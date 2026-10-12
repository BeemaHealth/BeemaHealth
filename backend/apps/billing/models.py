"""Billing models. Money is integer cents; no PHI in any __str__."""
from __future__ import annotations

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Q
from django.db.models.functions import Lower

from apps.common.models import BaseModel


class Subscription(BaseModel):
    """A patient's plan term. Prepaid terms are billed once; monthly plans renew."""

    class Status(models.TextChoices):
        ACTIVE = "active"
        PENDING_CANCEL = "pending_cancel"
        CANCELED = "canceled"
        COMPLETED = "completed"
        PAST_DUE = "past_due"

    class Commitment(models.TextChoices):
        RENEWING_MONTHLY = "renewing_monthly"
        PREPAID_TERM = "prepaid_term"

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.PROTECT, related_name="subscriptions")
    treatment = models.ForeignKey(
        "clinical.Treatment", null=True, blank=True, on_delete=models.SET_NULL, related_name="subscriptions"
    )
    plan = models.ForeignKey("catalog.Plan", on_delete=models.PROTECT, related_name="+")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE, db_index=True)
    commitment = models.CharField(max_length=24, choices=Commitment.choices)
    term_months = models.PositiveSmallIntegerField()
    term_starts_on = models.DateField()
    term_ends_on = models.DateField()
    paid_through = models.DateField()
    next_bill_on = models.DateField(null=True, blank=True)
    next_ship_on = models.DateField(null=True, blank=True)
    batches_total = models.PositiveSmallIntegerField(default=0)
    batches_shipped = models.PositiveSmallIntegerField(default=0)
    cancel_requested = models.BooleanField(default=False)
    cancel_effective_on = models.DateField(null=True, blank=True)
    renews_at_term_end = models.BooleanField(default=False)
    stripe_customer_id = models.CharField(max_length=64, blank=True)
    stripe_subscription_id = models.CharField(max_length=64, blank=True)

    class Meta(BaseModel.Meta):
        indexes = [models.Index(fields=["status", "next_bill_on"]), models.Index(fields=["status", "term_ends_on"])]

    def __str__(self) -> str:
        return f"Subscription {self.id} ({self.status})"


class Invoice(BaseModel):
    """One charge attempt series: a checkout, a renewal period, or a one-time charge."""

    class Kind(models.TextChoices):
        SUBSCRIPTION = "subscription"
        ONE_TIME = "one_time"

    class Status(models.TextChoices):
        DRAFT = "draft"
        OPEN = "open"
        PAID = "paid"
        FAILED = "failed"
        REFUNDED = "refunded"
        PARTIALLY_REFUNDED = "partially_refunded"
        VOID = "void"

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.PROTECT, related_name="invoices")
    subscription = models.ForeignKey(Subscription, null=True, blank=True, on_delete=models.PROTECT, related_name="invoices")
    treatment = models.ForeignKey(
        "clinical.Treatment", null=True, blank=True, on_delete=models.SET_NULL, related_name="invoices"
    )
    kind = models.CharField(max_length=16, choices=Kind.choices, default=Kind.SUBSCRIPTION)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN, db_index=True)
    currency = models.CharField(max_length=3, default="usd")
    subtotal_cents = models.PositiveIntegerField(default=0)
    discount_cents = models.PositiveIntegerField(default=0)
    credit_cents = models.PositiveIntegerField(default=0)
    total_cents = models.PositiveIntegerField(default=0)
    refunded_cents = models.PositiveIntegerField(default=0, editable=False)
    stripe_payment_intent_id = models.CharField(max_length=64, blank=True)
    stripe_invoice_id = models.CharField(max_length=64, blank=True)
    stripe_customer_id = models.CharField(max_length=64, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    period_start = models.DateField(null=True, blank=True, help_text="Renewal invoices: first day of the period billed.")
    attempt_count = models.PositiveSmallIntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    failure_code = models.CharField(max_length=64, blank=True)
    auto_renew_consented = models.BooleanField(default=False)
    coupon_codes = models.JSONField(default=list, blank=True)
    disputed_at = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=["stripe_payment_intent_id"],
                condition=~Q(stripe_payment_intent_id=""),
                name="billing_invoice_unique_payment_intent",
            ),
            models.UniqueConstraint(
                fields=["subscription", "period_start"],
                condition=Q(period_start__isnull=False),
                name="billing_invoice_unique_renewal_period",
            ),
            models.CheckConstraint(
                condition=Q(refunded_cents__lte=F("total_cents")), name="billing_invoice_refund_within_paid"
            ),
        ]
        indexes = [models.Index(fields=["patient", "status"])]

    def __str__(self) -> str:
        return f"Invoice {self.id} ({self.status}, {self.total_cents} cents)"

    @property
    def net_paid_cents(self) -> int:
        """Cents kept after refunds. Zero unless the invoice was paid."""
        if self.paid_at is None:
            return 0
        return self.total_cents - self.refunded_cents


class InvoiceLine(BaseModel):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="lines")
    description_internal = models.CharField(max_length=255)
    neutral_description = models.CharField(max_length=255, help_text="Safe to show on receipts and send to Stripe.")
    amount_cents = models.IntegerField()
    plan = models.ForeignKey("catalog.Plan", null=True, blank=True, on_delete=models.PROTECT, related_name="+")
    product = models.ForeignKey("catalog.Product", null=True, blank=True, on_delete=models.PROTECT, related_name="+")

    class Meta(BaseModel.Meta):
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"InvoiceLine {self.id} ({self.amount_cents} cents)"


class AffiliateLink(BaseModel):
    slug = models.SlugField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    coupon = models.ForeignKey("billing.Coupon", null=True, blank=True, on_delete=models.SET_NULL, related_name="affiliate_links")
    payout_terms = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"Affiliate {self.slug}"


class Coupon(BaseModel):
    class Kind(models.TextChoices):
        PERCENT = "percent"
        FIXED = "fixed"

    code = models.CharField(max_length=64)
    name = models.CharField(max_length=128, blank=True)
    kind = models.CharField(max_length=8, choices=Kind.choices)
    value = models.PositiveIntegerField(help_text="Percent (1-100) or cents, by kind.")
    stackable = models.BooleanField(default=False)
    stack_order = models.PositiveSmallIntegerField(default=100)
    first_order_only = models.BooleanField(default=False)
    products = models.ManyToManyField("catalog.Product", blank=True, related_name="+")
    eligible_term_months = models.JSONField(default=list, blank=True, help_text="Empty list means any term.")
    excludes_starter_pack = models.BooleanField(default=False)
    starts_at = models.DateTimeField(null=True, blank=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    global_cap = models.PositiveIntegerField(null=True, blank=True)
    per_patient_cap = models.PositiveIntegerField(null=True, blank=True)
    patients = models.ManyToManyField("patients.PatientProfile", blank=True, related_name="+")
    is_active = models.BooleanField(default=True)
    affiliate = models.ForeignKey(AffiliateLink, null=True, blank=True, on_delete=models.SET_NULL, related_name="coupons")

    class Meta(BaseModel.Meta):
        constraints = [
            models.UniqueConstraint(Lower("code"), name="billing_coupon_code_ci_unique"),
            models.CheckConstraint(
                condition=~Q(kind="percent") | Q(value__lte=100), name="billing_coupon_percent_max_100"
            ),
        ]

    def save(self, *args, **kwargs) -> None:
        self.code = (self.code or "").strip()
        super().save(*args, **kwargs)

    def clean(self) -> None:
        if self.kind == self.Kind.PERCENT and not 0 < self.value <= 100:
            raise ValidationError({"value": "Percent coupons must be between 1 and 100."})
        if not isinstance(self.eligible_term_months, list) or not all(
            isinstance(m, int) and m > 0 for m in self.eligible_term_months
        ):
            raise ValidationError({"eligible_term_months": "Must be a list of positive integers."})

    def __str__(self) -> str:
        return f"Coupon {self.code}"


class CouponRedemption(BaseModel):
    """A coupon reserved by an invoice. Released (not deleted) when the invoice is voided."""

    coupon = models.ForeignKey(Coupon, on_delete=models.PROTECT, related_name="redemptions")
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.PROTECT, related_name="coupon_redemptions")
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="coupon_redemptions")
    amount_cents = models.PositiveIntegerField()
    released_at = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        constraints = [models.UniqueConstraint(fields=["coupon", "invoice"], name="billing_redemption_once_per_invoice")]
        indexes = [models.Index(fields=["coupon", "patient"])]

    def __str__(self) -> str:
        return f"CouponRedemption {self.id}"


class AffiliateAttribution(BaseModel):
    affiliate = models.ForeignKey(AffiliateLink, on_delete=models.PROTECT, related_name="attributions")
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="affiliate_attributions")
    first_touch_at = models.DateTimeField()
    source = models.CharField(max_length=64, blank=True)

    class Meta(BaseModel.Meta):
        constraints = [models.UniqueConstraint(fields=["patient"], name="billing_attribution_first_touch_only")]

    def __str__(self) -> str:
        return f"AffiliateAttribution {self.id}"


class StoreCreditEntry(BaseModel):
    """Append-only ledger. The balance is the sum of deltas, never a stored number."""

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.PROTECT, related_name="store_credit_entries")
    delta_cents = models.IntegerField()
    reason = models.CharField(max_length=64)
    invoice = models.ForeignKey(Invoice, null=True, blank=True, on_delete=models.PROTECT, related_name="credit_entries")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )

    class Meta(BaseModel.Meta):
        constraints = [models.CheckConstraint(condition=~Q(delta_cents=0), name="billing_credit_nonzero_delta")]

    def save(self, *args, **kwargs) -> None:
        if not self._state.adding:
            raise ValidationError("Store credit entries are append-only. Add a compensating entry instead.")
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"StoreCreditEntry {self.id} ({self.delta_cents} cents)"


class Refund(BaseModel):
    class Reason(models.TextChoices):
        NOT_PRESCRIBED = "not_prescribed"
        CANCELED_BEFORE_SUBMISSION = "canceled_before_submission"
        DOCTOR_STOPPED = "doctor_stopped"
        UNFILLABLE = "unfillable"
        BILLING_ERROR = "billing_error"
        GOODWILL = "goodwill"
        LEGAL = "legal"

    class Status(models.TextChoices):
        PENDING = "pending"
        SUCCEEDED = "succeeded"
        FAILED = "failed"

    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="refunds")
    amount_cents = models.PositiveIntegerField()
    reason = models.CharField(max_length=32, choices=Reason.choices)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    stripe_refund_id = models.CharField(max_length=64, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    scope_key = models.CharField(max_length=64, blank=True, help_text="Idempotency scope, e.g. full or batch-2.")
    note = models.CharField(max_length=255, blank=True)

    class Meta(BaseModel.Meta):
        constraints = [
            models.UniqueConstraint(
                fields=["invoice", "scope_key"], condition=~Q(scope_key=""), name="billing_refund_scope_once"
            ),
            models.UniqueConstraint(
                fields=["stripe_refund_id"], condition=~Q(stripe_refund_id=""), name="billing_refund_stripe_id_unique"
            ),
            models.CheckConstraint(condition=Q(amount_cents__gt=0), name="billing_refund_positive"),
        ]

    def __str__(self) -> str:
        return f"Refund {self.id} ({self.amount_cents} cents, {self.status})"


class VendorCost(BaseModel):
    """What Beema owes a vendor for a patient. Never refunded with the patient charge."""

    class Kind(models.TextChoices):
        VISIT = "visit"
        DRUG = "drug"
        FACILITATION = "facilitation"
        SHIPPING = "shipping"
        OTHER = "other"

    treatment = models.ForeignKey("clinical.Treatment", on_delete=models.PROTECT, related_name="vendor_costs")
    order = models.ForeignKey("fulfillment.Order", null=True, blank=True, on_delete=models.SET_NULL, related_name="vendor_costs")
    vendor = models.ForeignKey("accounts.Organization", on_delete=models.PROTECT, related_name="+")
    kind = models.CharField(max_length=16, choices=Kind.choices)
    amount_cents = models.PositiveIntegerField()
    incurred_at = models.DateTimeField()
    invoice = models.ForeignKey(
        Invoice, null=True, blank=True, on_delete=models.SET_NULL, related_name="vendor_costs",
        help_text="The patient invoice this cost offsets.",
    )
    notes = models.CharField(max_length=255, blank=True)

    def __str__(self) -> str:
        return f"VendorCost {self.id} ({self.kind}, {self.amount_cents} cents)"
