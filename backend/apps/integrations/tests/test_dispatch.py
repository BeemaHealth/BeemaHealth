from datetime import timedelta
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone

from apps.clinical.models import ActionItem, DrugIneligibility, Prescription, Treatment, Visit
from apps.fulfillment.models import CareEvent, Order, Shipment
from apps.integrations import webhooks
from apps.integrations.exceptions import IntegrationError, UnresolvedReference
from apps.integrations.models import InboundEvent
from apps.messaging.models import Conversation, Message

from .helpers import make_graph

_seq = iter(range(1, 10_000))


def event(payload: dict, vendor: str = "beluga", **extra) -> InboundEvent:
    """Store an InboundEvent directly (ingest is covered in test_webhooks)."""
    return InboundEvent.objects.create(
        vendor=vendor,
        dedupe_key=f"{next(_seq):064d}",
        event_type=payload.get("event") or payload.get("type") or "",
        external_ref=payload.get("masterId", ""),
        raw_payload=payload,
        **extra,
    )


class DispatchBase(TestCase):
    def setUp(self):
        self.profile, self.treatment, self.visit = make_graph()
        self.master = self.visit.external_id
        for target in ("apps.clinical.hooks.notify_patient", "apps.clinical.hooks.refund_not_prescribed", "apps.integrations.dispatch.notify_patient"):
            patcher = mock.patch(target)
            setattr(self, target.split(".")[-1] + "_mock", patcher.start())
            self.addCleanup(patcher.stop)

    def run_event(self, payload: dict, **extra) -> InboundEvent:
        return webhooks.process(event({"masterId": self.master, **payload}, **extra))

    def refresh(self):
        self.treatment.refresh_from_db()
        self.visit.refresh_from_db()


RX = {
    "event": "RX_WRITTEN",
    "docName": "Dr. Who",
    "medsPrescribed": [
        {"name": "Semaglutide", "strength": "0.5mg", "refills": "2", "quantity": "1", "medId": "MED-1", "rxId": "RX-1", "pharmacyNotes": "Keep cold"}
    ],
}


class RxWrittenTests(DispatchBase):
    def test_creates_prescription_and_moves_treatment_to_prescribed(self):
        result = self.run_event(RX)
        self.assertEqual(result.status, "processed")
        rx = Prescription.objects.get()
        self.assertEqual((rx.external_rx_id, rx.external_med_id, rx.refills, rx.quantity), ("RX-1", "MED-1", 2, 1))
        self.assertEqual(rx.prescriber_name, "Dr. Who")
        self.refresh()
        self.assertEqual(self.treatment.status, "prescribed")
        self.assertEqual(self.visit.doctor_name, "Dr. Who")

    def test_dose_change_flagged(self):
        self.run_event(RX)
        self.refresh()
        self.assertTrue(self.treatment.dose_changed_by_doctor)

    def test_processing_twice_is_idempotent(self):
        stored = event({"masterId": self.master, **RX})
        webhooks.process(stored)
        webhooks.process(stored)
        self.assertEqual(Prescription.objects.count(), 1)
        stored.refresh_from_db()
        self.assertEqual(stored.attempts, 1)

    def test_distinct_events_for_same_rx_do_not_duplicate(self):
        self.run_event(RX)
        self.run_event({**RX, "docName": "Dr. Other"})
        self.assertEqual(Prescription.objects.count(), 1)

    def test_multiple_meds_create_multiple_prescriptions(self):
        meds = RX["medsPrescribed"] + [{**RX["medsPrescribed"][0], "rxId": "RX-2"}]
        self.run_event({**RX, "medsPrescribed": meds})
        self.assertEqual(Prescription.objects.count(), 2)

    def test_empty_meds_fails_event(self):
        result = self.run_event({"event": "RX_WRITTEN", "medsPrescribed": []})
        self.assertEqual((result.status, Prescription.objects.count()), ("failed", 0))

    def test_invalid_transition_marks_failed_not_raise(self):
        Treatment.objects.filter(pk=self.treatment.pk).update(status="canceled")
        result = self.run_event(RX)
        self.assertEqual(result.status, "failed")
        self.assertEqual(result.last_error, "InvalidTransition")

    def test_beema_routed_with_flag_creates_order_via_fulfillment(self):
        Treatment.objects.filter(pk=self.treatment.pk).update(status="pending_visit")
        self.treatment.product.routing_mode = "beema_routes"
        self.treatment.product.save()
        with override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True):
            self.run_event(RX)
        order = Order.objects.get()
        self.assertEqual(order.status, "submitted")
        self.assertTrue(order.external_order_id.startswith("FAKE-"))

    def test_network_routed_creates_no_order(self):
        with override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True):
            self.run_event(RX)
        self.assertEqual(Order.objects.count(), 0)

    def test_beema_routed_with_flag_off_creates_no_order(self):
        self.treatment.product.routing_mode = "beema_routes"
        self.treatment.product.save()
        self.run_event(RX)
        self.assertEqual(Order.objects.count(), 0)


class ConsultTests(DispatchBase):
    def test_concluded_prescribed(self):
        result = self.run_event({"event": "CONSULT_CONCLUDED", "visitOutcome": "prescribed"})
        self.assertEqual(result.status, "processed")
        self.refresh()
        self.assertEqual((self.visit.outcome, self.visit.status), ("prescribed", "concluded"))

    def test_concluded_referred_marks_ineligible_and_refunds(self):
        self.run_event({"event": "CONSULT_CONCLUDED", "visitOutcome": "referred"})
        self.refresh()
        self.assertEqual(self.treatment.status, "referred")
        self.assertEqual(DrugIneligibility.objects.count(), 1)
        self.refund_not_prescribed_mock.assert_called_once()

    def test_canceled_by_doctor(self):
        self.run_event({"event": "CONSULT_CANCELED"})
        self.refresh()
        self.assertEqual((self.visit.outcome, self.treatment.status), ("canceled", "canceled"))

    def test_invalid_outcome_fails_event(self):
        for outcome in ("", "maybe", None):
            with self.subTest(outcome=outcome):
                result = self.run_event({"event": "CONSULT_CONCLUDED", "visitOutcome": outcome})
                self.assertEqual(result.status, "failed")
        self.refresh()
        self.assertEqual(self.visit.outcome, "none")

    def test_replayed_conclusion_is_noop(self):
        for _ in range(2):
            self.run_event({"event": "CONSULT_CANCELED"})
        self.assertEqual(DrugIneligibility.objects.count(), 1)


class MessagingTests(DispatchBase):
    def test_doctor_chat_creates_inbound_message(self):
        self.visit.doctor_name = "Dr. Who"
        self.visit.save()
        stored = event({"masterId": self.master, "event": "DOCTOR_CHAT", "content": "Take with food"})
        result = webhooks.process(stored)
        self.assertEqual(result.status, "processed")
        message = Message.objects.get()
        self.assertEqual((message.direction, message.sender_role, message.body, message.external_id), ("in", "doctor", "Take with food", stored.dedupe_key))
        self.assertEqual(Conversation.objects.get().visit, self.visit)

    def test_doctor_chat_reprocess_does_not_duplicate(self):
        stored = event({"masterId": self.master, "event": "DOCTOR_CHAT", "content": "Hi"})
        webhooks.process(stored)
        InboundEvent.objects.filter(pk=stored.pk).update(status="received")
        webhooks.process(stored)
        self.assertEqual(Message.objects.count(), 1)

    def test_cs_message_goes_to_support_thread(self):
        result = self.run_event({"event": "CS_MESSAGE", "content": "Please upload ID"})
        self.assertEqual(result.status, "processed")
        message = Message.objects.get()
        self.assertEqual((message.sender_role, message.conversation.kind), ("customer_success", "support"))

    def test_empty_chat_content_fails(self):
        for kind in ("DOCTOR_CHAT", "CS_MESSAGE"):
            with self.subTest(kind=kind):
                self.assertEqual(self.run_event({"event": kind, "content": "  "}).status, "failed")
        self.assertEqual(Message.objects.count(), 0)

    def test_services_called_with_expected_arguments(self):
        messaging = mock.Mock()
        with mock.patch("apps.integrations.dispatch.messaging_services", return_value=messaging):
            stored = event({"masterId": self.master, "event": "DOCTOR_CHAT", "content": "yo"})
            webhooks.process(stored)
        messaging.receive_doctor_message.assert_called_once_with(self.visit, "yo", stored.dedupe_key, "Doctor")
        with mock.patch("apps.integrations.dispatch.messaging_services", return_value=messaging):
            stored = event({"masterId": self.master, "event": "CS_MESSAGE", "content": "cs"})
            webhooks.process(stored)
        messaging.receive_cs_message.assert_called_once_with(self.profile, "cs", stored.dedupe_key)


class BookingTests(DispatchBase):
    def test_created_schedules_visit_and_notifies(self):
        ActionItem.objects.create(patient=self.profile, treatment=self.treatment, kind="book_visit", title="Book")
        self.run_event({"event": "BOOKING_CREATED", "docName": "Dr. B", "scheduledDate": "2026-11-01T15:00:00.000Z", "location": "https://video.test/abc"})
        self.refresh()
        self.assertEqual(self.visit.status, "scheduled")
        self.assertEqual(self.visit.scheduled_at.isoformat(), "2026-11-01T15:00:00+00:00")
        self.assertEqual((self.visit.video_location, self.visit.doctor_name), ("https://video.test/abc", "Dr. B"))
        self.assertFalse(ActionItem.objects.get(kind="book_visit").is_open)
        self.notify_patient_mock.assert_called_with(self.profile, "visit_scheduled")

    def test_rescheduled_updates_time(self):
        self.run_event({"event": "BOOKING_CREATED", "scheduledDate": "2026-11-01T15:00:00Z"})
        self.run_event({"event": "BOOKING_RESCHEDULED", "scheduledDate": "2026-11-02T16:00:00Z"})
        self.refresh()
        self.assertEqual(self.visit.scheduled_at.day, 2)

    def test_missing_schedule_date_fails(self):
        self.assertEqual(self.run_event({"event": "BOOKING_CREATED"}).status, "failed")

    def test_cancelled_reopens_booking_action_once(self):
        self.run_event({"event": "BOOKING_CREATED", "scheduledDate": "2026-11-01T15:00:00Z"})
        self.run_event({"event": "BOOKING_CANCELLED"})
        self.run_event({"event": "BOOKING_CANCELLED", "extra": "again"})
        self.refresh()
        self.assertEqual((self.visit.status, self.visit.scheduled_at), ("pending", None))
        self.assertEqual(ActionItem.objects.filter(kind="book_visit", is_open=True).count(), 1)

    def test_no_show(self):
        self.run_event({"event": "NO_SHOW"})
        self.refresh()
        self.assertEqual(self.visit.status, "no_show")
        self.assertTrue(ActionItem.objects.filter(kind="book_visit", is_open=True).exists())

    def test_booking_after_conclusion_is_ignored(self):
        self.run_event({"event": "CONSULT_CONCLUDED", "visitOutcome": "prescribed"})
        self.run_event({"event": "NO_SHOW"})
        self.refresh()
        self.assertEqual(self.visit.status, "concluded")


class FulfillmentEventTests(DispatchBase):
    def test_pharmacy_shipped_creates_order_and_shipment(self):
        result = self.run_event({"event": "PHARMACY_ORDER_SHIPPED", "orderId": "O-1", "info": {"carrier": "UPS", "tracking": "1Z9"}})
        self.assertEqual(result.status, "processed")
        order = Order.objects.get()
        self.assertEqual((order.external_order_id, order.status), ("O-1", "shipped"))
        shipment = Shipment.objects.get()
        self.assertEqual((shipment.carrier, shipment.tracking_number, shipment.status), ("UPS", "1Z9", "shipped"))
        self.notify_patient_mock.assert_called_with(self.profile, "shipped")
        self.assertTrue(CareEvent.objects.filter(event="pharmacy_order_shipped").exists())

    def test_every_pharmacy_package_and_lab_event_is_handled(self):
        names = [
            "PHARMACY_ORDER_IN_FULFILLMENT", "PHARMACY_ORDER_SHIPPED", "PHARMACY_ORDER_DELIVERED", "PACKAGE_IN_TRANSIT",
            "PACKAGE_OUT_FOR_DELIVERY", "PACKAGE_DELIVERED", "PACKAGE_DELIVERY_FAILED", "LAB_ORDER_SHIPPED_TO_PATIENT",
            "LAB_ORDER_DELIVERED_TO_PATIENT", "LAB_ORDER_SHIPPED_TO_LAB", "LAB_ORDER_RECEIVED_BY_LAB", "LAB_ORDER_RESULTS",
            "LAB_ORDER_REQUISITION_CREATED",
        ]
        self.run_event({"event": "PHARMACY_ORDER_IN_FULFILLMENT", "orderId": "O-1"})
        for name in names:
            with self.subTest(event=name):
                self.assertEqual(self.run_event({"event": name, "orderId": "O-1", "info": {"tracking": "T"}}).status, "processed")

    def test_package_event_before_any_order_fails_then_succeeds_after_retry(self):
        early = self.run_event({"event": "PACKAGE_IN_TRANSIT", "info": {"tracking": "T1"}})
        self.assertEqual((early.status, early.attempts), ("failed", 1))
        self.assertIsNotNone(early.next_attempt_at)
        self.run_event({"event": "PHARMACY_ORDER_SHIPPED", "orderId": "O-1", "info": {"tracking": "T1", "carrier": "UPS"}})
        InboundEvent.objects.filter(pk=early.pk).update(next_attempt_at=timezone.now() - timedelta(seconds=1))
        stats = webhooks.process_pending()
        early.refresh_from_db()
        self.assertEqual(early.status, "processed")
        self.assertEqual(stats["processed"], 1)
        self.assertEqual(Shipment.objects.get().status, "in_transit")

    def test_late_events_never_regress_status(self):
        self.run_event({"event": "PHARMACY_ORDER_DELIVERED", "orderId": "O-1", "info": {"tracking": "T", "deliveredDate": "2026-05-05"}})
        self.run_event({"event": "PACKAGE_IN_TRANSIT", "info": {"tracking": "T"}})
        self.run_event({"event": "PHARMACY_ORDER_IN_FULFILLMENT", "orderId": "O-1"})
        self.assertEqual(Order.objects.get().status, "delivered")
        shipment = Shipment.objects.get()
        self.assertEqual(shipment.status, "delivered")
        self.assertEqual(str(shipment.delivered_on), "2026-05-05")


class LabAndUnknownEventTests(DispatchBase):
    def test_unknown_event_is_ignored_not_failed(self):
        result = self.run_event({"event": "SOMETHING_NEW"})
        self.assertEqual(result.status, "ignored")

    def test_missing_event_name_fails(self):
        self.assertEqual(self.run_event({"foo": "bar"}).status, "failed")

    def test_unknown_master_id_marks_failed_not_500(self):
        stored = event({"masterId": "no-such-visit", "event": "CONSULT_CANCELED"})
        result = webhooks.process(stored)
        self.assertEqual(result.status, "failed")
        self.assertIn("UnresolvedReference", result.last_error)
        self.assertEqual(Visit.objects.get().outcome, "none")

    def test_known_event_without_master_id_fails(self):
        self.assertEqual(webhooks.process(event({"event": "CONSULT_CANCELED"})).status, "failed")

    def test_lab_event_records_care_event_only(self):
        self.run_event({"event": "LAB_ORDER_RESULTS", "orderId": "L1"})
        self.assertEqual(CareEvent.objects.get().event, "lab_order_results")
        self.assertEqual(Order.objects.count(), 0)


class StripeDispatchTests(TestCase):
    def stripe_event(self, event_type="payment_intent.succeeded"):
        return event({"id": "evt_1", "type": event_type, "data": {"object": {"id": "pi_1"}}}, vendor="stripe")

    def test_delegates_to_billing_dispatch(self):
        with mock.patch("apps.billing.webhooks.dispatch", return_value=True) as dispatch:
            result = webhooks.process(self.stripe_event())
        dispatch.assert_called_once_with("payment_intent.succeeded", {"id": "pi_1"})
        self.assertEqual(result.status, "processed")

    def test_unhandled_or_foreign_events_are_ignored(self):
        for returned in (None, False):
            with self.subTest(returned=returned), mock.patch("apps.billing.webhooks.dispatch", return_value=returned):
                self.assertEqual(webhooks.process(self.stripe_event("customer.created")).status, "ignored")

    def test_billing_exception_marks_failed_without_leaking_message(self):
        with mock.patch("apps.billing.webhooks.dispatch", side_effect=RuntimeError("card 4242 for Jane")):
            result = webhooks.process(self.stripe_event())
        self.assertEqual((result.status, result.last_error), ("failed", "RuntimeError"))


class ProcessPipelineTests(DispatchBase):
    def test_processed_events_are_not_reprocessed(self):
        stored = event({"masterId": self.master, "event": "CONSULT_CANCELED"})
        with mock.patch("apps.integrations.dispatch.dispatch_event", return_value="handled") as dispatch:
            webhooks.process(stored)
            webhooks.process(stored)
        dispatch.assert_called_once()

    def test_dead_after_max_attempts(self):
        stored = event({"masterId": "ghost", "event": "CONSULT_CANCELED"})
        with override_settings(INTEGRATIONS_MAX_ATTEMPTS=3):
            statuses = [webhooks.process(stored).status for _ in range(5)]
        self.assertEqual(statuses, ["failed", "failed", "dead", "dead", "dead"])
        stored.refresh_from_db()
        self.assertEqual(stored.attempts, 3)
        self.assertIsNone(stored.next_attempt_at)

    def test_backoff_grows_and_is_capped(self):
        self.assertLess(webhooks._backoff(1), webhooks._backoff(2))
        self.assertEqual(webhooks._backoff(30), timedelta(hours=1))

    def test_unexpected_exception_is_contained_and_message_not_stored(self):
        stored = event({"masterId": self.master, "event": "CONSULT_CANCELED"})
        with mock.patch("apps.integrations.dispatch.dispatch_event", side_effect=ValueError("Jane Doe 512-555-0100")):
            result = webhooks.process(stored)
        self.assertEqual((result.status, result.last_error), ("failed", "ValueError"))

    def test_crash_log_excludes_exception_message(self):
        stored = event({"masterId": self.master, "event": "CONSULT_CANCELED"})
        with mock.patch("apps.integrations.dispatch.dispatch_event", side_effect=ValueError("Jane Doe 512-555-0100")):
            with self.assertLogs("apps.integrations.webhooks", level="ERROR") as logs:
                webhooks.process(stored)
        text = "\n".join(logs.output)
        self.assertIn("ValueError at", text)
        self.assertNotIn("Jane", text)

    def test_integration_error_message_is_stored(self):
        stored = event({"masterId": self.master, "event": "CONSULT_CANCELED"})
        with mock.patch("apps.integrations.dispatch.dispatch_event", side_effect=UnresolvedReference("Unknown masterId")):
            result = webhooks.process(stored)
        self.assertEqual(result.last_error, "UnresolvedReference: Unknown masterId")

    def test_failed_handler_rolls_back_partial_writes(self):
        stored = event({"masterId": self.master, **RX})

        def boom(visit, rx):
            Prescription.objects.create(treatment=visit.treatment, external_rx_id="PARTIAL")
            raise IntegrationError("later step failed")

        with mock.patch("apps.clinical.services.apply_prescription", side_effect=boom):
            result = webhooks.process(stored)
        self.assertEqual(result.status, "failed")
        self.assertEqual(Prescription.objects.count(), 0)

    def test_process_pending_respects_backoff_vendor_filter_and_limit(self):
        due = event({"masterId": "g1", "event": "CONSULT_CANCELED"})
        waiting = event({"masterId": "g2", "event": "CONSULT_CANCELED"}, status="failed", next_attempt_at=timezone.now() + timedelta(hours=1))
        other = event({"masterId": "g3", "event": "x"}, vendor="lifefile")
        done = event({"masterId": "g4", "event": "CONSULT_CANCELED"}, status="processed")
        dead = event({"masterId": "g5", "event": "CONSULT_CANCELED"}, status="dead")
        stats = webhooks.process_pending(vendor="beluga")
        self.assertEqual(stats["failed"], 1)
        for e in (due, waiting, other, done, dead):
            e.refresh_from_db()
        self.assertEqual((due.attempts, waiting.attempts, other.attempts, done.attempts, dead.attempts), (1, 0, 0, 0, 0))
        self.assertEqual(webhooks.process_pending(limit=0), {"processed": 0, "failed": 0, "dead": 0, "ignored": 0})

    def test_events_processed_oldest_first(self):
        order = []
        a = event({"masterId": self.master, "event": "CONSULT_CANCELED"})
        b = event({"masterId": self.master, "event": "NO_SHOW"})
        with mock.patch("apps.integrations.dispatch.dispatch_event", side_effect=lambda e: order.append(e.pk) or "handled"):
            webhooks.process_pending()
        self.assertEqual(order, [a.pk, b.pk])
