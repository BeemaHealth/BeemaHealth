"""Integration models: raw inbound vendor events and outbound call logs."""
from django.db import models

from apps.common.models import BaseModel


class InboundEvent(BaseModel):
    """A vendor webhook, persisted verbatim before any processing (dead letter queue included)."""

    VENDOR_CHOICES = [("beluga", "Beluga"), ("lifefile", "LifeFile"), ("stripe", "Stripe")]
    STATUS_CHOICES = [
        ("received", "Received"),
        ("processed", "Processed"),
        ("failed", "Failed"),
        ("dead", "Dead letter"),
        ("ignored", "Ignored"),
    ]

    vendor = models.CharField(max_length=20, choices=VENDOR_CHOICES, db_index=True)
    dedupe_key = models.CharField(max_length=64, unique=True)
    event_type = models.CharField(max_length=100, blank=True, db_index=True)
    external_ref = models.CharField(max_length=255, blank=True, db_index=True, help_text="masterId or orderId")
    raw_payload = models.JSONField(default=dict, blank=True, help_text="May contain PHI. Superusers only.")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="received", db_index=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    last_error = models.CharField(max_length=500, blank=True)
    received_at = models.DateTimeField(auto_now_add=True, db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    next_attempt_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-received_at"]
        indexes = [models.Index(fields=["status", "next_attempt_at"])]

    def __str__(self) -> str:
        return f"{self.vendor}:{self.event_type or 'unknown'}:{self.id}"


class OutboundCall(BaseModel):
    """One logical call to a vendor API (all retry attempts folded into one row). Redacted."""

    VENDOR_CHOICES = InboundEvent.VENDOR_CHOICES

    vendor = models.CharField(max_length=20, choices=VENDOR_CHOICES, db_index=True)
    endpoint_name = models.CharField(max_length=100, db_index=True)
    treatment = models.ForeignKey(
        "clinical.Treatment", null=True, blank=True, on_delete=models.SET_NULL, related_name="outbound_calls"
    )
    request_summary = models.JSONField(default=dict, blank=True, help_text="Redacted. Never contains PHI.")
    status_code = models.PositiveSmallIntegerField(null=True, blank=True)
    ok = models.BooleanField(default=False, db_index=True)
    attempts = models.PositiveSmallIntegerField(default=1)
    error = models.CharField(max_length=500, blank=True)
    duration_ms = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.vendor}:{self.endpoint_name}:{self.id}"
