from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.validation.payloads import SQL_INJECTION, STRICT_FIELD_ATTACKS
from apps.eligibility.models import EligibilityResponse
from apps.intakes.models import MedicalIntake


class IntakeApiValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        EligibilityResponse.objects.create(user=self.user, weight_lbs="190.0")
        self.intake = MedicalIntake.objects.create(user=self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_patch_valid_identity(self):
        response = self.client.patch(
            reverse("intake-me"),
            {
                "identity": {
                    "address": "123 Main St",
                    "city": "Denver",
                    "county": "Denver County",
                    "zip": "80202",
                    "address_verified": "true",
                    "emergency_name": "John Doe",
                    "emergency_phone": "3035550101",
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.profile.refresh_from_db()
        self.assertEqual(self.user.profile.county, "Denver County")

    def test_rejects_malicious_identity_address_fields(self):
        valid_base = {
            "address": "123 Main St",
            "city": "Denver",
            "county": "Denver County",
            "zip": "80202",
            "address_verified": "true",
            "emergency_name": "John Doe",
            "emergency_phone": "3035550101",
        }
        for field in ("address", "city", "zip", "county"):
            for payload in STRICT_FIELD_ATTACKS:
                if field in ("city", "county") and payload == "admin'--":
                    continue
                with self.subTest(field=field, payload=payload):
                    identity = {**valid_base, field: payload}
                    response = self.client.patch(
                        reverse("intake-me"),
                        {"identity": identity},
                        format="json",
                    )
                    self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_malicious_emergency_phone(self):
        for payload in STRICT_FIELD_ATTACKS:
            with self.subTest(payload=payload):
                response = self.client.patch(
                    reverse("intake-me"),
                    {"identity": {"emergency_phone": payload}},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_invalid_preferred_first_name(self):
        response = self.client.patch(
            reverse("intake-me"),
            {"identity": {"preferred": "matt123"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_sql_injection_in_body_metrics(self):
        for payload in SQL_INJECTION:
            with self.subTest(payload=payload):
                response = self.client.patch(
                    reverse("intake-me"),
                    {"body_metrics": {"highest_weight": payload, "lowest_weight": "165"}},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_invalid_pharmacy_phone(self):
        response = self.client.patch(
            reverse("intake-me"),
            {"medication_preferences": {"pharmacy_phone": "' OR 1=1--"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_non_numeric_lab_values(self):
        response = self.client.patch(
            reverse("intake-me"),
            {"labs": {"bp": SQL_INJECTION[0]}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
