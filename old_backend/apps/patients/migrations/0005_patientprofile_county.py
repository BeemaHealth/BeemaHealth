from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("patients", "0004_deduplicate_profile_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientprofile",
            name="county",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
    ]
