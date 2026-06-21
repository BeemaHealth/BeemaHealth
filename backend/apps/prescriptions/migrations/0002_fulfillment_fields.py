import uuid

import django.db.models.deletion
import django.utils.timezone
import fernet_fields.fields
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("prescriptions", "0001_initial_patient_prescription"),
        ("reviews", "0002_provider_review_partner_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="patientprescription",
            name="clinical_difference_statement",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="date_written",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="days_supply",
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="drug_form",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="drug_strength",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="effective_date",
            field=models.DateField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="external_prescriber_id",
            field=models.CharField(blank=True, default="", max_length=128),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="fulfillment_status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("signed", "Signed"),
                    ("sent_to_pharmacy", "Sent to pharmacy"),
                    ("cancelled", "Cancelled"),
                ],
                default="draft",
                max_length=32,
            ),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="lf_product_id",
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="practice_id",
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_address1",
            field=models.CharField(blank=True, default="", max_length=60),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_address2",
            field=models.CharField(blank=True, default="", max_length=60),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_city",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_dea",
            field=fernet_fields.fields.EncryptedCharField(
                blank=True, default="", max_length=9
            ),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_email",
            field=models.CharField(blank=True, default="", max_length=100),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_first_name",
            field=models.CharField(blank=True, default="", max_length=30),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_last_name",
            field=models.CharField(blank=True, default="", max_length=30),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_license_number",
            field=fernet_fields.fields.EncryptedCharField(
                blank=True, default="", max_length=50
            ),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_license_state",
            field=models.CharField(blank=True, default="", max_length=2),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_npi",
            field=fernet_fields.fields.EncryptedCharField(
                blank=True, default="", max_length=40
            ),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_phone",
            field=fernet_fields.fields.EncryptedCharField(
                blank=True, default="", max_length=16
            ),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_state",
            field=models.CharField(blank=True, default="", max_length=2),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="prescriber_zip",
            field=models.CharField(blank=True, default="", max_length=10),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="provider_review",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="prescriptions",
                to="reviews.providerreview",
            ),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="quantity",
            field=models.CharField(blank=True, default="", max_length=45),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="quantity_units",
            field=models.CharField(blank=True, default="", max_length=45),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="refills",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="rx_type",
            field=models.CharField(
                blank=True,
                choices=[("new", "New"), ("refill", "Refill")],
                default="new",
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="rx_uuid",
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="schedule_code",
            field=models.CharField(blank=True, default="", max_length=8),
        ),
        migrations.AddField(
            model_name="patientprescription",
            name="signed_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddIndex(
            model_name="patientprescription",
            index=models.Index(
                fields=["user", "fulfillment_status"],
                name="patient_pre_user_fulfillment_idx",
            ),
        ),
    ]
