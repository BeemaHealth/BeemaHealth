from datetime import date, datetime, timezone as dt_timezone
from unittest import mock

from django.test import TestCase

from apps.billing.models import Subscription
from apps.fulfillment import services
from apps.fulfillment.models import AppendOnlyError, CareEvent, Order, Shipment, ShipmentBatch
from apps.integrations.exceptions import UnresolvedReference
from apps.integrations.tests.helpers import make_graph, make_subscription

T0 = datetime(2026, 5, 1, 12, 0, tzinfo=dt_timezone.utc)


class Base(TestCase):
    def setUp(self):
        self.profile, self.treatment, self.visit = make_graph(status="active")
        patcher = mock.patch("apps.integrations.dispatch.notify_patient")
        self.notify = patcher.start()
        self.addCleanup(patcher.stop)

    def apply(self, event, order_ref="O-1", **info):
        return services.apply_network_event(treatment=self.treatment, event=event, order_ref=order_ref, info=info, occurred_at=T0)


class CareEventTests(Base):
    def test_record_event_redacts_payload_to_allow_list(self):
        event = services.record_event(
            treatment=self.treatment, source="beluga", event="x",
            payload={"status": "ok", "first_name": "Jane", "content": "private", "carrier": "UPS", "nested": {"a": 1}, "order_id": "o"},
        )
        self.assertEqual(event.payload_redacted, {"status": "ok", "carrier": "UPS", "order_id": "o"})
        self.assertEqual(event.patient, self.profile)

    def test_signature_matches_cross_app_callers(self):
        event = services.record_event(treatment=self.treatment, patient=self.profile, source="stripe", event="payment.ok", payload={"invoice_id": "i"})
        self.assertEqual((event.source, event.event), ("stripe", "payment.ok"))

    def test_event_name_truncated_and_time_defaults_to_now(self):
        event = services.record_event(event="e" * 300)
        self.assertEqual(len(event.event), 100)
        self.assertIsNotNone(event.occurred_at)
        self.assertIsNone(event.treatment)

    def test_append_only_model_and_queryset(self):
        event = services.record_event(treatment=self.treatment, event="a")
        event.event = "b"
        with self.assertRaises(AppendOnlyError):
            event.save()
        with self.assertRaises(AppendOnlyError):
            event.delete()
        with self.assertRaises(AppendOnlyError):
            CareEvent.objects.all().update(event="z")
        with self.assertRaises(AppendOnlyError):
            CareEvent.objects.all().delete()
        self.assertEqual(CareEvent.objects.get().event, "a")

    def test_deleting_treatment_keeps_event_without_link(self):
        services.record_event(treatment=self.treatment, event="a")
        self.treatment.delete()
        self.assertIsNone(CareEvent.objects.get().treatment)

    def test_str_has_no_phi(self):
        self.assertNotIn("Pat", str(services.record_event(treatment=self.treatment, event="a")))


class PharmacyEventTests(Base):
    def test_in_fulfillment_then_shipped_then_delivered(self):
        self.apply("PHARMACY_ORDER_IN_FULFILLMENT")
        self.assertEqual(Order.objects.get().status, "in_fulfillment")
        self.apply("PHARMACY_ORDER_SHIPPED", carrier="UPS", tracking="1Z1", trackingUrl="https://t.test/1Z1")
        order = Order.objects.get()
        shipment = Shipment.objects.get()
        self.assertEqual((order.status, shipment.carrier, shipment.tracking_number, shipment.tracking_url, shipment.status), ("shipped", "UPS", "1Z1", "https://t.test/1Z1", "shipped"))
        self.assertEqual(shipment.shipped_at, T0)
        self.apply("PHARMACY_ORDER_DELIVERED", deliveredDate="2026-05-04T10:00:00Z")
        order.refresh_from_db()
        shipment.refresh_from_db()
        self.assertEqual((order.status, shipment.status, shipment.delivered_on), ("delivered", "delivered", date(2026, 5, 4)))
        self.assertEqual([c.args[1] for c in self.notify.call_args_list], ["shipped", "delivered"])

    def test_package_tracking_progression_updates_same_shipment(self):
        self.apply("PHARMACY_ORDER_SHIPPED", carrier="UPS", tracking="T1")
        for event, expected in (("PACKAGE_IN_TRANSIT", "in_transit"), ("PACKAGE_OUT_FOR_DELIVERY", "out_for_delivery"), ("PACKAGE_DELIVERED", "delivered")):
            self.apply(event, order_ref="", tracking="T1", deliveredDate="2026-05-05")
            self.assertEqual(Shipment.objects.get().status, expected)
        self.assertEqual(Order.objects.get().status, "delivered")
        self.assertEqual(Shipment.objects.count(), 1)

    def test_tracking_details_filled_in_by_package_event(self):
        self.apply("PHARMACY_ORDER_SHIPPED")
        self.apply("PACKAGE_IN_TRANSIT", order_ref="", tracking="T9", carrier="FedEx", trackingUrl="https://t.test/9")
        shipment = Shipment.objects.get()
        self.assertEqual((shipment.carrier, shipment.tracking_number, shipment.tracking_url), ("FedEx", "T9", "https://t.test/9"))

    def test_out_of_order_late_events_never_regress(self):
        self.apply("PHARMACY_ORDER_DELIVERED", tracking="T")
        self.apply("PACKAGE_IN_TRANSIT", order_ref="", tracking="T")
        self.apply("PHARMACY_ORDER_SHIPPED", tracking="T")
        self.apply("PHARMACY_ORDER_IN_FULFILLMENT")
        self.assertEqual(Order.objects.get().status, "delivered")
        self.assertEqual(Shipment.objects.get().status, "delivered")
        self.assertEqual(Shipment.objects.count(), 1)

    def test_replayed_event_does_not_double_notify_or_double_count(self):
        sub = make_subscription(self.treatment, term=3)
        batch = services.create_batches(sub)[0]
        Order.objects.create(treatment=self.treatment, pharmacy=self.treatment.pharmacy, external_order_id="O-1", status="submitted", batch=batch)
        for _ in range(3):
            self.apply("PHARMACY_ORDER_SHIPPED", tracking="T")
        self.assertEqual(self.notify.call_count, 1)
        self.assertEqual(Subscription.objects.get(pk=sub.pk).batches_shipped, 1)

    def test_shipped_marks_batch_and_increments_subscription(self):
        sub = make_subscription(self.treatment, term=6)
        first, second = services.create_batches(sub)
        order = services.create_order(self.treatment, batch=first, subscription=sub)
        order.external_order_id = "O-1"
        order.save()
        self.apply("PHARMACY_ORDER_SHIPPED", tracking="T")
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual((first.status, second.status), ("shipped", "scheduled"))
        self.assertEqual(Subscription.objects.get(pk=sub.pk).batches_shipped, 1)

    def test_unassigned_pending_order_is_adopted_by_vendor_order_id(self):
        pending = services.create_order(self.treatment, fill_type="refill")
        self.apply("PHARMACY_ORDER_IN_FULFILLMENT", order_ref="V-77")
        pending.refresh_from_db()
        self.assertEqual((pending.external_order_id, pending.status), ("V-77", "in_fulfillment"))
        self.assertEqual(Order.objects.count(), 1)

    def test_second_vendor_order_id_creates_second_order_as_refill(self):
        self.apply("PHARMACY_ORDER_SHIPPED", order_ref="O-1")
        self.apply("PHARMACY_ORDER_SHIPPED", order_ref="O-2")
        self.assertEqual(list(Order.objects.order_by("created_at").values_list("fill_type", flat=True)), ["initial", "refill"])

    def test_package_event_without_order_is_unresolved(self):
        with self.assertRaises(UnresolvedReference):
            self.apply("PACKAGE_IN_TRANSIT", order_ref="")

    def test_pharmacy_event_without_any_pharmacy_is_unresolved(self):
        self.treatment.pharmacy = None
        self.treatment.network = None
        with self.assertRaises(UnresolvedReference):
            self.apply("PHARMACY_ORDER_SHIPPED")

    def test_first_shipment_activates_prescribed_treatment(self):
        self.treatment.status = "prescribed"
        self.treatment.save()
        with mock.patch("apps.clinical.hooks.record_event"):
            self.apply("PHARMACY_ORDER_SHIPPED")
        self.treatment.refresh_from_db()
        self.assertEqual(self.treatment.status, "active")

    def test_activation_failure_does_not_break_tracking(self):
        self.treatment.status = "prescribed"
        self.treatment.save()
        with mock.patch("apps.clinical.services.transition", side_effect=RuntimeError):
            self.apply("PHARMACY_ORDER_SHIPPED")
        self.assertEqual(Order.objects.get().status, "shipped")

    def test_delivery_failed_flags_shipment_and_alerts_patient(self):
        self.apply("PHARMACY_ORDER_SHIPPED", tracking="T")
        self.apply("PACKAGE_DELIVERY_FAILED", order_ref="", tracking="T")
        self.assertEqual(Shipment.objects.get().status, "delivery_failed")
        self.assertEqual(Order.objects.get().status, "shipped")
        self.notify.assert_called_with(self.profile, "action_required")

    def test_redelivery_after_failure_and_final_delivery(self):
        self.apply("PHARMACY_ORDER_SHIPPED", tracking="T")
        self.apply("PACKAGE_DELIVERY_FAILED", order_ref="", tracking="T")
        self.apply("PACKAGE_OUT_FOR_DELIVERY", order_ref="", tracking="T")
        self.assertEqual(Shipment.objects.get().status, "out_for_delivery")
        self.apply("PACKAGE_DELIVERED", order_ref="", tracking="T")
        self.assertEqual(Shipment.objects.get().status, "delivered")

    def test_delivery_failed_after_delivery_is_ignored(self):
        self.apply("PHARMACY_ORDER_DELIVERED", tracking="T")
        self.apply("PACKAGE_DELIVERY_FAILED", order_ref="", tracking="T")
        self.assertEqual(Shipment.objects.get().status, "delivered")

    def test_every_event_is_recorded_without_phi(self):
        self.apply("PHARMACY_ORDER_SHIPPED", carrier="UPS", tracking="SECRET-TRACK")
        event = CareEvent.objects.get(event="pharmacy_order_shipped")
        self.assertEqual(event.source, "beluga")
        self.assertNotIn("SECRET-TRACK", str(event.payload_redacted))

    def test_lab_events_only_record_care_event(self):
        self.apply("LAB_ORDER_RESULTS")
        self.assertEqual(CareEvent.objects.get().event, "lab_order_results")
        self.assertEqual((Order.objects.count(), Shipment.objects.count()), (0, 0))

    def test_unknown_event_ignored(self):
        self.assertEqual(self.apply("SOMETHING_ELSE"), services.IGNORED)

    def test_delivered_date_formats(self):
        self.apply("PHARMACY_ORDER_SHIPPED", tracking="T")
        self.apply("PACKAGE_DELIVERED", order_ref="", tracking="T", deliveredDate="not a date")
        self.assertEqual(Shipment.objects.get().delivered_on, T0.date())


class PharmacyWebhookTests(Base):
    def setUp(self):
        super().setUp()
        self.order = Order.objects.create(treatment=self.treatment, pharmacy=self.treatment.pharmacy, external_order_id="LF-1", status="submitted")

    def apply(self, **payload):  # type: ignore[override]
        return services.apply_pharmacy_webhook("lifefile", payload, received_at=T0)

    def test_status_progression_and_tracking(self):
        self.apply(orderId="LF-1", status="processing")
        self.assertEqual(Order.objects.get().status, "in_fulfillment")
        self.apply(orderId="LF-1", status="shipped", trackingNumber="1Z", carrier="UPS")
        shipment = Shipment.objects.get()
        self.assertEqual((shipment.tracking_number, shipment.carrier, Order.objects.get().status), ("1Z", "UPS", "shipped"))
        self.apply(orderId="LF-1", status="delivered")
        self.assertEqual((Order.objects.get().status, Shipment.objects.get().status), ("delivered", "delivered"))

    def test_matches_by_reference_id_and_stores_vendor_id(self):
        Order.objects.filter(pk=self.order.pk).update(external_order_id="")
        self.apply(referenceId=str(self.order.pk), orderId="LF-9", status="received")
        self.order.refresh_from_db()
        self.assertEqual(self.order.external_order_id, "LF-9")

    def test_unknown_order_unresolved(self):
        with self.assertRaises(UnresolvedReference):
            self.apply(orderId="nope", status="shipped")
        with self.assertRaises(UnresolvedReference):
            self.apply(referenceId="not-a-uuid", status="shipped")

    def test_cancel_and_error_do_not_override_shipped(self):
        self.apply(orderId="LF-1", status="shipped")
        self.apply(orderId="LF-1", status="cancelled")
        self.assertEqual(Order.objects.get().status, "shipped")

    def test_cancel_and_error_before_shipping(self):
        self.apply(orderId="LF-1", status="error")
        self.assertEqual(Order.objects.get().status, "failed")
        self.apply(orderId="LF-1", status="cancelled")
        self.assertEqual(Order.objects.get().status, "canceled")

    def test_unknown_status_is_ignored_but_recorded(self):
        self.assertEqual(self.apply(orderId="LF-1", status="weird"), services.IGNORED)
        self.assertTrue(CareEvent.objects.filter(event="pharmacy.weird").exists())

    def test_on_hold_changes_nothing(self):
        self.apply(orderId="LF-1", status="on_hold")
        self.assertEqual(Order.objects.get().status, "submitted")


class BatchShippedGuardTests(Base):
    def test_batch_not_double_counted_when_order_delivers_after_shipping(self):
        sub = make_subscription(self.treatment, term=3)
        batch = services.create_batches(sub)[0]
        order = services.create_order(self.treatment, batch=batch, subscription=sub)
        order.external_order_id = "O-1"
        order.save()
        self.apply("PHARMACY_ORDER_SHIPPED", tracking="T")
        self.apply("PHARMACY_ORDER_DELIVERED", tracking="T")
        self.assertEqual(Subscription.objects.get(pk=sub.pk).batches_shipped, 1)
        self.assertEqual(ShipmentBatch.objects.get(pk=batch.pk).status, "shipped")
