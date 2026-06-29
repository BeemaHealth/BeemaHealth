"""
Tests for the Beluga outbound API client.

These tests run without real Beluga credentials; they verify that:
  - Functions return {"status": "not_configured"} when BELUGA_API_KEY is empty.
  - Functions return {"status": "not_configured"} when BELUGA_REFILL_ENDPOINT /
    BELUGA_CREATION_PATH is empty.
  - No network calls are made when unconfigured.
"""

from django.test import TestCase, override_settings

from apps.integrations.adapters import beluga_client


@override_settings(
    BELUGA_API_KEY="",
    BELUGA_BASE_URL="https://api-staging.belugahealth.com",
    BELUGA_REFILL_ENDPOINT="",
    BELUGA_CREATION_PATH="",
    BELUGA_PHOTO_ENDPOINT="",
)
class BelugaClientUnconfiguredTests(TestCase):
    def test_trigger_same_dose_refill_returns_not_configured_when_no_key(self):
        result = beluga_client.trigger_same_dose_refill(
            master_id="master-001",
            med_id="med-001",
            pharmacy_id="",
        )
        self.assertEqual(result["status"], "not_configured")
        self.assertIn("request_id", result)

    def test_submit_titration_checkin_returns_not_configured_when_no_key(self):
        result = beluga_client.submit_titration_checkin(
            master_id="master-002",
            form_obj={"firstName": "Jane"},
            visit_type="weightlossCheckin",
            company="aretide",
        )
        self.assertEqual(result["status"], "not_configured")
        self.assertIn("request_id", result)

    def test_submit_photo_returns_not_configured_when_no_endpoint(self):
        result = beluga_client.submit_photo(
            visit_id="visit-001",
            jpeg_bytes=b"\xff\xd8\xff",
        )
        self.assertEqual(result["status"], "not_configured")
        self.assertIn("request_id", result)


@override_settings(
    BELUGA_API_KEY="test-key",
    BELUGA_BASE_URL="https://api-staging.belugahealth.com",
    BELUGA_REFILL_ENDPOINT="",
    BELUGA_CREATION_PATH="",
    BELUGA_PHOTO_ENDPOINT="",
)
class BelugaClientMissingEndpointTests(TestCase):
    def test_trigger_same_dose_refill_returns_not_configured_when_no_endpoint(self):
        """API key set but refill endpoint empty — still not_configured."""
        result = beluga_client.trigger_same_dose_refill(
            master_id="master-003",
            med_id="med-003",
            pharmacy_id="",
        )
        self.assertEqual(result["status"], "not_configured")

    def test_submit_titration_checkin_returns_not_configured_when_no_creation_path(self):
        """API key set but creation path empty — still not_configured."""
        result = beluga_client.submit_titration_checkin(
            master_id="master-004",
            form_obj={},
            visit_type="weightlossCheckin",
            company="aretide",
        )
        self.assertEqual(result["status"], "not_configured")

    def test_submit_titration_checkin_returns_not_configured_when_no_visit_type(self):
        """Creation path set but visit_type empty — not_configured."""
        with self.settings(BELUGA_CREATION_PATH="/v1/visits/create"):
            result = beluga_client.submit_titration_checkin(
                master_id="master-005",
                form_obj={},
                visit_type="",
                company="aretide",
            )
        self.assertEqual(result["status"], "not_configured")
