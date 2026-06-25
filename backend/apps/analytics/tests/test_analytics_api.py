from django.test import TestCase

from apps.analytics.validation import sanitize_event_properties, validate_event_name


class AnalyticsValidationTests(TestCase):
    def test_valid_event_name(self):
        self.assertEqual(validate_event_name("step_viewed"), "step_viewed")

    def test_invalid_event_name_rejected(self):
        with self.assertRaises(ValueError):
            validate_event_name("patient_name_logged")

    def test_phi_property_key_rejected(self):
        with self.assertRaises(ValueError):
            sanitize_event_properties({"email": "test@example.com"})

    def test_allowed_properties_pass(self):
        props = sanitize_event_properties({"duration_ms": 1200, "step_index": 2})
        self.assertEqual(props["duration_ms"], 1200)
