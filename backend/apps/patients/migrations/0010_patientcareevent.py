import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0009_patientsettings_notification_categories"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PatientCareEvent",
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
                ("milestone", models.CharField(db_index=True, max_length=64)),
                (
                    "source",
                    models.CharField(
                        choices=[
                            ("beluga_webhook", "Beluga webhook"),
                            ("pharmacy_webhook", "Pharmacy webhook"),
                        ],
                        max_length=32,
                    ),
                ),
                ("source_event", models.CharField(blank=True, default="", max_length=64)),
                ("title", models.CharField(max_length=128)),
                ("description", models.TextField(blank=True, default="")),
                ("occurred_at", models.DateTimeField()),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "idempotency_key",
                    models.CharField(
                        blank=True,
                        max_length=255,
                        null=True,
                        unique=True,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="care_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "patient_care_events",
                "ordering": ["occurred_at", "created_at"],
            },
        ),
        migrations.AddIndex(
            model_name="patientcareevent",
            index=models.Index(
                fields=["user", "milestone"], name="patient_car_user_id_6f0a0d_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="patientcareevent",
            index=models.Index(
                fields=["user", "occurred_at"], name="patient_car_user_id_8b2c4e_idx"
            ),
        ),
    ]
