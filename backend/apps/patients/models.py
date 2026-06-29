import uuid

from django.conf import settings
from django.db import models
from fernet_fields import EncryptedCharField

from apps.accounts.models import User


class PatientProfile(models.Model):
    SEX_CHOICES = [
        ("female", "Female"),
        ("male", "Male"),
        ("intersex", "Intersex"),
        ("unknown", "Unknown"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    sex_assigned_at_birth = models.CharField(
        max_length=16, choices=SEX_CHOICES, blank=True, default=""
    )
    gender_identity = models.CharField(
        max_length=16, choices=SEX_CHOICES, blank=True, default=""
    )
    preferred_name = models.CharField(max_length=128, blank=True, default="")
    address = EncryptedCharField(max_length=255, blank=True)
    city = models.CharField(max_length=128, blank=True)
    county = models.CharField(max_length=128, blank=True)
    zip_code = models.CharField(max_length=16, blank=True)
    emergency_contact_name = EncryptedCharField(max_length=255, blank=True)
    emergency_contact_phone = EncryptedCharField(max_length=32, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patient_profiles"

    def __str__(self):
        return f"Profile for {self.user.email}"


class PatientSettings(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="patient_settings"
    )
    email_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=True)
    product_emails = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    # Per-category notification toggles (which events notify; channels above decide how).
    notify_messages = models.BooleanField(default=True)
    notify_review = models.BooleanField(default=True)
    notify_prescription = models.BooleanField(default=True)
    notify_shipping = models.BooleanField(default=True)
    notify_labs = models.BooleanField(default=True)
    notify_appointments = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patient_settings"

    def __str__(self):
        return f"Settings for {self.user.email}"


class PatientCareEvent(models.Model):
    """Persisted patient-visible care milestones (fulfillment, shipping, etc.)."""

    SOURCE_CHOICES = [
        ("beluga_webhook", "Beluga webhook"),
        ("pharmacy_webhook", "Pharmacy webhook"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="care_events"
    )
    milestone = models.CharField(max_length=64, db_index=True)
    source = models.CharField(max_length=32, choices=SOURCE_CHOICES)
    source_event = models.CharField(max_length=64, blank=True, default="")
    title = models.CharField(max_length=128)
    description = models.TextField(blank=True, default="")
    occurred_at = models.DateTimeField()
    metadata = models.JSONField(default=dict, blank=True)
    idempotency_key = models.CharField(
        max_length=255, blank=True, null=True, unique=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "patient_care_events"
        ordering = ["occurred_at", "created_at"]
        indexes = [
            models.Index(fields=["user", "milestone"]),
            models.Index(fields=["user", "occurred_at"]),
        ]

    def __str__(self):
        return f"{self.milestone} for {self.user_id}"
