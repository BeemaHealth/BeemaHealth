import uuid

from django.db import models
from django.utils import timezone
from fernet_fields import EncryptedCharField

from apps.accounts.models import User


class PatientPrescription(models.Model):
    ROUTE_CHOICES = [
        ("injection", "Injection"),
        ("oral", "Oral"),
        ("other", "Other"),
    ]
    RX_TYPE_CHOICES = [
        ("new", "New"),
        ("refill", "Refill"),
    ]
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("signed", "Signed"),
        ("sent_to_pharmacy", "Sent to pharmacy"),
        ("cancelled", "Cancelled"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="prescriptions"
    )
    provider_review = models.ForeignKey(
        "reviews.ProviderReview",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions",
    )
    medication_name = models.CharField(max_length=128)
    dosage = models.CharField(max_length=64)
    frequency = models.CharField(max_length=128)
    route = models.CharField(
        max_length=16, choices=ROUTE_CHOICES, blank=True, default=""
    )
    instructions = models.TextField(blank=True, default="")
    pharmacy_name = models.CharField(max_length=128, blank=True, default="")
    rx_type = models.CharField(
        max_length=16, choices=RX_TYPE_CHOICES, blank=True, default="new"
    )
    drug_strength = models.CharField(max_length=128, blank=True, default="")
    drug_form = models.CharField(max_length=128, blank=True, default="")
    quantity = models.CharField(max_length=45, blank=True, default="")
    quantity_units = models.CharField(max_length=45, blank=True, default="")
    refills = models.PositiveSmallIntegerField(default=0)
    days_supply = models.PositiveSmallIntegerField(null=True, blank=True)
    date_written = models.DateField(null=True, blank=True)
    effective_date = models.DateField(null=True, blank=True)
    schedule_code = models.CharField(max_length=8, blank=True, default="")
    lf_product_id = models.IntegerField(null=True, blank=True)
    rx_uuid = models.UUIDField(null=True, blank=True)
    clinical_difference_statement = models.TextField(blank=True, default="")
    prescriber_npi = EncryptedCharField(max_length=40, blank=True, default="")
    prescriber_first_name = models.CharField(max_length=30, blank=True, default="")
    prescriber_last_name = models.CharField(max_length=30, blank=True, default="")
    prescriber_license_state = models.CharField(max_length=2, blank=True, default="")
    prescriber_license_number = EncryptedCharField(max_length=50, blank=True, default="")
    prescriber_dea = EncryptedCharField(max_length=9, blank=True, default="")
    prescriber_address1 = models.CharField(max_length=60, blank=True, default="")
    prescriber_address2 = models.CharField(max_length=60, blank=True, default="")
    prescriber_city = models.CharField(max_length=100, blank=True, default="")
    prescriber_state = models.CharField(max_length=2, blank=True, default="")
    prescriber_zip = models.CharField(max_length=10, blank=True, default="")
    prescriber_phone = EncryptedCharField(max_length=16, blank=True, default="")
    prescriber_email = models.CharField(max_length=100, blank=True, default="")
    practice_id = models.IntegerField(null=True, blank=True)
    external_prescriber_id = models.CharField(max_length=128, blank=True, default="")
    fulfillment_status = models.CharField(
        max_length=32, choices=STATUS_CHOICES, default="draft"
    )
    is_active = models.BooleanField(default=True)
    prescribed_at = models.DateTimeField(default=timezone.now)
    signed_at = models.DateTimeField(null=True, blank=True)
    prescribed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="prescriptions_written",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "patient_prescriptions"
        ordering = ["-prescribed_at", "-created_at"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["user", "fulfillment_status"]),
        ]

    def __str__(self):
        return f"{self.medication_name} for {self.user.email}"

    @property
    def directions(self) -> str:
        parts = [p for p in (self.instructions.strip(), self.frequency.strip()) if p]
        return ". ".join(parts)
