"""Billing services. Every function that moves money is idempotent.

Idempotency tools used here: `select_for_update` on the invoice or coupon row, a unique
`stripe_payment_intent_id`, a unique (invoice, scope_key) on refunds, a unique
(subscription, period_start) on renewal invoices, and deterministic Stripe idempotency keys.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Iterable, Sequence

from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum
from django.db.models.functions import Lower
from django.utils import timezone

from . import bridge, pricing
from .dates import add_months
from .exceptions import (
    AmountMismatch,
    BillingError,
    CheckoutError,
    CouponRejected,
    RefundError,
    RefundExceedsPaid,
    StripeUnavailable,
)
from .models import (
    AffiliateAttribution,
    AffiliateLink,
    Coupon,
    CouponRedemption,
    Invoice,
    InvoiceLine,
    Refund,
    StoreCreditEntry,
    Subscription,
)
from .stripe_client import get_stripe_client

logger = logging.getLogger(__name__)

MAX_RENEWAL_ATTEMPTS = 4
BATCH_MONTHS = 3
CHECKOUT_CONSENTS = frozenset({"no_cancel_after_submit", "auto_renew"})
MIN_STRIPE_CHARGE_CENTS = 50
TERMINAL_TREATMENT_STATES = frozenset({"not_eligible", "canceled", "referred", "ended"})
OPEN_BATCH_STATUSES = ("scheduled", "released")


# ---------------------------------------------------------------- helpers

def _today() -> date:
    return timezone.localdate()


def _batches_for(plan) -> int:
    """Shipment batches for one billing period of a plan."""
    if plan.billing_commitment == "prepaid_term" and plan.term_months:
        return -(-plan.term_months // BATCH_MONTHS)
    return 1


def _invoice_plan(invoice: Invoice):
    line = invoice.lines.exclude(plan__isnull=True).select_related("plan", "plan__product").first()
    return line.plan if line else None


def _restore_credit_once(invoice: Invoice, reason: str) -> None:
    """Give applied store credit back, at most once per reason per invoice."""
    if invoice.credit_cents <= 0:
        return
    if StoreCreditEntry.objects.filter(invoice=invoice, reason=reason).exists():
        return
    StoreCreditEntry.objects.create(
        patient=invoice.patient, delta_cents=invoice.credit_cents, reason=reason, invoice=invoice
    )


def existing_customer_id(patient) -> str:
    """The patient's known Stripe customer id, or an empty string. Never calls Stripe."""
    return (
        Invoice.objects.filter(patient=patient).exclude(stripe_customer_id="").order_by("-created_at")
        .values_list("stripe_customer_id", flat=True).first()
    ) or (
        Subscription.objects.filter(patient=patient).exclude(stripe_customer_id="").order_by("-created_at")
        .values_list("stripe_customer_id", flat=True).first()
    ) or ""


def get_or_create_customer(patient) -> str:
    """The patient's Stripe customer id, created on first use. Only email and our UUID are sent."""
    return get_stripe_client().ensure_customer(
        patient_id=str(patient.pk), email=patient.user.email, existing_id=existing_customer_id(patient)
    )


def _stripe_metadata(invoice: Invoice) -> dict[str, str]:
    """Internal UUIDs only. No drug, condition, or plan name."""
    return {"beema_invoice_id": str(invoice.pk), "beema_patient_id": str(invoice.patient_id)}


def _stripe_description(invoice: Invoice) -> str:
    line = invoice.lines.first()
    label = line.neutral_description if line else "Order"
    return f"Beema Health - {label}"[:255]


def _record_consents(patient, kinds: Iterable[str], ip: str | None, user_agent: str) -> None:
    from apps.common.utils import sha256_hex
    from apps.patients.models import ConsentRecord

    version = getattr(settings, "BILLING_CONSENT_VERSION", "v1")
    for kind in kinds:
        ConsentRecord.objects.create(
            patient=patient, kind=kind, version=version, ip=ip, user_agent_hash=sha256_hex(user_agent or "")
        )


def _lock_coupons(codes: Sequence[str]) -> None:
    """Serialise concurrent redemptions of the same coupon before caps are checked."""
    wanted = {(c or "").strip().lower() for c in codes if (c or "").strip()}
    if wanted:
        list(
            Coupon.objects.select_for_update().annotate(code_lower=Lower("code"))
            .filter(code_lower__in=wanted).order_by("id")
        )


def _lock_patient(patient):
    return type(patient).objects.select_for_update().get(pk=patient.pk)


def _create_invoice_records(
    patient,
    *,
    kind: str,
    quote: pricing.Quote,
    lines: Sequence[dict],
    treatment=None,
    auto_renew: bool = False,
    coupon_codes: Sequence[str] = (),
    period_start: date | None = None,
    subscription: Subscription | None = None,
) -> Invoice:
    """Create the invoice, its lines, coupon reservations, and the store credit debit."""
    invoice = Invoice.objects.create(
        patient=patient,
        subscription=subscription,
        treatment=treatment,
        kind=kind,
        status=Invoice.Status.OPEN,
        currency=quote.currency,
        subtotal_cents=quote.subtotal_cents,
        discount_cents=quote.discount_cents,
        credit_cents=quote.credit_cents,
        total_cents=quote.total_cents,
        auto_renew_consented=auto_renew,
        coupon_codes=[a.code for a in quote.applied_coupons] or list(coupon_codes),
        period_start=period_start,
    )
    for line in lines:
        InvoiceLine.objects.create(invoice=invoice, **line)
    coupons = {str(c.pk): c for c in Coupon.objects.filter(pk__in=[a.coupon_id for a in quote.applied_coupons])}
    for applied in quote.applied_coupons:
        CouponRedemption.objects.create(
            coupon=coupons[applied.coupon_id], patient=patient, invoice=invoice, amount_cents=applied.amount_cents
        )
    if quote.credit_cents:
        StoreCreditEntry.objects.create(
            patient=patient, delta_cents=-quote.credit_cents, reason="applied_at_checkout", invoice=invoice
        )
    return invoice


# ---------------------------------------------------------------- checkout

@dataclass
class CheckoutResult:
    invoice: Invoice
    quote: pricing.Quote
    client_secret: str = ""
    requires_payment: bool = True


def _reject_if_ineligible(patient, plan, treatment) -> None:
    """Stop a patient who was not prescribed this drug before. The message is patient safe."""
    try:
        from apps.clinical.services import INELIGIBLE_MESSAGE, is_ineligible
    except ImportError:
        return
    variant = getattr(treatment, "variant", None) or plan.variant
    if is_ineligible(patient, variant if variant is not None else plan.product) is not None:
        raise CheckoutError(INELIGIBLE_MESSAGE, code="previously_ineligible")


@transaction.atomic
def create_checkout(
    patient,
    plan,
    coupon_codes: Sequence[str] = (),
    *,
    use_store_credit: bool = False,
    consents: Iterable[str] = (),
    treatment=None,
    ip: str | None = None,
    user_agent: str = "",
) -> CheckoutResult:
    """Price a plan, reserve coupons and credit, record consents, and create the PaymentIntent.

    Raises CouponRejected when any submitted coupon is invalid, so a patient is never charged
    full price after expecting a discount.
    """
    consent_set = set(consents)
    unknown = consent_set - CHECKOUT_CONSENTS
    if unknown:
        raise CheckoutError(f"Unknown consent kinds: {sorted(unknown)}", code="unknown_consent")
    if not plan.is_active:
        raise CheckoutError("Plan is not available.", code="plan_inactive")
    if treatment is not None and treatment.patient_id != patient.pk:
        raise CheckoutError("Treatment does not belong to this patient.", code="treatment_mismatch")
    _reject_if_ineligible(patient, plan, treatment)
    one_time_plan = plan.billing_commitment == "one_time"
    if not one_time_plan and "no_cancel_after_submit" not in consent_set:
        raise CheckoutError("The no-cancel-after-submission acknowledgment is required.", code="consent_required")

    _lock_patient(patient)
    stale = Invoice.objects.filter(
        patient=patient, treatment=treatment, status__in=[Invoice.Status.OPEN, Invoice.Status.FAILED],
        subscription__isnull=True, period_start__isnull=True, kind=Invoice.Kind.SUBSCRIPTION,
    )
    for old in stale:
        void_invoice(old, reason="superseded_by_new_checkout")

    _lock_coupons(coupon_codes)
    quote = pricing.quote(patient, plan, coupon_codes, use_store_credit)
    if quote.rejected_coupons:
        raise CouponRejected(quote)
    if 0 < quote.total_cents < MIN_STRIPE_CHARGE_CENTS:
        raise CheckoutError("Total is below the minimum card charge.", code="below_minimum_charge")

    neutral = f"{plan.product.neutral_label} - {plan.term_months or 1} month plan" if plan.term_months else plan.product.neutral_label
    invoice = _create_invoice_records(
        patient,
        kind=Invoice.Kind.ONE_TIME if one_time_plan else Invoice.Kind.SUBSCRIPTION,
        quote=quote,
        lines=[{
            "description_internal": plan.name, "neutral_description": neutral,
            "amount_cents": quote.subtotal_cents, "plan": plan, "product": plan.product,
        }],
        treatment=treatment,
        auto_renew="auto_renew" in consent_set,
        coupon_codes=coupon_codes,
    )
    _record_consents(patient, sorted(consent_set), ip, user_agent)

    if quote.total_cents == 0:
        _mark_paid(invoice.pk)
        invoice.refresh_from_db()
        bridge.audit("create", invoice, metadata={"total_cents": 0, "free": True})
        return CheckoutResult(invoice=invoice, quote=quote, requires_payment=False)

    customer_id = get_or_create_customer(patient)
    result = get_stripe_client().create_payment_intent(
        amount_cents=quote.total_cents,
        currency=quote.currency,
        customer_id=customer_id,
        description=_stripe_description(invoice),
        metadata=_stripe_metadata(invoice),
        idempotency_key=f"checkout-{invoice.pk}",
    )
    invoice.stripe_payment_intent_id = result.id
    invoice.stripe_customer_id = customer_id
    invoice.save(update_fields=["stripe_payment_intent_id", "stripe_customer_id", "updated_at"])
    bridge.audit("create", invoice, metadata={"total_cents": invoice.total_cents})
    return CheckoutResult(invoice=invoice, quote=quote, client_secret=result.client_secret)


@transaction.atomic
def void_invoice(invoice: Invoice, *, reason: str = "") -> Invoice:
    """Void an unpaid invoice: cancel its PaymentIntent, release coupons, return store credit."""
    locked = Invoice.objects.select_for_update().get(pk=invoice.pk)
    if locked.paid_at is not None:
        raise BillingError("A paid invoice cannot be voided; refund it instead.", code="invoice_paid")
    if locked.status == Invoice.Status.VOID:
        return locked
    if locked.stripe_payment_intent_id:
        try:
            get_stripe_client().cancel_payment_intent(locked.stripe_payment_intent_id)
        except StripeUnavailable:
            logger.warning("void_cancel_pi_failed invoice=%s", locked.pk)
    locked.status = Invoice.Status.VOID
    locked.save(update_fields=["status", "updated_at"])
    CouponRedemption.objects.filter(invoice=locked, released_at__isnull=True).update(released_at=timezone.now())
    _restore_credit_once(locked, "released_void_invoice")
    bridge.audit("update", locked, reason=reason, metadata={"status": "void"})
    return locked


# ---------------------------------------------------------------- payment events

def _lookup_by_intent(payment_intent_id: str) -> Invoice | None:
    return Invoice.objects.select_for_update().filter(stripe_payment_intent_id=payment_intent_id).first()


@transaction.atomic
def handle_payment_succeeded(
    payment_intent_id: str, *, amount_received_cents: int | None = None, payment_method_id: str = ""
) -> Invoice | None:
    """Mark the invoice for a PaymentIntent paid. Safe to call any number of times.

    Returns None for an unknown PaymentIntent (the caller may retry; our commit can lag the webhook).
    """
    invoice = _lookup_by_intent(payment_intent_id)
    if invoice is None:
        logger.warning("payment_succeeded_unknown_intent intent=%s", payment_intent_id)
        return None
    if invoice.paid_at is not None:
        return _mark_paid(invoice.pk)  # replay: finishes any post-payment step that failed earlier
    if amount_received_cents is not None and amount_received_cents != invoice.total_cents:
        logger.error("payment_amount_mismatch invoice=%s", invoice.pk)
        raise AmountMismatch(f"Invoice {invoice.pk} amount does not match the payment.")
    return _mark_paid(invoice.pk, payment_method_id=payment_method_id)


def _mark_paid(invoice_id, *, payment_method_id: str = "") -> Invoice:
    with transaction.atomic():
        invoice = Invoice.objects.select_for_update().get(pk=invoice_id)
        if invoice.paid_at is not None:
            if invoice.status == Invoice.Status.PAID and not invoice.period_start:
                _after_payment(invoice)  # replay repairs any step a past run could not finish
            return invoice
        if invoice.status == Invoice.Status.VOID:
            logger.error("payment_on_void_invoice invoice=%s", invoice.pk)
        invoice.status = Invoice.Status.PAID
        invoice.paid_at = timezone.now()
        invoice.failure_code = ""
        invoice.save(update_fields=["status", "paid_at", "failure_code", "updated_at"])

        # Stop abandoned checkout drip when payment succeeds
        try:
            from apps.messaging.services import mark_checkout_completed
            mark_checkout_completed(invoice.patient)
        except ImportError:
            logger.warning("messaging app not available for checkout completion")

        if invoice.subscription_id and invoice.period_start:
            _apply_renewal(invoice)
        else:
            _after_payment(invoice)
        bridge.resolve_payment_failed_items(invoice.patient)
        _remember_default_card(invoice, payment_method_id)
        bridge.audit("update", invoice, metadata={"status": "paid", "total_cents": invoice.total_cents})
        return invoice


def _guarded(step: str, invoice: Invoice, fn, *args):
    """Run one post-payment step in a savepoint. A failure is logged and never undoes the payment."""
    try:
        with transaction.atomic():
            return fn(*args)
    except Exception:  # noqa: BLE001 - replays retry; the captured payment must stay recorded
        logger.exception("post_payment_step_failed step=%s invoice=%s", step, invoice.pk)
        bridge.record_care_event(invoice.treatment, "billing.post_payment_step_failed", {"step": step})
        return None


def _after_payment(invoice: Invoice) -> None:
    """Post-payment pipeline for a checkout invoice. Every step is idempotent, so replays are safe.

    treatment (created if missing) -> subscription (and batches) -> questionnaire past checkout
    -> treatment moves to awaiting_visit_completion. The visit is submitted later, when the
    medical questionnaire is finished.
    """
    plan = _invoice_plan(invoice)
    if plan is None:
        return  # an ad hoc one-time charge, not a plan checkout
    submission = bridge.find_submission(invoice.patient, invoice.treatment, plan)
    if invoice.treatment_id is None and submission is not None:
        treatment = _guarded("start_treatment", invoice, bridge.start_treatment, submission)
        if treatment is not None:
            invoice.treatment = treatment
            invoice.save(update_fields=["treatment", "updated_at"])
    if invoice.kind == Invoice.Kind.SUBSCRIPTION:
        subscription = invoice.subscription or start_subscription(invoice)
        invoice.subscription = subscription
        if subscription.treatment_id is None and invoice.treatment_id:
            subscription.treatment = invoice.treatment
            subscription.save(update_fields=["treatment", "updated_at"])
    if submission is not None and submission.selected_plan_id:
        _guarded("complete_checkout", invoice, bridge.complete_checkout, submission)
    bridge.mark_payment_received(invoice.treatment)


@transaction.atomic
def handle_post_payment_disqualification(treatment) -> list[Refund]:
    """A paid patient was disqualified in the medical questionnaire (for example pregnancy).

    Before submission this is the pre-submission cancel (full refund). Once submitted it is the
    not-prescribed refund (the doctor VendorCost stays). Idempotent.
    """
    if treatment.submitted_to_network_at is not None:
        refunds = refund_not_prescribed(treatment)
    else:
        refunds = refund_canceled_before_submission(treatment)
    bridge.end_treatment(treatment, "disqualified")
    return refunds


def _remember_default_card(invoice: Invoice, payment_method_id: str) -> None:
    """Make the card used the default for renewals when the customer has none."""
    if not (payment_method_id and invoice.stripe_customer_id):
        return
    try:
        client = get_stripe_client()
        if not client.get_default_payment_method(invoice.stripe_customer_id):
            client.set_default_payment_method(invoice.stripe_customer_id, payment_method_id)
    except BillingError:
        logger.warning("default_card_not_saved invoice=%s", invoice.pk)


@transaction.atomic
def handle_payment_failed(payment_intent_id: str, *, failure_code: str = "") -> Invoice | None:
    """Record a failed payment and ask the patient to fix their card."""
    invoice = _lookup_by_intent(payment_intent_id)
    if invoice is None:
        logger.warning("payment_failed_unknown_intent intent=%s", payment_intent_id)
        return None
    return _mark_failed(invoice.pk, failure_code)


def _mark_failed(invoice_id, failure_code: str = "") -> Invoice:
    with transaction.atomic():
        invoice = Invoice.objects.select_for_update().get(pk=invoice_id)
        if invoice.paid_at is not None:
            return invoice  # a late failure event after success must not undo the payment
        already = invoice.status == Invoice.Status.FAILED and invoice.failure_code == (failure_code or invoice.failure_code)
        invoice.status = Invoice.Status.FAILED
        invoice.failure_code = (failure_code or invoice.failure_code)[:64]
        invoice.save(update_fields=["status", "failure_code", "updated_at"])
        if already:
            return invoice
        if invoice.subscription_id:
            Subscription.objects.filter(pk=invoice.subscription_id, status=Subscription.Status.ACTIVE).update(
                status=Subscription.Status.PAST_DUE
            )
        bridge.open_payment_failed_item(invoice.patient, invoice.treatment)
        bridge.notify_patient(invoice.patient, "payment_failed")
        bridge.record_care_event(invoice.treatment, "payment.failed", {"invoice_id": str(invoice.pk)})
        return invoice


@transaction.atomic
def handle_charge_refunded(payment_intent_id: str, amount_refunded_cents: int) -> Invoice | None:
    """Sync refunds made outside this system (Stripe dashboard) into our ledger."""
    invoice = _lookup_by_intent(payment_intent_id)
    if invoice is None:
        return None
    recorded = _refund_sum(invoice, (Refund.Status.PENDING, Refund.Status.SUCCEEDED))
    delta = min(amount_refunded_cents, invoice.total_cents) - recorded
    if delta > 0:
        Refund.objects.create(
            invoice=invoice, amount_cents=delta, reason=Refund.Reason.GOODWILL, status=Refund.Status.SUCCEEDED,
            scope_key=f"stripe-sync-{amount_refunded_cents}", note="Recorded from Stripe dashboard refund",
        )
        _recompute_refunded(invoice)
    return invoice


@transaction.atomic
def handle_dispute_created(payment_intent_id: str) -> Invoice | None:
    """Flag a chargeback for staff. No automatic money movement."""
    invoice = _lookup_by_intent(payment_intent_id)
    if invoice is None:
        return None
    if invoice.disputed_at is None:
        invoice.disputed_at = timezone.now()
        invoice.save(update_fields=["disputed_at", "updated_at"])
        bridge.record_care_event(invoice.treatment, "payment.disputed", {"invoice_id": str(invoice.pk)})
        bridge.audit("update", invoice, metadata={"disputed": True})
    return invoice


# ---------------------------------------------------------------- subscriptions

@transaction.atomic
def start_subscription(invoice: Invoice) -> Subscription:
    """Create the subscription for a paid invoice. Calling twice returns the same subscription."""
    locked = Invoice.objects.select_for_update().get(pk=invoice.pk)
    if locked.subscription_id:
        return locked.subscription
    if locked.paid_at is None:
        raise BillingError("Invoice must be paid before a subscription starts.", code="invoice_unpaid")
    plan = _invoice_plan(locked)
    if plan is None or plan.billing_commitment not in ("renewing_monthly", "prepaid_term"):
        raise BillingError("Invoice has no subscription plan.", code="no_plan")

    monthly = plan.billing_commitment == "renewing_monthly"
    term = 1 if monthly else int(plan.term_months)
    start = timezone.localtime(locked.paid_at).date()
    end = add_months(start, term)
    subscription = Subscription.objects.create(
        patient=locked.patient,
        treatment=locked.treatment,
        plan=plan,
        status=Subscription.Status.ACTIVE,
        commitment=plan.billing_commitment,
        term_months=term,
        term_starts_on=start,
        term_ends_on=end,
        paid_through=end - timedelta(days=1),
        next_bill_on=end if monthly else None,
        next_ship_on=start,
        batches_total=_batches_for(plan),
        renews_at_term_end=True if monthly else locked.auto_renew_consented,
        stripe_customer_id=locked.stripe_customer_id,
    )
    locked.subscription = subscription
    locked.save(update_fields=["subscription", "updated_at"])
    bridge.create_batches(subscription)
    bridge.audit("create", subscription, metadata={"plan_id": str(plan.pk)})
    return subscription


def _apply_renewal(invoice: Invoice) -> None:
    """Extend a subscription after a paid renewal invoice (called with the invoice locked)."""
    sub = Subscription.objects.select_for_update().get(pk=invoice.subscription_id)
    if sub.status in (Subscription.Status.CANCELED, Subscription.Status.COMPLETED):
        logger.error("renewal_paid_on_inactive_subscription subscription=%s", sub.pk)
        bridge.record_care_event(sub.treatment, "payment.renewal_on_inactive", {"invoice_id": str(invoice.pk)})
        return
    if invoice.period_start <= sub.term_starts_on:
        return  # this period was already applied
    plan = sub.plan
    monthly = sub.commitment == Subscription.Commitment.RENEWING_MONTHLY
    start = invoice.period_start
    end = add_months(start, sub.term_months)
    sub.term_starts_on = start
    sub.term_ends_on = end
    sub.paid_through = end - timedelta(days=1)
    sub.next_bill_on = end if monthly and not sub.cancel_requested else None
    sub.batches_total += _batches_for(plan)
    sub.status = Subscription.Status.PENDING_CANCEL if sub.cancel_requested else Subscription.Status.ACTIVE
    sub.save()
    bridge.create_batches(sub)


@dataclass
class CancelResult:
    outcome: str  # refunded_before_submission | cancel_at_period_end | auto_renew_off | already_ended
    refunded_cents: int = 0


def _submitted(subscription: Subscription) -> bool:
    return subscription.treatment is not None and subscription.treatment.submitted_to_network_at is not None


@transaction.atomic
def request_cancel(subscription: Subscription, user=None) -> CancelResult:
    """Apply the owner's cancellation policy.

    1. Not yet submitted to the doctor network: cancel with a full refund.
    2. Submitted: no cancel for refund (accepted at checkout).
    3. Monthly: stop future charges; the paid month is not refunded.
    4. Prepaid 3/6/12: only turn renewal off; remaining batches still ship.
    """
    sub = Subscription.objects.select_for_update().select_related("treatment", "plan").get(pk=subscription.pk)
    if sub.status in (Subscription.Status.CANCELED, Subscription.Status.COMPLETED):
        return CancelResult("already_ended")

    if not _submitted(sub):
        before = _refund_total_for_subscription(sub)
        if sub.treatment is not None:
            bridge.cancel_treatment(sub.treatment, actor=user)
            refund_canceled_before_submission(sub.treatment)
        else:
            _refund_subscription_invoices(sub, Refund.Reason.CANCELED_BEFORE_SUBMISSION)
            _end_subscription(sub, Subscription.Status.CANCELED)
        bridge.audit("update", sub, actor=user, metadata={"cancel": "before_submission"})
        return CancelResult("refunded_before_submission", _refund_total_for_subscription(sub) - before)

    if sub.commitment == Subscription.Commitment.RENEWING_MONTHLY:
        _stop_monthly_renewal(sub)
        bridge.audit("update", sub, actor=user, metadata={"cancel": "period_end"})
        return CancelResult("cancel_at_period_end")

    sub.renews_at_term_end = False
    sub.save(update_fields=["renews_at_term_end", "updated_at"])
    bridge.audit("update", sub, actor=user, metadata={"auto_renew": False})
    return CancelResult("auto_renew_off")


def _stop_monthly_renewal(sub: Subscription) -> None:
    sub.cancel_requested = True
    sub.cancel_effective_on = sub.paid_through
    sub.next_bill_on = None
    sub.renews_at_term_end = False
    if sub.status in (Subscription.Status.ACTIVE, Subscription.Status.PAST_DUE):
        sub.status = Subscription.Status.PENDING_CANCEL
    sub.save()


@transaction.atomic
def set_auto_renew(
    subscription: Subscription, enabled: bool, *, ip: str | None = None, user_agent: str = ""
) -> Subscription:
    """Turn renewal on or off in one call (rule 7). Never refunds. Enabling records consent."""
    sub = Subscription.objects.select_for_update().get(pk=subscription.pk)
    if sub.status in (Subscription.Status.CANCELED, Subscription.Status.COMPLETED):
        raise BillingError("This subscription has ended.", code="subscription_ended")
    monthly = sub.commitment == Subscription.Commitment.RENEWING_MONTHLY
    currently_on = (not sub.cancel_requested) if monthly else sub.renews_at_term_end
    if enabled == currently_on:
        return sub
    if enabled:
        _record_consents(sub.patient, ["auto_renew"], ip, user_agent)
    if monthly and not enabled:
        _stop_monthly_renewal(sub)
    elif monthly and enabled:
        if sub.term_ends_on <= _today() and sub.status == Subscription.Status.PENDING_CANCEL:
            raise BillingError("This subscription has ended.", code="subscription_ended")
        sub.cancel_requested = False
        sub.cancel_effective_on = None
        sub.renews_at_term_end = True
        sub.next_bill_on = sub.term_ends_on
        if sub.status == Subscription.Status.PENDING_CANCEL:
            sub.status = Subscription.Status.ACTIVE
        sub.save()
    else:
        sub.renews_at_term_end = enabled
        sub.save(update_fields=["renews_at_term_end", "updated_at"])
    bridge.audit("update", sub, metadata={"auto_renew": enabled})
    return sub


def _end_subscription(sub: Subscription, status: str) -> None:
    sub.status = status
    sub.renews_at_term_end = False
    sub.next_bill_on = None
    sub.cancel_effective_on = sub.cancel_effective_on or _today()
    sub.save()


# ---------------------------------------------------------------- refunds

def _refund_sum(invoice: Invoice, statuses: Iterable[str]) -> int:
    return int(Refund.objects.filter(invoice=invoice, status__in=list(statuses)).aggregate(s=Sum("amount_cents"))["s"] or 0)


def _recompute_refunded(invoice: Invoice) -> None:
    """Refresh refunded_cents (pending plus succeeded) and the invoice status (succeeded only)."""
    invoice.refunded_cents = _refund_sum(invoice, (Refund.Status.PENDING, Refund.Status.SUCCEEDED))
    done = _refund_sum(invoice, (Refund.Status.SUCCEEDED,))
    if done >= invoice.total_cents and invoice.total_cents > 0:
        invoice.status = Invoice.Status.REFUNDED
    elif done > 0:
        invoice.status = Invoice.Status.PARTIALLY_REFUNDED
    invoice.save(update_fields=["refunded_cents", "status", "updated_at"])


def _issue_refund(
    invoice_id, amount_cents: int | None, reason: str, *, scope_key: str, approved_by=None, note: str = ""
) -> Refund | None:
    """Refund once per (invoice, scope_key). `amount_cents=None` means everything not yet refunded.

    Returns the existing refund for a repeated scope, None when there is nothing left to refund.
    A Stripe failure leaves a failed Refund row that the next call with the same scope retries.
    """
    with transaction.atomic():
        invoice = Invoice.objects.select_for_update().get(pk=invoice_id)
        existing = Refund.objects.filter(invoice=invoice, scope_key=scope_key).first() if scope_key else None
        if existing is not None and existing.status != Refund.Status.FAILED:
            return existing
        if invoice.paid_at is None:
            raise RefundError(f"Invoice {invoice.pk} was not paid.", code="invoice_not_paid")
        remaining = invoice.total_cents - invoice.refunded_cents
        if amount_cents is None:
            amount_cents = remaining
        if amount_cents <= 0:
            return None
        if not invoice.stripe_payment_intent_id:
            raise RefundError(f"Invoice {invoice.pk} has no payment to refund.", code="no_payment")
        if amount_cents > remaining:
            raise RefundExceedsPaid(f"Refund exceeds the paid amount on invoice {invoice.pk}.")
        refund = existing or Refund(invoice=invoice, scope_key=scope_key)
        refund.amount_cents = amount_cents
        refund.reason = reason
        refund.approved_by = approved_by
        refund.note = note
        refund.status = Refund.Status.PENDING
        refund.save()
        _recompute_refunded(invoice)

        try:
            result = get_stripe_client().create_refund(
                payment_intent_id=invoice.stripe_payment_intent_id,
                amount_cents=amount_cents,
                idempotency_key=f"refund-{invoice.pk}-{scope_key or refund.pk}",
                metadata={"beema_invoice_id": str(invoice.pk), "beema_refund_id": str(refund.pk)},
            )
        except StripeUnavailable:
            refund.status = Refund.Status.FAILED
            refund.save(update_fields=["status", "updated_at"])
            _recompute_refunded(invoice)
            logger.error("refund_failed invoice=%s refund=%s", invoice.pk, refund.pk)
            return refund
        refund.status = Refund.Status.SUCCEEDED
        refund.stripe_refund_id = result.id
        refund.save(update_fields=["status", "stripe_refund_id", "updated_at"])
        _recompute_refunded(invoice)
        if invoice.refunded_cents >= invoice.total_cents:
            _restore_credit_once(invoice, "refund_restore")
        bridge.audit(
            "create", refund, actor=approved_by, reason=reason,
            metadata={"invoice_id": str(invoice.pk), "amount_cents": amount_cents},
        )
        return refund


def refund_invoice(
    invoice: Invoice, amount_cents: int, reason: str, *, approved_by=None, scope_key: str = "", note: str = ""
) -> Refund:
    """Staff refund of part or all of an invoice. Without a scope key each call is a new refund."""
    if reason not in Refund.Reason.values:
        raise RefundError("Unknown refund reason.", code="unknown_reason")
    if amount_cents <= 0:
        raise RefundError("Refund amount must be positive.", code="invalid_amount")
    refund = _issue_refund(
        invoice.pk, amount_cents, reason, scope_key=scope_key or f"manual-{uuid.uuid4().hex[:16]}",
        approved_by=approved_by, note=note,
    )
    if refund is None:
        raise RefundError("Nothing left to refund on this invoice.", code="nothing_to_refund")
    return refund


def retry_failed_refund(refund: Refund) -> Refund:
    """Retry a failed refund (admin action). Same scope, same Stripe idempotency key."""
    result = _issue_refund(
        refund.invoice_id, refund.amount_cents, refund.reason, scope_key=refund.scope_key or f"retry-{refund.pk}",
        approved_by=refund.approved_by, note=refund.note,
    )
    return result or refund


def _paid_invoices(treatment) -> list[Invoice]:
    return list(
        Invoice.objects.filter(Q(treatment=treatment) | Q(subscription__treatment=treatment), paid_at__isnull=False)
        .distinct().order_by("paid_at")
    )


def _refund_total_for_subscription(sub: Subscription) -> int:
    return int(
        Refund.objects.filter(invoice__subscription=sub, status=Refund.Status.SUCCEEDED).aggregate(s=Sum("amount_cents"))["s"]
        or 0
    )


def _refund_subscription_invoices(sub: Subscription, reason: str) -> list[Refund]:
    refunds = []
    for invoice in Invoice.objects.filter(subscription=sub, paid_at__isnull=False).order_by("paid_at"):
        refund = _issue_refund(invoice.pk, None, reason, scope_key="full")
        if refund:
            refunds.append(refund)
    return refunds


def _refund_treatment(treatment, reason: str) -> list[Refund]:
    """Refund everything paid for a treatment and end its subscriptions. Vendor costs are untouched."""
    refunds: list[Refund] = []
    for invoice in _paid_invoices(treatment):
        refund = _issue_refund(invoice.pk, None, reason, scope_key="full")
        if refund:
            refunds.append(refund)
    if any(r.status == Refund.Status.FAILED for r in refunds):
        logger.error("treatment_refund_incomplete treatment=%s", treatment.pk)
    subs = Subscription.objects.select_for_update().filter(treatment=treatment).exclude(
        status__in=[Subscription.Status.CANCELED, Subscription.Status.COMPLETED]
    )
    for sub in subs:
        _end_subscription(sub, Subscription.Status.CANCELED)
        _close_open_batches(sub, "refunded")
    return refunds


@transaction.atomic
def refund_not_prescribed(treatment) -> list[Refund]:
    """Rule 5: full refund when the patient is not prescribed. The doctor VendorCost stays."""
    refunds = _refund_treatment(treatment, Refund.Reason.NOT_PRESCRIBED)
    bridge.record_care_event(treatment, "billing.refund_not_prescribed", {"count": len(refunds)})
    return refunds


@transaction.atomic
def refund_canceled_before_submission(treatment) -> list[Refund]:
    """Rule 1: the patient canceled before the visit reached the network. Full refund."""
    refunds = _refund_treatment(treatment, Refund.Reason.CANCELED_BEFORE_SUBMISSION)
    bridge.record_care_event(treatment, "billing.refund_canceled_before_submission", {"count": len(refunds)})
    return refunds


def _close_open_batches(sub: Subscription, status: str) -> list:
    model = bridge.shipment_batch_model()
    if model is None:
        return []
    batches = list(model.objects.filter(subscription=sub, status__in=OPEN_BATCH_STATUSES).order_by("sequence"))
    for batch in batches:
        batch.status = status
        batch.save(update_fields=["status", "updated_at"])
    return batches


def _unshipped_sequences(sub: Subscription) -> list[int]:
    model = bridge.shipment_batch_model()
    if model is not None:
        rows = model.objects.filter(subscription=sub)
        if rows.exists():
            return list(rows.filter(status__in=OPEN_BATCH_STATUSES).order_by("sequence").values_list("sequence", flat=True))
    return list(range(sub.batches_shipped + 1, sub.batches_total + 1))


def _batch_share(sub: Subscription, sequence: int) -> tuple[Invoice, int] | None:
    """The invoice that paid for a batch and the batch's share of it (last batch takes the rounding)."""
    cursor = 0
    for invoice in Invoice.objects.filter(subscription=sub, paid_at__isnull=False).order_by("paid_at", "created_at"):
        plan = _invoice_plan(invoice)
        count = _batches_for(plan) if plan else 1
        if sequence <= cursor + count:
            index = sequence - cursor - 1
            base = invoice.total_cents // count
            share = base + (invoice.total_cents - base * count if index == count - 1 else 0)
            return invoice, share
        cursor += count
    return None


@transaction.atomic
def refund_unshipped_batches(subscription: Subscription, reason: str, *, approved_by=None) -> list[Refund]:
    """Rule 6: refund the unshipped share, batch by batch, and end the subscription."""
    if reason not in (Refund.Reason.DOCTOR_STOPPED, Refund.Reason.UNFILLABLE, Refund.Reason.LEGAL, Refund.Reason.GOODWILL):
        raise RefundError("Unsupported reason for a batch refund.", code="unknown_reason")
    sub = Subscription.objects.select_for_update().get(pk=subscription.pk)
    refunds: list[Refund] = []
    for sequence in _unshipped_sequences(sub):
        allocation = _batch_share(sub, sequence)
        if allocation is None:
            continue
        invoice, share = allocation
        if share <= 0:
            continue
        refund = _issue_refund(
            invoice.pk, share, reason, scope_key=f"batch-{sequence}", approved_by=approved_by,
            note=f"Unshipped batch {sequence}",
        )
        if refund:
            refunds.append(refund)
    _close_open_batches(sub, "refunded")
    if sub.status not in (Subscription.Status.CANCELED, Subscription.Status.COMPLETED):
        _end_subscription(sub, Subscription.Status.CANCELED)
    bridge.audit("update", sub, actor=approved_by, reason=reason, metadata={"batches_refunded": len(refunds)})
    return refunds


# ---------------------------------------------------------------- renewals

@dataclass
class RenewalReport:
    charged: list[str] = field(default_factory=list)
    failed: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    canceled: list[str] = field(default_factory=list)
    completed: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def _is_due(sub: Subscription, today: date) -> bool:
    if sub.status not in (Subscription.Status.ACTIVE, Subscription.Status.PAST_DUE) or sub.cancel_requested:
        return False
    if sub.commitment == Subscription.Commitment.RENEWING_MONTHLY:
        return sub.next_bill_on is not None and sub.next_bill_on <= today
    return sub.renews_at_term_end and sub.term_ends_on <= today


def _finalize_ended(today: date, report: RenewalReport) -> None:
    pending = Subscription.objects.filter(
        status=Subscription.Status.PENDING_CANCEL, commitment=Subscription.Commitment.RENEWING_MONTHLY,
        term_ends_on__lte=today,
    )
    for sub in pending:
        with transaction.atomic():
            locked = Subscription.objects.select_for_update().get(pk=sub.pk)
            if locked.status == Subscription.Status.PENDING_CANCEL:
                _end_subscription(locked, Subscription.Status.CANCELED)
                report.canceled.append(str(locked.pk))
    finished = Subscription.objects.filter(
        status=Subscription.Status.ACTIVE, commitment=Subscription.Commitment.PREPAID_TERM,
        renews_at_term_end=False, term_ends_on__lte=today,
    )
    for sub in finished:
        if sub.batches_shipped >= sub.batches_total:
            with transaction.atomic():
                locked = Subscription.objects.select_for_update().get(pk=sub.pk)
                if locked.status == Subscription.Status.ACTIVE:
                    locked.status = Subscription.Status.COMPLETED
                    locked.save(update_fields=["status", "updated_at"])
                    report.completed.append(str(locked.pk))


def run_renewals(today: date | None = None) -> RenewalReport:
    """Charge every renewal due on or before `today` (once per period) and close finished terms."""
    today = today or _today()
    report = RenewalReport()
    _finalize_ended(today, report)
    due = Subscription.objects.filter(
        status__in=[Subscription.Status.ACTIVE, Subscription.Status.PAST_DUE], cancel_requested=False
    ).filter(
        Q(commitment=Subscription.Commitment.RENEWING_MONTHLY, next_bill_on__lte=today)
        | Q(commitment=Subscription.Commitment.PREPAID_TERM, renews_at_term_end=True, term_ends_on__lte=today)
    ).order_by("created_at")
    for sub_id in list(due.values_list("pk", flat=True)):
        try:
            _renew_one(sub_id, today, report)
        except BillingError as exc:
            logger.error("renewal_error subscription=%s code=%s", sub_id, exc.code)
            report.errors.append(str(sub_id))
    return report


def _renew_one(sub_id, today: date, report: RenewalReport) -> None:
    with transaction.atomic():
        sub = Subscription.objects.select_for_update().select_related("plan", "treatment", "patient").get(pk=sub_id)
        if not _is_due(sub, today):
            return
        if sub.treatment is not None and sub.treatment.status in TERMINAL_TREATMENT_STATES:
            report.skipped.append(str(sub.pk))
            return
        monthly = sub.commitment == Subscription.Commitment.RENEWING_MONTHLY
        period_start = sub.next_bill_on if monthly else sub.term_ends_on
        invoice = Invoice.objects.select_for_update().filter(subscription=sub, period_start=period_start).first()
        if invoice is not None and invoice.paid_at is not None:
            _apply_renewal(invoice)  # repair a crash between payment and extension
            report.skipped.append(str(sub.pk))
            return
        if invoice is not None:
            if invoice.attempt_count >= MAX_RENEWAL_ATTEMPTS or (
                invoice.last_attempt_at and timezone.localtime(invoice.last_attempt_at).date() >= today
            ):
                report.skipped.append(str(sub.pk))
                return
        else:
            quote = pricing.quote(sub.patient, sub.plan, (), False)
            plan = sub.plan
            invoice = _create_invoice_records(
                sub.patient, kind=Invoice.Kind.SUBSCRIPTION, quote=quote,
                lines=[{
                    "description_internal": plan.name,
                    "neutral_description": f"{plan.product.neutral_label} - renewal",
                    "amount_cents": quote.subtotal_cents, "plan": plan, "product": plan.product,
                }],
                treatment=sub.treatment, period_start=period_start, subscription=sub,
            )
        outcome = _attempt_charge(invoice, sub.stripe_customer_id)
        (report.charged if outcome == "paid" else report.failed).append(str(sub.pk))


def _attempt_charge(invoice: Invoice, customer_hint: str = "", payment_method_id: str = "") -> str:
    """Charge an invoice off session. Returns "paid" or "failed". StripeUnavailable propagates."""
    if invoice.total_cents == 0:
        _mark_paid(invoice.pk)
        return "paid"
    client = get_stripe_client()
    customer = invoice.stripe_customer_id or customer_hint or get_or_create_customer(invoice.patient)
    method = payment_method_id or client.get_default_payment_method(customer)
    invoice.stripe_customer_id = customer
    invoice.attempt_count += 1
    invoice.last_attempt_at = timezone.now()
    invoice.save(update_fields=["stripe_customer_id", "attempt_count", "last_attempt_at", "updated_at"])
    if not method:
        _mark_failed(invoice.pk, "no_payment_method")
        return "failed"
    result = client.create_payment_intent(
        amount_cents=invoice.total_cents, currency=invoice.currency, customer_id=customer,
        description=_stripe_description(invoice), metadata=_stripe_metadata(invoice),
        idempotency_key=f"charge-{invoice.pk}-{invoice.attempt_count}", payment_method_id=method, off_session=True,
    )
    if result.id:
        invoice.stripe_payment_intent_id = result.id
        invoice.save(update_fields=["stripe_payment_intent_id", "updated_at"])
    if result.status == "succeeded":
        _mark_paid(invoice.pk, payment_method_id=method)
        return "paid"
    _mark_failed(invoice.pk, result.failure_code or "payment_failed")
    return "failed"


# ---------------------------------------------------------------- one time charges

@dataclass(frozen=True)
class OneTimeItem:
    description_internal: str
    neutral_description: str
    amount_cents: int
    plan: object | None = None
    product: object | None = None


@transaction.atomic
def charge_one_time(
    patient,
    items: Sequence[OneTimeItem],
    *,
    coupon_codes: Sequence[str] = (),
    use_store_credit: bool = False,
    payment_method_id: str = "",
    treatment=None,
) -> Invoice:
    """Charge a standalone item (add-on, fee, manual staff charge) off session. No subscription.

    The coupon product rule uses the first item that has a product. A declined card leaves a
    failed invoice (and opens the payment_failed banner) rather than raising.
    """
    if not items:
        raise CheckoutError("At least one item is required.", code="no_items")
    if any(item.amount_cents < 0 for item in items):
        raise CheckoutError("Item amounts must not be negative.", code="negative_amount")
    _lock_patient(patient)
    if payment_method_id:
        customer = get_or_create_customer(patient)
        if payment_method_id not in {m.id for m in get_stripe_client().list_payment_methods(customer)}:
            raise CheckoutError("Payment method does not belong to this patient.", code="payment_method_mismatch")
    _lock_coupons(coupon_codes)
    product = next((i.product for i in items if i.product is not None), None)
    quote = pricing.quote_amount(
        patient, sum(i.amount_cents for i in items), product=product, coupon_codes=coupon_codes,
        use_store_credit=use_store_credit,
    )
    if quote.rejected_coupons:
        raise CouponRejected(quote)
    if 0 < quote.total_cents < MIN_STRIPE_CHARGE_CENTS:
        raise CheckoutError("Total is below the minimum card charge.", code="below_minimum_charge")
    invoice = _create_invoice_records(
        patient, kind=Invoice.Kind.ONE_TIME, quote=quote, treatment=treatment, coupon_codes=coupon_codes,
        lines=[
            {"description_internal": i.description_internal, "neutral_description": i.neutral_description,
             "amount_cents": i.amount_cents, "plan": i.plan, "product": i.product}
            for i in items
        ],
    )
    _attempt_charge(invoice, payment_method_id=payment_method_id)
    invoice.refresh_from_db()
    bridge.audit("create", invoice, metadata={"total_cents": invoice.total_cents, "one_time": True})
    return invoice


# ---------------------------------------------------------------- affiliates

def record_attribution(patient, slug: str, source: str = "") -> AffiliateAttribution | None:
    """First touch wins. Unknown or inactive links and repeat calls change nothing."""
    link = AffiliateLink.objects.filter(slug=slug, is_active=True).first()
    if link is None:
        return None
    attribution, _ = AffiliateAttribution.objects.get_or_create(
        patient=patient, defaults={"affiliate": link, "first_touch_at": timezone.now(), "source": source[:64]}
    )
    return attribution
