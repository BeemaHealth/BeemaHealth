from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("prescriptions", "0002_fulfillment_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientprescription",
            name="beluga_med_id",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="beluga_pharmacy_id",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="drug_category",
            field=models.CharField(
                blank=True,
                choices=[
                    ("glp1", "GLP-1 / Weight loss"),
                    ("ed", "ED"),
                    ("other", "Other"),
                ],
                default="other",
                max_length=16,
            ),
        ),
    ]
