"""Billing errors. Messages carry ids and codes only, never PHI."""
from __future__ import annotations


class BillingError(Exception):
    """Base class. `code` is a stable machine readable reason."""

    code = "billing_error"

    def __init__(self, message: str = "", *, code: str | None = None) -> None:
        super().__init__(message or (code or self.code))
        if code:
            self.code = code


class CheckoutError(BillingError):
    code = "checkout_error"


class CouponRejected(CheckoutError):
    """One or more submitted coupons were rejected. `quote` has the structured reasons."""

    code = "coupon_rejected"

    def __init__(self, quote) -> None:
        super().__init__("One or more coupons were rejected.")
        self.quote = quote


class RefundError(BillingError):
    code = "refund_error"


class RefundExceedsPaid(RefundError):
    code = "refund_exceeds_paid"


class AmountMismatch(BillingError):
    code = "amount_mismatch"


class PricingError(BillingError):
    code = "pricing_error"


class StripeUnavailable(BillingError):
    """The payment processor call failed. Safe to retry with the same idempotency key."""

    code = "stripe_unavailable"
