from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.validation.payloads import SQL_INJECTION, STRICT_FIELD_ATTACKS, XSS_PAYLOADS
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

    def test_rejects_pickup_shipping_preference(self):
        response = self.client.patch(
            reverse("intake-me"),
            {"medication_preferences": {"shipping_preference": "pickup"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("pickup", str(response.data).lower())

    def test_rejects_invalid_shipping_preference(self):
        response = self.client.patch(
            reverse("intake-me"),
            {"medication_preferences": {"shipping_preference": "Standard"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_invalid_member_id(self):
        response = self.client.patch(
            reverse("intake-me"),
            {"medication_preferences": {"member_id": "<script>alert(1)</script>"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accepts_valid_medication_preferences(self):
        response = self.client.patch(
            reverse("intake-me"),
            {
                "medication_preferences": {
                    "shipping_preference": "shipping",
                    "insurance_provider": "Aetna",
                    "member_id": "ABC123-45",
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejects_malicious_alternate_shipping_address(self):
        response = self.client.patch(
            reverse("intake-me"),
            {
                "medication_preferences": {
                    "use_different_shipping_address": True,
                    "shipping_address": SQL_INJECTION[0],
                    "shipping_city": "Denver",
                    "shipping_zip": "80202",
                    "shipping_county": "Denver County",
                    "shipping_address_verified": "true",
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accepts_verified_alternate_shipping_address(self):
        response = self.client.patch(
            reverse("intake-me"),
            {
                "medication_preferences": {
                    "use_different_shipping_address": True,
                    "shipping_address": "456 Oak Ave",
                    "shipping_city": "Denver",
                    "shipping_zip": "80203",
                    "shipping_county": "Denver County",
                    "shipping_address_verified": "true",
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejects_non_numeric_lab_values(self):
        response = self.client.patch(
            reverse("intake-me"),
            {"labs": {"bp": SQL_INJECTION[0]}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_accepts_valid_lab_values(self):
        response = self.client.patch(
            reverse("intake-me"),
            {
                "labs": {
                    "bp": "120/80",
                    "a1c": "5.6",
                    "glucose": "95",
                    "cholesterol": "180",
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejects_invalid_lab_field_values(self):
        cases = (
            ("bp", "IkjFHDaafslkjadslfkj"),
            ("a1c", "abc"),
            ("glucose", "xyz"),
            ("cholesterol", "bad"),
        )
        for field, value in cases:
            with self.subTest(field=field, value=value):
                response = self.client.patch(
                    reverse("intake-me"),
                    {"labs": {field: value}},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_valid_lifestyle(self):
        response = self.client.patch(
            reverse("intake-me"),
            {
                "lifestyle": {
                    "exercise_days": "3",
                    "exercise_type": "Walking",
                    "diet": "balanced",
                    "smoke": "no",
                    "alcohol": "occasionally",
                    "drugs": "no",
                    "sleep": "7_8",
                    "binge": "never",
                    "night_eating": "no",
                    "struggle": "cravings",
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejects_invalid_lifestyle_enum(self):
        response = self.client.patch(
            reverse("intake-me"),
            {"lifestyle": {"diet": SQL_INJECTION[0]}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_accepts_new_lifestyle_enum_values(self):
        response = self.client.patch(
            reverse("intake-me"),
            {
                "lifestyle": {
                    "diet": "mediterranean",
                    "binge": "daily",
                    "night_eating": "most_nights",
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejects_legacy_lifestyle_enum_values(self):
        for field, value in (("diet", "Balanced"), ("binge", "weekly_plus")):
            with self.subTest(field=field, value=value):
                response = self.client.patch(
                    reverse("intake-me"),
                    {"lifestyle": {field: value}},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_malicious_lifestyle_drugs_detail(self):
        response = self.client.patch(
            reverse("intake-me"),
            {
                "lifestyle": {
                    "drugs": "yes",
                    "drugs_detail": XSS_PAYLOADS[0],
                }
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
