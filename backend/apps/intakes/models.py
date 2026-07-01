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
    account_screening = models.JSONField(default=dict)
    questionnaire_responses = models.JSONField(default=dict, blank=True)
    questionnaire_version_id = models.UUIDField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    active_submission_version = models.PositiveSmallIntegerField(null=True, blank=True)
    working_version = models.PositiveSmallIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "medical_intakes"

    def __str__(self):
        return f"Intake for {self.user.email}"


class IntakeSubmission(models.Model):
    STATUS_AT_SUBMIT_CHOICES = [
        ("submitted", "Submitted"),
        ("resubmitted", "Resubmitted"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="intake_submissions"
    )
    medical_intake = models.ForeignKey(
        MedicalIntake,
        on_delete=models.CASCADE,
        related_name="submissions",
    )
    version = models.PositiveSmallIntegerField()
    status_at_submit = models.CharField(
        max_length=32, choices=STATUS_AT_SUBMIT_CHOICES, default="submitted"
    )
    snapshot = models.JSONField(default=dict)
    questionnaire_version_id = models.UUIDField(null=True, blank=True)
    submitted_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "intake_submissions"
        ordering = ["-version"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "version"], name="unique_intake_submission_version"
            )
        ]

    def __str__(self):
        return f"Intake submission v{self.version} for {self.user.email}"


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


class SideEffectCheckIn(models.Model):
    SIDE_EFFECT_CHOICES = [
        ("none", "None"),
        ("mild_nausea", "Mild nausea"),
        ("reduced_appetite", "Reduced appetite"),
        ("constipation", "Constipation"),
        ("fatigue", "Fatigue"),
        ("other", "Other"),
    ]
    TITRATION_DIRECTION_CHOICES = [
        ("increase", "Increase"),
        ("decrease", "Decrease"),
        ("same", "Stay the same"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="side_effect_check_ins"
    )
    side_effect = models.CharField(max_length=32, choices=SIDE_EFFECT_CHOICES)
    side_effect_detail = models.CharField(max_length=200, blank=True, default="")
    experienced_on = models.DateField()
    titration_direction = models.CharField(
        max_length=16, choices=TITRATION_DIRECTION_CHOICES, null=True, blank=True
    )
    weight_lbs = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    bmi = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True)
    notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "side_effect_check_ins"
        ordering = ["-experienced_on", "-created_at"]

    def __str__(self):
        return f"{self.side_effect} on {self.experienced_on}"


class RefillRequest(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("denied", "Denied"),
    ]
    REQUEST_TYPE_CHOICES = [
        ("same_dose", "Same dose"),
        ("titration", "Titration (dose change)"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="refill_requests"
    )
    side_effect_check_in = models.ForeignKey(
        SideEffectCheckIn,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="refill_requests",
    )
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="pending")
    request_type = models.CharField(
        max_length=16, choices=REQUEST_TYPE_CHOICES, default="same_dose"
    )
    titration_direction = models.CharField(max_length=16, null=True, blank=True)
    beluga_response_status = models.CharField(max_length=64, blank=True, default="not_sent")
    beluga_visit_id = models.CharField(max_length=128, blank=True, default="")
    beluga_master_id = models.CharField(max_length=128, blank=True, default="")
    beluga_order_id = models.CharField(max_length=128, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "refill_requests"
        ordering = ["-created_at"]


class WeightCheckinPhoto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    check_in = models.ForeignKey(
        SideEffectCheckIn,
        on_delete=models.CASCADE,
        related_name="photos",
    )
    storage_key = models.CharField(max_length=512)
    content_type = models.CharField(max_length=64, default="image/jpeg")
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "weight_checkin_photos"

    def __str__(self):
        return f"Photo for check-in {self.check_in_id}"
