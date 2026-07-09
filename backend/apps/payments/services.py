from __future__ import annotations

import logging

import stripe
from django.conf import settings
from django.utils import timezone

from apps.accounts.models import User
from apps.eligibility.models import FunnelSession
from apps.payments.models import (
    AuthorizationHold,
    StripeCustomer,
    StripePaymentMethod,
)
from apps.questionnaires.models import QuestionnaireVersion
from apps.questionnaires.validation import PAYMENT_HOLD_PLUGIN_ID

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY
HOLD_EXPIRY_DAYS = 7


class PaymentNotConfigured(Exception):
    """Raised when the patient's pinned questionnaire version has no payment field."""


class IllegalStateTransition(Exception):
    """Raised when a hold status transition violates AuthorizationHold.ALLOWED_TRANSITIONS."""


class StripeApiUnavailable(Exception):
    """Raised when the Stripe API call fails for reasons outside the patient's control."""


def _find_payment_field(version_id):
    if not version_id:
        return None
    try:
        version = QuestionnaireVersion.objects.get(id=version_id)
    except QuestionnaireVersion.DoesNotExist:
        return None
    for step in version.steps.all():
        for field in step.fields.all():
            if field.field_type == "plugin" and field.plugin_id == PAYMENT_HOLD_PLUGIN_ID:
                return field
    return None


def resolve_payment_config(user: User) -> dict:
    """Resolve payment_mode + amount for this user's pinned questionnaire version.

    Checks the intake pin first (patient is further along), then the qualify
    pin. Raises PaymentNotConfigured if neither pinned version has a payment
    field — the caller (view) should turn that into a 409, not a 500.
    """
    version_id = None
    intake = getattr(user, "intake", None)
    if intake is not None and intake.questionnaire_version_id:
        version_id = intake.questionnaire_version_id

    funnel_session = None
    if version_id is None:
        funnel_session = (
            FunnelSession.objects.filter(claimed_by_user=user)
            .order_by("-created_at")
            .first()
        )
        if funnel_session is not None:
            version_id = funnel_session.qualify_questionnaire_version_id

    field = _find_payment_field(version_id)
    if field is None:
        raise PaymentNotConfigured(
            "No payment field configured on this patient's pinned questionnaire version."
        )

    payment_mode = (field.options or {}).get("payment_mode", "auth_hold")
    amount_cents = (
        settings.PAYMENT_HOLD_AMOUNT_CENTS if payment_mode == "auth_hold" else 0
    )

    if funnel_session is None:
        funnel_session = (
            FunnelSession.objects.filter(claimed_by_user=user)
            .order_by("-created_at")
            .first()
        )

    return {
        "payment_mode": payment_mode,
        "amount_cents": amount_cents,
        "questionnaire_version_id": version_id,
        "experiment_id": funnel_session.experiment_id if funnel_session else None,
        "variant_key": funnel_session.variant_key if funnel_session else "",
    }


def get_or_create_stripe_customer(user: User) -> StripeCustomer:
    try:
        return user.stripe_customer
    except StripeCustomer.DoesNotExist:
        pass
    try:
        customer = stripe.Customer.create(
            name=f"{user.first_name} {user.last_name}".strip(),
            email=user.email,
            metadata={"user_id": str(user.id)},
        )
    except stripe.error.StripeError as exc:
        logger.error("Stripe customer create failed: %s", type(exc).__name__)
        raise StripeApiUnavailable("Unable to reach Stripe.") from exc
    return StripeCustomer.objects.create(user=user, stripe_customer_id=customer.id)


def get_client_secret(hold: AuthorizationHold) -> str | None:
    """Fetch the client_secret for a hold still awaiting patient confirmation.

    Needed for the re-entry case (page refresh mid-3DS) — the frontend has to
    re-confirm against the same intent, and client_secret is never persisted
    server-side.
    """
    if hold.status not in (
        AuthorizationHold.Status.PROCESSING,
        AuthorizationHold.Status.REQUIRES_ACTION,
    ):
        return None
    try:
        if hold.payment_mode == AuthorizationHold.PaymentMode.SETUP_ONLY:
            intent = stripe.SetupIntent.retrieve(hold.stripe_setup_intent_id)
        else:
            intent = stripe.PaymentIntent.retrieve(hold.stripe_payment_intent_id)
    except stripe.error.StripeError as exc:
        logger.error("Stripe intent retrieve failed: %s", type(exc).__name__)
        raise StripeApiUnavailable("Unable to reach Stripe.") from exc
    return intent.client_secret


def get_active_hold(user: User) -> AuthorizationHold | None:
    return (
        AuthorizationHold.objects.filter(user=user)
        .exclude(
            status__in=[
                AuthorizationHold.Status.CANCELED,
                AuthorizationHold.Status.EXPIRED,
                AuthorizationHold.Status.FAILED,
            ]
        )
        .order_by("-created_at")
        .first()
    )


def create_or_get_hold(user: User) -> AuthorizationHold:
    """Idempotent create-or-return: returns the existing active hold if present."""
    existing = get_active_hold(user)
    if existing is not None:
        return existing

    config = resolve_payment_config(user)
    customer = get_or_create_stripe_customer(user)
    intake = getattr(user, "intake", None)

    # hold.id (a UUID default) is populated at instantiation, before save — used
    # as the Stripe idempotency key so it's unique per hold attempt. Request-level
    # dedup (double-click, resumed session) is handled above by get_active_hold,
    # not by reusing a Stripe key, so a canceled-and-recreated hold (change-card)
    # always gets a genuinely new PaymentIntent rather than a cached one.
    hold = AuthorizationHold(
        user=user,
        intake=intake,
        questionnaire_version_id=config["questionnaire_version_id"],
        experiment_id=config["experiment_id"],
        variant_key=config["variant_key"],
        payment_mode=config["payment_mode"],
        amount_cents=config["amount_cents"],
        pricing_config_snapshot=config,
    )
    hold.idempotency_key = f"hold-{hold.id}"
    hold.save()
    idempotency_key = hold.idempotency_key

    metadata = {
        "user_id": str(user.id),
        "intake_id": str(intake.id) if intake else "",
        "hold_id": str(hold.id),
    }

    try:
        if hold.payment_mode == AuthorizationHold.PaymentMode.SETUP_ONLY:
            intent = stripe.SetupIntent.create(
                customer=customer.stripe_customer_id,
                usage="off_session",
                metadata=metadata,
                idempotency_key=idempotency_key,
            )
            hold.stripe_setup_intent_id = intent.id
        else:
            intent = stripe.PaymentIntent.create(
                amount=hold.amount_cents,
                currency="usd",
                customer=customer.stripe_customer_id,
                capture_method="manual",
                setup_future_usage="off_session",
                metadata=metadata,
                idempotency_key=idempotency_key,
            )
            hold.stripe_payment_intent_id = intent.id
    except stripe.error.StripeError as exc:
        logger.error("Stripe intent create failed: %s", type(exc).__name__)
        transition_hold(hold, AuthorizationHold.Status.FAILED, status_reason="stripe_api_error")
        raise StripeApiUnavailable("Unable to reach Stripe.") from exc

    transition_hold(hold, AuthorizationHold.Status.PROCESSING)
    return hold


def transition_hold(
    hold: AuthorizationHold, new_status: str, **fields
) -> AuthorizationHold:
    current = AuthorizationHold.Status(hold.status)
    target = AuthorizationHold.Status(new_status)
    if target == current:
        return hold
    allowed = AuthorizationHold.ALLOWED_TRANSITIONS.get(current, set())
    if target not in allowed:
        logger.warning(
            "Illegal hold transition attempted: %s -> %s (hold=%s)",
            current,
            target,
            hold.id,
        )
        raise IllegalStateTransition(f"Cannot move hold from {current} to {target}.")

    hold.status = target
    for key, value in fields.items():
        setattr(hold, key, value)
    if target == AuthorizationHold.Status.HELD and not hold.held_at:
        hold.held_at = timezone.now()
        hold.expires_at = hold.held_at + timezone.timedelta(days=HOLD_EXPIRY_DAYS)
    if target == AuthorizationHold.Status.CAPTURED and not hold.captured_at:
        hold.captured_at = timezone.now()
    if target == AuthorizationHold.Status.CANCELED and not hold.canceled_at:
        hold.canceled_at = timezone.now()
    hold.save()
    return hold


def save_payment_method_from_intent(user: User, payment_method_id: str, setup_intent_id: str = "") -> StripePaymentMethod:
    try:
        pm = stripe.PaymentMethod.retrieve(payment_method_id)
    except stripe.error.StripeError as exc:
        logger.error("Stripe payment method retrieve failed: %s", type(exc).__name__)
        raise StripeApiUnavailable("Unable to reach Stripe.") from exc

    card = pm.card or {}
    StripePaymentMethod.objects.filter(user=user).update(is_default=False)
    return StripePaymentMethod.objects.create(
        user=user,
        stripe_payment_method_id=pm.id,
        card_brand=card.get("brand", ""),
        card_last4=card.get("last4", ""),
        card_exp_month=card.get("exp_month"),
        card_exp_year=card.get("exp_year"),
        is_default=True,
        stripe_setup_intent_id=setup_intent_id,
    )


def capture_hold(hold: AuthorizationHold, amount_to_capture_cents: int | None = None) -> AuthorizationHold:
    if hold.status != AuthorizationHold.Status.HELD:
        raise IllegalStateTransition(
            f"Cannot capture a hold in status {hold.status}."
        )
    amount = amount_to_capture_cents or hold.amount_cents
    if amount > hold.amount_cents:
        raise ValueError(
            "Cannot capture more than the authorized amount; cancel and create a new PaymentIntent instead."
        )
    try:
        stripe.PaymentIntent.capture(
            hold.stripe_payment_intent_id,
            amount_to_capture=amount,
            idempotency_key=f"cap-{hold.id}",
        )
    except stripe.error.StripeError as exc:
        logger.error("Stripe capture failed: %s", type(exc).__name__)
        raise StripeApiUnavailable("Unable to reach Stripe.") from exc
    return transition_hold(
        hold, AuthorizationHold.Status.CAPTURED, captured_amount_cents=amount
    )


def cancel_hold(hold: AuthorizationHold, reason: str) -> AuthorizationHold:
    if hold.status in (
        AuthorizationHold.Status.CAPTURED,
        AuthorizationHold.Status.CANCELED,
        AuthorizationHold.Status.EXPIRED,
    ):
        return hold
    pi_id = hold.stripe_payment_intent_id
    if pi_id:
        stripe_reason = "abandoned" if reason == "abandoned" else "requested_by_customer"
        try:
            stripe.PaymentIntent.cancel(pi_id, cancellation_reason=stripe_reason)
        except stripe.error.StripeError as exc:
            logger.error("Stripe cancel failed: %s", type(exc).__name__)
            raise StripeApiUnavailable("Unable to reach Stripe.") from exc
    return transition_hold(
        hold, AuthorizationHold.Status.CANCELED, status_reason=reason
    )


def _hold_from_metadata(stripe_object) -> AuthorizationHold | None:
    """Look up the hold by the opaque hold_id in Stripe metadata.

    stripe_payment_intent_id/stripe_setup_intent_id are EncryptedCharField —
    django-fernet-fields disables all query lookups on encrypted columns
    (ciphertext is non-deterministic), so we can't filter by Stripe object id
    directly. hold_id is our own UUID primary key, set at intent-creation time
    and round-tripped unmodified by Stripe (webhook payloads are signature
    verified before this is ever called), so it's a safe, queryable handle.
    """
    metadata = getattr(stripe_object, "metadata", None) or {}
    hold_id = metadata.get("hold_id")
    if not hold_id:
        logger.warning("Stripe webhook object missing hold_id metadata.")
        return None
    try:
        return AuthorizationHold.objects.get(id=hold_id)
    except AuthorizationHold.DoesNotExist:
        logger.warning("Stripe webhook referenced unknown hold_id=%s", hold_id)
        return None


def _safe_transition(hold: AuthorizationHold, target: str, **fields) -> None:
    try:
        transition_hold(hold, target, **fields)
    except IllegalStateTransition:
        # Out-of-order/duplicate webhook delivery (e.g. amount_capturable_updated
        # arriving after our own capture already ran) — no-op, not an error.
        logger.info(
            "Ignored out-of-order webhook transition for hold=%s -> %s",
            hold.id,
            target,
        )


def apply_stripe_webhook(event: "stripe.Event") -> dict:
    """Idempotent-by-caller: dedupe on stripe_event_id happens in the view
    before this is invoked."""
    event_type = event["type"]
    obj = event["data"]["object"]

    if event_type == "payment_intent.amount_capturable_updated":
        hold = _hold_from_metadata(obj)
        if hold is None:
            return {"handled": False}
        _safe_transition(hold, AuthorizationHold.Status.HELD)
        payment_method_id = obj.get("payment_method")
        if payment_method_id:
            save_payment_method_from_intent(hold.user, payment_method_id)
        return {"handled": True}

    if event_type in ("payment_intent.canceled", "charge.expired"):
        hold = _hold_from_metadata(obj)
        if hold is None:
            return {"handled": False}
        cancellation_reason = obj.get("cancellation_reason")
        if cancellation_reason == "expired" or event_type == "charge.expired":
            _safe_transition(
                hold, AuthorizationHold.Status.EXPIRED, status_reason="expired"
            )
        else:
            _safe_transition(
                hold,
                AuthorizationHold.Status.CANCELED,
                status_reason=cancellation_reason or "canceled",
            )
        return {"handled": True}

    if event_type == "payment_intent.payment_failed":
        hold = _hold_from_metadata(obj)
        if hold is None:
            return {"handled": False}
        last_error = obj.get("last_payment_error") or {}
        _safe_transition(
            hold,
            AuthorizationHold.Status.FAILED,
            status_reason=last_error.get("code", "declined"),
        )
        return {"handled": True}

    if event_type == "setup_intent.succeeded":
        hold = _hold_from_metadata(obj)
        if hold is None:
            return {"handled": False}
        _safe_transition(hold, AuthorizationHold.Status.HELD)
        payment_method_id = obj.get("payment_method")
        if payment_method_id:
            save_payment_method_from_intent(
                hold.user, payment_method_id, setup_intent_id=obj.get("id", "")
            )
        return {"handled": True}

    if event_type == "charge.dispute.created":
        logger.warning("[STRIPE DISPUTE] charge=%s amount=%s", obj.get("charge"), obj.get("amount"))
        return {"handled": True}

    if event_type == "customer.deleted":
        logger.warning("[STRIPE] customer.deleted id=%s", obj.get("id"))
        return {"handled": True}

    return {"handled": False}
