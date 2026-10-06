from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("eligibility", "0003_alter_eligibilityresponse_safety_screen"),
    ]

    operations = [
        migrations.AddField(
            model_name="eligibilityresponse",
            name="gender_identity",
            field=models.CharField(
                blank=True,
                choices=[
                    ("female", "Female"),
                    ("male", "Male"),
                    ("intersex", "Intersex"),
                    ("unknown", "Unknown"),
                ],
                default="",
                max_length=16,
            ),
        ),
    ]
