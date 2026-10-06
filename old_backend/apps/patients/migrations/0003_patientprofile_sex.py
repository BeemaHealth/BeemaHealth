from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("patients", "0002_remove_colorado_default_state"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientprofile",
            name="sex_assigned_at_birth",
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
