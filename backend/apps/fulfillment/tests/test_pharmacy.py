import base64
from datetime import date
from unittest import mock

import requests
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.accounts.models import Organization
from apps.accounts.tests.helpers import make_org
from apps.catalog.models import VariantMapping
from apps.clinical.models import Prescription
from apps.fulfillment import services
from apps.fulfillment.models import CareEvent, Order
from apps.fulfillment.pharmacy import (
    FakePharmacyAdapter,
    LifeFileAdapter,
    PharmacyRoutingDisabled,
    format_phone,
    get_pharmacy_adapter,
)
from apps.integrations.exceptions import NotConfigured, PayloadInvalid
from apps.integrations.models import OutboundCall
from apps.integrations.tests.helpers import make_graph
from apps.patients.models import Address, Allergy, PatientMedication

LF = {
    "BEEMA_PHARMACY_ROUTING_ENABLED": True,
    "LIFEFILE_API_BASE_URL": "https://lf.test/api/",
    "LIFEFILE_VENDOR_ID": "11", "LIFEFILE_LOCATION_ID": "22", "LIFEFILE_API_NETWORK_ID": "33",
    "LIFEFILE_BASIC_AUTH_USER": "u", "LIFEFILE_BASIC_AUTH_PASSWORD": "p",
    "LIFEFILE_SHIPPING_SERVICE": 7, "LIFEFILE_HANDLING_SERVICE": 8, "LIFEFILE_PRACTICE_ID": 99,
}


def lifefile_order(**rx_overrides):
    profile, treatment, visit = make_graph(status="active", routing_mode="beema_routes")
    lf = make_org("lf-pharmacy", kind=Organization.Kind.PHARMACY, integration_adapter="lifefile")
    treatment.pharmacy = lf
    treatment.save()
    user = profile.user
    user.first_name, user.last_name, user.phone = "Pat", "Tester", "+15125550100"
    user.save()
    profile.date_of_birth, profile.sex_at_birth = date(1985, 3, 9), "female"
    profile.save()
    Address.objects.create(patient=profile, kind="shipping", line1="1 Main St", line2="Apt 2", city="Austin", state="TX", zip_code="78701", is_default=True)
    Allergy.objects.create(patient=profile, name="Penicillin", reaction="Rash")
    PatientMedication.objects.create(patient=profile, name="Metformin")
    PatientMedication.objects.create(patient=profile, name="OldDrug", is_current=False)
    VariantMapping.objects.create(variant=treatment.variant, organization=lf, vendor_sku="4455")
    fields = dict(treatment=treatment, visit=visit, external_rx_id="R1", drug="Semaglutide", strength="0.5mg", quantity=1, refills=2,
                  prescriber_name="Dana Q Doctor", prescriber_npi="1234567890", written_at=timezone.now())
    fields.update(rx_overrides)
    rx = Prescription.objects.create(**fields)
    order = Order.objects.create(treatment=treatment, prescription=rx, pharmacy=lf, fill_type="initial")
    return order


class FakeAdapterTests(TestCase):
    def setUp(self):
        FakePharmacyAdapter.reset()
        _, self.treatment, _ = make_graph()
        self.order = Order.objects.create(treatment=self.treatment, pharmacy=self.treatment.pharmacy)

    def test_submit_records_and_returns_ids(self):
        a = FakePharmacyAdapter()
        first, second = a.submit_order(self.order), a.submit_order(self.order)
        self.assertEqual((first.ok, first.external_order_id, second.external_order_id), (True, "FAKE-000001", "FAKE-000002"))

    def test_fail_next_then_recover(self):
        FakePharmacyAdapter.fail_next = "boom"
        a = FakePharmacyAdapter()
        self.assertEqual((a.submit_order(self.order).ok, a.submit_order(self.order).ok), (False, True))

    def test_cancel(self):
        self.assertTrue(FakePharmacyAdapter().cancel_order(self.order).ok)
        self.assertEqual(FakePharmacyAdapter.canceled, [self.order.pk])

    def test_handle_webhook_normalizes(self):
        parsed = FakePharmacyAdapter().handle_webhook({"orderId": 5, "status": "SHIPPED", "trackingNumber": "T", "carrier": "UPS", "referenceId": "r"})
        self.assertEqual((parsed.external_order_id, parsed.status, parsed.tracking_number, parsed.carrier, parsed.reference_id, parsed.event_type), ("5", "shipped", "T", "UPS", "r", "shipped"))


class RegistryAndSubmitTests(TestCase):
    def setUp(self):
        FakePharmacyAdapter.reset()
        _, self.treatment, _ = make_graph()
        self.order = Order.objects.create(treatment=self.treatment, pharmacy=self.treatment.pharmacy)

    def test_registry(self):
        self.assertIsInstance(get_pharmacy_adapter(self.treatment.pharmacy), FakePharmacyAdapter)
        for key in ("", "beluga", "nope"):
            with self.subTest(key=key), self.assertRaises(NotConfigured):
                get_pharmacy_adapter(Organization(integration_adapter=key))

    def test_lifefile_requires_feature_flag(self):
        org = Organization(integration_adapter="lifefile")
        with self.assertRaises(PharmacyRoutingDisabled):
            get_pharmacy_adapter(org)
        with override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True):
            self.assertIsInstance(get_pharmacy_adapter(org), LifeFileAdapter)

    def test_submit_success_and_failure_update_order(self):
        services.submit_order(self.order)
        self.order.refresh_from_db()
        self.assertEqual((self.order.status, self.order.external_order_id), ("submitted", "FAKE-000001"))
        self.assertIsNotNone(self.order.submitted_at)
        self.order.status = "pending"
        FakePharmacyAdapter.fail_next = "http_500"
        services.submit_order(self.order)
        self.assertEqual((self.order.status, self.order.last_error), ("failed", "http_500"))
        services.submit_order(self.order)  # failed orders can be retried
        self.assertEqual(self.order.status, "submitted")
        self.assertEqual(self.order.last_error, "")

    def test_already_submitted_order_is_not_resubmitted(self):
        self.order.status = "shipped"
        self.assertIs(services.submit_order(self.order), self.order)
        self.assertEqual(FakePharmacyAdapter.submitted, [])

    def test_submit_with_disabled_lifefile_raises_and_quiet_variant_defers(self):
        lf = make_org("lf-x", kind=Organization.Kind.PHARMACY, integration_adapter="lifefile")
        order = Order.objects.create(treatment=self.treatment, pharmacy=lf)
        with self.assertRaises(PharmacyRoutingDisabled):
            services.submit_order(order)
        services._submit_quietly(order)
        order.refresh_from_db()
        self.assertEqual((order.status, order.last_error.split(":")[0]), ("pending", "PharmacyRoutingDisabled"))


@override_settings(**LF)
class LifeFilePayloadTests(TestCase):
    def test_full_mapping(self):
        order = lifefile_order()
        payload = LifeFileAdapter().build_order_payload(order, message_id=5)
        o = payload["order"]
        self.assertEqual(payload["message"]["id"], 5)
        self.assertEqual(o["general"]["referenceId"], str(order.pk))
        self.assertEqual(o["practice"], {"id": 99})
        self.assertEqual(o["patient"]["gender"], "f")
        self.assertEqual(o["patient"]["dateOfBirth"], "1985-03-09")
        self.assertEqual(o["patient"]["phoneMobile"], "(512) 555-0100")
        self.assertEqual((o["shipping"]["service"], o["shipping"]["handlingService"]), (7, 8))
        self.assertEqual(o["shipping"]["addressLine2"], "Apt 2")
        self.assertEqual((o["prescriber"]["firstName"], o["prescriber"]["lastName"], o["prescriber"]["npi"]), ("Dana Q", "Doctor", "1234567890"))
        rx = o["rxs"][0]
        self.assertEqual((rx["rxType"], rx["drugName"], rx["quantity"], rx["refills"], rx["lfProductID"], rx["uuid"]), ("new", "Semaglutide", "1", 2, 4455, str(order.prescription.pk)))
        self.assertEqual({c["type"] for c in o["clinical"]}, {"allergy", "medication"})
        self.assertEqual(len([c for c in o["clinical"] if c["type"] == "medication"]), 1)

    def test_refill_order_uses_refill_rx_type(self):
        order = lifefile_order()
        order.fill_type = "refill"
        self.assertEqual(LifeFileAdapter().build_order_payload(order)["order"]["rxs"][0]["rxType"], "refill")

    def test_no_empty_strings_or_nulls_are_sent(self):
        def walk(value):
            if isinstance(value, dict):
                for v in value.values():
                    walk(v)
            elif isinstance(value, list):
                for v in value:
                    walk(v)
            else:
                self.assertNotIn(value, ("", None))

        walk(LifeFileAdapter().build_order_payload(lifefile_order(strength="")))

    def test_long_values_are_clipped_to_vendor_limits(self):
        order = lifefile_order()
        user = order.treatment.patient.user
        user.first_name = "F" * 80
        user.save()
        payload = LifeFileAdapter().build_order_payload(order)
        self.assertEqual(len(payload["order"]["patient"]["firstName"]), 30)
        self.assertEqual(len(payload["order"]["shipping"]["recipientFirstName"]), 30)

    def test_missing_required_fields_are_named_not_valued(self):
        order = lifefile_order(prescriber_npi=None, prescriber_name="")
        with self.assertRaises(PayloadInvalid) as ctx:
            LifeFileAdapter().build_order_payload(order)
        self.assertEqual(ctx.exception.fields, ["prescription.prescriber_name", "prescription.prescriber_npi"])
        self.assertNotIn("Tester", str(ctx.exception))

    def test_missing_prescription_rejected(self):
        order = lifefile_order()
        order.prescription = None
        with self.assertRaises(PayloadInvalid):
            LifeFileAdapter().build_order_payload(order)

    def test_unknown_sex_maps_to_u(self):
        order = lifefile_order()
        order.treatment.patient.sex_at_birth = ""
        order.treatment.patient.save()
        self.assertEqual(LifeFileAdapter().build_order_payload(order)["order"]["patient"]["gender"], "u")

    def test_format_phone(self):
        self.assertEqual(format_phone("1-512-555-0100"), "(512) 555-0100")
        self.assertEqual(format_phone("123"), "")
        self.assertEqual(format_phone(None), "")


@override_settings(**LF)
class LifeFileSubmitTests(TestCase):
    def post(self, order, response=None, exc=None):
        if exc:
            patcher = mock.patch("apps.fulfillment.pharmacy.requests.post", side_effect=exc)
        else:
            patcher = mock.patch("apps.fulfillment.pharmacy.requests.post", return_value=response)
        with patcher as post:
            return LifeFileAdapter().submit_order(order), post

    @staticmethod
    def resp(status=200, body=None):
        response = mock.Mock(status_code=status)
        response.json.return_value = body if body is not None else {}
        return response

    def test_success_posts_with_documented_headers_and_stores_order_id(self):
        order = lifefile_order()
        result, post = self.post(order, self.resp(body={"type": "success", "data": {"orderId": 24200716}}))
        self.assertEqual((result.ok, result.external_order_id), (True, "24200716"))
        args, kwargs = post.call_args
        self.assertEqual(args[0], "https://lf.test/api/order")
        self.assertEqual(kwargs["headers"]["X-Vendor-ID"], "11")
        self.assertEqual(kwargs["headers"]["X-API-Network-ID"], "33")
        self.assertEqual(kwargs["headers"]["Authorization"], "Basic " + base64.b64encode(b"u:p").decode())
        self.assertEqual(kwargs["timeout"], 30)
        call = OutboundCall.objects.get()
        self.assertEqual((call.vendor, call.endpoint_name, call.ok), ("lifefile", "create_order", True))
        self.assertNotIn("Pat", str(call.request_summary))

    def test_http_error_and_error_type_fail(self):
        order = lifefile_order()
        self.assertEqual(self.post(order, self.resp(500))[0].error, "http_500")
        self.assertFalse(self.post(order, self.resp(200, {"type": "error", "message": "Jane Doe"}))[0].ok)
        self.assertNotIn("Jane", OutboundCall.objects.first().error)

    def test_non_json_response_is_handled(self):
        response = mock.Mock(status_code=200)
        response.json.side_effect = ValueError
        self.assertTrue(self.post(lifefile_order(), response)[0].ok)

    def test_transport_error_is_captured_without_details(self):
        result, _ = self.post(lifefile_order(), exc=requests.ConnectionError("host 10.0.0.1 patient Jane"))
        self.assertEqual(result.error, "transport_error:ConnectionError")

    def test_invalid_payload_never_posts(self):
        order = lifefile_order(prescriber_npi=None)
        with mock.patch("apps.fulfillment.pharmacy.requests.post") as post, self.assertRaises(PayloadInvalid):
            LifeFileAdapter().submit_order(order)
        post.assert_not_called()

    @override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=False)
    def test_flag_off_blocks_everything(self):
        order = lifefile_order()
        with self.assertRaises(PharmacyRoutingDisabled):
            LifeFileAdapter().submit_order(order)
        with self.assertRaises(PharmacyRoutingDisabled):
            LifeFileAdapter().cancel_order(order)

    @override_settings(LIFEFILE_API_BASE_URL="")
    def test_missing_base_url(self):
        with self.assertRaises(NotConfigured):
            LifeFileAdapter().submit_order(lifefile_order())

    def test_service_level_submit_goes_through_lifefile(self):
        order = lifefile_order()
        with mock.patch("apps.fulfillment.pharmacy.requests.post", return_value=self.resp(body={"data": {"orderId": "55"}})):
            services.submit_order(order)
        order.refresh_from_db()
        self.assertEqual((order.status, order.external_order_id), ("submitted", "55"))
        self.assertTrue(CareEvent.objects.filter(event="order.submitted", source="lifefile").exists())

    def test_cancel_is_unsupported(self):
        self.assertFalse(LifeFileAdapter().cancel_order(lifefile_order()).ok)


class BeemaRoutedOrderCreationTests(TestCase):
    def setUp(self):
        FakePharmacyAdapter.reset()
        _, self.treatment, self.visit = make_graph(status="prescribed", routing_mode="beema_routes")
        self.rx = Prescription.objects.create(treatment=self.treatment, visit=self.visit, external_rx_id="R1", drug="Sema")

    def test_flag_off_returns_none(self):
        self.assertIsNone(services.create_order_for_prescription(self.rx))

    def test_network_routed_returns_none_even_with_flag(self):
        self.treatment.product.routing_mode = "network_routes"
        self.treatment.product.save()
        with override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True):
            self.assertIsNone(services.create_order_for_prescription(self.rx))

    @override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True)
    def test_idempotent_one_order_per_prescription(self):
        first = services.create_order_for_prescription(self.rx)
        second = services.create_order_for_prescription(self.rx)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(len(FakePharmacyAdapter.submitted), 1)

    @override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True)
    def test_attaches_first_open_batch_and_releases_it(self):
        from apps.fulfillment.models import ShipmentBatch
        from apps.integrations.tests.helpers import make_subscription

        sub = make_subscription(self.treatment, term=6)
        first, second = services.create_batches(sub)
        order = services.create_order_for_prescription(self.rx)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual((order.batch_id, first.status, second.status), (first.pk, "released", "scheduled"))
        self.assertEqual(ShipmentBatch.objects.get(pk=first.pk).order_id, order.pk)

    @override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True)
    def test_no_pharmacy_chosen_is_unresolved_so_event_retries(self):
        from apps.integrations.exceptions import UnresolvedReference

        self.treatment.pharmacy = None
        self.treatment.network = None
        self.treatment.save()
        with self.assertRaises(UnresolvedReference):
            services.create_order_for_prescription(self.rx)

    @override_settings(BEEMA_PHARMACY_ROUTING_ENABLED=True)
    def test_submit_failure_keeps_order_for_staff(self):
        FakePharmacyAdapter.fail_next = "http_503"
        order = services.create_order_for_prescription(self.rx)
        self.assertEqual((order.status, order.last_error), ("failed", "http_503"))
