from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("questionnaires", "0004_version_intake_routing_rules"),
    ]

    operations = [
        migrations.AddField(
            model_name="questionnaireversion",
            name="cta_ids",
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name="questionnaireversion",
            name="is_default_entry",
            field=models.BooleanField(default=False),
        ),
    ]
