import uuid

import django.db.models.deletion
import fernet_fields.fields
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pharmacy", "0001_initial"),
        ("prescriptions", "0002_fulfillment_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PharmacyOrder",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "pharmacy_partner",
                    models.CharField(
                        choices=[
                            ("mock", "Mock"),
                            ("medivera", "MediVera / LifeFile"),
                            ("openloop", "OpenLoop"),
                        ],
                        default="mock",
                        max_length=32,
                    ),
                ),
                ("external_order_id", models.CharField(blank=True, default="", max_length=64)),
                (
                    "external_reference_id",
                    models.CharField(blank=True, default="", max_length=200),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("created", "Created"),
                            ("submitted", "Submitted"),
                            ("received", "Received"),
                            ("processing", "Processing"),
                            ("shipped", "Shipped"),
                            ("delivered", "Delivered"),
                            ("cancelled", "Cancelled"),
                            ("error", "Error"),
                            ("on_hold", "On hold"),
                        ],
                        default="created",
                        max_length=32,
                    ),
                ),
                (
                    "recipient_type",
                    models.CharField(
                        choices=[("patient", "Patient"), ("clinic", "Clinic")],
                        default="patient",
                        max_length=16,
                    ),
                ),
                (
                    "ship_to_first_name",
                    fernet_fields.fields.EncryptedCharField(
                        blank=True, default="", max_length=30
                    ),
                ),
                (
                    "ship_to_last_name",
                    fernet_fields.fields.EncryptedCharField(
                        blank=True, default="", max_length=30
                    ),
                ),
                (
                    "ship_to_phone",
                    fernet_fields.fields.EncryptedCharField(
                        blank=True, default="", max_length=16
                    ),
                ),
                (
                    "ship_to_email",
                    fernet_fields.fields.EncryptedCharField(
                        blank=True, default="", max_length=100
                    ),
                ),
                (
                    "ship_to_address_line_1",
                    fernet_fields.fields.EncryptedCharField(
                        blank=True, default="", max_length=60
                    ),
                ),
                (
                    "ship_to_address_line_2",
                    fernet_fields.fields.EncryptedCharField(
                        blank=True, default="", max_length=60
                    ),
                ),
                ("ship_to_city", models.CharField(blank=True, default="", max_length=100)),
                ("ship_to_state", models.CharField(blank=True, default="", max_length=2)),
                ("ship_to_zip_code", models.CharField(blank=True, default="", max_length=10)),
                ("ship_to_country", models.CharField(default="US", max_length=2)),
                ("shipping_service_code", models.IntegerField(blank=True, null=True)),
                ("handling_service_code", models.IntegerField(blank=True, null=True)),
                (
                    "tracking_number",
                    fernet_fields.fields.EncryptedCharField(
                        blank=True, default="", max_length=128
                    ),
                ),
                ("carrier", models.CharField(blank=True, default="", max_length=64)),
                ("submitted_payload", models.JSONField(blank=True, default=dict)),
                ("last_response_payload", models.JSONField(blank=True, null=True)),
                ("error_message", models.TextField(blank=True, default="")),
                ("submitted_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "prescription",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pharmacy_orders",
                        to="prescriptions.patientprescription",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="pharmacy_orders",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "pharmacy_orders",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="PharmacyOrderEvent",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("partner", models.CharField(default="medivera", max_length=32)),
                ("external_order_id", models.CharField(blank=True, default="", max_length=64)),
                ("event_type", models.CharField(blank=True, default="", max_length=64)),
                ("status", models.CharField(blank=True, default="", max_length=64)),
                (
                    "tracking_number",
                    fernet_fields.fields.EncryptedCharField(
                        blank=True, default="", max_length=128
                    ),
                ),
                ("carrier", models.CharField(blank=True, default="", max_length=64)),
                ("raw_payload", models.JSONField(default=dict)),
                (
                    "idempotency_key",
                    models.CharField(blank=True, db_index=True, default="", max_length=255),
                ),
                ("processed_at", models.DateTimeField(blank=True, null=True)),
                ("processing_error", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "pharmacy_order",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="events",
                        to="pharmacy.pharmacyorder",
                    ),
                ),
            ],
            options={
                "db_table": "pharmacy_order_events",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="pharmacyorder",
            index=models.Index(fields=["user", "status"], name="pharmacy_or_user_id_idx"),
        ),
        migrations.AddIndex(
            model_name="pharmacyorder",
            index=models.Index(fields=["external_order_id"], name="pharmacy_or_ext_ord_idx"),
        ),
        migrations.AddIndex(
            model_name="pharmacyorder",
            index=models.Index(fields=["external_reference_id"], name="pharmacy_or_ext_ref_idx"),
        ),
    ]
