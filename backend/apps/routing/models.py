"""Routing models: which network and pharmacy handle a treatment, and why."""
from __future__ import annotations

from django.db import models

from apps.common.models import BaseModel


class RoutingRule(BaseModel):
    """Filters plus a destination. The most specific matching rule wins (see engine)."""

    class StatesMode(models.TextChoices):
        ALL = "all", "All states"
        ONLY = "only", "Only these states"
        EXCEPT = "except", "All except these states"

    class FillType(models.TextChoices):
        INITIAL = "initial", "Initial"
        REFILL = "refill", "Refill"
        ANY = "any", "Any"

    name = models.CharField(max_length=200)
    priority = models.PositiveIntegerField(default=100, help_text="Lower number wins ties.")
    is_active = models.BooleanField(default=True, db_index=True)
    product = models.ForeignKey(
        "catalog.Product", on_delete=models.CASCADE, null=True, blank=True, related_name="routing_rules",
        help_text="Blank matches every product.",
    )
    states_mode = models.CharField(max_length=10, choices=StatesMode.choices, default=StatesMode.ALL)
    states = models.JSONField(default=list, blank=True, help_text="Two letter codes, used by only and except.")
    fill_type = models.CharField(max_length=10, choices=FillType.choices, default=FillType.ANY)
    term_months = models.JSONField(default=list, blank=True, help_text="Plan terms this rule covers. Empty means any.")
    network = models.ForeignKey("accounts.Organization", on_delete=models.PROTECT, related_name="routing_rules")
    pharmacy = models.ForeignKey(
        "accounts.Organization", on_delete=models.PROTECT, null=True, blank=True, related_name="pharmacy_routing_rules"
    )
    dose_min_mg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    dose_max_mg = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    orders_per_day_threshold = models.PositiveIntegerField(
        null=True, blank=True, help_text="Stop using this rule after this many routed orders today."
    )
    route_errors_only = models.BooleanField(default=False, help_text="Only use after the primary route failed.")
    refill_only = models.BooleanField(default=False)

    class Meta(BaseModel.Meta):
        ordering = ["priority", "name"]

    def __str__(self) -> str:
        return f"RoutingRule {self.name}"

    def save(self, *args, **kwargs) -> None:
        """Normalize state codes so matching is case insensitive."""
        self.states = sorted({str(s).strip().upper() for s in (self.states or []) if str(s).strip()})
        super().save(*args, **kwargs)


class RoutingDecision(BaseModel):
    """The outcome of routing a treatment. Inputs hold a non PHI summary only."""

    class Result(models.TextChoices):
        ROUTED = "routed", "Routed"
        FLAGGED = "flagged", "Flagged for review"

    treatment = models.ForeignKey("clinical.Treatment", on_delete=models.CASCADE, related_name="routing_decisions")
    rule = models.ForeignKey(RoutingRule, on_delete=models.SET_NULL, null=True, blank=True, related_name="decisions")
    replacement_rule = models.ForeignKey(
        "routing.ReplacementRule", on_delete=models.SET_NULL, null=True, blank=True, related_name="decisions"
    )
    result = models.CharField(max_length=10, choices=Result.choices, db_index=True)
    inputs = models.JSONField(default=dict, blank=True)
    flag_reason = models.CharField(max_length=100, blank=True)
    resolved_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    resolved_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"RoutingDecision {self.id} ({self.result})"


class OpenFlagManager(models.Manager):
    """Flagged decisions nobody has resolved yet."""

    def get_queryset(self) -> models.QuerySet:
        return super().get_queryset().filter(result="flagged", resolved_at__isnull=True)


class RoutingReviewItem(RoutingDecision):
    """Proxy used for the staff queue: flagged decisions nobody has resolved yet."""

    objects = OpenFlagManager()

    class Meta:
        proxy = True
        verbose_name = "routing review item"
        verbose_name_plural = "routing review queue"


class ReplacementRule(BaseModel):
    """Redirect a source variant at a source pharmacy to an equivalent variant at another pharmacy."""

    source_variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.CASCADE, related_name="+")
    source_pharmacy = models.ForeignKey("accounts.Organization", on_delete=models.CASCADE, related_name="+")
    target_variant = models.ForeignKey("catalog.ProductVariant", on_delete=models.CASCADE, related_name="+")
    target_pharmacy = models.ForeignKey("accounts.Organization", on_delete=models.CASCADE, related_name="+")
    is_active = models.BooleanField(default=True)
    route_errors_only = models.BooleanField(default=False)
    refill_only = models.BooleanField(default=False)
    orders_per_day_threshold = models.PositiveIntegerField(null=True, blank=True)

    def __str__(self) -> str:
        return f"ReplacementRule {self.id}"
