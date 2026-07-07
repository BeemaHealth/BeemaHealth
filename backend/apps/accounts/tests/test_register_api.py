from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.common.validation.payloads import STRICT_FIELD_ATTACKS, malicious_emails


def valid_register_payload(**overrides):
    payload = {
        "email": "jane.doe@example.com",
        "password": "secure-pass-1",
        "first_name": "Jane",
        "last_name": "Doe",
        "phone": "(303) 555-0100",
        "state": "Washington",
    }
    payload.update(overrides)
    return payload


class RegisterApiValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = reverse("auth-register")

    def test_valid_registration(self):
        response = self.client.post(self.url, valid_register_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_rejects_missing_required_fields(self):
        response = self.client.post(self.url, {"email": "x@example.com", "password": "secure-pass-1"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_short_password(self):
        response = self.client.post(
            self.url,
            valid_register_payload(password="short"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_malicious_first_name(self):
        for payload in [p for p in STRICT_FIELD_ATTACKS if p != "admin'--"]:
            with self.subTest(payload=payload):
                response = self.client.post(
                    self.url,
                    valid_register_payload(first_name=payload),
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_malicious_email(self):
        for email in malicious_emails():
            with self.subTest(email=email):
                response = self.client.post(
                    self.url,
                    valid_register_payload(email=email),
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_malicious_phone(self):
        for payload in STRICT_FIELD_ATTACKS:
            with self.subTest(payload=payload):
                response = self.client.post(
                    self.url,
                    valid_register_payload(phone=payload),
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
