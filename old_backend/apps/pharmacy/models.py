import uuid

from django.db import models
from fernet_fields import EncryptedCharField

from apps.accounts.models import User


class PharmacyProductCatalog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    offering_slug = models.CharField(max_length=64, unique=True)
    display_name = models.CharField(max_length=128)
    drug_name = models.CharField(max_length=254)
    drug_strength = models.CharField(max_length=254, blank=True, default="")
    drug_form = models.CharField(max_length=255, blank=True, default="")
    lf_product_id = models.IntegerField(null=True, blank=True)
    schedule_code = models.CharField(max_length=8, blank=True, default="0")
    pharmacy_partner = models.CharField(max_length=32, default="medivera")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pharmacy_product_catalog"
        ordering = ["display_name"]

    def __str__(self):
        return self.display_name


class PharmacyOrder(models.Model):
    PARTNER_CHOICES = [
        ("mock", "Mock"),
        ("medivera", "MediVera / LifeFile"),
        ("openloop", "OpenLoop"),
    ]
    STATUS_CHOICES = [
        ("created", "Created"),
        ("submitted", "Submitted"),
        ("received", "Received"),
        ("processing", "Processing"),
        ("shipped", "Shipped"),
        ("delivered", "Delivered"),
        ("cancelled", "Cancelled"),
        ("error", "Error"),
        ("on_hold", "On hold"),
    ]
    RECIPIENT_CHOICES = [
        ("patient", "Patient"),
        ("clinic", "Clinic"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    prescription = models.ForeignKey(
        "prescriptions.PatientPrescription",
        on_delete=models.CASCADE,
        related_name="pharmacy_orders",
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="pharmacy_orders")
    pharmacy_partner = models.CharField(max_length=32, choices=PARTNER_CHOICES, default="mock")
    external_order_id = models.CharField(max_length=64, blank=True, default="")
    external_reference_id = models.CharField(max_length=200, blank=True, default="")
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default="created")
    recipient_type = models.CharField(
        max_length=16, choices=RECIPIENT_CHOICES, default="patient"
    )
    ship_to_first_name = EncryptedCharField(max_length=30, blank=True, default="")
    ship_to_last_name = EncryptedCharField(max_length=30, blank=True, default="")
    ship_to_phone = EncryptedCharField(max_length=16, blank=True, default="")
    ship_to_email = EncryptedCharField(max_length=100, blank=True, default="")
    ship_to_address_line_1 = EncryptedCharField(max_length=60, blank=True, default="")
    ship_to_address_line_2 = EncryptedCharField(max_length=60, blank=True, default="")
    ship_to_city = models.CharField(max_length=100, blank=True, default="")
    ship_to_state = models.CharField(max_length=2, blank=True, default="")
    ship_to_zip_code = models.CharField(max_length=10, blank=True, default="")
    ship_to_country = models.CharField(max_length=2, default="US")
    shipping_service_code = models.IntegerField(null=True, blank=True)
    handling_service_code = models.IntegerField(null=True, blank=True)
    tracking_number = EncryptedCharField(max_length=128, blank=True, default="")
    carrier = models.CharField(max_length=64, blank=True, default="")
    submitted_payload = models.JSONField(default=dict, blank=True)
    last_response_payload = models.JSONField(null=True, blank=True)
    error_message = models.TextField(blank=True, default="")
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "pharmacy_orders"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["external_order_id"]),
            models.Index(fields=["external_reference_id"]),
        ]

    def __str__(self):
        return f"Order {self.id} ({self.status})"


class PharmacyOrderEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    pharmacy_order = models.ForeignKey(
        PharmacyOrder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="events",
    )
    partner = models.CharField(max_length=32, default="medivera")
    external_order_id = models.CharField(max_length=64, blank=True, default="")
    event_type = models.CharField(max_length=64, blank=True, default="")
    status = models.CharField(max_length=64, blank=True, default="")
    tracking_number = EncryptedCharField(max_length=128, blank=True, default="")
    carrier = models.CharField(max_length=64, blank=True, default="")
    raw_payload = models.JSONField(default=dict)
    idempotency_key = models.CharField(max_length=255, blank=True, default="", db_index=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    processing_error = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "pharmacy_order_events"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.partner} event {self.event_type or self.status}"
