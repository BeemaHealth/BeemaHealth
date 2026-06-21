import uuid

from django.db import migrations, models


def seed_product_catalog(apps, schema_editor):
    Catalog = apps.get_model("pharmacy", "PharmacyProductCatalog")
    rows = [
        {
            "offering_slug": "zepbound",
            "display_name": "Zepbound injection",
            "drug_name": "Tirzepatide",
            "drug_strength": "",
            "drug_form": "injection",
            "schedule_code": "0",
        },
        {
            "offering_slug": "wegovy_inj",
            "display_name": "Wegovy injection",
            "drug_name": "Semaglutide",
            "drug_strength": "",
            "drug_form": "injection",
            "schedule_code": "0",
        },
        {
            "offering_slug": "wegovy_pill",
            "display_name": "Wegovy pill",
            "drug_name": "Semaglutide",
            "drug_strength": "",
            "drug_form": "tablet",
            "schedule_code": "0",
        },
        {
            "offering_slug": "compounded_sema",
            "display_name": "Compounded semaglutide injection",
            "drug_name": "Semaglutide",
            "drug_strength": "",
            "drug_form": "injection",
            "schedule_code": "0",
        },
    ]
    for row in rows:
        Catalog.objects.get_or_create(
            offering_slug=row["offering_slug"],
            defaults={**row, "pharmacy_partner": "medivera", "is_active": True},
        )


class Migration(migrations.Migration):
    dependencies = []

    operations = [
        migrations.CreateModel(
            name="PharmacyProductCatalog",
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
                ("offering_slug", models.CharField(max_length=64, unique=True)),
                ("display_name", models.CharField(max_length=128)),
                ("drug_name", models.CharField(max_length=254)),
                ("drug_strength", models.CharField(blank=True, default="", max_length=254)),
                ("drug_form", models.CharField(blank=True, default="", max_length=255)),
                ("lf_product_id", models.IntegerField(blank=True, null=True)),
                ("schedule_code", models.CharField(blank=True, default="0", max_length=8)),
                ("pharmacy_partner", models.CharField(default="medivera", max_length=32)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "db_table": "pharmacy_product_catalog",
                "ordering": ["display_name"],
            },
        ),
        migrations.RunPython(seed_product_catalog, migrations.RunPython.noop),
    ]
