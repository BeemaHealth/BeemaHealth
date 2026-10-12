"""Pricing and coupon engine. `quote` reads the database and never writes.

Order of operations:
1. Base price from the plan's current `PlanPrice`.
2. `PriceOverride` replaces the base price (patient specific beats global).
3. Coupons: percent before fixed, then `stack_order`; a non stackable coupon excludes all others.
4. Floor at zero.
5. Store credit last, always leaving a minimum card charge (Bask parity).
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Iterable, Sequence

from django.db.models import Sum
from django.db.models.functions import Lower
from django.utils import timezone

from .exceptions import PricingError
from .models import Coupon, CouponRedemption, Invoice, StoreCreditEntry

MIN_CARD_CHARGE_CENTS = 100  # when store credit is used the card is still charged at least $1.00

# Structured rejection reasons (stable strings the frontend can switch on).
UNKNOWN_CODE = "unknown_code"
INACTIVE = "inactive"
NOT_STARTED = "not_started"
EXPIRED = "expired"
PATIENT_NOT_ALLOWED = "patient_not_allowed"
PRODUCT_NOT_ELIGIBLE = "product_not_eligible"
TERM_NOT_ELIGIBLE = "term_not_eligible"
STARTER_PACK_EXCLUDED = "starter_pack_excluded"
FIRST_ORDER_ONLY = "first_order_only"
GLOBAL_CAP_REACHED = "global_cap_reached"
PER_PATIENT_CAP_REACHED = "per_patient_cap_reached"
NOT_STACKABLE = "not_stackable"
PLAN_EXCLUDES_COUPONS = "plan_excludes_coupons"
NO_STACK_WITH_TERM_DISCOUNT = "no_stack_with_term_discount"
NOTHING_TO_DISCOUNT = "nothing_to_discount"

REJECTION_MESSAGES = {
    UNKNOWN_CODE: "That code is not valid.",
    INACTIVE: "That code is no longer active.",
    NOT_STARTED: "That code is not active yet.",
    EXPIRED: "That code has expired.",
    PATIENT_NOT_ALLOWED: "That code is not available for this account.",
    PRODUCT_NOT_ELIGIBLE: "That code does not apply to this product.",
    TERM_NOT_ELIGIBLE: "That code does not apply to this plan length.",
    STARTER_PACK_EXCLUDED: "That code does not apply to the starter pack.",
    FIRST_ORDER_ONLY: "That code is only valid on a first order.",
    GLOBAL_CAP_REACHED: "That code has reached its redemption limit.",
    PER_PATIENT_CAP_REACHED: "That code has already been used.",
    NOT_STACKABLE: "That code cannot be combined with another code.",
    PLAN_EXCLUDES_COUPONS: "Codes cannot be used on this plan.",
    NO_STACK_WITH_TERM_DISCOUNT: "Codes cannot be combined with this plan's discount.",
    NOTHING_TO_DISCOUNT: "There is nothing left to discount.",
}


@dataclass(frozen=True)
class AppliedCoupon:
    code: str
    coupon_id: str
    kind: str
    amount_cents: int


@dataclass(frozen=True)
class RejectedCoupon:
    code: str
    reason: str
    message: str


@dataclass(frozen=True)
class Quote:
    currency: str
    base_price_cents: int
    price_override_cents: int | None
    subtotal_cents: int
    discount_cents: int
    credit_cents: int
    total_cents: int
    applied_coupons: tuple[AppliedCoupon, ...] = ()
    rejected_coupons: tuple[RejectedCoupon, ...] = ()
    store_credit_balance_cents: int = 0
    plan_id: str | None = None

    def as_dict(self) -> dict:
        return asdict(self)


@dataclass(frozen=True)
class PriceContext:
    """The facts about the thing being priced that coupon rules look at."""

    product_id: object | None
    term_months: int | None
    is_starter_pack: bool = False
    allows_coupons: bool = True
    stackable_with_term_discount: bool = True


def context_for_plan(plan) -> PriceContext:
    return PriceContext(
        product_id=plan.product_id,
        term_months=plan.term_months,
        is_starter_pack=plan.kind == "starter_pack",
        allows_coupons=plan.allows_coupons,
        stackable_with_term_discount=plan.stackable_with_term_discount,
    )


def percent_of(amount_cents: int, percent: int) -> int:
    """Percent of an amount in whole cents, rounding half up."""
    return (amount_cents * percent + 50) // 100


def store_credit_balance(patient) -> int:
    total = StoreCreditEntry.objects.filter(patient=patient).aggregate(s=Sum("delta_cents"))["s"]
    return int(total or 0)


def base_price_cents(plan, at: datetime) -> int:
    """Current list price in cents from the catalog."""
    from apps.catalog import services as catalog_services
    from apps.catalog.models import PlanPrice

    try:
        return int(catalog_services.current_price(plan, at))
    except PlanPrice.DoesNotExist as exc:
        raise PricingError(f"Plan {plan.pk} has no current price.", code="no_price") from exc


def override_price_cents(patient, plan, at: datetime) -> int | None:
    """Active override for this plan: patient specific first, then global, newest first."""
    from apps.catalog.models import PriceOverride

    live = PriceOverride.objects.filter(plan=plan, is_active=True)
    live = [o for o in live.order_by("-created_at") if o.expires_at is None or o.expires_at > at]
    for override in live:
        if override.patient_id == patient.pk:
            return override.amount_cents
    for override in live:
        if override.patient_id is None:
            return override.amount_cents
    return None


def _has_prior_order(patient) -> bool:
    return Invoice.objects.filter(patient=patient, paid_at__isnull=False).exists()


def _eligibility_failure(coupon: Coupon, patient, ctx: PriceContext, at: datetime) -> str | None:
    if not ctx.allows_coupons:
        return PLAN_EXCLUDES_COUPONS
    if not ctx.stackable_with_term_discount and ctx.term_months not in (None, 1):
        return NO_STACK_WITH_TERM_DISCOUNT
    if not coupon.is_active:
        return INACTIVE
    if coupon.starts_at and at < coupon.starts_at:
        return NOT_STARTED
    if coupon.ends_at and at >= coupon.ends_at:
        return EXPIRED
    if coupon.patients.exists() and not coupon.patients.filter(pk=patient.pk).exists():
        return PATIENT_NOT_ALLOWED
    if coupon.products.exists() and not coupon.products.filter(pk=ctx.product_id).exists():
        return PRODUCT_NOT_ELIGIBLE
    if coupon.excludes_starter_pack and ctx.is_starter_pack:
        return STARTER_PACK_EXCLUDED
    if coupon.eligible_term_months and ctx.term_months not in coupon.eligible_term_months:
        return TERM_NOT_ELIGIBLE
    if coupon.first_order_only and _has_prior_order(patient):
        return FIRST_ORDER_ONLY
    live = CouponRedemption.objects.filter(coupon=coupon, released_at__isnull=True)
    if coupon.global_cap is not None and live.count() >= coupon.global_cap:
        return GLOBAL_CAP_REACHED
    if coupon.per_patient_cap is not None and live.filter(patient=patient).count() >= coupon.per_patient_cap:
        return PER_PATIENT_CAP_REACHED
    return None


def _sort_key(coupon: Coupon) -> tuple:
    return (0 if coupon.kind == Coupon.Kind.PERCENT else 1, coupon.stack_order, coupon.code.lower())


def _reject(code: str, reason: str) -> RejectedCoupon:
    return RejectedCoupon(code=code, reason=reason, message=REJECTION_MESSAGES[reason])


def price_cart(
    patient,
    *,
    base_cents: int,
    override_cents: int | None,
    ctx: PriceContext,
    coupon_codes: Sequence[str] = (),
    use_store_credit: bool = False,
    at: datetime | None = None,
    plan_id: str | None = None,
) -> Quote:
    """Run the full engine over an already resolved base price."""
    at = at or timezone.now()
    subtotal = override_cents if override_cents is not None else base_cents

    seen: set[str] = set()
    submitted: list[str] = []
    for raw in coupon_codes:
        code = (raw or "").strip()
        if code and code.lower() not in seen:
            seen.add(code.lower())
            submitted.append(code)

    found = {c.code.lower(): c for c in Coupon.objects.annotate(code_lower=Lower("code")).filter(code_lower__in=seen)}
    rejected: list[RejectedCoupon] = []
    candidates: list[tuple[str, Coupon]] = []
    for code in submitted:
        coupon = found.get(code.lower())
        if coupon is None:
            rejected.append(_reject(code, UNKNOWN_CODE))
            continue
        failure = _eligibility_failure(coupon, patient, ctx, at)
        if failure:
            rejected.append(_reject(code, failure))
        else:
            candidates.append((code, coupon))

    applied: list[AppliedCoupon] = []
    applied_coupons: list[Coupon] = []
    running = subtotal
    for code, coupon in sorted(candidates, key=lambda pair: _sort_key(pair[1])):
        if applied_coupons and not (coupon.stackable and all(c.stackable for c in applied_coupons)):
            rejected.append(_reject(code, NOT_STACKABLE))
            continue
        if running <= 0:
            rejected.append(_reject(code, NOTHING_TO_DISCOUNT))
            continue
        raw_discount = percent_of(running, coupon.value) if coupon.kind == Coupon.Kind.PERCENT else coupon.value
        discount = min(raw_discount, running)
        running -= discount
        applied_coupons.append(coupon)
        applied.append(AppliedCoupon(code=coupon.code, coupon_id=str(coupon.pk), kind=coupon.kind, amount_cents=discount))

    balance = store_credit_balance(patient)
    credit = 0
    if use_store_credit and balance > 0 and running > MIN_CARD_CHARGE_CENTS:
        credit = min(balance, running - MIN_CARD_CHARGE_CENTS)

    return Quote(
        currency="usd",
        base_price_cents=base_cents,
        price_override_cents=override_cents,
        subtotal_cents=subtotal,
        discount_cents=subtotal - running,
        credit_cents=credit,
        total_cents=running - credit,
        applied_coupons=tuple(applied),
        rejected_coupons=tuple(rejected),
        store_credit_balance_cents=balance,
        plan_id=plan_id,
    )


def quote(
    patient,
    plan,
    coupon_codes: Iterable[str] = (),
    use_store_credit: bool = False,
    at: datetime | None = None,
) -> Quote:
    """Price a plan for a patient. No database writes; invalid coupons come back as reasons."""
    at = at or timezone.now()
    return price_cart(
        patient,
        base_cents=base_price_cents(plan, at),
        override_cents=override_price_cents(patient, plan, at),
        ctx=context_for_plan(plan),
        coupon_codes=tuple(coupon_codes),
        use_store_credit=use_store_credit,
        at=at,
        plan_id=str(plan.pk),
    )


def quote_amount(
    patient,
    amount_cents: int,
    *,
    product=None,
    coupon_codes: Iterable[str] = (),
    use_store_credit: bool = False,
    at: datetime | None = None,
) -> Quote:
    """Price a one-time item. Term restricted coupons never match (there is no term)."""
    if amount_cents < 0:
        raise PricingError("Amount must not be negative.", code="negative_amount")
    return price_cart(
        patient,
        base_cents=amount_cents,
        override_cents=None,
        ctx=PriceContext(product_id=getattr(product, "pk", None), term_months=None),
        coupon_codes=tuple(coupon_codes),
        use_store_credit=use_store_credit,
        at=at,
    )
