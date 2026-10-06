import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("intakes", "0008_sideeffectcheckin_detail"),
    ]

    operations = [
        # SideEffectCheckIn new fields
        migrations.AddField(
            model_name="sideeffectcheckin",
            name="titration_direction",
            field=models.CharField(
                blank=True,
                choices=[
                    ("increase", "Increase"),
                    ("decrease", "Decrease"),
                    ("same", "Stay the same"),
                ],
                max_length=16,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="sideeffectcheckin",
            name="weight_lbs",
            field=models.DecimalField(blank=True, decimal_places=1, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name="sideeffectcheckin",
            name="bmi",
            field=models.DecimalField(blank=True, decimal_places=1, max_digits=4, null=True),
        ),
        migrations.AddField(
            model_name="sideeffectcheckin",
            name="notes",
            field=models.TextField(blank=True, default=""),
        ),
        # RefillRequest new fields
        migrations.AddField(
            model_name="refillrequest",
            name="request_type",
            field=models.CharField(
                choices=[
                    ("same_dose", "Same dose"),
                    ("titration", "Titration (dose change)"),
                ],
                default="same_dose",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="refillrequest",
            name="titration_direction",
            field=models.CharField(blank=True, max_length=16, null=True),
        ),
        migrations.AddField(
            model_name="refillrequest",
            name="beluga_response_status",
            field=models.CharField(blank=True, default="not_sent", max_length=64),
        ),
        migrations.AddField(
            model_name="refillrequest",
            name="beluga_visit_id",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="refillrequest",
            name="beluga_master_id",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        # WeightCheckinPhoto new model
        migrations.CreateModel(
            name="WeightCheckinPhoto",
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
                    "check_in",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="photos",
                        to="intakes.sideeffectcheckin",
                    ),
                ),
                ("storage_key", models.CharField(max_length=512)),
                ("content_type", models.CharField(default="image/jpeg", max_length=64)),
                ("uploaded_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "weight_checkin_photos",
            },
        ),
    ]
