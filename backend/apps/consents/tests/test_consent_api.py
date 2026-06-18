from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.validation.payloads import STRICT_FIELD_ATTACKS
from apps.eligibility.models import EligibilityResponse


def valid_consent_payload(**overrides):
    payload = {
        "telehealth_consent": True,
        "no_guarantee_acknowledgment": True,
        "emergency_disclaimer_acknowledgment": True,
        "medication_risk_acknowledgment": True,
        "compounded_medication_acknowledgment": True,
        "typed_signature": "Jane Doe",
    }
    payload.update(overrides)
    return payload


class ConsentApiValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        EligibilityResponse.objects.create(
            user=self.user,
            pre_signup_consents={"terms": True, "privacy": True, "telehealth": True},
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_valid_consent(self):
        response = self.client.post(reverse("consent-me"), valid_consent_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_rejects_false_acknowledgments(self):
        response = self.client.post(
            reverse("consent-me"),
            valid_consent_payload(telehealth_consent=False),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_malicious_signature(self):
        for payload in STRICT_FIELD_ATTACKS:
            if payload == "admin'--":
                continue
            with self.subTest(payload=payload):
                response = self.client.post(
                    reverse("consent-me"),
                    valid_consent_payload(typed_signature=payload),
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
