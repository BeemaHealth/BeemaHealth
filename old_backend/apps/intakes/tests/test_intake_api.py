from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.validation.payloads import SQL_INJECTION, STRICT_FIELD_ATTACKS, XSS_PAYLOADS
from apps.eligibility.models import EligibilityResponse
from apps.intakes.models import MedicalIntake
from apps.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)


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


class IntakeQuestionnaireResponseValidationTests(TestCase):
    """Required questionnaire fields are enforced only at submission, so a draft
    save (incl. the one-time version_id auto-sync) never rejects unanswered
    required fields. See IntakeDynamicFlow load + sync."""

    def setUp(self):
        self.user = User.objects.create_user(
            email="patient2@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        self.intake = MedicalIntake.objects.create(user=self.user)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        questionnaire = Questionnaire.objects.create(
            slug="intake", title="Intake", questionnaire_type="intake"
        )
        self.version = QuestionnaireVersion.objects.create(
            questionnaire=questionnaire,
            version_label="1.0.0",
            status="published",
        )
        step = QuestionnaireStep.objects.create(
            version=self.version, step_key="dob_step", sort_order=0, title="DOB"
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="dob",
            field_type="dob",
            label="Date of birth",
            maps_to_section="beluga:dob",
            required=True,
            sort_order=0,
        )

    def test_draft_autosync_with_unanswered_required_field_succeeds(self):
        response = self.client.patch(
            reverse("intake-me"),
            {
                "questionnaire_version_id": str(self.version.id),
                "questionnaire_responses": {},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_submission_enforces_required_questionnaire_field(self):
        response = self.client.patch(
            reverse("intake-me"),
            {
                "questionnaire_version_id": str(self.version.id),
                "questionnaire_responses": {},
                "status": "submitted",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_draft_still_validates_provided_answer_format(self):
        response = self.client.patch(
            reverse("intake-me"),
            {
                "questionnaire_version_id": str(self.version.id),
                "questionnaire_responses": {"dob": "2015-01-01"},
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
