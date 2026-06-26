from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("questionnaires", "0005_version_cta_entry"),
    ]

    operations = [
        migrations.AddField(
            model_name="questionnairestep",
            name="progress_level",
            field=models.PositiveSmallIntegerField(
                default=0,
                help_text=(
                    "Progress tier for the patient bar (0 = first). Branching "
                    "steps at the same depth share a level."
                ),
            ),
        ),
    ]
