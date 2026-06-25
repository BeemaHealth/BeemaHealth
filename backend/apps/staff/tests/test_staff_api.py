from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

User = get_user_model()


class StaffPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            email="staff@example.com",
            password="securepass123",
            is_staff=True,
            is_patient=False,
        )
        self.patient = User.objects.create_user(
            email="patient@example.com",
            password="securepass123",
            is_patient=True,
        )
        self.provider = User.objects.create_user(
            email="provider@example.com",
            password="securepass123",
            is_provider=True,
            is_patient=False,
        )

    def test_staff_summary_allowed_for_staff(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/staff/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("total_patients", response.json())

    def test_staff_summary_denied_for_patient(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get("/api/staff/summary/")
        self.assertEqual(response.status_code, 403)

    def test_staff_summary_denied_for_provider_without_staff(self):
        self.client.force_authenticate(user=self.provider)
        response = self.client.get("/api/staff/summary/")
        self.assertEqual(response.status_code, 403)

    def test_staff_patients_denied_for_anonymous(self):
        response = self.client.get("/api/staff/patients/")
        self.assertEqual(response.status_code, 401)
