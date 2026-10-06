from django.test import SimpleTestCase

from apps.common.validation.lifestyle import validate_lifestyle_section
from apps.common.validation.payloads import SQL_INJECTION, XSS_PAYLOADS


class LifestyleValidationTests(SimpleTestCase):
    def test_accepts_structured_lifestyle_values(self):
        errors = validate_lifestyle_section(
            {
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
        )
        self.assertEqual(errors, {})

    def test_accepts_new_diet_options(self):
        for diet in (
            "mediterranean",
            "calorie_controlled",
            "intermittent_fasting",
            "high_carb",
            "mixed",
        ):
            with self.subTest(diet=diet):
                errors = validate_lifestyle_section({"diet": diet})
                self.assertEqual(errors, {})

    def test_accepts_new_binge_and_night_eating_options(self):
        for binge in ("weekly", "daily"):
            with self.subTest(binge=binge):
                errors = validate_lifestyle_section({"binge": binge})
                self.assertEqual(errors, {})

        errors = validate_lifestyle_section({"night_eating": "most_nights"})
        self.assertEqual(errors, {})

    def test_rejects_legacy_and_free_text_enum_values(self):
        for payload in ("Balanced", "weekly_plus", "Yes, most nights", SQL_INJECTION[0]):
            with self.subTest(payload=payload):
                errors = validate_lifestyle_section({"diet": payload})
                self.assertIn("lifestyle", errors)

        errors = validate_lifestyle_section({"binge": "weekly_plus"})
        self.assertIn("lifestyle", errors)

    def test_rejects_invalid_enum_values(self):
        errors = validate_lifestyle_section({"diet": SQL_INJECTION[0]})
        self.assertIn("lifestyle", errors)

    def test_rejects_malicious_drugs_detail(self):
        errors = validate_lifestyle_section(
            {"drugs": "yes", "drugs_detail": XSS_PAYLOADS[0]}
        )
        self.assertIn("lifestyle", errors)

    def test_rejects_drugs_detail_when_drug_use_is_no(self):
        errors = validate_lifestyle_section(
            {"drugs": "no", "drugs_detail": "Cannabis"}
        )
        self.assertIn("lifestyle", errors)
