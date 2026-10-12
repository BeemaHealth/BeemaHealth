"""Scenario 4: cancel before the visit reaches the network (full refund) and after (blocked, no refund)."""
from __future__ import annotations

from apps.billing.models import Refund, Subscription
from apps.fulfillment.models import ShipmentBatch

from .base import E2ECase, glue_paid, glue_submitted


class CancelBeforeSubmissionTests(E2ECase):
    def test_treatment_cancel_before_submission_refunds_in_full(self):
        actor, treatment, invoice = glue_paid(self, "semaglutide-3month")
        self.assertIsNone(treatment.submitted_to_network_at)
        resp = actor.client.post(f"/api/v1/treatments/{treatment.pk}/cancel/")
        self.assertEqual(resp.status_code, 200, resp.content)
        treatment.refresh_from_db()
        invoice.refresh_from_db()
        self.assertEqual(treatment.status, "canceled")
        self.assertEqual(invoice.status, "refunded")
        refund = Refund.objects.get(invoice=invoice)
        self.assertEqual((refund.amount_cents, refund.reason, refund.status), (invoice.total_cents, "canceled_before_submission", "succeeded"))
        sub = Subscription.objects.get(treatment=treatment)
        self.assertEqual(sub.status, "canceled")
        self.assertFalse(sub.renews_at_term_end)
        self.assertEqual(ShipmentBatch.objects.exclude(status="refunded").count(), 0)
        self.assertEqual(len(self.beluga.calls), 0)

    def test_subscription_cancel_before_submission_refunds_in_full(self):
        actor, treatment, invoice = glue_paid(self, "semaglutide-monthly")
        sub = Subscription.objects.get(treatment=treatment)
        resp = actor.client.post(f"/api/v1/billing/subscriptions/{sub.pk}/cancel/")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()["outcome"], "refunded_before_submission")
        self.assertEqual(resp.json()["refunded_cents"], invoice.total_cents)
        treatment.refresh_from_db()
        self.assertEqual(treatment.status, "canceled")
        self.assertEqual(sum(r["amount"] for r in self.stripe.refunds.values()), invoice.total_cents)

    def test_double_cancel_does_not_refund_twice(self):
        actor, treatment, invoice = glue_paid(self, "semaglutide-monthly")
        actor.client.post(f"/api/v1/treatments/{treatment.pk}/cancel/")
        again = actor.client.post(f"/api/v1/treatments/{treatment.pk}/cancel/")
        self.assertEqual(again.status_code, 409)
        self.assertEqual(Refund.objects.filter(invoice=invoice).count(), 1)

    def test_patient_cannot_cancel_someone_elses_treatment(self):
        _, treatment, invoice = glue_paid(self, "semaglutide-monthly")
        from .base import Actor

        other = Actor(self, "other.patient@example.com")
        other.start()
        other.run()  # signs up, stops at checkout
        self.assertEqual(other.client.post(f"/api/v1/treatments/{treatment.pk}/cancel/").status_code, 404)
        treatment.refresh_from_db()
        self.assertEqual(treatment.status, "awaiting_visit_completion")


class CancelAfterSubmissionTests(E2ECase):
    def test_treatment_cancel_after_submission_is_blocked(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        resp = actor.client.post(f"/api/v1/treatments/{treatment.pk}/cancel/")
        self.assertEqual(resp.status_code, 409)
        treatment.refresh_from_db()
        invoice.refresh_from_db()
        self.assertEqual(treatment.status, "pending_visit")
        self.assertEqual(invoice.status, "paid")
        self.assertFalse(Refund.objects.exists())
        self.assertEqual(self.stripe.refunds, {})

    def test_monthly_cancel_after_submission_stops_charges_without_refund(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        sub = Subscription.objects.get(treatment=treatment)
        self.assertIsNotNone(sub.next_bill_on)
        resp = actor.client.post(f"/api/v1/billing/subscriptions/{sub.pk}/cancel/")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual((resp.json()["outcome"], resp.json()["refunded_cents"]), ("cancel_at_period_end", 0))
        sub.refresh_from_db()
        treatment.refresh_from_db()
        invoice.refresh_from_db()
        self.assertEqual(sub.status, "pending_cancel")
        self.assertIsNone(sub.next_bill_on)
        self.assertTrue(sub.cancel_requested)
        self.assertEqual(treatment.status, "pending_visit")  # the visit proceeds; the paid month is not refunded
        self.assertEqual(invoice.status, "paid")
        self.assertFalse(Refund.objects.exists())

    def test_renewal_run_after_cancel_charges_nothing(self):
        from datetime import timedelta

        from django.utils import timezone

        from apps.billing.services import run_renewals

        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        sub = Subscription.objects.get(treatment=treatment)
        actor.client.post(f"/api/v1/billing/subscriptions/{sub.pk}/cancel/")
        charges = len([c for c in self.stripe.calls if c[0] == "create_payment_intent"])
        report = run_renewals(timezone.localdate() + timedelta(days=45))
        self.assertEqual(report.charged, [])
        self.assertEqual(len([c for c in self.stripe.calls if c[0] == "create_payment_intent"]), charges)
        sub.refresh_from_db()
        self.assertEqual(sub.status, "canceled")
