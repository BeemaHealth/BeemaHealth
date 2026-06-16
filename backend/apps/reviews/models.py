import uuid

from django.db import models

from apps.accounts.models import User


class ProviderReview(models.Model):
    DECISION_CHOICES = [
        ("needs_more_info", "Needs more information"),
        ("not_appropriate", "Not appropriate"),
        ("labs_required", "Labs required"),
        ("approved", "Approved"),
        ("prescription_sent_outside", "Prescription sent outside platform"),
    ]
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
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="provider_review")
    reviewer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviews_conducted",
    )
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="submitted")
    internal_note = models.TextField(blank=True)
    patient_note = models.TextField(blank=True)
    decision = models.CharField(max_length=64, choices=DECISION_CHOICES, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "provider_reviews"

    def __str__(self):
        return f"Review for {self.user.email}"
