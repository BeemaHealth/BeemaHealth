from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("intakes", "0007_intakesubmission_questionnaire_version_id_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="sideeffectcheckin",
            name="side_effect_detail",
            field=models.CharField(blank=True, default="", max_length=200),
        ),
    ]
