from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.patients.care_events import get_user_care_events, record_beluga_fulfillment_event


class PatientCareEventTests(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            email="timeline@example.com",
            password="secure-pass-1",
            first_name="Pat",
            last_name="Example",
        )

    def test_beluga_fulfillment_events_dedupe_by_idempotency(self):
        first = record_beluga_fulfillment_event(
            self.patient,
            event_type="PHARMACY_ORDER_SHIPPED",
            master_id="master-1",
            order_id="order-1",
            info={"carrier": "USPS", "tracking": "9400"},
        )
        second = record_beluga_fulfillment_event(
            self.patient,
            event_type="PHARMACY_ORDER_SHIPPED",
            master_id="master-1",
            order_id="order-1",
            info={"carrier": "USPS", "tracking": "9400"},
        )

        self.assertIsNotNone(first)
        self.assertIsNone(second)
        self.assertEqual(
            self.patient.care_events.filter(milestone="pharmacy-shipped").count(),
            1,
        )

    def test_get_user_care_events_returns_chronological_order(self):
        now = timezone.now()
        # Even if inserted out of order, get_user_care_events sorts by occurred_at.
        shipped = record_beluga_fulfillment_event(
            self.patient,
            event_type="PHARMACY_ORDER_SHIPPED",
            master_id="master-1",
            order_id="order-1",
        )
        fulfillment = record_beluga_fulfillment_event(
            self.patient,
            event_type="PHARMACY_ORDER_IN_FULFILLMENT",
            master_id="master-1",
            order_id="order-1",
        )
        # Force fulfillment to appear earlier chronologically.
        if fulfillment and shipped:
            fulfillment.occurred_at = now - timedelta(hours=2)
            fulfillment.save(update_fields=["occurred_at"])
            shipped.occurred_at = now - timedelta(hours=1)
            shipped.save(update_fields=["occurred_at"])

        events = get_user_care_events(self.patient)
        self.assertEqual(
            [event.milestone for event in events],
            ["pharmacy-in-fulfillment", "pharmacy-shipped"],
        )
        self.assertLess(events[0].occurred_at, events[1].occurred_at)

    def test_delivery_failure_followed_by_reshipment_orders_chronologically(self):
        now = timezone.now()
        # Original shipment (order-2)
        original = record_beluga_fulfillment_event(
            self.patient,
            event_type="PHARMACY_ORDER_SHIPPED",
            master_id="master-2",
            order_id="order-2",
        )
        # Delivery failure (order-2)
        failure = record_beluga_fulfillment_event(
            self.patient,
            event_type="PACKAGE_DELIVERY_FAILED",
            master_id="master-2",
            order_id="order-2",
        )
        # Re-shipment with new order ID (idempotency key differs from original)
        reship = record_beluga_fulfillment_event(
            self.patient,
            event_type="PHARMACY_ORDER_SHIPPED",
            master_id="master-2",
            order_id="order-3",
        )

        # Explicitly set occurred_at values to make the ordering deterministic.
        if original and failure and reship:
            original.occurred_at = now - timedelta(hours=8)
            original.save(update_fields=["occurred_at"])
            failure.occurred_at = now - timedelta(hours=5)
            failure.save(update_fields=["occurred_at"])
            reship.occurred_at = now - timedelta(hours=2)
            reship.save(update_fields=["occurred_at"])

        events = get_user_care_events(self.patient)
        # All 3 events returned (no milestone deduplication)
        self.assertEqual(len(events), 3)
        milestones = [e.milestone for e in events]
        # Two pharmacy-shipped events (original + re-shipment), one failure
        self.assertEqual(milestones.count("pharmacy-shipped"), 2)
        self.assertEqual(milestones.count("package-delivery-failed"), 1)
        # package-delivery-failed (T-5h) must appear before re-shipment (T-2h)
        failure_idx = milestones.index("package-delivery-failed")
        # re-shipment is the second pharmacy-shipped → index 2
        reship_idx = milestones.index("pharmacy-shipped", failure_idx)
        self.assertLess(failure_idx, reship_idx)

    def test_multiple_refill_cycles_all_returned(self):
        """All events across multiple refill cycles are returned."""
        now = timezone.now()
        for i, order_id in enumerate(["order-A", "order-B", "order-C"]):
            event = record_beluga_fulfillment_event(
                self.patient,
                event_type="PHARMACY_ORDER_SHIPPED",
                master_id="master-99",
                order_id=order_id,
            )
            if event:
                event.occurred_at = now + timedelta(days=i)
                event.save(update_fields=["occurred_at"])

        events = get_user_care_events(self.patient)
        # All 3 shipment events returned (one per order_id)
        self.assertEqual(len(events), 3)
        order_ids = [e.metadata.get("order_id") for e in events]
        self.assertEqual(order_ids, ["order-A", "order-B", "order-C"])

    def test_delivery_failure_resolved_by_later_delivered_event(self):
        now = timezone.now()
        record_beluga_fulfillment_event(
            self.patient,
            event_type="PACKAGE_DELIVERY_FAILED",
            master_id="master-3",
            order_id="order-4",
        )
        delivered = record_beluga_fulfillment_event(
            self.patient,
            event_type="PACKAGE_DELIVERED",
            master_id="master-3",
            order_id="order-4",
        )
        failure_record = self.patient.care_events.get(milestone="package-delivery-failed")
        if delivered:
            failure_record.occurred_at = now - timedelta(hours=10)
            failure_record.save(update_fields=["occurred_at"])
            delivered.occurred_at = now - timedelta(hours=1)
            delivered.save(update_fields=["occurred_at"])

        events = get_user_care_events(self.patient)
        milestones = [e.milestone for e in events]
        self.assertIn("package-delivery-failed", milestones)
        self.assertIn("package-delivered", milestones)
        # Delivered must appear after failure chronologically
        failure_idx = milestones.index("package-delivery-failed")
        delivered_idx = milestones.index("package-delivered")
        self.assertLess(failure_idx, delivered_idx)
