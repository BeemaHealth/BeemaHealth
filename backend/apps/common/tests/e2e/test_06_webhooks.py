"""Scenario 6: webhook robustness through the real endpoints."""
from __future__ import annotations

import json

from django.core.management import call_command
from django.test import Client
from django.utils import timezone

from apps.billing.models import Invoice, Subscription
from apps.clinical.models import DoseLog, Prescription, Visit
from apps.fulfillment.models import Order, Shipment
from apps.integrations.models import InboundEvent
from apps.messaging.models import Message

from .base import BELUGA_SECRET, E2ECase, Actor, beluga_event, glue_buy, glue_submitted, rx_event


class BelugaWebhookTests(E2ECase):
    def setUp(self):
        super().setUp()
        self.actor, self.treatment, self.invoice, self.master = glue_submitted(self, "semaglutide-monthly")

    def test_replayed_and_duplicate_rx_creates_one_prescription(self):
        payload = rx_event(self.master)
        for _ in range(3):
            self.assertEqual(self.post_beluga(payload).status_code, 200)
        self.assertEqual(InboundEvent.objects.filter(event_type="RX_WRITTEN").count(), 1)
        self.assertEqual(Prescription.objects.filter(treatment=self.treatment).count(), 1)
        doses = DoseLog.objects.filter(treatment=self.treatment).count()
        # Same prescription id in a re-keyed payload (new dedupe key) still adds no prescription or doses.
        self.post_beluga({**payload, "retry": 2})
        self.assertEqual(Prescription.objects.filter(treatment=self.treatment).count(), 1)
        self.assertEqual(DoseLog.objects.filter(treatment=self.treatment).count(), doses)

    def test_duplicate_doctor_chat_creates_one_message_and_one_alert(self):
        payload = beluga_event(self.master, "DOCTOR_CHAT", content="Hello there")
        for _ in range(3):
            self.post_beluga(payload)
        self.assertEqual(Message.objects.filter(sender_role="doctor").count(), 1)
        self.assertEqual(self.notifier.keys().count("new_message"), 2)  # sms and email, once

    def test_out_of_order_conclusion_before_rx(self):
        self.post_beluga(beluga_event(self.master, "CONSULT_CONCLUDED", visitOutcome="prescribed"))
        self.post_beluga(rx_event(self.master))
        self.treatment.refresh_from_db()
        self.assertEqual(self.treatment.status, "prescribed")
        self.assertEqual(Prescription.objects.filter(treatment=self.treatment).count(), 1)
        self.assertEqual(InboundEvent.objects.filter(status="failed").count(), 0)

    def test_delivery_before_shipment_never_moves_backwards(self):
        self.post_beluga(rx_event(self.master))
        self.post_beluga(beluga_event(self.master, "CONSULT_CONCLUDED", visitOutcome="prescribed"))
        self.post_beluga(beluga_event(self.master, "PHARMACY_ORDER_DELIVERED", orderId="O1", info={"deliveredDate": "2026-10-06"}))
        self.post_beluga(beluga_event(self.master, "PHARMACY_ORDER_SHIPPED", orderId="O1", info={"carrier": "UPS", "tracking": "T"}))
        self.post_beluga(beluga_event(self.master, "PACKAGE_IN_TRANSIT", orderId="O1", info={"tracking": "T"}))
        order = Order.objects.get(treatment=self.treatment)
        self.assertEqual(order.status, "delivered")
        self.assertEqual(Shipment.objects.get(order=order).status, "delivered")
        self.assertEqual(Order.objects.filter(treatment=self.treatment).count(), 1)

    def test_package_event_for_unknown_order_fails_then_succeeds_on_retry(self):
        self.post_beluga(rx_event(self.master))
        self.post_beluga(beluga_event(self.master, "CONSULT_CONCLUDED", visitOutcome="prescribed"))
        resp = self.post_beluga(beluga_event(self.master, "PACKAGE_IN_TRANSIT", orderId="LATE", info={"tracking": "T9"}))
        self.assertEqual(resp.status_code, 200)
        event = InboundEvent.objects.get(event_type="PACKAGE_IN_TRANSIT")
        self.assertEqual(event.status, "failed")
        self.assertIsNotNone(event.next_attempt_at)
        self.post_beluga(beluga_event(self.master, "PHARMACY_ORDER_SHIPPED", orderId="LATE", info={"carrier": "UPS", "tracking": "T9"}))
        stats = __import__("apps.integrations.webhooks", fromlist=["x"]).process_pending(now=timezone.now() + timezone.timedelta(hours=2))
        event.refresh_from_db()
        self.assertEqual(event.status, "processed", stats)

    def test_unknown_master_id_is_stored_failed_and_acknowledged(self):
        resp = self.post_beluga(beluga_event("no-such-master", "RX_WRITTEN", medsPrescribed=[{"rxId": "X"}]))
        self.assertEqual(resp.status_code, 200)
        event = InboundEvent.objects.get(external_ref="no-such-master")
        self.assertEqual(event.status, "failed")
        self.assertEqual(Prescription.objects.count(), 0)
        self.treatment.refresh_from_db()
        self.assertEqual(self.treatment.status, "pending_visit")

    def test_bad_missing_or_empty_secret_is_rejected_and_nothing_stored(self):
        before = InboundEvent.objects.count()
        payload = rx_event(self.master)
        self.assertEqual(self.post_beluga(payload, secret="wrong").status_code, 401)
        self.assertEqual(self.post_beluga(payload, secret=None).status_code, 401)
        self.assertEqual(self.post_beluga(payload, secret="").status_code, 401)
        self.assertEqual(self.post_beluga(payload, secret=BELUGA_SECRET + "x").status_code, 401)
        self.assertEqual(InboundEvent.objects.count(), before)
        self.assertEqual(Prescription.objects.count(), 0)

    def test_oversized_body_is_rejected(self):
        before = InboundEvent.objects.count()
        body = json.dumps({"masterId": self.master, "event": "DOCTOR_CHAT", "content": "x" * (2 * 1024 * 1024 + 10)})
        self.assertEqual(self.post_beluga(body).status_code, 413)
        self.assertEqual(InboundEvent.objects.count(), before)

    def test_malformed_json_is_acknowledged_and_parked_without_the_body(self):
        resp = self.post_beluga(b'{"masterId": "' + self.master.encode() + b'", "event": ')
        self.assertEqual(resp.status_code, 200)
        event = InboundEvent.objects.get(event_type="malformed")
        self.assertEqual(event.status, "dead")
        self.assertNotIn(self.master, json.dumps(event.raw_payload))
        for raw in (b"[1, 2]", b'"text"', b"null", b""):
            self.assertEqual(self.post_beluga(raw).status_code, 200)
        self.treatment.refresh_from_db()
        self.assertEqual(self.treatment.status, "pending_visit")

    def test_unknown_event_and_missing_master_id(self):
        self.assertEqual(self.post_beluga({"masterId": self.master, "event": "SOMETHING_NEW"}).status_code, 200)
        self.assertEqual(InboundEvent.objects.get(event_type="SOMETHING_NEW").status, "ignored")
        self.assertEqual(self.post_beluga({"event": "RX_WRITTEN"}).status_code, 200)
        self.assertNotEqual(InboundEvent.objects.get(event_type="RX_WRITTEN").status, "processed")

    def test_wrong_method_is_not_allowed(self):
        self.assertEqual(Client().get("/api/v1/webhooks/beluga/").status_code, 405)

    def test_failed_events_back_off_and_die_after_max_attempts(self):
        self.post_beluga(beluga_event("ghost", "DOCTOR_CHAT", content="hi"))
        for _ in range(10):
            call_command("process_pending_events", stdout=__import__("io").StringIO())
            InboundEvent.objects.filter(status="failed").update(next_attempt_at=timezone.now() - timezone.timedelta(seconds=1))
        self.assertEqual(InboundEvent.objects.get(external_ref="ghost").status, "dead")


class StripeWebhookTests(E2ECase):
    def setUp(self):
        super().setUp()
        self.actor = Actor(self)
        self.actor.start()
        self.actor.run()
        self.actor.answer("checkout", {"plan_slug": "semaglutide-monthly"})
        resp = self.actor.checkout("semaglutide-monthly", None)
        self.invoice = Invoice.objects.get(pk=resp.json()["invoice_id"])
        self.pi = self.invoice.stripe_payment_intent_id

    def test_payment_succeeded_replay_does_not_double_start(self):
        for i in range(3):
            self.assertEqual(self.stripe_payment_succeeded(self.pi, self.invoice.total_cents).status_code, 200)
        # Same payment re-sent as a brand new Stripe event.
        self.stripe_payment_succeeded(self.pi, self.invoice.total_cents, event_id="evt_second_delivery")
        self.assertEqual(Subscription.objects.filter(patient=self.invoice.patient).count(), 1)
        self.assertEqual(Invoice.objects.filter(patient=self.invoice.patient, status="paid").count(), 1)
        from apps.clinical.models import Treatment
        from apps.fulfillment.models import ShipmentBatch

        treatment = Treatment.objects.get(patient=self.invoice.patient)
        self.assertEqual(Treatment.objects.filter(patient=self.invoice.patient).count(), 1)
        self.assertEqual(treatment.status, "awaiting_visit_completion")
        self.assertEqual(ShipmentBatch.objects.count(), 1)

    def test_bad_signature_and_wrong_secret_are_rejected(self):
        self.assertEqual(self.post_stripe("payment_intent.succeeded", {"id": self.pi}, "evt_x", secret="whsec_other").status_code, 401)
        resp = Client().post("/api/v1/webhooks/stripe/", data=b"{}", content_type="application/json", HTTP_STRIPE_SIGNATURE="t=1,v1=bad")
        self.assertEqual(resp.status_code, 401)
        self.assertEqual(Client().post("/api/v1/webhooks/stripe/", data=b"{}", content_type="application/json").status_code, 401)
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, "open")

    def test_amount_mismatch_never_marks_paid(self):
        self.stripe_payment_succeeded(self.pi, self.invoice.total_cents - 1, event_id="evt_short")
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, "open")
        self.assertEqual(InboundEvent.objects.get(dedupe_key__isnull=False, event_type="payment_intent.succeeded").status, "failed")
        self.assertEqual(Subscription.objects.count(), 0)

    def test_unknown_payment_intent_is_failed_not_fatal(self):
        resp = self.stripe_payment_succeeded("pi_unknown", 100, event_id="evt_unknown")
        self.assertEqual(resp.status_code, 200)
        self.assertNotEqual(InboundEvent.objects.get(external_ref="pi_unknown").status, "processed")

    def test_late_failure_after_success_does_not_undo_payment(self):
        self.stripe_payment_succeeded(self.pi, self.invoice.total_cents)
        self.post_stripe("payment_intent.payment_failed", {"id": self.pi, "last_payment_error": {"code": "card_declined"}}, "evt_late_fail")
        self.invoice.refresh_from_db()
        self.assertEqual(self.invoice.status, "paid")
        self.assertEqual(Subscription.objects.count(), 1)
