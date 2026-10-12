from django.apps import apps
from django.test import TestCase

from apps.accounts.models import User
from apps.fulfillment import services
from apps.fulfillment.models import CareEvent, Order, Shipment, ShipmentBatch
from apps.fulfillment.pharmacy import FakePharmacyAdapter
from apps.integrations.tests.helpers import make_graph, make_subscription


class FulfillmentAdminTests(TestCase):
    def setUp(self):
        FakePharmacyAdapter.reset()
        self.root = User.objects.create_superuser("root@example.com", "a-long-password-1")
        self.client.force_login(self.root)
        _, self.treatment, _ = make_graph(status="active")
        self.order = Order.objects.create(treatment=self.treatment, pharmacy=self.treatment.pharmacy)
        self.shipment = Shipment.objects.create(order=self.order, tracking_number="T1")
        self.sub = make_subscription(self.treatment, term=6)
        self.batch = services.create_batches(self.sub)[0]
        self.event = services.record_event(treatment=self.treatment, event="x")

    def test_every_model_is_registered_with_a_working_changelist_and_detail(self):
        for model in apps.get_app_config("fulfillment").get_models():
            name = model._meta.model_name
            with self.subTest(model=name):
                self.assertTrue(model in __import__("django.contrib.admin", fromlist=["site"]).site._registry)
                self.assertEqual(self.client.get(f"/admin/fulfillment/{name}/").status_code, 200)
                obj = model.objects.first()
                self.assertEqual(self.client.get(f"/admin/fulfillment/{name}/{obj.pk}/change/").status_code, 200)

    def test_changelist_filters_and_search(self):
        for path in (
            "order/?status=pending", "order/?fill_type=initial", f"order/?q={self.order.pk}", "shipmentbatch/?status=scheduled",
            "shipment/?status=shipped", "shipment/?q=T1", "careevent/?source=system", "careevent/?q=x",
        ):
            with self.subTest(path=path):
                self.assertEqual(self.client.get(f"/admin/fulfillment/{path}").status_code, 200)

    def test_order_page_has_shipment_inline_and_batch_page_has_order_inline(self):
        self.assertContains(self.client.get(f"/admin/fulfillment/order/{self.order.pk}/change/"), "T1")
        Order.objects.filter(pk=self.order.pk).update(batch=self.batch)
        self.assertContains(self.client.get(f"/admin/fulfillment/shipmentbatch/{self.batch.pk}/change/"), str(self.order.pk))

    def test_care_event_is_read_only_even_for_superusers(self):
        self.assertEqual(self.client.get("/admin/fulfillment/careevent/add/").status_code, 403)
        self.assertEqual(self.client.post(f"/admin/fulfillment/careevent/{self.event.pk}/change/", {"event": "hacked"}).status_code, 403)
        self.assertEqual(self.client.post(f"/admin/fulfillment/careevent/{self.event.pk}/delete/", {"post": "yes"}).status_code, 403)
        self.assertEqual(CareEvent.objects.get().event, "x")

    def test_submit_to_pharmacy_action(self):
        self.client.post("/admin/fulfillment/order/", {"action": "submit_to_pharmacy", "_selected_action": [str(self.order.pk)]})
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "submitted")

    def test_submit_action_surfaces_errors_without_crashing(self):
        self.treatment.pharmacy.integration_adapter = ""
        self.treatment.pharmacy.save()
        response = self.client.post(
            "/admin/fulfillment/order/", {"action": "submit_to_pharmacy", "_selected_action": [str(self.order.pk)]}, follow=True
        )
        self.assertContains(response, "NotConfigured")
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, "pending")

    def test_release_and_skip_batch_actions(self):
        self.client.post("/admin/fulfillment/shipmentbatch/", {"action": "release_selected", "_selected_action": [str(self.batch.pk)]})
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.status, "released")
        self.client.post("/admin/fulfillment/shipmentbatch/", {"action": "skip_selected", "_selected_action": [str(self.batch.pk)]})
        self.batch.refresh_from_db()
        self.assertEqual(self.batch.status, "skipped")

    def test_release_action_reports_blocked_batches(self):
        second = ShipmentBatch.objects.get(subscription=self.sub, sequence=2)
        response = self.client.post(
            "/admin/fulfillment/shipmentbatch/", {"action": "release_selected", "_selected_action": [str(second.pk)]}, follow=True
        )
        self.assertContains(response, "previous_batch_pending")
        second.refresh_from_db()
        self.assertEqual(second.status, "scheduled")
