from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("questionnaires", "0008_field_type_legal_consent"),
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
                    ("dob", "Date of birth"),
                    ("number", "Number"),
                    ("textarea", "Textarea"),
                    ("address_group", "Address group"),
                    ("account", "Account"),
                    ("review", "Review & confirm"),
                    ("legal_consent", "Legal consent"),
                    ("plugin", "Plugin"),
                ],
            ),
        ),
    ]
