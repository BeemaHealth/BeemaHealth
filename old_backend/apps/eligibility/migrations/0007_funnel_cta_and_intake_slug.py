from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("eligibility", "0006_add_landing_page_slug_to_funnel_session"),
    ]

    operations = [
        migrations.AddField(
            model_name="funnelsession",
            name="cta_id",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
        migrations.AddField(
            model_name="eligibilityresponse",
            name="selected_intake_questionnaire_slug",
            field=models.CharField(blank=True, default="", max_length=64),
        ),
    ]
