import base64
import hashlib
import hmac
import json
import time
from unittest import mock

from django.test import Client, TestCase, override_settings

from apps.integrations import webhooks
from apps.integrations.exceptions import WebhookAuthError, WebhookTooLarge
from apps.integrations.models import InboundEvent

from .helpers import BELUGA_SECRET, post_beluga

PAYLOAD = {"masterId": "m-1", "event": "CONSULT_CANCELED"}
RAW = json.dumps(PAYLOAD).encode()


@override_settings(BELUGA_WEBHOOK_SECRET=BELUGA_SECRET)
class BelugaAuthTests(TestCase):
    def ingest(self, headers):
        return webhooks.ingest("beluga", headers, RAW)

    def test_missing_secret_header_rejected_and_nothing_stored(self):
        with self.assertRaises(WebhookAuthError):
            self.ingest({})
        self.assertEqual(InboundEvent.objects.count(), 0)

    def test_wrong_secret_rejected(self):
        for headers in ({"X-Webhook-Secret": "wrong"}, {"Authorization": "Bearer wrong"}, {"Authorization": "Basic abc"}):
            with self.subTest(headers=headers), self.assertRaises(WebhookAuthError):
                self.ingest(headers)

    def test_prefix_and_suffix_of_secret_rejected(self):
        for guess in (BELUGA_SECRET[:-1], BELUGA_SECRET + "x", BELUGA_SECRET.upper(), ""):
            with self.subTest(guess=guess), self.assertRaises(WebhookAuthError):
                self.ingest({"X-Webhook-Secret": guess})

    def test_both_header_styles_accepted_case_insensitively(self):
        self.assertEqual(self.ingest({"x-webhook-secret": BELUGA_SECRET}).vendor, "beluga")
        InboundEvent.objects.all().delete()
        self.assertEqual(self.ingest({"authorization": f"bearer {BELUGA_SECRET}"}).vendor, "beluga")

    def test_comparison_is_constant_time(self):
        with mock.patch("apps.integrations.webhooks.hmac.compare_digest", wraps=hmac.compare_digest) as spy:
            self.ingest({"X-Webhook-Secret": BELUGA_SECRET})
        spy.assert_called_once()

    @override_settings(BELUGA_WEBHOOK_SECRET="")
    def test_unset_server_secret_fails_closed_even_for_empty_header(self):
        for headers in ({}, {"X-Webhook-Secret": ""}, {"Authorization": "Bearer "}):
            with self.subTest(headers=headers), self.assertRaises(WebhookAuthError):
                self.ingest(headers)

    def test_unknown_vendor_rejected(self):
        with self.assertRaises(WebhookAuthError):
            webhooks.ingest("acme", {}, RAW)


@override_settings(BELUGA_WEBHOOK_SECRET=BELUGA_SECRET)
class IngestTests(TestCase):
    H = {"X-Webhook-Secret": BELUGA_SECRET}

    def test_stores_event_with_sha256_dedupe_key(self):
        event = webhooks.ingest("beluga", self.H, RAW)
        self.assertEqual((event.status, event.event_type, event.external_ref, event.attempts), ("received", "CONSULT_CANCELED", "m-1", 0))
        self.assertEqual(len(event.dedupe_key), 64)
        self.assertEqual(event.dedupe_key, webhooks.make_dedupe_key("beluga", "m-1|", "CONSULT_CANCELED", PAYLOAD))

    def test_key_ignores_json_key_order_and_whitespace(self):
        a = webhooks.ingest("beluga", self.H, b'{"masterId":"m-1","event":"CONSULT_CANCELED"}')
        b = webhooks.ingest("beluga", self.H, b'{ "event": "CONSULT_CANCELED",   "masterId": "m-1" }')
        self.assertEqual(a.pk, b.pk)
        self.assertEqual(InboundEvent.objects.count(), 1)

    def test_duplicate_and_replayed_events_are_stored_once(self):
        first = webhooks.ingest("beluga", self.H, RAW)
        for _ in range(3):
            self.assertEqual(webhooks.ingest("beluga", self.H, RAW).pk, first.pk)
        self.assertEqual(InboundEvent.objects.count(), 1)

    def test_replay_of_processed_event_does_not_reset_it(self):
        first = webhooks.ingest("beluga", self.H, RAW)
        InboundEvent.objects.filter(pk=first.pk).update(status="processed")
        again = webhooks.ingest("beluga", self.H, RAW)
        self.assertEqual(again.status, "processed")

    def test_different_payload_or_order_id_creates_new_event(self):
        webhooks.ingest("beluga", self.H, RAW)
        webhooks.ingest("beluga", self.H, json.dumps({**PAYLOAD, "content": "x"}).encode())
        webhooks.ingest("beluga", self.H, json.dumps({**PAYLOAD, "orderId": "o1"}).encode())
        self.assertEqual(InboundEvent.objects.count(), 3)

    def test_dedupe_race_returns_existing_row(self):
        first = webhooks.ingest("beluga", self.H, RAW)
        with mock.patch.object(InboundEvent.objects, "get_or_create", side_effect=__import__("django").db.IntegrityError):
            again = webhooks.ingest("beluga", self.H, RAW)
        self.assertEqual(again.pk, first.pk)

    def test_malformed_json_is_stored_dead_without_body(self):
        event = webhooks.ingest("beluga", self.H, b"{not json patient name Jane")
        self.assertEqual((event.status, event.last_error, event.event_type), ("dead", "malformed_json", "malformed"))
        self.assertNotIn("Jane", json.dumps(event.raw_payload))

    def test_non_object_json_is_stored_dead(self):
        for body in (b"[1,2]", b'"str"', b"null", b"123", b"\xff\xfe"):
            with self.subTest(body=body):
                self.assertEqual(webhooks.ingest("beluga", self.H, body).status, "dead")

    def test_oversized_body_rejected_before_parsing(self):
        with override_settings(WEBHOOK_MAX_BODY_BYTES=100), self.assertRaises(WebhookTooLarge):
            webhooks.ingest("beluga", self.H, b"x" * 101)
        self.assertEqual(InboundEvent.objects.count(), 0)

    def test_body_at_cap_is_accepted(self):
        pad = "y" * 20
        body = json.dumps({**PAYLOAD, "pad": pad}).encode()
        with override_settings(WEBHOOK_MAX_BODY_BYTES=len(body)):
            self.assertEqual(webhooks.ingest("beluga", self.H, body).event_type, "CONSULT_CANCELED")

    def test_event_without_master_id_still_stored(self):
        event = webhooks.ingest("beluga", self.H, b'{"event":"CONSULT_CANCELED"}')
        self.assertEqual(event.external_ref, "")

    def test_ingest_never_processes(self):
        with mock.patch("apps.integrations.webhooks.process") as process:
            webhooks.ingest("beluga", self.H, RAW)
        process.assert_not_called()


LIFEFILE = {"LIFEFILE_WEBHOOK_USER": "lf", "LIFEFILE_WEBHOOK_PASSWORD": "pw"}


def basic(user, password):
    return {"Authorization": "Basic " + base64.b64encode(f"{user}:{password}".encode()).decode()}


@override_settings(**LIFEFILE)
class LifeFileIngestTests(TestCase):
    body = json.dumps({"orderId": "42", "status": "shipped", "eventId": "e1"}).encode()

    def test_good_credentials_store_event(self):
        event = webhooks.ingest("lifefile", basic("lf", "pw"), self.body)
        self.assertEqual((event.vendor, event.external_ref, event.event_type), ("lifefile", "42", "shipped"))

    def test_bad_credentials_and_formats_rejected(self):
        for headers in (basic("lf", "bad"), basic("bad", "pw"), {}, {"Authorization": "Basic !!!"}, {"Authorization": "Bearer pw"}):
            with self.subTest(headers=headers), self.assertRaises(WebhookAuthError):
                webhooks.ingest("lifefile", headers, self.body)

    @override_settings(LIFEFILE_WEBHOOK_USER="", LIFEFILE_WEBHOOK_PASSWORD="")
    def test_unset_credentials_fail_closed(self):
        with self.assertRaises(WebhookAuthError):
            webhooks.ingest("lifefile", basic("", ""), self.body)


STRIPE_SECRET = "whsec_test"


def stripe_headers(body: bytes, secret: str = STRIPE_SECRET, ts: int | None = None) -> dict:
    ts = ts or int(time.time())
    sig = hmac.new(secret.encode(), f"{ts}.".encode() + body, hashlib.sha256).hexdigest()
    return {"Stripe-Signature": f"t={ts},v1={sig}"}


@override_settings(STRIPE_WEBHOOK_SECRET=STRIPE_SECRET)
class StripeIngestTests(TestCase):
    body = json.dumps(
        {"id": "evt_1", "object": "event", "type": "payment_intent.succeeded", "data": {"object": {"id": "pi_1"}}}
    ).encode()

    def test_valid_signature_stores_event(self):
        event = webhooks.ingest("stripe", stripe_headers(self.body), self.body)
        self.assertEqual((event.vendor, event.event_type, event.external_ref), ("stripe", "payment_intent.succeeded", "pi_1"))

    def test_duplicate_stripe_delivery_stored_once(self):
        a = webhooks.ingest("stripe", stripe_headers(self.body), self.body)
        b = webhooks.ingest("stripe", stripe_headers(self.body), self.body)
        self.assertEqual(a.pk, b.pk)

    def test_bad_signatures_rejected(self):
        for headers in (
            stripe_headers(self.body, secret="other"),
            stripe_headers(self.body, ts=int(time.time()) - 3600),
            {"Stripe-Signature": "garbage"},
            {},
        ):
            with self.subTest(headers=headers), self.assertRaises(WebhookAuthError):
                webhooks.ingest("stripe", headers, self.body)
        self.assertEqual(InboundEvent.objects.count(), 0)

    def test_tampered_body_rejected(self):
        headers = stripe_headers(self.body)
        with self.assertRaises(WebhookAuthError):
            webhooks.ingest("stripe", headers, self.body.replace(b"pi_1", b"pi_2"))

    @override_settings(STRIPE_WEBHOOK_SECRET="")
    def test_unset_secret_fails_closed(self):
        with self.assertRaises(WebhookAuthError):
            webhooks.ingest("stripe", stripe_headers(self.body, secret=""), self.body)


@override_settings(BELUGA_WEBHOOK_SECRET=BELUGA_SECRET)
class ViewTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)

    def test_csrf_exempt_and_returns_200(self):
        response = post_beluga(self.client, PAYLOAD)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(InboundEvent.objects.count(), 1)

    def test_duplicate_returns_200_without_second_row(self):
        post_beluga(self.client, PAYLOAD)
        self.assertEqual(post_beluga(self.client, PAYLOAD).status_code, 200)
        self.assertEqual(InboundEvent.objects.count(), 1)

    def test_missing_or_wrong_secret_is_401_and_stores_nothing(self):
        self.assertEqual(post_beluga(self.client, PAYLOAD, secret=None).status_code, 401)
        self.assertEqual(post_beluga(self.client, PAYLOAD, secret="nope").status_code, 401)
        self.assertEqual(InboundEvent.objects.count(), 0)

    def test_malformed_json_still_returns_200(self):
        self.assertEqual(post_beluga(self.client, b"{oops").status_code, 200)
        self.assertEqual(InboundEvent.objects.get().status, "dead")

    @override_settings(WEBHOOK_MAX_BODY_BYTES=64)
    def test_oversized_body_is_413(self):
        self.assertEqual(post_beluga(self.client, {"masterId": "m", "event": "X", "pad": "z" * 500}).status_code, 413)
        self.assertEqual(InboundEvent.objects.count(), 0)

    def test_only_post_allowed(self):
        self.assertEqual(self.client.get("/api/v1/webhooks/beluga/").status_code, 405)

    def test_persist_failure_is_500_so_vendor_retries(self):
        with mock.patch("apps.integrations.views.webhooks.ingest", side_effect=RuntimeError("db down")):
            self.assertEqual(post_beluga(self.client, PAYLOAD).status_code, 500)

    def test_processing_error_never_reaches_vendor(self):
        with override_settings(INTEGRATIONS_PROCESS_INLINE=True):
            response = post_beluga(self.client, PAYLOAD)  # unknown masterId: handler fails
        self.assertEqual(response.status_code, 200)
        self.assertEqual(InboundEvent.objects.get().status, "failed")

    @override_settings(STRIPE_WEBHOOK_SECRET=STRIPE_SECRET)
    def test_stripe_endpoint_verifies_signature(self):
        body = StripeIngestTests.body
        ok = self.client.post("/api/v1/webhooks/stripe/", data=body, content_type="application/json", **{"HTTP_STRIPE_SIGNATURE": stripe_headers(body)["Stripe-Signature"]})
        bad = self.client.post("/api/v1/webhooks/stripe/", data=body, content_type="application/json", **{"HTTP_STRIPE_SIGNATURE": "t=1,v1=bad"})
        self.assertEqual((ok.status_code, bad.status_code), (200, 401))

    @override_settings(**LIFEFILE)
    def test_lifefile_endpoint(self):
        body = json.dumps({"orderId": "1", "status": "shipped"})
        ok = self.client.post("/api/v1/webhooks/lifefile/", data=body, content_type="application/json", HTTP_AUTHORIZATION=basic("lf", "pw")["Authorization"])
        self.assertEqual(ok.status_code, 200)
