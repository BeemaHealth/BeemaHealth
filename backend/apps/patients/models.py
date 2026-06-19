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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patient_settings"

    def __str__(self):
        return f"Settings for {self.user.email}"
