import uuid

from django.db import models

from apps.accounts.models import User


class MedicalIntake(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("submitted", "Submitted"),
        ("under_review", "Under review"),
        ("more_info_needed", "More information needed"),
        ("approved", "Approved"),
        ("not_approved", "Not approved"),
        ("prescription_sent", "Prescription sent"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="intake")
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="draft")
    identity = models.JSONField(default=dict)
    body_metrics = models.JSONField(default=dict)
    weight_history = models.JSONField(default=dict)
    medical_conditions = models.JSONField(default=dict)
    family_history = models.JSONField(default=dict)
    medications = models.JSONField(default=dict)
    allergies = models.JSONField(default=dict)
    pregnancy = models.JSONField(default=dict)
    lifestyle = models.JSONField(default=dict)
    labs = models.JSONField(default=dict)
    medication_preferences = models.JSONField(default=dict)
    safety_acknowledgments = models.JSONField(default=dict)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medical_intakes"

    def __str__(self):
        return f"Intake for {self.user.email}"


class SafetyFlag(models.Model):
    SEVERITY_CHOICES = [
        ("low", "Low"),
        ("medium", "Medium"),
        ("high", "High"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="safety_flags")
    flag_type = models.CharField(max_length=64)
    severity = models.CharField(max_length=16, choices=SEVERITY_CHOICES)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "safety_flags"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.flag_type} ({self.severity})"
