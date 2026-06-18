from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.common.validation.payloads import SQL_INJECTION


class FunnelEligibilityApiValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(reverse("funnel-session"))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.client.cookies.load(response.cookies)

    def test_patch_valid_body_metrics(self):
        response = self.client.patch(
            reverse("funnel-eligibility"),
            {"height_ft": 5, "height_in": 8, "weight_lbs": "190.0", "goal_weight_lbs": "160.0"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejects_sql_injection_in_weight(self):
        for payload in SQL_INJECTION:
            with self.subTest(payload=payload):
                response = self.client.patch(
                    reverse("funnel-eligibility"),
                    {"weight_lbs": payload},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
