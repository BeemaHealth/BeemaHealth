import uuid

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models

BELUGA_SCHEMA = {
    "fields": [
        {"id": "firstName", "label": "First name", "required": True},
        {"id": "lastName", "label": "Last name", "required": True},
        {"id": "dob", "label": "Date of birth", "required": True},
        {"id": "phone", "label": "Phone", "required": True},
        {"id": "email", "label": "Email", "required": True},
        {"id": "address", "label": "Street address", "required": True},
        {"id": "city", "label": "City", "required": True},
        {"id": "state", "label": "State", "required": True},
        {"id": "zip", "label": "ZIP", "required": True},
        {"id": "sex", "label": "Sex (Male/Female/Other)", "required": True},
        {"id": "selfReportedMeds", "label": "Self-reported medications", "required": True},
        {"id": "allergies", "label": "Allergies", "required": True},
        {"id": "medicalConditions", "label": "Medical conditions", "required": True},
        {"id": "consentsSigned", "label": "Consents signed", "required": False},
    ]
}


def seed_beluga_vendor(apps, schema_editor):
    ApiVendor = apps.get_model("questionnaires", "ApiVendor")
    ApiVendorVersion = apps.get_model("questionnaires", "ApiVendorVersion")
    now = django.utils.timezone.now()
    vendor = ApiVendor.objects.create(
        id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        slug="beluga",
        name="Beluga Health",
        description="Clinical provider network and prescription fulfillment (GLP-1 weight loss).",
        active=True,
    )
    ApiVendorVersion.objects.create(
        id=uuid.UUID("00000000-0000-0000-0000-000000000002"),
        vendor=vendor,
        version_number=1,
        label="v1",
        schema=BELUGA_SCHEMA,
        status="published",
        published_at=now,
    )


def reverse_seed(apps, schema_editor):
    ApiVendor = apps.get_model("questionnaires", "ApiVendor")
    ApiVendor.objects.filter(slug="beluga").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("questionnaires", "0009_field_type_dob"),
    ]

    operations = [
        migrations.CreateModel(
            name="ApiVendor",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("slug", models.SlugField(max_length=32, unique=True)),
                ("name", models.CharField(max_length=128)),
                ("description", models.TextField(blank=True, default="")),
                ("active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "api_vendors", "ordering": ["name"]},
        ),
        migrations.CreateModel(
            name="ApiVendorVersion",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                (
                    "vendor",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="versions",
                        to="questionnaires.apivendor",
                    ),
                ),
                ("version_number", models.PositiveSmallIntegerField()),
                ("label", models.CharField(blank=True, default="", max_length=32)),
                ("schema", models.JSONField(default=dict)),
                (
                    "status",
                    models.CharField(
                        choices=[("draft", "Draft"), ("published", "Published"), ("archived", "Archived")],
                        default="draft",
                        max_length=16,
                    ),
                ),
                ("published_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "api_vendor_versions",
                "ordering": ["-version_number"],
                "unique_together": {("vendor", "version_number")},
            },
        ),
        migrations.AddField(
            model_name="questionnaireversion",
            name="vendor_version",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="questionnaire_versions",
                to="questionnaires.apivendorversion",
            ),
        ),
        migrations.RunPython(seed_beluga_vendor, reverse_code=reverse_seed),
    ]
