import json
from pathlib import Path

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake
from apps.intakes.submissions import create_intake_submission
from apps.pharmacy.models import PharmacyOrder, PharmacyProductCatalog
from apps.prescriptions.models import PatientPrescription


FIXTURES = Path(__file__).resolve().parent / "fixtures"


class PharmacyOrderApiTests(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
            dob="1990-01-01",
            state="New York",
        )
        self.provider = User.objects.create_user(
            email="provider@example.com",
            password="secure-pass-1",
            is_provider=True,
        )
        self.intake = MedicalIntake.objects.create(
            user=self.patient,
            status="approved",
            submitted_at=timezone.now(),
            identity={"address": "123 Main St", "city": "Denver", "zip": "80202"},
            medication_preferences={"treatment": "compounded_sema"},
        )
        create_intake_submission(self.patient, self.intake, submitted_at=self.intake.submitted_at)
        catalog = PharmacyProductCatalog.objects.get(offering_slug="compounded_sema")
        catalog.lf_product_id = 1001
        catalog.save()
        self.prescription = PatientPrescription.objects.create(
            user=self.patient,
            medication_name="Semaglutide",
            dosage="2.5 mg/mL",
            frequency="Once weekly",
            route="injection",
            instructions="Inject weekly",
            drug_strength="2.5 mg/mL",
            drug_form="injection",
            quantity="1",
            quantity_units="vial",
            lf_product_id=1001,
            prescriber_npi="1234567890",
            prescriber_last_name="Smith",
            prescriber_first_name="Jane",
            fulfillment_status="signed",
            signed_at=timezone.now(),
            is_active=True,
        )
        self.provider_client = APIClient()
        self.provider_client.force_authenticate(user=self.provider)
        self.patient_client = APIClient()
        self.patient_client.force_authenticate(user=self.patient)

    @override_settings(PHARMACY_ADAPTER="mock")
    def test_provider_submits_pharmacy_order(self):
        response = self.provider_client.post(
            reverse("pharmacy-order-create"),
            {"prescription_id": str(self.prescription.id)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], "submitted")
        self.assertTrue(response.data["external_order_id"])

        self.prescription.refresh_from_db()
        self.assertEqual(self.prescription.fulfillment_status, "sent_to_pharmacy")
        self.assertEqual(PharmacyOrder.objects.filter(user=self.patient).count(), 1)

    @override_settings(PHARMACY_ADAPTER="mock")
    def test_patient_reads_latest_order(self):
        self.provider_client.post(
            reverse("pharmacy-order-create"),
            {"prescription_id": str(self.prescription.id)},
            format="json",
        )
        response = self.patient_client.get(reverse("pharmacy-order-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "submitted")


@override_settings(
    LIFEFILE_WEBHOOK_USER="lifefile_webhook",
    LIFEFILE_WEBHOOK_PASSWORD="dev-lifefile-webhook-pass",
    PHARMACY_ADAPTER="mock",
)
class LifeFileWebhookTests(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
        )
        self.prescription = PatientPrescription.objects.create(
            user=self.patient,
            medication_name="Semaglutide",
            dosage="2.5 mg/mL",
            frequency="Once weekly",
            fulfillment_status="sent_to_pharmacy",
            is_active=True,
        )
        self.order = PharmacyOrder.objects.create(
            prescription=self.prescription,
            user=self.patient,
            pharmacy_partner="mock",
            external_order_id="24200716",
            external_reference_id=str(self.prescription.id),
            status="submitted",
        )
        self.client = APIClient()

    def test_lifefile_webhook_updates_order_status(self):
        payload = json.loads((FIXTURES / "lifefile_shipped.json").read_text())
        payload["referenceId"] = str(self.prescription.id)

        response = self.client.post(
            reverse("webhook-lifefile"),
            payload,
            format="json",
            HTTP_AUTHORIZATION="Basic bGlmZWZpbGVfd2ViaG9vazpkZXYtbGlmZWZpbGUtd2ViaG9vay1wYXNz",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "shipped")
        self.assertEqual(self.order.tracking_number, "1Z999AA10123456784")
