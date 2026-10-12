"""Catalog models: products, plans, pricing, and variants."""
from decimal import Decimal

from django.db import models
from django.utils import timezone

from apps.common.models import BaseModel


class Product(BaseModel):
    """A product available for purchase: weight loss, sexual health, etc."""

    CATEGORY_CHOICES = [
        ("weight_loss", "Weight Loss"),
        ("sexual_health", "Sexual Health"),
        ("other", "Other"),
    ]

    ROUTING_MODE_CHOICES = [
        ("network_routes", "Network Routes"),
        ("beema_routes", "Beema Routes"),
    ]

    slug = models.SlugField(unique=True, db_index=True)
    name = models.CharField(max_length=255)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    is_active = models.BooleanField(default=True, db_index=True)
    questionnaire_slug = models.CharField(max_length=255, blank=True)
    routing_mode = models.CharField(max_length=50, choices=ROUTING_MODE_CHOICES, default="network_routes")
    neutral_label = models.CharField(max_length=255, help_text="Stripe-safe, no drug names")
    requires_ineligibility_check = models.BooleanField(default=False)

    class Meta:
        ordering = ["slug"]

    def __str__(self) -> str:
        return self.name


class ProductVariant(BaseModel):
    """A variant of a product (e.g., semaglutide + b12 + titration)."""

    PHASE_CHOICES = [
        ("titration", "Titration"),
        ("maintenance", "Maintenance"),
    ]

    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="variants")
    drug = models.CharField(max_length=100, db_index=True)
    additive = models.CharField(max_length=100, default="none")
    phase = models.CharField(max_length=50, choices=PHASE_CHOICES)
    strength_mg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    form = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    slug = models.SlugField(unique=True, db_index=True)

    class Meta:
        ordering = ["product", "slug"]

    def __str__(self) -> str:
        return f"{self.product.name} - {self.slug}"


class VariantMapping(BaseModel):
    """Maps a ProductVariant to vendor SKUs (Beluga medId, LifeFile lfProductID)."""

    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.CASCADE, related_name="mappings")
    organization = models.ForeignKey("accounts.Organization", on_delete=models.CASCADE)
    vendor_sku = models.CharField(max_length=255, db_index=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["variant", "organization"]
        unique_together = [["variant", "organization"]]

    def __str__(self) -> str:
        return f"{self.variant.slug} @ {self.organization.slug}"


class Plan(BaseModel):
    """A purchase plan: 1/3/6/12 month, prepaid vs recurring."""

    KIND_CHOICES = [
        ("standard", "Standard"),
        ("starter_pack", "Starter Pack"),
        ("one_time", "One Time"),
    ]

    BILLING_COMMITMENT_CHOICES = [
        ("renewing_monthly", "Renewing Monthly"),
        ("prepaid_term", "Prepaid Term"),
        ("one_time", "One Time"),
    ]

    product = models.ForeignKey("catalog.Product", on_delete=models.CASCADE, related_name="plans")
    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.SET_NULL, null=True, blank=True)
    slug = models.SlugField(unique=True, db_index=True)
    name = models.CharField(max_length=255)
    kind = models.CharField(max_length=50, choices=KIND_CHOICES, default="standard")
    term_months = models.IntegerField(null=True, blank=True, help_text="1, 3, 6, 12, or null for one-time")
    billing_commitment = models.CharField(max_length=50, choices=BILLING_COMMITMENT_CHOICES)
    bill_interval_months = models.IntegerField()
    ship_interval_months = models.IntegerField()
    supply_days_per_shipment = models.IntegerField()
    allows_coupons = models.BooleanField(default=True)
    stackable_with_term_discount = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True, db_index=True)
    renews_at_term_end_default = models.BooleanField(default=True)

    class Meta:
        ordering = ["product", "term_months", "billing_commitment"]

    def __str__(self) -> str:
        return f"{self.product.name} - {self.name}"

    def clean(self) -> None:
        """Validate plan invariants."""
        from django.core.exceptions import ValidationError

        if self.billing_commitment == "prepaid_term" and self.term_months:
            if self.bill_interval_months != self.term_months:
                raise ValidationError("bill_interval_months must equal term_months for prepaid plans")
            if self.term_months % self.ship_interval_months != 0:
                raise ValidationError("ship_interval_months must divide term_months evenly")


class PlanPrice(BaseModel):
    """Price of a plan, effective from a date range."""

    plan = models.ForeignKey("catalog.Plan", on_delete=models.CASCADE, related_name="prices")
    amount_cents = models.IntegerField(help_text="Price in cents")
    effective_from = models.DateTimeField(db_index=True)
    effective_to = models.DateTimeField(null=True, blank=True, db_index=True)
    currency = models.CharField(max_length=3, default="usd")

    class Meta:
        ordering = ["plan", "-effective_from"]
        indexes = [
            models.Index(fields=["plan", "effective_from"]),
            models.Index(fields=["plan", "-effective_from"]),
        ]

    def __str__(self) -> str:
        return f"{self.plan.slug} - {self.amount_cents / 100:.2f} ({self.currency.upper()})"


class PlanPhase(BaseModel):
    """A phase within a plan (e.g., titration steps for a 12-month tirzepatide plan)."""

    plan = models.ForeignKey("catalog.Plan", on_delete=models.CASCADE, related_name="phases")
    sequence = models.IntegerField()
    start_month = models.IntegerField(help_text="Month when this phase starts (0-indexed)")
    variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.SET_NULL, null=True, blank=True)
    dose_interval_days = models.IntegerField()

    class Meta:
        ordering = ["plan", "sequence"]
        unique_together = [["plan", "sequence"]]

    def __str__(self) -> str:
        return f"{self.plan.slug} - Phase {self.sequence}"


class PriceOverride(BaseModel):
    """A patient- or group-specific price override for a plan."""

    plan = models.ForeignKey("catalog.Plan", on_delete=models.CASCADE, related_name="overrides")
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, null=True, blank=True)
    amount_cents = models.IntegerField(help_text="Price in cents")
    reason = models.CharField(max_length=255)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["plan", "-created_at"]

    def __str__(self) -> str:
        patient_str = f" for {self.patient.user.email}" if self.patient else " (group)"
        return f"{self.plan.slug} override{patient_str}: {self.amount_cents / 100:.2f}"
