"""Scenario 3: the doctor does not prescribe (referred or canceled)."""
from __future__ import annotations

from django.utils import timezone

from apps.billing import margins
from apps.billing.models import Refund, Subscription, VendorCost
from apps.clinical.models import DrugIneligibility, Treatment, Visit
from apps.fulfillment.models import ShipmentBatch

from .base import Actor, E2ECase, beluga_event, glue_submitted


def add_visit_cost(treatment, invoice, cents: int = 4900) -> VendorCost:
    return VendorCost.objects.create(
        treatment=treatment, vendor=treatment.network, kind="visit", amount_cents=cents,
        incurred_at=timezone.now(), invoice=invoice,
    )


class NotPrescribedTests(E2ECase):
    def test_referred_refunds_in_full_and_marks_drug_ineligible(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        cost = add_visit_cost(treatment, invoice)
        resp = self.post_beluga(beluga_event(master, "CONSULT_CONCLUDED", visitOutcome="referred"))
        self.assertEqual(resp.status_code, 200)

        treatment.refresh_from_db()
        invoice.refresh_from_db()
        self.assertEqual(treatment.status, "referred")
        self.assertEqual(Visit.objects.get(treatment=treatment).outcome, "referred")
        refund = Refund.objects.get(invoice=invoice)
        self.assertEqual((refund.amount_cents, refund.status, refund.reason), (invoice.total_cents, "succeeded", "not_prescribed"))
        self.assertEqual(invoice.status, "refunded")
        self.assertEqual(sum(r["amount"] for r in self.stripe.refunds.values()), invoice.total_cents)
        sub = Subscription.objects.get(treatment=treatment)
        self.assertEqual(sub.status, "canceled")
        self.assertFalse(sub.renews_at_term_end)
        ine = DrugIneligibility.objects.get(patient=treatment.patient)
        self.assertEqual((ine.drug, ine.source_treatment_id, ine.lifted_at), ("semaglutide", treatment.pk, None))
        # Beema keeps what it owes the doctor network.
        self.assertTrue(VendorCost.objects.filter(pk=cost.pk).exists())
        self.assertEqual(margins.invoice_vendor_cost_cents(invoice), 4900)
        self.assertEqual(margins.patient_margin_cents(treatment.patient), -4900)
        self.assertIn("action_required", self.notifier.keys())
        for batch in ShipmentBatch.objects.filter(subscription=sub):
            self.assertEqual(batch.status, "refunded")

    def test_replayed_referral_does_not_refund_twice(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        payload = beluga_event(master, "CONSULT_CONCLUDED", visitOutcome="referred")
        self.post_beluga(payload)
        self.post_beluga(payload)
        self.post_beluga({**payload, "note": "second delivery with different body"})
        self.assertEqual(Refund.objects.filter(invoice=invoice).count(), 1)
        self.assertEqual(len(self.stripe.refunds), 1)
        self.assertEqual(DrugIneligibility.objects.filter(patient=treatment.patient).count(), 1)

    def test_doctor_cancel_before_prescription_is_not_prescribed(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        self.post_beluga(beluga_event(master, "CONSULT_CANCELED"))
        treatment.refresh_from_db()
        invoice.refresh_from_db()
        self.assertEqual(treatment.status, "canceled")
        self.assertEqual(invoice.status, "refunded")
        self.assertTrue(DrugIneligibility.objects.filter(patient=treatment.patient, drug="semaglutide").exists())

    def test_other_drug_is_not_blocked_by_the_ineligibility_row(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        self.post_beluga(beluga_event(master, "CONSULT_CONCLUDED", visitOutcome="referred"))
        ine = DrugIneligibility.objects.get(patient=treatment.patient)
        self.assertNotEqual(ine.drug, "tirzepatide")

    def test_patient_cannot_start_the_same_drug_again(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        self.post_beluga(beluga_event(master, "CONSULT_CONCLUDED", visitOutcome="referred"))
        again = Actor(self, actor.email)
        again.login(actor.user)
        again.start()
        state = again.run()
        self.assertEqual(state["node"]["id"], "checkout")
        resp = again.answer("checkout", {"plan_slug": "semaglutide-3month"})
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        self.assertEqual(body["status"], "disqualified")
        self.assertEqual(body["disqualify_reason"], "previously_ineligible")
        self.assertIsNone(again.submission().selected_plan)
        self.assertEqual(Treatment.objects.filter(patient=actor.profile).count(), 1)
        # Checkout over the API is refused too.
        self.assertEqual(again.checkout("semaglutide-3month", None).status_code, 400)

    def test_a_different_drug_is_still_allowed(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        self.post_beluga(beluga_event(master, "CONSULT_CONCLUDED", visitOutcome="referred"))
        again = Actor(self, actor.email)
        again.login(actor.user)
        again.start()
        again.answers.update({"drug_choice": "tirzepatide"})
        again.run()
        resp = again.answer("checkout", {"plan_slug": "tirzepatide-monthly"})
        self.assertEqual(resp.json()["status"], "in_progress")
