import uuid

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="PatientPrescription",
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
                ("medication_name", models.CharField(max_length=128)),
                ("dosage", models.CharField(max_length=64)),
                ("frequency", models.CharField(max_length=128)),
                (
                    "route",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("injection", "Injection"),
                            ("oral", "Oral"),
                            ("other", "Other"),
                        ],
                        default="",
                        max_length=16,
                    ),
                ),
                ("instructions", models.TextField(blank=True, default="")),
                ("pharmacy_name", models.CharField(blank=True, default="", max_length=128)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "prescribed_at",
                    models.DateTimeField(default=django.utils.timezone.now),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "prescribed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="prescriptions_written",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="prescriptions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "patient_prescriptions",
                "ordering": ["-prescribed_at", "-created_at"],
                "indexes": [
                    models.Index(
                        fields=["user", "is_active"],
                        name="patient_pre_user_id_0f0f0f_idx",
                    )
                ],
            },
        ),
    ]
