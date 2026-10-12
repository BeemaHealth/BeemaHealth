from django.test import TestCase, override_settings

from apps.integrations.adapters import get_network_adapter
from apps.integrations.adapters.beluga import (
    BelugaAdapter,
    FakeBelugaTransport,
    TransportError,
    TransportResponse,
)
from apps.integrations.exceptions import NotConfigured, PayloadInvalid
from apps.integrations.models import OutboundCall

SETTINGS = {
    "BELUGA_API_KEY": "key-123",
    "BELUGA_BASE_URL": "https://beluga.test",
    "BELUGA_VISIT_PATH": "/visit/create",
    "BELUGA_CHAT_PATH": "/chat/send",
}
BODY = {
    "formObj": {"firstName": "Pat", "lastName": "Tester", "patientPreference": [{"medId": "M1"}]},
    "masterId": "m-1",
    "visitType": "weightloss",
    "company": "beema",
}


def adapter(*responses):
    sleeps: list[int] = []
    transport = FakeBelugaTransport(list(responses) or None)
    return BelugaAdapter(transport, sleep=sleeps.append), transport, sleeps


@override_settings(**SETTINGS)
class SubmitVisitTests(TestCase):
    def test_success_with_masterid_string_data(self):
        a, transport, _ = adapter(TransportResponse(200, {"status": 200, "data": "m-1"}))
        result = a.submit_visit(BODY)
        self.assertTrue(result.ok)
        self.assertEqual(result.master_id, "m-1")
        call = transport.calls[0]
        self.assertEqual(call["url"], "https://beluga.test/visit/create")
        self.assertEqual(call["headers"]["Authorization"], "Bearer key-123")
        self.assertEqual(call["timeout"], 20)

    def test_success_with_visit_id_dict(self):
        a, _, _ = adapter(TransportResponse(200, {"status": 200, "data": {"masterId": "m-1", "visitId": "v-9"}}))
        result = a.submit_visit(BODY)
        self.assertEqual((result.master_id, result.visit_id), ("m-1", "v-9"))

    def test_outbound_call_is_logged_redacted(self):
        a, _, _ = adapter(TransportResponse(200, {"status": 200, "data": "m-1"}))
        a.submit_visit(BODY)
        call = OutboundCall.objects.get()
        self.assertEqual((call.vendor, call.endpoint_name, call.ok, call.attempts, call.status_code), ("beluga", "create_visit", True, 1, 200))
        self.assertEqual(call.request_summary["masterId"], "m-1")
        self.assertNotIn("Pat", str(call.request_summary))
        self.assertNotIn("Tester", str(call.request_summary))

    def test_retries_5xx_then_succeeds_with_backoff(self):
        a, transport, sleeps = adapter(
            TransportResponse(503), TransportResponse(502), TransportResponse(200, {"status": 200, "data": "m-1"})
        )
        result = a.submit_visit(BODY)
        self.assertTrue(result.ok)
        self.assertEqual(len(transport.calls), 3)
        self.assertEqual(sleeps, [1, 2])
        self.assertEqual(OutboundCall.objects.get().attempts, 3)

    def test_gives_up_after_three_attempts(self):
        a, transport, _ = adapter(TransportResponse(500))
        result = a.submit_visit(BODY)
        self.assertFalse(result.ok)
        self.assertEqual(result.error, "http_500")
        self.assertEqual(len(transport.calls), 3)
        call = OutboundCall.objects.get()
        self.assertFalse(call.ok)
        self.assertEqual(call.attempts, 3)

    def test_transport_errors_are_retried(self):
        a, transport, _ = adapter(TransportError("Timeout"), TransportResponse(200, {"status": 200, "data": "m-1"}))
        self.assertTrue(a.submit_visit(BODY).ok)
        self.assertEqual(len(transport.calls), 2)

    def test_persistent_transport_error_returns_failure_without_details(self):
        a, _, _ = adapter(TransportError("ConnectionError"))
        result = a.submit_visit(BODY)
        self.assertFalse(result.ok)
        self.assertEqual(result.error, "transport_error:ConnectionError")
        self.assertIsNone(OutboundCall.objects.get().status_code)

    def test_4xx_is_not_retried(self):
        a, transport, _ = adapter(TransportResponse(400, {"status": 400, "error": "State not valid"}))
        result = a.submit_visit(BODY)
        self.assertFalse(result.ok)
        self.assertEqual(len(transport.calls), 1)

    def test_http_200_with_error_body_is_a_failure(self):
        a, _, _ = adapter(TransportResponse(200, {"status": 400, "error": "Patient not eligible for new visit"}))
        result = a.submit_visit(BODY)
        self.assertFalse(result.ok)
        self.assertEqual(result.error, "vendor_rejected")

    def test_vendor_error_text_is_not_copied_into_logs(self):
        a, _, _ = adapter(TransportResponse(400, {"status": 400, "error": "Jane Doe 555-0100"}))
        a.submit_visit(BODY)
        self.assertNotIn("Jane", OutboundCall.objects.get().error)

    def test_request_bodies_never_logged(self):
        a, _, _ = adapter(TransportResponse(200, {"status": 200, "data": "m-1"}))
        with self.assertLogs("apps.integrations.adapters.beluga", level="INFO") as logs:
            a.submit_visit(BODY)
        self.assertNotIn("Tester", "\n".join(logs.output))
        self.assertNotIn("key-123", "\n".join(logs.output))

    @override_settings(BELUGA_API_KEY="")
    def test_missing_api_key_raises_not_configured_and_sends_nothing(self):
        a, transport, _ = adapter()
        with self.assertRaises(NotConfigured):
            a.submit_visit(BODY)
        self.assertEqual(transport.calls, [])

    @override_settings(BELUGA_VISIT_PATH="")
    def test_missing_path_raises_not_configured(self):
        a, _, _ = adapter()
        with self.assertRaises(NotConfigured):
            a.submit_visit(BODY)


@override_settings(**SETTINGS)
class ChatAndFetchTests(TestCase):
    def test_send_message_posts_documented_body(self):
        a, transport, _ = adapter(TransportResponse(200, {"status": 200}))
        result = a.send_message(master_id="m-1", content="Hello doc", first_name="Pat", last_name="Tester")
        self.assertTrue(result.ok)
        self.assertEqual(
            transport.calls[0]["json"],
            {"firstName": "Pat", "lastName": "Tester", "content": "Hello doc", "isMedia": False, "masterId": "m-1"},
        )
        summary = OutboundCall.objects.get().request_summary
        self.assertEqual(summary, {"masterId": "m-1", "isMedia": False, "content_length": 9})

    def test_send_message_rejects_empty_values_before_sending(self):
        a, transport, _ = adapter()
        with self.assertRaises(PayloadInvalid):
            a.send_message(master_id="m-1", content="  ", first_name="Pat", last_name="Tester")
        self.assertEqual(transport.calls, [])

    def test_send_message_failure_is_reported(self):
        a, _, _ = adapter(TransportResponse(500))
        self.assertFalse(a.send_message(master_id="m-1", content="hi", first_name="P", last_name="T").ok)

    def test_fetch_visit_parses_rx_history_and_encodes_id(self):
        body = {
            "status": 200, "masterId": "m 1", "visitStatus": "resolved", "resolvedStatus": "closed",
            "data": {"rxHistory": [{"rxId": "R1", "medId": "M1", "name": "Sema", "strength": "0.25mg", "quantity": "1", "refills": "0"}]},
        }
        a, transport, _ = adapter(TransportResponse(200, body))
        snap = a.fetch_visit("m 1")
        self.assertEqual(transport.calls[0]["method"], "GET")
        self.assertTrue(transport.calls[0]["url"].endswith("/visit/externalFetch/m%201"))
        self.assertEqual((snap.visit_status, snap.resolved_status), ("resolved", "closed"))
        self.assertEqual(snap.rx_history[0]["rx_id"], "R1")

    def test_fetch_visit_not_found_returns_none(self):
        a, _, _ = adapter(TransportResponse(200, {"status": 400, "error": "Visit not found"}))
        self.assertIsNone(a.fetch_visit("nope"))

    def test_fetch_visit_auth_error_returns_none(self):
        a, _, _ = adapter(TransportResponse(400))
        self.assertIsNone(a.fetch_visit("m-1"))


class ParseAndRegistryTests(TestCase):
    def test_parse_webhook(self):
        parsed = BelugaAdapter().parse_webhook({"event": "PHARMACY_ORDER_SHIPPED", "masterId": "m", "orderId": "o"})
        self.assertEqual((parsed.event, parsed.master_id, parsed.order_id), ("PHARMACY_ORDER_SHIPPED", "m", "o"))

    def test_parse_webhook_requires_event(self):
        with self.assertRaises(PayloadInvalid):
            BelugaAdapter().parse_webhook({"masterId": "m"})

    def test_capabilities(self):
        self.assertIn("chat", BelugaAdapter().capabilities())

    def test_registry_defaults_to_beluga_and_rejects_unknown(self):
        self.assertIsInstance(get_network_adapter(None), BelugaAdapter)

        class Org:
            integration_adapter = "nope"

        with self.assertRaises(NotConfigured):
            get_network_adapter(Org())
