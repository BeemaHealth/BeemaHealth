from datetime import date
from unittest import mock

from django.test import TestCase, override_settings

from apps.billing.models import Subscription
from apps.clinical.models import Treatment, Visit
from apps.fulfillment import services
from apps.fulfillment.models import CareEvent, Order, ShipmentBatch
from apps.fulfillment.pharmacy import FakePharmacyAdapter
from apps.integrations.tests.helpers import make_graph, make_subscription


class CreateBatchesTests(TestCase):
    def setUp(self):
        _, self.treatment, _ = make_graph(status="active")

    def batches(self, subscription):
        return list(ShipmentBatch.objects.filter(subscription=subscription).order_by("sequence"))

    def test_one_month_monthly_plan_gets_one_30_day_batch(self):
        sub = make_subscription(self.treatment, term=1)
        created = services.create_batches(sub)
        self.assertEqual([(b.sequence, b.month_offset, b.supply_days, b.due_on) for b in created], [(1, 0, 30, date(2026, 1, 1))])

    def test_three_month_prepaid_is_one_90_day_batch(self):
        created = services.create_batches(make_subscription(self.treatment, term=3))
        self.assertEqual([(b.sequence, b.supply_days) for b in created], [(1, 90)])

    def test_six_month_prepaid_is_two_three_month_batches(self):
        created = services.create_batches(make_subscription(self.treatment, term=6))
        self.assertEqual(
            [(b.sequence, b.month_offset, b.supply_days, b.due_on) for b in created],
            [(1, 0, 90, date(2026, 1, 1)), (2, 3, 90, date(2026, 4, 1))],
        )

    def test_twelve_month_prepaid_is_four_three_month_batches(self):
        created = services.create_batches(make_subscription(self.treatment, term=12))
        self.assertEqual([b.due_on for b in created], [date(2026, 1, 1), date(2026, 4, 1), date(2026, 7, 1), date(2026, 10, 1)])
        self.assertEqual({b.supply_days for b in created}, {90})

    def test_total_supply_matches_term(self):
        for term in (1, 3, 6, 12):
            with self.subTest(term=term):
                sub = make_subscription(self.treatment, term=term)
                self.assertEqual(sum(b.supply_days for b in services.create_batches(sub)), 30 * term)

    def test_idempotent(self):
        sub = make_subscription(self.treatment, term=12)
        services.create_batches(sub)
        self.assertEqual(services.create_batches(sub), [])
        self.assertEqual(len(self.batches(sub)), 4)

    def test_month_end_due_dates_are_clamped(self):
        sub = make_subscription(self.treatment, term=6, starts=date(2026, 11, 30))
        due = [b.due_on for b in services.create_batches(sub)]
        self.assertEqual(due, [date(2026, 11, 30), date(2027, 2, 28)])

    def test_monthly_renewal_adds_one_batch_due_at_new_period_start(self):
        sub = make_subscription(self.treatment, term=1, batches_total=1)
        services.create_batches(sub)
        sub.term_starts_on, sub.batches_total = date(2026, 2, 1), 2
        sub.save()
        created = services.create_batches(sub)
        self.assertEqual([(b.sequence, b.month_offset, b.due_on) for b in created], [(2, 1, date(2026, 2, 1))])

    def test_prepaid_renewal_batches_start_at_new_term(self):
        sub = make_subscription(self.treatment, term=6, batches_total=2)
        services.create_batches(sub)
        sub.term_starts_on, sub.batches_total = date(2026, 7, 1), 4
        sub.save()
        created = services.create_batches(sub)
        self.assertEqual([(b.sequence, b.month_offset, b.due_on) for b in created], [(3, 6, date(2026, 7, 1)), (4, 9, date(2026, 10, 1))])

    def test_billing_batches_total_is_respected(self):
        sub = make_subscription(self.treatment, term=3, batches_total=1)
        self.assertEqual(len(services.create_batches(sub)), 1)

    def test_batches_are_unique_per_sequence(self):
        sub = make_subscription(self.treatment, term=3)
        services.create_batches(sub)
        with self.assertRaises(Exception):
            ShipmentBatch.objects.create(subscription=sub, sequence=1, due_on=date(2026, 1, 1), supply_days=90)


class ReleaseRuleTests(TestCase):
    def setUp(self):
        self.profile, self.treatment, self.visit = make_graph(status="active")
        self.sub = make_subscription(self.treatment, term=6)
        self.first, self.second = services.create_batches(self.sub)
        self.today = date(2026, 4, 2)
        for target in ("apps.clinical.hooks.record_event", "apps.clinical.hooks.notify_patient"):
            patcher = mock.patch(target)
            patcher.start()
            self.addCleanup(patcher.stop)

    def checkin(self, outcome="prescribed", concluded=True, kind="titration"):
        from django.utils import timezone

        return Visit.objects.create(
            treatment=self.treatment, kind=kind, outcome=outcome, status="concluded" if concluded else "pending",
            concluded_at=timezone.now() if concluded else None,
        )

    def test_first_batch_releases_when_due_and_treatment_active(self):
        self.assertEqual(services.release_blocker(self.first, self.today), "")
        released = services.release_batch(self.first, today=self.today)
        self.assertEqual(released.status, "released")
        self.assertIsNotNone(released.released_at)
        self.assertTrue(CareEvent.objects.filter(event="batch.released", treatment=self.treatment).exists())

    def test_prescribed_treatment_may_release_but_other_states_may_not(self):
        for status, allowed in (("prescribed", True), ("active", True), ("paused", False), ("ended", False), ("refill_due", False), ("pending_visit", False), ("canceled", False)):
            with self.subTest(status=status):
                Treatment.objects.filter(pk=self.treatment.pk).update(status=status)
                self.first.refresh_from_db()
                self.first.subscription.treatment.refresh_from_db()
                blocker = services.release_blocker(ShipmentBatch.objects.get(pk=self.first.pk), self.today)
                self.assertEqual(blocker == "", allowed)
                if not allowed:
                    self.assertEqual(blocker, "treatment_not_active")

    def test_not_due_yet(self):
        self.assertEqual(services.release_blocker(self.first, date(2025, 12, 31)), "not_due")

    def test_release_ignores_due_date_when_today_not_given(self):
        self.assertEqual(services.release_blocker(self.first), "")

    def test_only_scheduled_batches_release(self):
        services.release_batch(self.first)
        with self.assertRaises(services.ReleaseBlocked) as ctx:
            services.release_batch(self.first)
        self.assertEqual(ctx.exception.reason, "not_scheduled")

    def test_inactive_subscription_blocks(self):
        for status in ("past_due", "canceled", "completed"):
            with self.subTest(status=status):
                Subscription.objects.filter(pk=self.sub.pk).update(status=status)
                batch = ShipmentBatch.objects.get(pk=self.first.pk)
                self.assertEqual(services.release_blocker(batch, self.today), "subscription_inactive")

    def test_pending_cancel_subscription_still_ships_remaining_batches(self):
        Subscription.objects.filter(pk=self.sub.pk).update(status="pending_cancel", cancel_requested=True)
        self.assertEqual(services.release_blocker(ShipmentBatch.objects.get(pk=self.first.pk), self.today), "")

    def test_second_batch_needs_first_released(self):
        self.assertEqual(services.release_blocker(self.second, self.today), "previous_batch_pending")

    def test_glp1_batch_two_needs_month_three_checkin(self):
        services.release_batch(self.first)
        self.assertEqual(services.release_blocker(ShipmentBatch.objects.get(pk=self.second.pk), self.today), "checkin_required")

    def test_open_or_unprescribed_checkin_does_not_count(self):
        services.release_batch(self.first)
        self.checkin(concluded=False)
        self.checkin(outcome="referred")
        self.assertEqual(services.release_blocker(ShipmentBatch.objects.get(pk=self.second.pk), self.today), "checkin_required")

    def test_completed_checkin_unlocks_batch_two(self):
        services.release_batch(self.first)
        self.checkin()
        self.assertEqual(services.release_blocker(ShipmentBatch.objects.get(pk=self.second.pk), self.today), "")
        self.assertEqual(services.release_batch(self.second, today=self.today).status, "released")

    def test_non_weight_loss_products_skip_checkin_rule(self):
        self.treatment.product.category = "sexual_health"
        self.treatment.product.save()
        services.release_batch(self.first)
        self.assertEqual(services.release_blocker(ShipmentBatch.objects.get(pk=self.second.pk), self.today), "")

    def test_twelve_month_plan_needs_one_checkin_per_three_months(self):
        sub = make_subscription(self.treatment, term=12)
        batches = services.create_batches(sub)
        for batch in batches[:3]:
            ShipmentBatch.objects.filter(pk=batch.pk).update(status="shipped")
        self.assertEqual(services.release_blocker(ShipmentBatch.objects.get(pk=batches[3].pk)), "checkin_required")
        self.checkin()
        self.checkin(kind="renewal")
        self.assertEqual(services.release_blocker(ShipmentBatch.objects.get(pk=batches[3].pk)), "checkin_required")
        self.checkin()
        self.assertEqual(services.release_blocker(ShipmentBatch.objects.get(pk=batches[3].pk)), "")

    def test_release_batch_raises_with_reason(self):
        with self.assertRaises(services.ReleaseBlocked) as ctx:
            services.release_batch(self.second)
        self.assertEqual(ctx.exception.reason, "previous_batch_pending")
        self.second.refresh_from_db()
        self.assertEqual(self.second.status, "scheduled")

    def test_release_due_batches_counts_and_orders(self):
        stats = services.release_due_batches(today=date(2026, 4, 2))
        self.assertEqual(stats, {"released": 1, "checkin_required": 1})
        self.first.refresh_from_db()
        self.assertEqual(self.first.status, "released")

    def test_release_due_batches_ignores_future_batches(self):
        stats = services.release_due_batches(today=date(2026, 1, 15))
        self.assertEqual(stats, {"released": 1})

    def test_network_routed_release_creates_no_order(self):
        with override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True):
            services.release_batch(self.first)
        self.assertEqual(Order.objects.count(), 0)

    def test_beema_routed_release_creates_and_submits_order(self):
        from apps.clinical.models import Prescription

        FakePharmacyAdapter.reset()
        self.treatment.product.routing_mode = "beema_routes"
        self.treatment.product.save()
        Prescription.objects.create(treatment=self.treatment, visit=self.visit, external_rx_id="R1", drug="Sema")
        with override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True):
            services.release_batch(self.first)
        order = Order.objects.get()
        self.assertEqual((order.status, order.batch_id, order.subscription_id, order.fill_type), ("submitted", self.first.pk, self.sub.pk, "initial"))
        self.first.refresh_from_db()
        self.assertEqual(self.first.order_id, order.pk)
        self.assertEqual(len(FakePharmacyAdapter.submitted), 1)

    def test_beema_routed_with_flag_off_does_nothing(self):
        self.treatment.product.routing_mode = "beema_routes"
        self.treatment.product.save()
        services.release_batch(self.first)
        self.assertEqual(Order.objects.count(), 0)

    def test_treatmentless_subscription_never_releases(self):
        Subscription.objects.filter(pk=self.sub.pk).update(treatment=None)
        self.assertEqual(services.release_blocker(ShipmentBatch.objects.get(pk=self.first.pk), self.today), "treatment_not_active")
