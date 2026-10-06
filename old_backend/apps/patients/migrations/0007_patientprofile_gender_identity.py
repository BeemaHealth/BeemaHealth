from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0006_alter_patientprofile_county"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientprofile",
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
