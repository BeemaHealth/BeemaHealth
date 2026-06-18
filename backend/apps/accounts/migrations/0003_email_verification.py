import uuid

import django.db.models.deletion
import fernet_fields.fields
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_remove_colorado_default_state"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="email_verified",
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name="user",
            name="first_name",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
        migrations.AlterField(
            model_name="user",
            name="last_name",
            field=models.CharField(blank=True, default="", max_length=150),
        ),
        migrations.AlterField(
            model_name="user",
            name="phone",
            field=fernet_fields.fields.EncryptedCharField(blank=True, default="", max_length=32),
        ),
        migrations.CreateModel(
            name="EmailVerificationToken",
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
                ("token_hash", models.CharField(db_index=True, max_length=64, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="email_verification_tokens",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "email_verification_tokens",
            },
        ),
    ]
