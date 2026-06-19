from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake
from apps.intakes.submissions import create_intake_submission


class ProviderPatientDetailTests(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        self.provider = User.objects.create_user(
            email="provider@example.com",
            password="secure-pass-1",
            first_name="Dr",
            last_name="Smith",
            is_provider=True,
        )
        self.intake = MedicalIntake.objects.create(
            user=self.patient,
            status="submitted",
            submitted_at=timezone.now(),
        )
        create_intake_submission(
            self.patient, self.intake, submitted_at=self.intake.submitted_at
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.provider)

    def test_provider_detail_returns_frozen_submission_after_rename(self):
        response = self.client.get(
            reverse("admin-patient-detail", kwargs={"patient_id": self.patient.id}),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["submission"]["snapshot"]["account"]["first_name"], "Jane")

        self.patient.first_name = "Janet"
        self.patient.save(update_fields=["first_name", "updated_at"])

        response = self.client.get(
            reverse("admin-patient-detail", kwargs={"patient_id": self.patient.id}),
        )
        self.assertEqual(response.json()["submission"]["snapshot"]["account"]["first_name"], "Jane")
        self.assertEqual(response.json()["user"]["first_name"], "Janet")
