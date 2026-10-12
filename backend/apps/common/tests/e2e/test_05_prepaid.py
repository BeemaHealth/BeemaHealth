"""Scenario 5: prepaid 6 month plan, batches of 3 months, auto renew, doctor stops the drug mid term."""
from __future__ import annotations

from datetime import timedelta

from django.utils import timezone

from apps.billing.models import Refund, Subscription
from apps.billing.services import run_renewals
from apps.fulfillment import services as fulfillment
from apps.fulfillment.models import ShipmentBatch
from apps.patients.models import ConsentRecord

from .base import E2ECase, beluga_event, glue_submitted, rx_event


class PrepaidSixMonthTests(E2ECase):
    def setUp(self):
        super().setUp()
        self.actor, self.treatment, self.invoice, self.master = glue_submitted(self, "semaglutide-6month")
        self.sub = Subscription.objects.get(treatment=self.treatment)

    def prescribe_and_ship_first_batch(self):
        self.post_beluga(rx_event(self.master))
        self.post_beluga(beluga_event(self.master, "CONSULT_CONCLUDED", visitOutcome="prescribed"))
        self.post_beluga(beluga_event(self.master, "PHARMACY_ORDER_SHIPPED", orderId="ORD-1", info={"carrier": "UPS", "tracking": "T1"}))
        self.treatment.refresh_from_db()
        self.sub.refresh_from_db()

    def test_term_is_two_batches_of_three_months(self):
        self.assertEqual((self.sub.commitment, self.sub.term_months, self.sub.batches_total), ("prepaid_term", 6, 2))
        self.assertIsNone(self.sub.next_bill_on)
        first, second = ShipmentBatch.objects.filter(subscription=self.sub).order_by("sequence")
        self.assertEqual((first.supply_days, second.supply_days), (90, 90))
        self.assertEqual((first.month_offset, second.month_offset), (0, 3))
        self.assertGreater(second.due_on, first.due_on + timedelta(days=80))

    def test_second_batch_needs_the_month_three_checkin(self):
        self.prescribe_and_ship_first_batch()
        second = ShipmentBatch.objects.get(subscription=self.sub, sequence=2)
        self.assertEqual(fulfillment.release_blocker(second, today=second.due_on), "checkin_required")

    def test_cancel_after_submission_only_turns_auto_renew_off(self):
        self.assertTrue(self.sub.renews_at_term_end)  # patient consented to auto renew at checkout
        resp = self.actor.client.post(f"/api/v1/billing/subscriptions/{self.sub.pk}/cancel/")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual((resp.json()["outcome"], resp.json()["refunded_cents"]), ("auto_renew_off", 0))
        self.sub.refresh_from_db()
        self.invoice.refresh_from_db()
        self.assertFalse(self.sub.renews_at_term_end)
        self.assertEqual(self.sub.status, "active")
        self.assertEqual(self.invoice.status, "paid")
        self.assertFalse(Refund.objects.exists())
        self.assertEqual(ShipmentBatch.objects.filter(subscription=self.sub, status="scheduled").count(), 2)

    def test_auto_renew_toggle_round_trip_over_the_api(self):
        url = f"/api/v1/billing/subscriptions/{self.sub.pk}/auto-renew/"
        off = self.actor.client.post(url, {"enabled": False}, content_type="application/json")
        self.assertEqual(off.status_code, 200, off.content)
        self.sub.refresh_from_db()
        self.assertFalse(self.sub.renews_at_term_end)
        on = self.actor.client.post(url, {"enabled": True}, content_type="application/json")
        self.assertEqual(on.status_code, 200)
        self.sub.refresh_from_db()
        self.assertTrue(self.sub.renews_at_term_end)
        self.assertEqual(ConsentRecord.objects.filter(patient=self.treatment.patient, kind="auto_renew").count(), 2)

    def test_renewal_respects_the_toggle(self):
        self.actor.client.post(f"/api/v1/billing/subscriptions/{self.sub.pk}/auto-renew/", {"enabled": False}, content_type="application/json")
        charges = lambda: len([c for c in self.stripe.calls if c[0] == "create_payment_intent"])  # noqa: E731
        before = charges()
        run_renewals(self.sub.term_ends_on + timedelta(days=1))
        self.assertEqual(charges(), before)

    def test_doctor_stops_drug_mid_term_refunds_only_unshipped_batch(self):
        from apps.billing.services import refund_unshipped_batches

        self.prescribe_and_ship_first_batch()
        self.assertEqual(self.sub.batches_shipped, 1)
        refunds = refund_unshipped_batches(self.sub, "doctor_stopped")
        self.assertEqual(len(refunds), 1)
        self.invoice.refresh_from_db()
        half = self.invoice.total_cents // 2
        self.assertEqual(refunds[0].amount_cents, self.invoice.total_cents - half)
        self.assertEqual(self.invoice.status, "partially_refunded")
        self.assertEqual(self.invoice.refunded_cents, self.invoice.total_cents - half)
        self.assertEqual(ShipmentBatch.objects.get(subscription=self.sub, sequence=1).status, "shipped")
        self.assertEqual(ShipmentBatch.objects.get(subscription=self.sub, sequence=2).status, "refunded")
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.status, "canceled")
        # Replaying the stop does not refund again.
        refund_unshipped_batches(self.sub, "doctor_stopped")
        self.assertEqual(Refund.objects.filter(invoice=self.invoice).count(), 1)
        self.assertEqual(len(self.stripe.refunds), 1)

    def test_treatment_cancel_after_submission_is_blocked_on_prepaid_too(self):
        resp = self.actor.client.post(f"/api/v1/treatments/{self.treatment.pk}/cancel/")
        self.assertEqual(resp.status_code, 409)
        self.assertFalse(Refund.objects.exists())
