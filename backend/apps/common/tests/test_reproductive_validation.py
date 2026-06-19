from django.test import SimpleTestCase

from apps.common.validation.reproductive import needs_reproductive_questions


class ReproductiveValidationTests(SimpleTestCase):
    def test_skips_only_male_male(self):
        self.assertFalse(needs_reproductive_questions("male", "male"))

    def test_shows_male_birth_female_identity(self):
        self.assertTrue(needs_reproductive_questions("male", "female"))

    def test_shows_female_birth(self):
        self.assertTrue(needs_reproductive_questions("female", "male"))

    def test_skips_male_birth_missing_identity(self):
        self.assertFalse(needs_reproductive_questions("male", ""))
        self.assertFalse(needs_reproductive_questions("male", None))

    def test_conservative_unknown(self):
        self.assertTrue(needs_reproductive_questions("male", "unknown"))
        self.assertTrue(needs_reproductive_questions("", ""))
