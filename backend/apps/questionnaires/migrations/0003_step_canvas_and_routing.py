from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('questionnaires', '0002_medication_and_questionnaire_updates'),
    ]

    operations = [
        migrations.AddField(
            model_name='questionnairestep',
            name='routing_rules',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='questionnairestep',
            name='position_x',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='questionnairestep',
            name='position_y',
            field=models.FloatField(blank=True, null=True),
        ),
    ]
