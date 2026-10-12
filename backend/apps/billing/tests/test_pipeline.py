"""Post-payment pipeline: payment -> subscription -> questionnaire past checkout -> treatment, then visit submission."""
from __future__ import annotations

from datetime import timedelta
from unittest import mock

from django.utils import timezone

from apps.billing import bridge, services
from apps.billing.models import Invoice, Refund, Subscription
from apps.catalog.models import PlanPrice
from apps.clinical.models import Treatment
from apps.questionnaires import services as qs
from apps.questionnaires.models import Submission
from apps.questionnaires.tests.flow import everywhere
from apps.questionnaires.tests.support import drive, make_plans, publish_weight_loss

from .factories import BillingTestCase

CONSENTS = ["no_cancel_after_submit", "auto_renew"]
FEMALE = {"dob": "1985-04-12", "sex_at_birth": "female", "state": "TX", "zip": "77002", "phone": "(713) 555-0123", "first_name": "Pat", "last_name": "Tester", "address_line1": "1 Main St", "city": "Houston"}


class PipelineCase(BillingTestCase):
    def setUp(self) -> None:
        super().setUp()
        publish_weight_loss()
        self.plans = make_plans()
        self.plan = self.plans["semaglutide-3month"]
        self.plan.term_months = 3
        self.plan.billing_commitment = "prepaid_term"
        self.plan.save()
        PlanPrice.objects.create(plan=self.plan, amount_cents=79100, effective_from=timezone.now() - timedelta(days=1))
        self.sub, self.token = qs.start("weight_loss")

    def to_checkout(self, overrides: dict | None = None) -> Submission:
        self.sub = drive(self.sub, self.token, self.patient, overrides, stop_at="checkout", pay=False)
        self.assertEqual(self.sub.current_node, "checkout")
        self.sub = qs.answer(self.sub, "checkout", {"plan_slug": self.plan.slug}, availability=everywhere)
        return self.sub

    def pay(self, treatment=None) -> Invoice:
        invoice = services.create_checkout(self.patient, self.plan, consents=CONSENTS, treatment=treatment).invoice
        return services.handle_payment_succeeded(invoice.stripe_payment_intent_id, amount_received_cents=invoice.total_cents)

    def finish_medical(self, overrides: dict | None = None) -> Submission:
        self.sub.refresh_from_db()
        return drive(self.sub, self.token, self.patient, overrides, pay=False)


class PaymentAdvancesTheFlowTests(PipelineCase):
    def test_payment_without_a_treatment_creates_it_and_moves_the_questionnaire_on(self) -> None:
        self.to_checkout()
        self.assertFalse(Treatment.objects.exists())
        invoice = self.pay()
        treatment = Treatment.objects.get(submission=self.sub)
        self.sub.refresh_from_db()
        subscription = Subscription.objects.get(patient=self.patient)
        self.assertEqual(invoice.treatment_id, treatment.pk)
        self.assertEqual(subscription.treatment_id, treatment.pk)
        self.assertEqual(treatment.status, "awaiting_visit_completion")
        self.assertEqual(self.sub.current_node, "medical_intro")
        self.assertIn("checkout", self.sub.path)
        self.mock_create_batches.assert_called_once()

    def test_payment_with_an_existing_treatment_reuses_it(self) -> None:
        self.to_checkout()
        treatment = bridge.start_treatment(self.sub)
        invoice = self.pay(treatment)
        self.assertEqual(Treatment.objects.count(), 1)
        self.assertEqual(invoice.treatment_id, treatment.pk)
        treatment.refresh_from_db()
        self.assertEqual(treatment.status, "awaiting_visit_completion")
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.current_node, "medical_intro")

    def test_replayed_payment_events_change_nothing(self) -> None:
        self.to_checkout()
        invoice = self.pay()
        for _ in range(3):
            services.handle_payment_succeeded(invoice.stripe_payment_intent_id, amount_received_cents=invoice.total_cents)
        self.assertEqual(Treatment.objects.count(), 1)
        self.assertEqual(Subscription.objects.count(), 1)
        self.mock_create_batches.assert_called_once()
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.path.count("checkout"), 1)

    def test_a_failing_step_never_undoes_the_payment_and_a_replay_finishes_the_job(self) -> None:
        self.to_checkout()
        invoice = services.create_checkout(self.patient, self.plan, consents=CONSENTS).invoice
        pi = invoice.stripe_payment_intent_id
        with mock.patch.object(bridge, "complete_checkout", side_effect=RuntimeError("boom")):
            services.handle_payment_succeeded(pi)
        invoice.refresh_from_db()
        self.sub.refresh_from_db()
        self.assertEqual(invoice.status, "paid")
        self.assertTrue(Subscription.objects.exists())
        self.assertEqual(self.sub.current_node, "checkout")
        services.handle_payment_succeeded(pi)  # webhook retry
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.current_node, "medical_intro")

    def test_complete_checkout_is_idempotent(self) -> None:
        self.to_checkout()
        self.pay()
        again = qs.complete_checkout(Submission.objects.get(pk=self.sub.pk))
        self.assertEqual(again.current_node, "medical_intro")
        self.assertEqual(again.path.count("checkout"), 1)

    def test_complete_checkout_still_refuses_when_no_plan_chosen(self) -> None:
        sub = drive(self.sub, self.token, self.patient, stop_at="checkout", pay=False)
        with self.assertRaises(qs.ServiceError):
            qs.complete_checkout(sub)

    def test_adhoc_one_time_charge_does_not_touch_the_questionnaire(self) -> None:
        self.to_checkout()
        _, treatment = None, bridge.start_treatment(self.sub)
        self.stripe.add_card(services.get_or_create_customer(self.patient))
        services.charge_one_time(
            self.patient, [services.OneTimeItem("fee", "Beema Health fee", 4900)], treatment=treatment
        )
        self.sub.refresh_from_db()
        self.assertEqual(self.sub.current_node, "checkout")


class VisitSubmissionTests(PipelineCase):
    def setUp(self) -> None:
        super().setUp()
        self.to_checkout()
        self.pay()
        self.treatment = Treatment.objects.get(submission=self.sub)

    def run_medical(self, overrides: dict | None = None):
        with self.captureOnCommitCallbacks(execute=True):
            return self.finish_medical(overrides)

    def test_nothing_is_submitted_at_payment_time(self) -> None:
        self.treatment.refresh_from_db()
        self.assertIsNone(self.treatment.submitted_to_network_at)

    def test_visit_is_routed_and_submitted_when_the_medical_section_ends(self) -> None:
        with mock.patch("apps.routing.engine.route") as route, mock.patch(
            "apps.integrations.services.submit_visit_for_treatment"
        ) as submit:
            route.return_value.result = "routed"
            sub = self.run_medical()
        self.assertEqual(sub.status, "submitted")
        route.assert_called_once()
        submit.assert_called_once()
        self.assertEqual(submit.call_args.args[0].pk, self.treatment.pk)

    def test_flagged_route_does_not_submit(self) -> None:
        with mock.patch("apps.routing.engine.route") as route, mock.patch(
            "apps.integrations.services.submit_visit_for_treatment"
        ) as submit:
            route.return_value.result = "flagged"
            self.run_medical()
        submit.assert_not_called()

    def test_already_submitted_treatment_is_not_submitted_again(self) -> None:
        Treatment.objects.filter(pk=self.treatment.pk).update(status="pending_visit")
        with mock.patch("apps.integrations.services.submit_visit_for_treatment") as submit:
            self.assertFalse(qs.submit_visit_for_submission(self.sub.pk))
        submit.assert_not_called()

    def test_vendor_failure_is_logged_not_raised_to_the_patient(self) -> None:
        with mock.patch("apps.routing.engine.route") as route, mock.patch(
            "apps.integrations.services.submit_visit_for_treatment", side_effect=RuntimeError("vendor down")
        ):
            route.return_value.result = "routed"
            sub = self.run_medical()
        self.assertEqual(sub.status, "submitted")
        self.treatment.refresh_from_db()
        self.assertEqual(self.treatment.status, "awaiting_visit_completion")

    def test_not_submitted_before_the_callbacks_commit(self) -> None:
        with mock.patch("apps.integrations.services.submit_visit_for_treatment") as submit:
            self.finish_medical()  # on_commit callbacks are not executed here
        submit.assert_not_called()


class PostPaymentDisqualificationTests(PipelineCase):
    checkout_overrides: dict | None = None

    def setUp(self) -> None:
        super().setUp()
        self.to_checkout(self.checkout_overrides)
        self.invoice = self.pay()
        self.treatment = Treatment.objects.get(submission=self.sub)

    def refund_calls(self) -> list[dict]:
        return [c[1] for c in self.stripe.calls if c[0] == "create_refund"]

    def assert_refunded_and_closed(self) -> None:
        self.invoice.refresh_from_db()
        self.treatment.refresh_from_db()
        subscription = Subscription.objects.get(patient=self.patient)
        self.assertEqual((self.invoice.status, self.invoice.refunded_cents), ("refunded", self.invoice.total_cents))
        self.assertEqual(self.treatment.status, "not_eligible")
        self.assertEqual(subscription.status, "canceled")
        self.assertEqual(len(self.refund_calls()), 1)
        self.assertEqual(Refund.objects.get().reason, "canceled_before_submission")

    def test_gastric_bypass_refunds_in_full(self) -> None:
        sub = self.finish_medical({"gastric_bypass": "yes"})
        self.assertEqual(sub.status, "disqualified")
        self.assert_refunded_and_closed()

    def test_handler_is_idempotent(self) -> None:
        self.finish_medical({"gastric_bypass": "yes"})
        services.handle_post_payment_disqualification(Treatment.objects.get(pk=self.treatment.pk))
        self.assertEqual(len(self.refund_calls()), 1)

    def test_after_submission_it_is_the_not_prescribed_refund(self) -> None:
        Treatment.objects.filter(pk=self.treatment.pk).update(submitted_to_network_at=timezone.now())
        services.handle_post_payment_disqualification(Treatment.objects.get(pk=self.treatment.pk))
        self.assertEqual(Refund.objects.get().reason, "not_prescribed")

    def test_refund_failure_never_blocks_the_patients_answer(self) -> None:
        with mock.patch("apps.billing.services.handle_post_payment_disqualification", side_effect=RuntimeError("x")):
            sub = self.finish_medical({"gastric_bypass": "yes"})
        self.assertEqual(sub.status, "disqualified")

    def test_disqualified_before_paying_refunds_nothing(self) -> None:
        other_patient_sub, token = qs.start("weight_loss")
        from .factories import make_profile

        profile = make_profile()
        sub = drive(other_patient_sub, token, profile, {"bmi_new": {"height_feet": 5, "height_inches": 6, "weight_lbs": 90}},
                    pay=False)
        self.assertEqual(sub.status, "disqualified")
        self.assertEqual(len(self.refund_calls()), 0)


class PregnancyDisqualificationTests(PostPaymentDisqualificationTests):
    checkout_overrides = {"basics": FEMALE}

    def test_pregnancy_refunds_in_full(self) -> None:
        sub = self.finish_medical({"pregnancy": "pregnant"})
        self.assertEqual(sub.status, "disqualified")
        self.assert_refunded_and_closed()
