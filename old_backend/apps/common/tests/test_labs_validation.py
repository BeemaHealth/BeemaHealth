from django.test import SimpleTestCase

from apps.common.validation.intake import validate_labs_section
from apps.common.validation.payloads import SQL_INJECTION, XSS_PAYLOADS


class LabsValidationTests(SimpleTestCase):
    def test_accepts_empty_optional_lab_fields(self):
        errors = validate_labs_section(
            {"bp": "", "a1c": "", "glucose": "", "cholesterol": ""}
        )
        self.assertEqual(errors, {})

    def test_accepts_valid_lab_values_for_all_fields(self):
        errors = validate_labs_section(
            {
                "bp": "120/80",
                "a1c": "5.6",
                "glucose": "95",
                "cholesterol": "180",
            }
        )
        self.assertEqual(errors, {})

    def test_rejects_invalid_blood_pressure(self):
        for payload in ("IkjFHDaafslkjadslfkj", "120", "80/120", SQL_INJECTION[0]):
            with self.subTest(payload=payload):
                errors = validate_labs_section({"bp": payload})
                self.assertIn("labs", errors)

    def test_rejects_invalid_a1c(self):
        for payload in ("abc", "not-a-number", SQL_INJECTION[0]):
            with self.subTest(payload=payload):
                errors = validate_labs_section({"a1c": payload})
                self.assertIn("labs", errors)

    def test_rejects_invalid_glucose(self):
        for payload in ("xyz", "high", SQL_INJECTION[0]):
            with self.subTest(payload=payload):
                errors = validate_labs_section({"glucose": payload})
                self.assertIn("labs", errors)

    def test_rejects_invalid_cholesterol(self):
        for payload in ("bad", "two hundred", SQL_INJECTION[0]):
            with self.subTest(payload=payload):
                errors = validate_labs_section({"cholesterol": payload})
                self.assertIn("labs", errors)

    def test_rejects_xss_in_blood_pressure(self):
        errors = validate_labs_section({"bp": XSS_PAYLOADS[0]})
        self.assertIn("labs", errors)
