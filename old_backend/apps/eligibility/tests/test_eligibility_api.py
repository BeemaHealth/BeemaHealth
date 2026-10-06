from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.validation.payloads import SQL_INJECTION
from apps.eligibility.models import EligibilityResponse


class EligibilityApiValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.record = EligibilityResponse.objects.create(user=self.user)

    def test_patch_valid_body_metrics(self):
        response = self.client.patch(
            reverse("eligibility-me"),
            {"height_ft": 5, "height_in": 8, "weight_lbs": "190.0", "goal_weight_lbs": "160.0"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejects_sql_injection_in_height(self):
        for payload in SQL_INJECTION:
            with self.subTest(payload=payload):
                response = self.client.patch(
                    reverse("eligibility-me"),
                    {"height_ft": payload},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_goal_weight_above_current(self):
        response = self.client.patch(
            reverse("eligibility-me"),
            {"weight_lbs": "190.0", "goal_weight_lbs": "200.0"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_under_18_flag(self):
        response = self.client.patch(
            reverse("eligibility-me"),
            {"is_18_or_older": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_excluded_state_marks_not_eligible(self):
        self.user.state = "KS"
        self.user.save(update_fields=["state"])
        response = self.client.patch(
            reverse("eligibility-me"),
            {"height_ft": 5, "height_in": 8, "weight_lbs": "190.0"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertFalse(data["is_likely_eligible"])
        self.assertEqual(data["disqualification_reason"], "state_not_eligible")
