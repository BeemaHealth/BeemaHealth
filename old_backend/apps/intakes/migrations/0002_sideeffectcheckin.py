import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("intakes", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="SideEffectCheckIn",
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
                    "side_effect",
                    models.CharField(
                        choices=[
                            ("none", "None"),
                            ("mild_nausea", "Mild nausea"),
                            ("reduced_appetite", "Reduced appetite"),
                            ("constipation", "Constipation"),
                            ("fatigue", "Fatigue"),
                            ("other", "Other"),
                        ],
                        max_length=32,
                    ),
                ),
                ("experienced_on", models.DateField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="side_effect_check_ins",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "side_effect_check_ins",
                "ordering": ["-experienced_on", "-created_at"],
            },
        ),
    ]
