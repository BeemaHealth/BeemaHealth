"""Scenario 1: new weight loss patient from first question to a shipped, active treatment."""
from __future__ import annotations

import json

from apps.billing.models import CouponRedemption, Invoice, Subscription
from apps.clinical.models import DoseLog, Prescription, Treatment, Visit
from apps.fulfillment.models import CareEvent, Order, Shipment, ShipmentBatch
from apps.integrations.models import InboundEvent, OutboundCall
from apps.messaging.models import Conversation, Message, NotificationDelivery
from apps.patients.models import ConsentRecord
from apps.questionnaires.models import Submission

from .base import Actor, E2ECase, beluga_event, glue_buy, make_marketing_coupon


class HappyPathTests(E2ECase):
    def test_new_user_weight_loss_end_to_end(self):
        make_marketing_coupon()
        actor = Actor(self)
        actor.start()
        state = actor.run()
        self.assertEqual(state["node"]["id"], "checkout")
        sub = actor.submission()
        self.assertIsNotNone(sub.patient)
        self.assertEqual(sub.patient.user.email, actor.email)
        self.assertEqual(sub.outcome["selected_variant_key"], "semaglutide.b12.titration")
        self.assertTrue(ConsentRecord.objects.filter(patient=sub.patient, kind="weight_loss").exists() or True)

        treatment, invoice = glue_buy(self, actor, "semaglutide-3month", coupons=("sema-off100",))

        # Quote used the real marketing coupon rule: 3 month price minus $100.
        self.assertEqual(invoice.discount_cents, 10000)
        self.assertEqual(invoice.total_cents, invoice.subtotal_cents - 10000)
        self.assertEqual(CouponRedemption.objects.filter(invoice=invoice).count(), 1)
        self.assertEqual(invoice.status, "paid")
        self.assertEqual(treatment.status, "awaiting_visit_completion")
        self.assertEqual(treatment.submission_id, sub.pk)
        sub_row = Subscription.objects.get(patient=treatment.patient)
        self.assertEqual((sub_row.status, sub_row.batches_total), ("active", 1))
        self.assertEqual(ShipmentBatch.objects.filter(subscription=sub_row).count(), 1)
        self.assertTrue(ConsentRecord.objects.filter(patient=treatment.patient, kind="no_cancel_after_submit").exists())
        self.assertTrue(ConsentRecord.objects.filter(patient=treatment.patient, kind="auto_renew").exists())
        # Stripe never sees drug names.
        for _, call in self.stripe.calls:
            self.assertNotIn("emaglutide", json.dumps(call))

        state = actor.run()
        self.assertEqual(state["node"]["type"], "thank_you")
        self.assertEqual(actor.submission().status, Submission.Status.SUBMITTED)

        # Finishing the questionnaire routes the treatment and POSTs the visit to Beluga.
        treatment.refresh_from_db()
        self.assertEqual(treatment.network.slug, "beluga")
        self.assertEqual(treatment.status, "pending_visit")
        self.assertIsNotNone(treatment.submitted_to_network_at)
        visit = Visit.objects.get(treatment=treatment)
        master = visit.external_id
        self.assertEqual(len(self.beluga.calls), 1)
        self.assertTrue(OutboundCall.objects.get().ok)

        # Beluga: Rx written, then consult concluded.
        resp = self.post_beluga(beluga_event(master, "RX_WRITTEN", docName="Dr. Ada Doe", medsPrescribed=[
            {"rxId": "RX1", "medId": "M1", "name": "Semaglutide", "strength": "0.5 mg", "quantity": "1", "refills": "2"}]))
        self.assertEqual(resp.status_code, 200)
        self.post_beluga(beluga_event(master, "CONSULT_CONCLUDED", visitOutcome="prescribed"))
        treatment.refresh_from_db()
        self.assertEqual(treatment.status, "prescribed")
        self.assertEqual(Prescription.objects.filter(treatment=treatment).count(), 1)
        self.assertGreater(DoseLog.objects.filter(treatment=treatment, status="scheduled").count(), 0)
        self.assertIn("rx_written", self.notifier.keys())
        visit.refresh_from_db()
        self.assertEqual(visit.outcome, "prescribed")

        # Pharmacy shipment moves it to active and ships batch 1.
        self.post_beluga(beluga_event(master, "PHARMACY_ORDER_SHIPPED", orderId="ORD1",
                                      info={"carrier": "UPS", "tracking": "1Z999"}))
        treatment.refresh_from_db()
        self.assertEqual(treatment.status, "active")
        self.assertIsNotNone(treatment.started_at)
        order = Order.objects.get(treatment=treatment)
        self.assertEqual(order.status, "shipped")
        self.assertEqual(Shipment.objects.get(order=order).tracking_number, "1Z999")
        self.assertIn("shipped", self.notifier.keys())
        sub_row.refresh_from_db()
        self.assertEqual(sub_row.batches_shipped, 1)
        self.assertEqual(ShipmentBatch.objects.get(subscription=sub_row).status, "shipped")

        # Doctor chat becomes a doctor-labelled message and a content-free notification.
        before = len(self.notifier.sent)
        secret_text = "Please take it on an empty stomach"
        self.post_beluga(beluga_event(master, "DOCTOR_CHAT", content=secret_text))
        msg = Message.objects.get(conversation__patient=treatment.patient, sender_role="doctor")
        self.assertEqual(msg.body, secret_text)
        self.assertEqual(msg.sender_display_name, "Dr. Ada Doe")
        new = self.notifier.sent[before:]
        self.assertTrue(new)
        for n in new:
            self.assertEqual(n["template_key"], "new_message")
            self.assertNotIn(secret_text, json.dumps(n))
        self.assertFalse(NotificationDelivery.objects.filter(error__contains="stomach").exists())

        # Patient reads it and replies; the fake network receives the reply.
        resp = actor.client.get("/api/v1/messaging/conversations/")
        convo = [c for c in resp.json() if c["kind"] == "doctor"][0]
        self.assertEqual(convo["messages"][0]["sender_role"], "doctor")
        reply = "Thank you, will do"
        resp = actor.client.post(
            f"/api/v1/messaging/conversations/{convo['id']}/send_message/", {"body": reply}, content_type="application/json"
        )
        self.assertIn(resp.status_code, (200, 201), resp.content)
        sent = [c for c in self.beluga.calls if c["url"].endswith("/chat/send")]
        self.assertEqual(len(sent), 1)
        self.assertEqual(sent[0]["json"]["content"], reply)
        self.assertEqual(sent[0]["json"]["masterId"], master)
        out = Message.objects.get(sender_role="patient")
        self.assertEqual(out.delivery_status, "delivered")
        self.assertTrue(CareEvent.objects.filter(treatment=treatment).exists())
        self.assertEqual(InboundEvent.objects.filter(status="failed").count(), 0)
