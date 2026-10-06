from django.test import TestCase

from apps.common.validation.form import (
    is_valid_email,
    is_valid_optional_member_id,
    is_valid_person_name,
    is_valid_phone,
    is_valid_preferred_first_name,
    is_valid_shipping_preference,
    validate_height_ft,
    validate_optional_blood_pressure,
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
                self.assertIsNotNone(validate_optional_blood_pressure(payload))

    def test_blood_pressure_format(self):
        self.assertIsNone(validate_optional_blood_pressure(""))
        self.assertIsNone(validate_optional_blood_pressure("120/80"))
        self.assertIsNone(validate_optional_blood_pressure("157/32"))
        self.assertIsNotNone(validate_optional_blood_pressure("120"))
        self.assertIsNotNone(validate_optional_blood_pressure("80/120"))

    def test_preferred_first_name_letters_only(self):
        self.assertTrue(is_valid_preferred_first_name("Matt"))
        self.assertTrue(is_valid_preferred_first_name(""))
        self.assertFalse(is_valid_preferred_first_name("matt1"))
        self.assertFalse(is_valid_preferred_first_name("matt a"))

    def test_shipping_preference_values(self):
        self.assertTrue(is_valid_shipping_preference("pickup"))
        self.assertTrue(is_valid_shipping_preference("shipping"))
        self.assertFalse(is_valid_shipping_preference("Standard"))

    def test_optional_member_id(self):
        self.assertTrue(is_valid_optional_member_id(""))
        self.assertTrue(is_valid_optional_member_id("ABC123-45"))
        self.assertFalse(is_valid_optional_member_id("' OR 1=1--"))
