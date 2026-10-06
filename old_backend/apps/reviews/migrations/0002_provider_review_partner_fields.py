from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("reviews", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="providerreview",
            name="external_review_id",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="providerreview",
            name="doctor_partner",
            field=models.CharField(
                blank=True,
                choices=[
                    ("manual", "Manual admin"),
                    ("mock", "Mock adapter"),
                    ("openloop", "OpenLoop"),
                    ("carevalidate", "CareValidate"),
                    ("steadymd", "SteadyMD"),
                ],
                default="manual",
                max_length=32,
            ),
        ),
    ]
