import uuid

from django.db import models
from fernet_fields import EncryptedDateField

from apps.accounts.models import User


class FunnelSession(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CLAIMED = "claimed", "Claimed"
        EXPIRED = "expired", "Expired"
        ABANDONED = "abandoned", "Abandoned"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token_hash = models.CharField(max_length=64, unique=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.ACTIVE)
    claimed_by_user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="claimed_funnel_sessions",
    )
    claimed_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default="")
    utm_source = models.CharField(max_length=128, blank=True, default="")
    utm_medium = models.CharField(max_length=128, blank=True, default="")
    utm_campaign = models.CharField(max_length=128, blank=True, default="")
    utm_content = models.CharField(max_length=128, blank=True, default="")
    landing_page_slug = models.CharField(max_length=64, blank=True, default="")
    experiment_id = models.UUIDField(null=True, blank=True)
    variant_key = models.CharField(max_length=32, blank=True, default="")
    qualify_questionnaire_version_id = models.UUIDField(null=True, blank=True)
    cta_id = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "funnel_sessions"

    def __str__(self):
        return f"FunnelSession {self.id} ({self.status})"


class EligibilityResponse(models.Model):
    TREATMENT_INTEREST_CHOICES = [
        ("glp1_pills", "GLP-1 pills"),
        ("glp1_injections", "GLP-1 injections"),
        ("provider_recommendation", "Provider recommendation"),
        ("not_sure", "Not sure"),
    ]
    PRIMARY_GOAL_CHOICES = [
        ("improve_health", "Improve my health"),
        ("gain_confidence", "Gain confidence"),
        ("feel_better_clothes", "Feel better in my clothes"),
        ("lose_weight", "Lose weight"),
        ("metabolic_health", "Metabolic health"),
        ("learn_options", "Learn my options"),
        ("something_else", "Something else"),
    ]
    TREATMENT_PRIORITY_CHOICES = [
        ("fda_approved", "FDA-approved medications"),
        ("cost", "Affordability"),
        ("results", "Results that last"),
        ("convenience", "Convenience"),
        ("provider_support", "Support from licensed providers"),
    ]
    TARGET_WEIGHT_LOSS_CHOICES = [
        ("1_15", "Lose 1–15 pounds"),
        ("16_50", "Lose 16–50 pounds"),
        ("51_100", "Lose 51–100 pounds"),
        ("100_plus", "Lose 100+ pounds"),
        ("not_sure", "Not sure — I just need to lose weight"),
    ]
    SEX_CHOICES = [
        ("female", "Female"),
        ("male", "Male"),
        ("intersex", "Intersex"),
        ("unknown", "Unknown"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    funnel_session = models.OneToOneField(
        FunnelSession,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="eligibility",
    )
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="eligibility",
    )

    treatment_interest = models.CharField(
        max_length=32, choices=TREATMENT_INTEREST_CHOICES, blank=True, default=""
    )
    primary_goal = models.CharField(
        max_length=32, choices=PRIMARY_GOAL_CHOICES, blank=True, default=""
    )
    treatment_priority = models.CharField(
        max_length=32, choices=TREATMENT_PRIORITY_CHOICES, blank=True, default=""
    )
    target_weight_loss_range = models.CharField(
        max_length=16, choices=TARGET_WEIGHT_LOSS_CHOICES, blank=True, default=""
    )
    state = models.CharField(max_length=64, blank=True, default="")
    dob = EncryptedDateField(null=True, blank=True)
    is_18_or_older = models.BooleanField(null=True, blank=True)

    height_ft = models.PositiveSmallIntegerField(null=True, blank=True)
    height_in = models.PositiveSmallIntegerField(null=True, blank=True)
    weight_lbs = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    goal_weight_lbs = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    bmi = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)

    sex_assigned_at_birth = models.CharField(
        max_length=16, choices=SEX_CHOICES, blank=True, default=""
    )

    gender_identity = models.CharField(
        max_length=16, choices=SEX_CHOICES, blank=True, default=""
    )

    safety_screen = models.JSONField(default=dict, blank=True)
    safety_concern_flag = models.BooleanField(default=False)
    is_likely_eligible = models.BooleanField(null=True, blank=True)
    needs_clinician_review = models.BooleanField(default=False)
    disqualification_reason = models.CharField(max_length=64, blank=True, default="")

    pre_signup_consents = models.JSONField(default=dict, blank=True)
    questionnaire_responses = models.JSONField(default=dict, blank=True)
    questionnaire_version_id = models.UUIDField(null=True, blank=True)
    selected_intake_questionnaire_slug = models.CharField(max_length=64, blank=True, default="")
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "eligibility_responses"

    def __str__(self):
        if self.user_id:
            return f"Eligibility for {self.user.email}"
        return f"Eligibility draft {self.id}"
