from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake
from apps.intakes.submissions import create_intake_submission
from apps.patients.models import PatientProfile


class PatientProfileApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        self.intake = MedicalIntake.objects.create(
            user=self.user,
            status="submitted",
            submitted_at=timezone.now(),
            identity={"address": "123 Main St", "city": "Denver", "zip": "80202"},
        )
        create_intake_submission(self.user, self.intake, submitted_at=self.intake.submitted_at)
        PatientProfile.objects.create(user=self.user, address="123 Main St", city="Denver")
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_profile_patch_does_not_mutate_intake_identity(self):
        response = self.client.patch(
            reverse("patient-profile-me"),
            {"address": "999 New Address", "city": "Boulder", "zip": "80301"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.intake.refresh_from_db()
        self.assertEqual(self.intake.identity["address"], "123 Main St")
        self.assertEqual(self.intake.identity["city"], "Denver")
