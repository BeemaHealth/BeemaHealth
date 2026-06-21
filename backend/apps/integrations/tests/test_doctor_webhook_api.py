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
from apps.prescriptions.models import PatientPrescription
from apps.reviews.models import ProviderReview


FIXTURES = Path(__file__).resolve().parent / "fixtures"


@override_settings(DOCTOR_WEBHOOK_SECRET="test-doctor-secret")
class DoctorWebhookTests(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
            dob="1990-01-01",
            state="Colorado",
        )
        self.intake = MedicalIntake.objects.create(
            user=self.patient,
            status="under_review",
            submitted_at=timezone.now(),
            identity={"address": "123 Main St", "city": "Denver", "zip": "80202"},
            medication_preferences={"treatment": "compounded_sema"},
        )
        create_intake_submission(self.patient, self.intake, submitted_at=self.intake.submitted_at)
        ProviderReview.objects.create(user=self.patient, status="under_review")
        self.client = APIClient()

    def test_doctor_webhook_creates_prescription_and_updates_review(self):
        payload = json.loads((FIXTURES / "doctor_approved.json").read_text())
        payload["patient_id"] = str(self.patient.id)

        response = self.client.post(
            reverse("webhook-doctor"),
            payload,
            format="json",
            HTTP_AUTHORIZATION="Bearer test-doctor-secret",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        review = ProviderReview.objects.get(user=self.patient)
        self.assertEqual(review.status, "approved")
        self.assertEqual(review.external_review_id, "mock-consult-001")

        prescription = PatientPrescription.objects.get(user=self.patient, is_active=True)
        self.assertEqual(prescription.medication_name, "Semaglutide")
        self.assertEqual(prescription.fulfillment_status, "signed")
        self.assertEqual(prescription.prescriber_npi, "1234567890")

        self.intake.refresh_from_db()
        self.assertEqual(self.intake.status, "approved")

    def test_doctor_webhook_rejects_missing_auth(self):
        payload = {"patient_id": str(self.patient.id), "status": "approved"}
        response = self.client.post(reverse("webhook-doctor"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
