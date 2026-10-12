"""Scenario 8: routing gaps, manual review, and the Beema pharmacy routing flag."""
from __future__ import annotations

from django.test import override_settings

from apps.accounts.models import Organization
from apps.accounts.tests.helpers import make_staff
from apps.billing.models import Invoice
from apps.catalog.models import ProductVariant
from apps.clinical.models import Treatment
from apps.fulfillment.models import Order
from apps.fulfillment.pharmacy import FakePharmacyAdapter
from apps.routing import engine as routing
from apps.routing.models import RoutingDecision, RoutingReviewItem, RoutingRule
from apps.questionnaires.models import Submission

from .base import Actor, E2ECase, beluga_event, glue_paid, glue_submitted, rx_event

NM = {"dob": "1985-04-12", "sex_at_birth": "male", "state": "NM", "zip": "87101", "phone": "(505) 555-0123", "first_name": "Pat", "last_name": "Tester", "address_line1": "1 Main St", "city": "Houston"}


class ZipRouterTests(E2ECase):
    def test_state_without_a_route_is_stopped_before_checkout(self):
        for state in ("NM", "KS", "WV"):
            with self.subTest(state=state):
                actor = Actor(self, f"{state.lower()}@example.com")
                actor.start()
                s = actor.run(overrides={"basics": {**NM, "state": state}})
                self.assertEqual(s["node"]["id"], "no_proceed_state")
                self.assertEqual(actor.submission().status, Submission.Status.DISQUALIFIED)
                self.assertIsNone(actor.submission().selected_plan)
        self.assertFalse(Treatment.objects.exists())
        self.assertFalse(Invoice.objects.exists())

    def test_waitlist_email_is_accepted_on_the_dead_end_page(self):
        actor = Actor(self)
        actor.start()
        actor.run(overrides={"basics": NM})
        resp = actor.answer("no_proceed_state", {"email": "waitlist@example.com"})
        self.assertEqual(resp.status_code, 200, resp.content)

    def test_covered_state_reaches_checkout_and_is_available(self):
        actor = Actor(self)
        actor.start()
        self.assertEqual(actor.run()["node"]["id"], "checkout")
        sema = ProductVariant.objects.filter(drug="semaglutide").first()
        self.assertTrue(routing.is_available("TX", sema))
        self.assertFalse(routing.is_available("NM", sema))
        self.assertFalse(routing.is_available("", sema))

    def test_deactivating_the_rule_closes_every_state(self):
        RoutingRule.objects.update(is_active=False)
        actor = Actor(self)
        actor.start()
        self.assertEqual(actor.run()["node"]["id"], "no_proceed_state")


class ManualReviewTests(E2ECase):
    def finish_with_mismatched_address(self):
        """Passes the zip router, then the covering rule is switched off before routing runs."""
        actor = Actor(self)
        actor.start()
        from .base import glue_buy

        treatment, invoice = glue_buy(self, actor, "semaglutide-monthly")
        RoutingRule.objects.update(is_active=False)
        actor.run()
        treatment.refresh_from_db()
        return actor, treatment

    def test_flagged_decision_lands_in_routing_review_and_staff_resolution_continues_the_flow(self):
        actor, treatment = self.finish_with_mismatched_address()
        self.assertEqual(treatment.status, "routing_review")
        self.assertIsNone(treatment.submitted_to_network_at)
        self.assertEqual(len(self.beluga.calls), 0)
        decision = RoutingDecision.objects.get(treatment=treatment)
        self.assertEqual((decision.result, decision.flag_reason), ("flagged", "no_matching_rule"))
        self.assertEqual(decision.inputs["state"], "TX")
        self.assertIn(decision.pk, [i.pk for i in RoutingReviewItem.objects.all()])

        staff = make_staff("admin")
        rule = RoutingRule.objects.get(name="Beluga weight loss semaglutide")
        with self.captureOnCommitCallbacks(execute=True):
            routing.resolve_flag(decision, staff, rule)
        treatment.refresh_from_db()
        decision.refresh_from_db()
        self.assertEqual(decision.result, "routed")
        self.assertEqual(decision.resolved_by, staff)
        self.assertEqual(treatment.status, "pending_visit")
        self.assertIsNotNone(treatment.submitted_to_network_at)
        self.assertEqual(treatment.network.slug, "beluga")
        self.assertEqual(len(self.beluga.calls), 1)
        self.assertFalse(RoutingReviewItem.objects.filter(pk=decision.pk).exists())

    def test_non_staff_cannot_resolve(self):
        from django.core.exceptions import PermissionDenied

        actor, treatment = self.finish_with_mismatched_address()
        decision = RoutingDecision.objects.get(treatment=treatment)
        with self.assertRaises(PermissionDenied):
            routing.resolve_flag(decision, actor.user, RoutingRule.objects.first())

    def test_rerun_after_staff_adds_a_rule_continues_the_flow(self):
        actor, treatment = self.finish_with_mismatched_address()
        decision = RoutingDecision.objects.get(treatment=treatment)
        RoutingRule.objects.create(
            name="Temporary cover", priority=50, states_mode="only", states=["TX"],
            network=Organization.objects.get(slug="beluga"),
        )
        with self.captureOnCommitCallbacks(execute=True):
            new = routing.rerun(decision, make_staff("admin"))
        self.assertEqual(new.result, "routed")
        treatment.refresh_from_db()
        self.assertEqual(treatment.status, "pending_visit")


class BeemaRoutingFlagTests(E2ECase):
    def setUp(self):
        super().setUp()
        self.actor, self.treatment, self.invoice, self.master = glue_submitted(self, "semaglutide-monthly")
        product = self.treatment.product
        product.routing_mode = "beema_routes"
        product.save()
        self.pharmacy = Organization.objects.create(name="Fake RX", slug="fake-rx", kind="pharmacy", integration_adapter="fake")
        self.treatment.pharmacy = self.pharmacy
        self.treatment.save(update_fields=["pharmacy"])

    def test_beema_routes_stays_off_while_flag_is_false(self):
        self.post_beluga(rx_event(self.master))
        self.post_beluga(beluga_event(self.master, "CONSULT_CONCLUDED", visitOutcome="prescribed"))
        self.treatment.refresh_from_db()
        self.assertEqual(self.treatment.status, "prescribed")
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(FakePharmacyAdapter.submitted, [])

    def test_batch_release_creates_no_order_while_flag_is_false(self):
        from apps.fulfillment import services

        self.post_beluga(rx_event(self.master))
        self.post_beluga(beluga_event(self.master, "CONSULT_CONCLUDED", visitOutcome="prescribed"))
        stats = services.release_due_batches()
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(FakePharmacyAdapter.submitted, [])
        self.assertIn("released", stats)

    @override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True)
    def test_flag_on_submits_the_prescription_to_the_pharmacy(self):
        self.post_beluga(rx_event(self.master))
        order = Order.objects.get(treatment=self.treatment)
        self.assertEqual(order.status, "submitted")
        self.assertEqual(order.pharmacy, self.pharmacy)
        self.assertEqual(FakePharmacyAdapter.submitted, [order.pk])
        self.assertTrue(order.external_order_id.startswith("FAKE-"))
        self.post_beluga(rx_event(self.master))  # replay
        self.assertEqual(Order.objects.filter(treatment=self.treatment).count(), 1)
