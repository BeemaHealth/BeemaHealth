import uuid

from django.db import models
from django.utils import timezone

from apps.accounts.models import User


class PatientPrescription(models.Model):
    ROUTE_CHOICES = [
        ("injection", "Injection"),
        ("oral", "Oral"),
        ("other", "Other"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="prescriptions"
    )
    medication_name = models.CharField(max_length=128)
    dosage = models.CharField(max_length=64)
    frequency = models.CharField(max_length=128)
    route = models.CharField(
        max_length=16, choices=ROUTE_CHOICES, blank=True, default=""
    )
    instructions = models.TextField(blank=True, default="")
    pharmacy_name = models.CharField(max_length=128, blank=True, default="")
    is_active = models.BooleanField(default=True)
    prescribed_at = models.DateTimeField(default=timezone.now)
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
        ]

    def __str__(self):
        return f"{self.medication_name} for {self.user.email}"
