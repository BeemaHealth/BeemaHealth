from io import StringIO
from unittest import mock

from django.apps import apps
from django.core.exceptions import ImproperlyConfigured
from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings

from apps.clinical.models import Prescription
from apps.fulfillment.models import Order, Shipment
from apps.integrations import services
from apps.integrations.adapters.beluga import BelugaAdapter, DevFakeTransport, RequestsTransport, fake_mode_enabled
from apps.integrations.models import InboundEvent
from apps.messaging.models import Message
from apps.patients.models import Address, ConsentRecord

from .helpers import BELUGA_SECRET, make_graph

FAKE = {"BELUGA_FAKE_MODE": True, "DEBUG": True, "BELUGA_API_KEY": "", "BELUGA_VISIT_PATH": "", "BELUGA_CHAT_PATH": "", "BELUGA_WEBHOOK_SECRET": BELUGA_SECRET}


class FakeModeGuardTests(TestCase):
    def test_default_is_off_and_uses_real_transport(self):
        self.assertFalse(fake_mode_enabled())
        self.assertIsInstance(BelugaAdapter().transport, RequestsTransport)

    @override_settings(BELUGA_FAKE_MODE=True, DEBUG=True)
    def test_on_with_debug_uses_fake_transport(self):
        self.assertTrue(fake_mode_enabled())
        self.assertIsInstance(BelugaAdapter().transport, DevFakeTransport)

    @override_settings(BELUGA_FAKE_MODE=True, DEBUG=False)
    def test_on_without_debug_raises_at_use_and_startup(self):
        with self.assertRaises(ImproperlyConfigured):
            BelugaAdapter()
        with self.assertRaises(ImproperlyConfigured):
            apps.get_app_config("integrations").ready()

    @override_settings(BELUGA_FAKE_MODE=False, DEBUG=False)
    def test_off_without_debug_is_fine(self):
        apps.get_app_config("integrations").ready()

    @override_settings(**FAKE)
    def test_fake_never_touches_network(self):
        DevFakeTransport.reset()
        with mock.patch("apps.integrations.adapters.beluga.requests.request", side_effect=AssertionError("network")):
            adapter = BelugaAdapter()
            body = {"formObj": {"a": "b"}, "masterId": "m-1", "visitType": "w", "company": "c"}
            first, second = adapter.submit_visit(body), adapter.submit_visit(body)
            chat = adapter.send_message(master_id=first.master_id, content="hello doc", first_name="P", last_name="T")
        self.assertTrue(first.ok and chat.ok)
        self.assertEqual(first.master_id, second.master_id)
        self.assertEqual(first.master_id, DevFakeTransport.fake_master_id("m-1"))
        self.assertEqual(DevFakeTransport.sent_chats, [{"masterId": first.master_id, "content_length": 9}])

    @override_settings(**FAKE)
    def test_fake_fetch_reports_pending(self):
        snap = BelugaAdapter().fetch_visit("fake-abc")
        self.assertEqual((snap.master_id, snap.visit_status), ("fake-abc", "pending"))


class Base(TestCase):
    def setUp(self):
        self.profile, self.treatment, self.visit = make_graph(status="awaiting_visit_completion")
        self.visit.delete()
        Address.objects.create(patient=self.profile, kind="shipping", line1="1 Main St", city="Austin", state="TX", zip_code="78701", is_default=True)
        ConsentRecord.objects.create(patient=self.profile, kind="telehealth", version="1")
        for target in ("apps.clinical.hooks.notify_patient", "apps.integrations.dispatch.notify_patient"):
            patcher = mock.patch(target)
            patcher.start()
            self.addCleanup(patcher.stop)
        neutral = {"patient": {"dob": "1985-03-09", "sex": "female", "state": "TX", "zip": "78701"}}
        patcher = mock.patch("apps.integrations.services._questionnaire_payload", return_value=neutral)
        patcher.start()
        self.addCleanup(patcher.stop)

    def sim(self, *args):
        out = StringIO()
        call_command("simulate_beluga_event", *args, "--treatment", str(self.treatment.pk), stdout=out)
        return out.getvalue()

    def refresh(self):
        self.treatment.refresh_from_db()


@override_settings(**FAKE)
class SimulateCommandTests(Base):
    def submit(self):
        return services.submit_visit_for_treatment(self.treatment)

    def test_submit_in_fake_mode_needs_no_credentials(self):
        visit = self.submit()
        self.assertTrue(visit.external_id.startswith("fake-"))
        self.refresh()
        self.assertEqual(self.treatment.status, "pending_visit")

    def test_drives_treatment_from_pending_visit_to_prescribed_to_active(self):
        self.submit()
        self.assertIn("status=processed", self.sim("RX_WRITTEN", "--strength", "0.5mg"))
        self.refresh()
        self.assertEqual(self.treatment.status, "prescribed")
        rx = Prescription.objects.get()
        self.assertEqual((rx.strength, rx.prescriber_name, rx.external_med_id), ("0.5mg", "Dr. Dev Tester", "MED-1"))
        self.assertIn("status=processed", self.sim("CONSULT_CONCLUDED", "--outcome", "prescribed"))
        self.assertIn("status=processed", self.sim("PHARMACY_ORDER_SHIPPED"))
        self.refresh()
        self.assertEqual(self.treatment.status, "active")
        self.assertEqual(Order.objects.get().status, "shipped")
        self.assertIn("status=processed", self.sim("PACKAGE_DELIVERED"))
        self.assertEqual((Order.objects.get().status, Shipment.objects.get().status), ("delivered", "delivered"))

    def test_events_go_through_real_ingest_with_secret_header(self):
        self.submit()
        with mock.patch("apps.integrations.management.commands.simulate_beluga_event.webhooks.ingest", wraps=__import__("apps.integrations.webhooks", fromlist=["x"]).ingest) as ingest:
            self.sim("NO_SHOW")
        vendor, headers, raw = ingest.call_args.args
        self.assertEqual((vendor, headers), ("beluga", {"X-Webhook-Secret": BELUGA_SECRET}))
        self.assertEqual(InboundEvent.objects.get().vendor, "beluga")

    def test_wrong_server_secret_would_be_rejected_by_real_check(self):
        self.submit()
        with mock.patch("apps.integrations.webhooks.verify_beluga_auth", return_value=False), self.assertRaises(CommandError):
            self.sim("NO_SHOW")
        self.assertEqual(InboundEvent.objects.count(), 0)

    def test_doctor_chat_and_cs_message_need_text(self):
        self.submit()
        with self.assertRaises(CommandError):
            self.sim("DOCTOR_CHAT")
        self.sim("DOCTOR_CHAT", "--text", "Welcome")
        self.sim("CS_MESSAGE", "--text", "Upload ID")
        self.assertEqual(Message.objects.count(), 2)

    def test_referred_and_canceled_and_booking(self):
        self.submit()
        self.assertIn("status=processed", self.sim("BOOKING_CREATED"))
        self.assertIn("status=processed", self.sim("CONSULT_CONCLUDED", "--outcome", "referred"))
        self.refresh()
        self.assertEqual(self.treatment.status, "referred")

    def test_canceled(self):
        self.submit()
        with mock.patch("apps.clinical.hooks.refund_not_prescribed"):
            self.sim("CONSULT_CANCELED")
        self.refresh()
        self.assertEqual(self.treatment.status, "canceled")

    def test_every_event_type_builds_and_processes_without_error_status_crash(self):
        from apps.integrations.adapters.beluga import KNOWN_EVENTS

        self.submit()
        for event in sorted(KNOWN_EVENTS):
            with self.subTest(event=event):
                args = ["--text", "hi"] if event in ("DOCTOR_CHAT", "CS_MESSAGE") else []
                with mock.patch("apps.clinical.hooks.refund_not_prescribed"):
                    self.assertIn(f"event={event}", self.sim(event, *args))

    def test_no_process_leaves_event_received(self):
        self.submit()
        self.assertIn("status=received", self.sim("NO_SHOW", "--no-process"))

    def test_requires_a_target_and_known_visit(self):
        with self.assertRaises(CommandError):
            call_command("simulate_beluga_event", "NO_SHOW")
        with self.assertRaises(CommandError):
            call_command("simulate_beluga_event", "NO_SHOW", "--master-id", "nope")
        with self.assertRaises(CommandError):
            self.sim("NO_SHOW")  # treatment has no visit yet

    def test_master_id_lookup(self):
        visit = self.submit()
        out = StringIO()
        call_command("simulate_beluga_event", "NO_SHOW", "--master-id", visit.external_id, stdout=out)
        self.assertIn(visit.external_id, out.getvalue())


class CommandGuardTests(Base):
    @override_settings(**{**FAKE, "DEBUG": False, "BELUGA_FAKE_MODE": False})
    def test_refuses_when_debug_false(self):
        with self.assertRaisesMessage(CommandError, "DEBUG"):
            self.sim("NO_SHOW")
        self.assertEqual(InboundEvent.objects.count(), 0)

    @override_settings(**{**FAKE, "BELUGA_WEBHOOK_SECRET": ""})
    def test_refuses_without_webhook_secret(self):
        with self.assertRaisesMessage(CommandError, "BELUGA_WEBHOOK_SECRET"):
            self.sim("NO_SHOW")
