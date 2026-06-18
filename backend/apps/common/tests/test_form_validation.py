from django.test import TestCase

from apps.common.validation.form import (
    is_valid_email,
    is_valid_person_name,
    is_valid_phone,
    validate_height_ft,
    validate_optional_numeric_lab,
    validate_weight_lbs,
)
from apps.common.validation.payloads import (
    KNOWN_NAME_FORMAT_PASSES,
    SQL_INJECTION,
    STRICT_FIELD_ATTACKS,
    XSS_PAYLOADS,
    malicious_emails,
)


class FormValidationTests(TestCase):
    def test_valid_email(self):
        self.assertTrue(is_valid_email("user@example.com"))

    def test_rejects_malicious_emails(self):
        for email in malicious_emails():
            with self.subTest(email=email):
                self.assertFalse(is_valid_email(email))

    def test_valid_phone(self):
        self.assertTrue(is_valid_phone("(303) 555-0100"))

    def test_rejects_malicious_phone(self):
        for payload in STRICT_FIELD_ATTACKS:
            with self.subTest(payload=payload):
                self.assertFalse(is_valid_phone(payload))

    def test_rejects_malicious_names_except_known_passes(self):
        for payload in [*STRICT_FIELD_ATTACKS, *XSS_PAYLOADS, "12345"]:
            if payload in KNOWN_NAME_FORMAT_PASSES:
                continue
            with self.subTest(payload=payload):
                self.assertFalse(is_valid_person_name(payload))

    def test_known_name_format_passes(self):
        for payload in KNOWN_NAME_FORMAT_PASSES:
            with self.subTest(payload=payload):
                self.assertTrue(is_valid_person_name(payload))

    def test_numeric_fields_reject_sql(self):
        for payload in SQL_INJECTION:
            with self.subTest(payload=payload):
                self.assertIsNotNone(validate_height_ft(payload))
                self.assertIsNotNone(validate_weight_lbs(payload))
                self.assertIsNotNone(validate_optional_numeric_lab(payload, "A1C"))
