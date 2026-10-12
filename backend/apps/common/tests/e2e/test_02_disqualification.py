"""Scenario 2: disqualification before and after checkout."""
from __future__ import annotations

from apps.billing.models import Invoice, Refund, Subscription
from apps.clinical.models import Treatment, Visit
from apps.questionnaires.models import Submission

from .base import Actor, E2ECase, glue_paid

FEMALE = {"dob": "1985-04-12", "sex_at_birth": "female", "state": "TX", "zip": "77002", "phone": "(713) 555-0123", "first_name": "Pat", "last_name": "Tester", "address_line1": "1 Main St", "city": "Houston"}


class DisqualificationTests(E2ECase):
    def test_bmi_below_minimum_ends_before_checkout(self):
        actor = Actor(self)
        actor.start()
        state = actor.run(overrides={"bmi_new": {"height_feet": 5, "height_inches": 6, "weight_lbs": 120}})
        self.assertEqual(state["status"], "disqualified")
        self.assertEqual(state["node"]["id"], "no_proceed_bmi")
        sub = actor.submission()
        self.assertEqual(sub.status, Submission.Status.DISQUALIFIED)
        self.assertIsNone(sub.selected_plan)
        self.assertFalse(Treatment.objects.exists())
        self.assertFalse(Invoice.objects.exists())
        # The client cannot push past a disqualification.
        resp = actor.answer("checkout", {"plan_slug": "semaglutide-monthly"})
        self.assertGreaterEqual(resp.status_code, 400)

    def test_current_user_bmi_minimum_is_20(self):
        actor = Actor(self)
        actor.start()
        state = actor.run(overrides={"glp1_history": "current", "bmi_current": {"height_feet": 5, "height_inches": 6, "weight_lbs": 110}})
        self.assertEqual(state["node"]["id"], "no_proceed_bmi")

    def test_pregnancy_after_checkout_disqualifies_and_refunds(self):
        actor, treatment, invoice = glue_paid(self, overrides={"basics": FEMALE, "pregnancy": "pregnant"})
        state = actor.run()
        self.assertEqual(state["status"], "disqualified")
        self.assertEqual(state["node"]["id"], "no_proceed_pregnancy")
        self.assertEqual(actor.submission().status, Submission.Status.DISQUALIFIED)
        self.assert_refunded_in_full(treatment, invoice)

    def test_gastric_bypass_after_checkout_triggers_refund(self):
        actor, treatment, invoice = glue_paid(self, overrides={"gastric_bypass": "yes"})
        self.assertEqual(invoice.status, "paid")  # money is taken before the medical questions
        state = actor.run()
        self.assertEqual(state["node"]["id"], "no_proceed_bypass")
        self.assertEqual(actor.submission().status, Submission.Status.DISQUALIFIED)
        self.assert_refunded_in_full(treatment, invoice)
        sub = Subscription.objects.get(treatment=treatment)
        self.assertEqual(sub.status, "canceled")
        self.assertEqual(Visit.objects.filter(treatment=treatment).count(), 0)
        self.assertEqual(len(self.beluga.calls), 0)  # nothing reached the doctor network

    def test_disqualification_refund_is_not_repeated(self):
        actor, treatment, invoice = glue_paid(self, overrides={"gastric_bypass": "yes"})
        actor.run()
        from apps.billing.services import handle_post_payment_disqualification

        treatment.refresh_from_db()
        handle_post_payment_disqualification(treatment)
        self.assertEqual(Refund.objects.filter(invoice=invoice).count(), 1)
        self.assertEqual(len(self.stripe.refunds), 1)

    def assert_refunded_in_full(self, treatment, invoice):
        treatment.refresh_from_db()
        invoice.refresh_from_db()
        self.assertEqual(treatment.status, "not_eligible")
        self.assertEqual(invoice.status, "refunded")
        self.assertEqual(Refund.objects.get(invoice=invoice).amount_cents, invoice.total_cents)
