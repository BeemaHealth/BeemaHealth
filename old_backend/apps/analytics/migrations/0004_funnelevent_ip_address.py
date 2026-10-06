from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('analytics', '0003_add_redirect_to_home'),
    ]

    operations = [
        migrations.AddField(
            model_name='funnelevent',
            name='ip_address',
            field=models.GenericIPAddressField(blank=True, null=True),
        ),
    ]
