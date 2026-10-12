"""Fulfillment models: pharmacy orders, shipment batches, shipments and the care event log."""
from __future__ import annotations

from django.db import models

from apps.common.models import BaseModel


class Order(BaseModel):
    """One pharmacy order for a treatment (initial fill, refill or renewal)."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUBMITTED = "submitted", "Submitted"
        IN_FULFILLMENT = "in_fulfillment", "In fulfillment"
        SHIPPED = "shipped", "Shipped"
        DELIVERED = "delivered", "Delivered"
        FAILED = "failed", "Failed"
        CANCELED = "canceled", "Canceled"

    class FillType(models.TextChoices):
        INITIAL = "initial", "Initial"
        REFILL = "refill", "Refill"
        RENEWAL = "renewal", "Renewal"

    treatment = models.ForeignKey("clinical.Treatment", on_delete=models.CASCADE, related_name="orders")
    prescription = models.ForeignKey(
        "clinical.Prescription", null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )
    subscription = models.ForeignKey(
        "billing.Subscription", null=True, blank=True, on_delete=models.SET_NULL, related_name="orders"
    )
    batch = models.ForeignKey("fulfillment.ShipmentBatch", null=True, blank=True, on_delete=models.SET_NULL, related_name="orders")
    pharmacy = models.ForeignKey("accounts.Organization", on_delete=models.PROTECT, related_name="orders")
    external_order_id = models.CharField(max_length=100, blank=True, db_index=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    fill_type = models.CharField(max_length=20, choices=FillType.choices, default=FillType.INITIAL)
    submitted_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=500, blank=True)

    class Meta(BaseModel.Meta):
        indexes = [models.Index(fields=["treatment", "status"])]

    def __str__(self) -> str:
        return f"Order {self.id} ({self.status})"


class ShipmentBatch(BaseModel):
    """A scheduled slice of a subscription's supply (3 months for prepaid terms, 1 for monthly)."""

    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        RELEASED = "released", "Released"
        SHIPPED = "shipped", "Shipped"
        SKIPPED = "skipped", "Skipped"
        REFUNDED = "refunded", "Refunded"

    subscription = models.ForeignKey("billing.Subscription", on_delete=models.CASCADE, related_name="batches")
    sequence = models.PositiveSmallIntegerField()
    month_offset = models.PositiveSmallIntegerField(default=0, help_text="Months from term start to this batch.")
    due_on = models.DateField(db_index=True)
    supply_days = models.PositiveSmallIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SCHEDULED, db_index=True)
    order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    released_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["subscription_id", "sequence"]
        constraints = [models.UniqueConstraint(fields=["subscription", "sequence"], name="uniq_batch_sequence")]
        verbose_name_plural = "shipment batches"

    def __str__(self) -> str:
        return f"Batch {self.id} #{self.sequence} ({self.status})"


class Shipment(BaseModel):
    """A physical package with carrier tracking."""

    class Status(models.TextChoices):
        SHIPPED = "shipped", "Shipped"
        IN_TRANSIT = "in_transit", "In transit"
        OUT_FOR_DELIVERY = "out_for_delivery", "Out for delivery"
        DELIVERED = "delivered", "Delivered"
        DELIVERY_FAILED = "delivery_failed", "Delivery failed"

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="shipments")
    carrier = models.CharField(max_length=64, blank=True)
    tracking_number = models.CharField(max_length=128, blank=True, db_index=True)
    tracking_url = models.URLField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SHIPPED, db_index=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_on = models.DateField(null=True, blank=True)

    def __str__(self) -> str:
        return f"Shipment {self.id} ({self.status})"


class AppendOnlyError(Exception):
    """Raised when code tries to change or remove a CareEvent."""


class CareEventQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise AppendOnlyError("CareEvent is append only")

    def delete(self):
        raise AppendOnlyError("CareEvent is append only")


class CareEvent(BaseModel):
    """Append-only timeline entry. ``payload_redacted`` never holds PHI."""

    class Source(models.TextChoices):
        BELUGA = "beluga", "Beluga"
        LIFEFILE = "lifefile", "LifeFile"
        STRIPE = "stripe", "Stripe"
        STAFF = "staff", "Staff"
        SYSTEM = "system", "System"

    treatment = models.ForeignKey("clinical.Treatment", null=True, blank=True, on_delete=models.SET_NULL, related_name="care_events")
    patient = models.ForeignKey("patients.PatientProfile", null=True, blank=True, on_delete=models.SET_NULL, related_name="care_events")
    source = models.CharField(max_length=20, choices=Source.choices, db_index=True)
    event = models.CharField(max_length=100, db_index=True)
    payload_redacted = models.JSONField(default=dict, blank=True)
    occurred_at = models.DateTimeField(db_index=True)

    objects = CareEventQuerySet.as_manager()

    class Meta:
        ordering = ["-occurred_at", "-created_at"]

    def __str__(self) -> str:
        return f"CareEvent {self.id} ({self.source}:{self.event})"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise AppendOnlyError("CareEvent is append only")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise AppendOnlyError("CareEvent is append only")
