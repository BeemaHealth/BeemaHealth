from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("questionnaires", "0006_step_progress_level"),
    ]

    operations = [
        migrations.AlterField(
            model_name="questionnairefield",
            name="field_type",
            field=models.CharField(
                max_length=32,
                choices=[
                    ("single_choice", "Single choice"),
                    ("multi_choice", "Multi choice"),
                    ("yes_no", "Yes / No"),
                    ("text", "Text"),
                    ("email", "Email"),
                    ("phone", "Phone"),
                    ("password", "Password"),
                    ("date", "Date"),
                    ("number", "Number"),
                    ("textarea", "Textarea"),
                    ("address_group", "Address group"),
                    ("account", "Account"),
                    ("review", "Review & confirm"),
                    ("plugin", "Plugin"),
                ],
            ),
        ),
    ]
