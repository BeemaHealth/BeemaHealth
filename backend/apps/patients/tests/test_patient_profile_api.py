from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake
from apps.intakes.submissions import create_intake_submission
from apps.patients.models import PatientProfile
from apps.patients.services import sync_patient_profile_from_intake


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


class SyncPatientProfileFromIntakeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="ship@example.com",
            password="secure-pass-1",
            first_name="Sam",
            last_name="Ship",
        )

    def test_falls_back_to_shipping_section_when_identity_has_no_address(self):
        """Dynamic address_group mapped to medication_preferences still syncs."""
        profile = sync_patient_profile_from_intake(
            self.user,
            identity={},
            shipping={
                "shipping_address": "2510 Summit Drive",
                "shipping_city": "Colorado Springs",
                "shipping_zip": "80909",
                "shipping_county": "El Paso",
            },
        )
        self.assertEqual(profile.address, "2510 Summit Drive")
        self.assertEqual(profile.city, "Colorado Springs")
        self.assertEqual(profile.zip_code, "80909")
        self.assertEqual(profile.county, "El Paso")

    def test_identity_address_takes_precedence_over_shipping(self):
        profile = sync_patient_profile_from_intake(
            self.user,
            identity={"address": "123 Main St", "city": "Denver", "zip": "80202"},
            shipping={
                "shipping_address": "2510 Summit Drive",
                "shipping_city": "Colorado Springs",
                "shipping_zip": "80909",
            },
        )
        self.assertEqual(profile.address, "123 Main St")
        self.assertEqual(profile.city, "Denver")
        self.assertEqual(profile.zip_code, "80202")
