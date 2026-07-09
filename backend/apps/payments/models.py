import uuid

from django.core.serializers.json import DjangoJSONEncoder
from django.db import models
from fernet_fields import EncryptedCharField

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake


class StripeCustomer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="stripe_customer"
    )
    stripe_customer_id = EncryptedCharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "stripe_customers"

    def __str__(self):
        return f"StripeCustomer(user={self.user_id})"


class StripePaymentMethod(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="stripe_payment_methods"
    )
    stripe_payment_method_id = EncryptedCharField(max_length=64)
    card_brand = models.CharField(max_length=16, blank=True, default="")
    card_last4 = models.CharField(max_length=4, blank=True, default="")
    card_exp_month = models.PositiveSmallIntegerField(null=True, blank=True)
    card_exp_year = models.PositiveSmallIntegerField(null=True, blank=True)
    is_default = models.BooleanField(default=True)
    stripe_setup_intent_id = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "stripe_payment_methods"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.card_brand} ****{self.card_last4}"


class StripeWebhookEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    stripe_event_id = models.CharField(max_length=128, unique=True)
    event_type = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stripe_webhook_events"

    def __str__(self):
        return f"{self.event_type} ({self.stripe_event_id})"


class AuthorizationHold(models.Model):
    class PaymentMode(models.TextChoices):
        AUTH_HOLD = "auth_hold", "Auth hold"
        SETUP_ONLY = "setup_only", "Setup only"

    class Status(models.TextChoices):
        CREATED = "created", "Created"
        PROCESSING = "processing", "Processing"
        HELD = "held", "Held"
        REQUIRES_ACTION = "requires_action", "Requires action"
        CAPTURED = "captured", "Captured"
        FAILED = "failed", "Failed"
        CANCELED = "canceled", "Canceled"
        EXPIRED = "expired", "Expired"

    # Legal transitions enforced by apps.payments.services.transition_hold —
    # not by the database. See the plan doc's state machine diagram.
    ALLOWED_TRANSITIONS = {
        Status.CREATED: {Status.PROCESSING, Status.FAILED, Status.CANCELED},
        Status.PROCESSING: {
            Status.HELD,
            Status.REQUIRES_ACTION,
            Status.FAILED,
            Status.CANCELED,
        },
        Status.REQUIRES_ACTION: {Status.HELD, Status.FAILED, Status.CANCELED},
        Status.HELD: {Status.CAPTURED, Status.CANCELED, Status.EXPIRED},
        Status.CAPTURED: set(),
        Status.FAILED: {Status.PROCESSING, Status.CANCELED},
        Status.CANCELED: set(),
        Status.EXPIRED: set(),
    }

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="authorization_holds"
    )
    intake = models.ForeignKey(
        MedicalIntake,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="authorization_holds",
    )
    questionnaire_version_id = models.UUIDField(null=True, blank=True)
    experiment_id = models.UUIDField(null=True, blank=True)
    variant_key = models.CharField(max_length=32, blank=True, default="")
    payment_mode = models.CharField(max_length=16, choices=PaymentMode.choices)
    stripe_payment_intent_id = EncryptedCharField(
        max_length=128, blank=True, default=""
    )
    stripe_setup_intent_id = EncryptedCharField(max_length=128, blank=True, default="")
    amount_cents = models.PositiveIntegerField(default=0)
    pricing_config_snapshot = models.JSONField(
        default=dict, blank=True, encoder=DjangoJSONEncoder
    )
    status = models.CharField(
        max_length=32, choices=Status.choices, default=Status.CREATED
    )
    status_reason = models.CharField(max_length=128, blank=True, default="")
    captured_amount_cents = models.PositiveIntegerField(null=True, blank=True)
    held_at = models.DateTimeField(null=True, blank=True)
    captured_at = models.DateTimeField(null=True, blank=True)
    canceled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    idempotency_key = models.CharField(max_length=64, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "authorization_holds"
        ordering = ["-created_at"]

    def __str__(self):
        return f"AuthorizationHold({self.user_id}, {self.status})"
