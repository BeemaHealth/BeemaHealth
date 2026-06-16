import uuid

from django.db import models

from apps.accounts.models import User


class ConsentRecord(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="consent")
    telehealth_consent = models.BooleanField()
    no_guarantee_acknowledgment = models.BooleanField()
    emergency_disclaimer_acknowledgment = models.BooleanField()
    medication_risk_acknowledgment = models.BooleanField()
    compounded_medication_acknowledgment = models.BooleanField()
    privacy_acknowledgment = models.BooleanField()
    typed_signature = models.CharField(max_length=255)
    signed_at = models.DateTimeField()

    class Meta:
        db_table = "consent_records"

    def __str__(self):
        return f"Consent for {self.user.email}"
