from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("patients", "0008_patientsettings"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientsettings",
            name="notify_messages",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="patientsettings",
            name="notify_review",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="patientsettings",
            name="notify_prescription",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="patientsettings",
            name="notify_shipping",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="patientsettings",
            name="notify_labs",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="patientsettings",
            name="notify_appointments",
            field=models.BooleanField(default=True),
        ),
    ]
