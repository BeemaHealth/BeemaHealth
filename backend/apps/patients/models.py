from __future__ import annotations

from typing import Any

from django.db import models
from django.utils import timezone

from apps.common.crypto import EncryptedTextField
from apps.common.models import BaseModel


class PatientProfile(BaseModel):
    """Clinical and demographic profile attached to a patient user."""

    class SexAtBirth(models.TextChoices):
        FEMALE = "female", "Female"
        MALE = "male", "Male"

    user = models.OneToOneField("accounts.User", on_delete=models.CASCADE, related_name="patient_profile")
    date_of_birth = models.DateField(null=True, blank=True)
    sex_at_birth = models.CharField(max_length=10, choices=SexAtBirth.choices, blank=True)
    gender_identity = models.CharField(max_length=50, blank=True)
    height_inches = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    starting_weight_lbs = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    goal_weight_lbs = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    preferred_pharmacy_note = EncryptedTextField(blank=True, default="")
    affiliate_ref = models.CharField(max_length=100, blank=True, help_text="Non-PHI affiliate id.")
    acquisition = models.JSONField(default=dict, blank=True, help_text="UTM data only, never PHI.")
    ineligible_notes = EncryptedTextField(blank=True, default="")

    def __str__(self) -> str:
        return f"PatientProfile {self.id}"


class Address(BaseModel):
    class Kind(models.TextChoices):
        HOME = "home", "Home"
        SHIPPING = "shipping", "Shipping"
        BILLING = "billing", "Billing"

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="addresses")
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.SHIPPING)
    line1 = models.CharField(max_length=200)
    line2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=10)
    is_default = models.BooleanField(default=False)
    validated_at = models.DateTimeField(null=True, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name_plural = "addresses"

    def __str__(self) -> str:
        return f"Address {self.id} ({self.kind})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        """Keep a single default address per patient and kind."""
        self.state = self.state.upper()
        super().save(*args, **kwargs)
        if self.is_default:
            Address.objects.filter(patient_id=self.patient_id, kind=self.kind, is_default=True).exclude(pk=self.pk).update(
                is_default=False
            )


class EmergencyContact(BaseModel):
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="emergency_contacts")
    name = models.CharField(max_length=200)
    relationship = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=16)

    def __str__(self) -> str:
        return f"EmergencyContact {self.id}"


class Allergy(BaseModel):
    class Severity(models.TextChoices):
        MILD = "mild", "Mild"
        MODERATE = "moderate", "Moderate"
        SEVERE = "severe", "Severe"

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="allergies")
    name = models.CharField(max_length=200)
    reaction = EncryptedTextField(blank=True, default="")
    severity = models.CharField(max_length=10, choices=Severity.choices, blank=True)

    class Meta(BaseModel.Meta):
        verbose_name_plural = "allergies"

    def __str__(self) -> str:
        return f"Allergy {self.id}"


class PatientMedication(BaseModel):
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="medications")
    name = models.CharField(max_length=200)
    dose = models.CharField(max_length=100, blank=True)
    frequency = models.CharField(max_length=100, blank=True)
    is_current = models.BooleanField(default=True)

    def __str__(self) -> str:
        return f"PatientMedication {self.id}"


class MedicalCondition(BaseModel):
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="conditions")
    name = models.CharField(max_length=200)
    notes = EncryptedTextField(blank=True, default="")
    diagnosed_on = models.DateField(null=True, blank=True)

    def __str__(self) -> str:
        return f"MedicalCondition {self.id}"


class IdentityDocument(BaseModel):
    class Kind(models.TextChoices):
        DRIVERS_LICENSE = "drivers_license", "Driver's license"
        STATE_ID = "state_id", "State ID"
        PASSPORT = "passport", "Passport"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="identity_documents")
    s3_key = models.CharField(max_length=512)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.DRIVERS_LICENSE)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    verified_by = models.ForeignKey(
        "accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    verified_at = models.DateTimeField(null=True, blank=True)

    def __str__(self) -> str:
        return f"IdentityDocument {self.id} ({self.status})"


class ImmutableError(Exception):
    """Raised when code tries to change or delete a record that must never change."""


class ConsentQuerySet(models.QuerySet["ConsentRecord"]):
    def update(self, **kwargs: Any) -> int:
        raise ImmutableError("Consent records cannot be updated.")

    def delete(self) -> tuple[int, dict[str, int]]:
        raise ImmutableError("Consent records cannot be deleted.")


class ConsentRecord(BaseModel):
    """Immutable record that a patient accepted a specific document version."""

    class Kind(models.TextChoices):
        TERMS = "terms", "Terms"
        PRIVACY = "privacy", "Privacy"
        HIPAA_NOTICE = "hipaa_notice", "HIPAA notice"
        TELEHEALTH = "telehealth", "Telehealth"
        WEIGHT_LOSS = "weight_loss", "Weight loss"
        GLP1 = "glp1", "GLP-1"
        TRUTHFULNESS = "truthfulness", "Truthfulness"
        PREGNANCY = "pregnancy", "Pregnancy"
        GALLBLADDER = "gallbladder", "Gallbladder"
        NO_CANCEL_AFTER_SUBMIT = "no_cancel_after_submit", "No cancel after submit"
        AUTO_RENEW = "auto_renew", "Auto renew"

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="consents")
    kind = models.CharField(max_length=30, choices=Kind.choices)
    version = models.CharField(max_length=32)
    accepted_at = models.DateTimeField(default=timezone.now)
    ip = models.GenericIPAddressField(null=True, blank=True)
    user_agent_hash = models.CharField(max_length=64, blank=True)

    objects = ConsentQuerySet.as_manager()

    def __str__(self) -> str:
        return f"ConsentRecord {self.id} ({self.kind} v{self.version})"

    def save(self, *args: Any, **kwargs: Any) -> None:
        if not self._state.adding:
            raise ImmutableError("Consent records cannot be modified.")
        super().save(*args, **kwargs)

    def delete(self, *args: Any, **kwargs: Any) -> tuple[int, dict[str, int]]:
        raise ImmutableError("Consent records cannot be deleted.")


class DataRequest(BaseModel):
    class Kind(models.TextChoices):
        EXPORT = "export", "Export"
        DELETION = "deletion", "Deletion"

    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        IN_REVIEW = "in_review", "In review"
        COMPLETED = "completed", "Completed"
        DENIED = "denied", "Denied"

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="data_requests")
    kind = models.CharField(max_length=10, choices=Kind.choices)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.REQUESTED)
    reviewed_by = models.ForeignKey("accounts.User", null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"DataRequest {self.id} ({self.kind}, {self.status})"
