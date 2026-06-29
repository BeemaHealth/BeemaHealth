from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("questionnaires", "0003_step_canvas_and_routing"),
    ]

    operations = [
        migrations.AddField(
            model_name="questionnaireversion",
            name="intake_routing_rules",
            field=models.JSONField(blank=True, default=list),
        ),
    ]
