from datetime import timedelta

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.tests.helpers import make_staff
from apps.audit.models import AuditEvent
from apps.fulfillment import services
from apps.fulfillment.models import CareEvent, Order, Shipment
from apps.fulfillment.pharmacy import FakePharmacyAdapter
from apps.integrations.tests.helpers import make_graph, make_subscription

BASE = "/api/v1/fulfillment/"


def seed(status="active"):
    profile, treatment, _ = make_graph(status=status)
    order = Order.objects.create(treatment=treatment, pharmacy=treatment.pharmacy, status="shipped", external_order_id="SECRET-VENDOR-ID")
    shipment = Shipment.objects.create(order=order, carrier="UPS", tracking_number="1Z1", status="in_transit")
    return profile, treatment, order, shipment


class PatientScopingTests(TestCase):
    def setUp(self):
        self.a, self.a_treatment, self.a_order, self.a_shipment = seed()
        self.b, self.b_treatment, self.b_order, self.b_shipment = seed()
        self.client = APIClient()
        self.client.force_authenticate(self.a.user)

    def ids(self, response):
        data = response.data["results"] if isinstance(response.data, dict) and "results" in response.data else response.data
        return {row["id"] for row in data}

    def test_orders_list_only_own(self):
        response = self.client.get(BASE + "orders/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.ids(response), {str(self.a_order.pk)})

    def test_order_detail_other_patient_is_404(self):
        self.assertEqual(self.client.get(f"{BASE}orders/{self.a_order.pk}/").status_code, 200)
        self.assertEqual(self.client.get(f"{BASE}orders/{self.b_order.pk}/").status_code, 404)

    def test_shipments_list_only_own(self):
        self.assertEqual(self.ids(self.client.get(BASE + "shipments/")), {str(self.a_shipment.pk)})

    def test_next_shipment_only_own(self):
        sub_b = make_subscription(self.b_treatment, term=3)
        services.create_batches(sub_b)
        self.assertIsNone(self.client.get(BASE + "next-shipment/").data["next_shipment"])
        sub_a = make_subscription(self.a_treatment, term=3)
        batch = services.create_batches(sub_a)[0]
        self.assertEqual(self.client.get(BASE + "next-shipment/").data["next_shipment"]["id"], str(batch.pk))

    def test_request_refill_for_other_patients_treatment_is_404_and_creates_nothing(self):
        before = Order.objects.count()
        response = self.client.post(BASE + "request-refill/", {"treatment": str(self.b_treatment.pk)}, format="json")
        self.assertEqual(response.status_code, 404)
        self.assertEqual(Order.objects.count(), before)

    def test_unauthenticated_and_non_patient_denied_everywhere(self):
        staff = make_staff()
        for client in (APIClient(), self._as(staff)):
            for method, path in (("get", "orders/"), ("get", f"orders/{self.a_order.pk}/"), ("get", "shipments/"), ("get", "next-shipment/"), ("post", "request-refill/")):
                with self.subTest(path=path, user=getattr(client.handler._force_user, "pk", None)):
                    self.assertIn(getattr(client, method)(BASE + path).status_code, (401, 403))

    def _as(self, user):
        client = APIClient()
        client.force_authenticate(user)
        return client

    def test_response_hides_vendor_ids_and_internal_fields(self):
        text = str(self.client.get(BASE + "orders/").content)
        self.assertNotIn("SECRET-VENDOR-ID", text)
        self.assertNotIn("last_error", text)

    def test_serializers_are_read_only(self):
        self.assertEqual(self.client.post(BASE + "orders/", {"status": "delivered"}, format="json").status_code, 405)
        self.assertEqual(self.client.patch(f"{BASE}orders/{self.a_order.pk}/", {"status": "delivered"}, format="json").status_code, 405)

    def test_order_includes_shipments_with_tracking(self):
        data = self.client.get(f"{BASE}orders/{self.a_order.pk}/").data
        self.assertEqual(data["shipments"][0]["tracking_number"], "1Z1")
        self.assertEqual(data["shipments"][0]["status"], "in_transit")


class NextShipmentTests(TestCase):
    def setUp(self):
        self.profile, self.treatment, _ = make_graph(status="active")
        self.client = APIClient()
        self.client.force_authenticate(self.profile.user)

    def test_none_without_subscription(self):
        self.assertEqual(self.client.get(BASE + "next-shipment/").data, {"next_shipment": None})

    def test_reports_blocker_reason_for_portal(self):
        sub = make_subscription(self.treatment, term=6)
        first, second = services.create_batches(sub)
        from apps.fulfillment.models import ShipmentBatch

        ShipmentBatch.objects.filter(pk=first.pk).update(status="released")
        data = self.client.get(BASE + "next-shipment/").data["next_shipment"]
        self.assertEqual((data["sequence"], data["status"], data["blocked_reason"]), (1, "released", ""))
        ShipmentBatch.objects.filter(pk=first.pk).update(status="shipped")
        data = self.client.get(BASE + "next-shipment/").data["next_shipment"]
        self.assertEqual((data["sequence"], data["blocked_reason"], data["supply_days"]), (2, "checkin_required", 90))
        self.assertEqual(str(data["treatment_id"]), str(self.treatment.pk))

    def test_canceled_subscription_has_no_next_shipment(self):
        sub = make_subscription(self.treatment, term=3)
        services.create_batches(sub)
        sub.status = "canceled"
        sub.save()
        self.assertIsNone(self.client.get(BASE + "next-shipment/").data["next_shipment"])


class RefillTests(TestCase):
    def setUp(self):
        FakePharmacyAdapter.reset()
        self.profile, self.treatment, _ = make_graph(status="active")
        self.client = APIClient()
        self.client.force_authenticate(self.profile.user)

    def post(self, treatment=None):
        return self.client.post(BASE + "request-refill/", {"treatment": str((treatment or self.treatment).pk)}, format="json")

    def test_creates_pending_refill_order_and_audit(self):
        response = self.post()
        self.assertEqual(response.status_code, 201)
        order = Order.objects.get()
        self.assertEqual((order.fill_type, order.status, order.pharmacy_id), ("refill", "pending", self.treatment.pharmacy_id))
        self.assertTrue(CareEvent.objects.filter(event="refill.requested", treatment=self.treatment).exists())
        self.assertTrue(AuditEvent.objects.filter(action="create", object_id=str(order.pk)).exists())

    def test_second_request_within_24_hours_is_429_with_cooldown_payload(self):
        self.post()
        response = self.post()
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.data["code"], "refill_cooldown")
        self.assertTrue(response.data["cooldown"]["active"])
        self.assertGreater(response.data["cooldown"]["hours_remaining"], 23)
        self.assertEqual(Order.objects.count(), 1)

    def test_cooldown_boundaries(self):
        now = timezone.now()
        services.record_event(treatment=self.treatment, event="refill.requested", occurred_at=now - timedelta(hours=23, minutes=59))
        with self.assertRaises(services.RefillCooldownActive) as ctx:
            services.request_refill(self.profile, self.treatment, now=now)
        self.assertEqual(ctx.exception.hours_remaining, 0.0)
        Order.objects.all().delete()
        later = now + timedelta(minutes=2)
        order = services.request_refill(self.profile, self.treatment, now=later)
        self.assertEqual(order.fill_type, "refill")

    def test_cooldown_is_per_treatment(self):
        self.post()
        _, other, _ = make_graph(status="active")
        other.patient = self.profile
        other.save()
        self.assertEqual(self.post(other).status_code, 201)

    def test_open_refill_blocks_even_after_cooldown(self):
        order = services.request_refill(self.profile, self.treatment, now=timezone.now() - timedelta(hours=30))
        self.assertEqual(order.status, "pending")
        response = self.post()
        self.assertEqual((response.status_code, response.data["code"]), (409, "refill_in_progress"))

    def test_completed_refill_allows_new_request_after_cooldown(self):
        order = services.request_refill(self.profile, self.treatment, now=timezone.now() - timedelta(hours=30))
        Order.objects.filter(pk=order.pk).update(status="delivered")
        self.assertEqual(self.post().status_code, 201)

    def test_inactive_treatments_cannot_refill(self):
        for status in ("pending_visit", "canceled", "ended", "paused", "referred", "awaiting_payment"):
            with self.subTest(status=status):
                self.treatment.status = status
                self.treatment.save()
                response = self.post()
                self.assertEqual((response.status_code, response.data["code"]), (409, "treatment_not_active"))
        self.assertEqual(Order.objects.count(), 0)

    def test_refill_due_and_prescribed_may_refill(self):
        for status in ("refill_due", "prescribed"):
            Order.objects.all().delete()
            _, treatment, _ = make_graph(status=status)
            treatment.patient = self.profile
            treatment.save()
            self.assertEqual(self.post(treatment).status_code, 201, status)

    def test_no_pharmacy_or_network_is_a_clear_conflict(self):
        self.treatment.pharmacy = None
        self.treatment.network = None
        self.treatment.save()
        self.assertEqual(self.post().data["code"], "no_pharmacy")

    def test_validation(self):
        for body in ({}, {"treatment": "not-a-uuid"}, {"treatment": ""}):
            with self.subTest(body=body):
                self.assertEqual(self.client.post(BASE + "request-refill/", body, format="json").status_code, 400)
        missing = self.client.post(BASE + "request-refill/", {"treatment": "00000000-0000-0000-0000-000000000000"}, format="json")
        self.assertEqual(missing.status_code, 404)

    def test_beema_routed_refill_submits_to_pharmacy_when_flag_on(self):
        self.treatment.product.routing_mode = "beema_routes"
        self.treatment.product.save()
        from apps.clinical.models import Prescription

        Prescription.objects.create(treatment=self.treatment, external_rx_id="R", drug="Sema")
        with override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True):
            response = self.post()
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Order.objects.get().status, "submitted")
        self.assertEqual(len(FakePharmacyAdapter.submitted), 1)

    def test_network_routed_refill_stays_pending_for_staff(self):
        with override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True):
            self.post()
        self.assertEqual(Order.objects.get().status, "pending")
        self.assertEqual(FakePharmacyAdapter.submitted, [])

    def test_service_rejects_foreign_treatment_directly(self):
        other, other_treatment, _ = make_graph(status="active")
        with self.assertRaises(services.RefillNotAllowed) as ctx:
            services.request_refill(self.profile, other_treatment)
        self.assertEqual(ctx.exception.reason, "not_found")


class ExportTests(TestCase):
    def test_contributor_registered_and_scoped_to_patient(self):
        from apps.patients import export

        self.assertIn(services.export_for_patient, export.registered())
        a, _, a_order, _ = seed()
        b, _, b_order, _ = seed()
        services.record_event(treatment=a_order.treatment, event="x")
        data = export.build_export(a)
        self.assertNotIn("export_errors", data)
        self.assertEqual([o["id"] for o in data["fulfillment"]["orders"]], [str(a_order.pk)])
        self.assertEqual(len(data["fulfillment"]["shipments"]), 1)
        self.assertEqual(len(data["fulfillment"]["care_events"]), 1)
        self.assertNotIn(str(b_order.pk), str(data))
