from django.test import SimpleTestCase

from apps.common.validation.dob import validate_iso_date_of_birth
from apps.common.validation.payloads import SQL_INJECTION, XSS_PAYLOADS


class DobValidationTests(SimpleTestCase):
    def test_valid_adult_dob(self):
        self.assertIsNone(validate_iso_date_of_birth("1990-01-15"))

    def test_rejects_minor(self):
        self.assertIsNotNone(validate_iso_date_of_birth("2015-01-01"))

    def test_rejects_malicious_payloads(self):
        for payload in [*SQL_INJECTION, *XSS_PAYLOADS]:
            with self.subTest(payload=payload):
                self.assertIsNotNone(validate_iso_date_of_birth(payload))
