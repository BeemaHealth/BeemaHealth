from datetime import date
from io import StringIO
from unittest import mock

from django.core.management import call_command
from django.test import TestCase, override_settings

from apps.clinical.models import Prescription, Visit
from apps.integrations import services
from apps.integrations.adapters.beluga import BelugaAdapter, FakeBelugaTransport, TransportResponse
from apps.integrations.exceptions import NotConfigured, PayloadInvalid, VendorRejected
from apps.integrations.models import InboundEvent, OutboundCall
from apps.messaging.models import Conversation, Message
from apps.patients.models import Address, ConsentRecord

from .helpers import make_graph

SETTINGS = {
    "BELUGA_API_KEY": "key",
    "BELUGA_BASE_URL": "https://beluga.test",
    "BELUGA_VISIT_PATH": "/visit/create",
    "BELUGA_CHAT_PATH": "/chat/send",
    "BELUGA_COMPANY": "beema",
}
OK = {"status": 200, "data": "ignored"}


def fake_adapter(*responses):
    transport = FakeBelugaTransport(list(responses))
    return BelugaAdapter(transport, sleep=lambda _: None), transport


def neutral_payload():
    return {
        "patient": {"dob": date(1985, 3, 9), "sex": "female", "state": "TX", "zip": "78701"},
        "intake_results": [{"question": "Sleep?", "answer": "7 hours"}],
        "medical_conditions": ["Hypertension"],
    }


@override_settings(**SETTINGS)
class SubmitVisitTests(TestCase):
    def setUp(self):
        self.profile, self.treatment, self.visit = make_graph(status="awaiting_visit_completion")
        self.visit.delete()
        Address.objects.create(patient=self.profile, kind="shipping", line1="1 Main St", city="Austin", state="TX", zip_code="78701", is_default=True)
        ConsentRecord.objects.create(patient=self.profile, kind="telehealth", version="1")
        for target in ("apps.clinical.hooks.record_event", "apps.clinical.hooks.notify_patient"):
            patcher = mock.patch(target)
            patcher.start()
            self.addCleanup(patcher.stop)
        patcher = mock.patch("apps.integrations.services._questionnaire_payload", return_value=neutral_payload())
        patcher.start()
        self.addCleanup(patcher.stop)

    def submit(self, adapter):
        with mock.patch("apps.integrations.services.get_network_adapter", return_value=adapter):
            return services.submit_visit_for_treatment(self.treatment)

    def test_happy_path_posts_mapped_body_and_marks_submitted(self):
        adapter, transport = fake_adapter(TransportResponse(200, {"status": 200, "info": "Patient visit created successfully"}))
        visit = self.submit(adapter)
        body = transport.calls[0]["json"]
        self.assertEqual(body["masterId"], visit.external_id)
        self.assertEqual((body["company"], body["visitType"]), ("beema", "weightloss"))
        form = body["formObj"]
        self.assertEqual((form["firstName"], form["dob"], form["phone"], form["state"], form["address"]), ("Pat", "03/09/1985", "5125550100", "TX", "1 Main St"))
        self.assertEqual(form["patientPreference"][0]["medId"], "MED-1")
        self.assertEqual(form["medicalConditions"], "Hypertension")
        self.assertTrue(form["consentsSigned"])
        self.treatment.refresh_from_db()
        self.assertIsNotNone(self.treatment.submitted_to_network_at)
        self.assertEqual(self.treatment.status, "pending_visit")
        visit.refresh_from_db()
        self.assertIsNotNone(visit.submitted_at)
        self.assertEqual(OutboundCall.objects.get().treatment, self.treatment)

    def test_vendor_returned_master_id_is_stored(self):
        adapter, _ = fake_adapter(TransportResponse(200, {"status": 200, "data": {"masterId": "vendor-id", "visitId": "v"}}))
        self.assertEqual(self.submit(adapter).external_id, "vendor-id")

    def test_second_call_is_idempotent(self):
        adapter, transport = fake_adapter(TransportResponse(200, OK))
        first = self.submit(adapter)
        second = self.submit(adapter)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(len(transport.calls), 1)

    def test_failure_raises_and_leaves_treatment_unsubmitted(self):
        adapter, _ = fake_adapter(TransportResponse(400, {"status": 400, "error": "State not valid"}))
        with self.assertRaises(VendorRejected):
            self.submit(adapter)
        self.treatment.refresh_from_db()
        self.assertIsNone(self.treatment.submitted_to_network_at)
        self.assertEqual(self.treatment.status, "awaiting_visit_completion")

    def test_retry_after_failure_reuses_master_id(self):
        failing, t1 = fake_adapter(TransportResponse(500))
        with self.assertRaises(VendorRejected):
            self.submit(failing)
        working, t2 = fake_adapter(TransportResponse(200, OK))
        self.submit(working)
        self.assertEqual(t1.calls[0]["json"]["masterId"], t2.calls[0]["json"]["masterId"])
        self.assertEqual(Visit.objects.filter(treatment=self.treatment).count(), 1)

    def test_invalid_payload_never_reaches_vendor(self):
        self.profile.user.first_name = ""
        self.profile.user.save()
        adapter, transport = fake_adapter(TransportResponse(200, OK))
        with self.assertRaises(PayloadInvalid) as ctx:
            self.submit(adapter)
        self.assertIn("patient.first_name", ctx.exception.fields)
        self.assertEqual(transport.calls, [])

    def test_missing_variant_mapping_rejects_before_sending(self):
        self.treatment.variant.mappings.all().delete()
        adapter, transport = fake_adapter(TransportResponse(200, OK))
        with self.assertRaises(PayloadInvalid) as ctx:
            self.submit(adapter)
        self.assertEqual(ctx.exception.fields, ["patient_preference"])
        self.assertEqual(transport.calls, [])

    def test_unsigned_consent_blocks_submission(self):
        payload = {**neutral_payload(), "consents_signed": False}
        adapter, transport = fake_adapter(TransportResponse(200, OK))
        with mock.patch("apps.integrations.services._questionnaire_payload", return_value=payload):
            with self.assertRaises(PayloadInvalid) as ctx:
                self.submit(adapter)
        self.assertEqual(ctx.exception.fields, ["consents_signed"])
        self.assertEqual(transport.calls, [])

    def test_consent_defaults_to_telehealth_consent_record(self):
        self.profile.consents.all()  # created in setUp
        adapter, transport = fake_adapter(TransportResponse(200, OK))
        self.submit(adapter)
        self.assertTrue(transport.calls[0]["json"]["formObj"]["consentsSigned"])

    @override_settings(BELUGA_API_KEY="")
    def test_unconfigured_vendor_raises_not_configured(self):
        with self.assertRaises(NotConfigured):
            services.submit_visit_for_treatment(self.treatment)


@override_settings(**SETTINGS)
class ChatTests(TestCase):
    def setUp(self):
        self.profile, self.treatment, self.visit = make_graph()
        self.conversation = Conversation.objects.create(patient=self.profile, kind="doctor", treatment=self.treatment, visit=self.visit)
        self.message = Message.objects.create(
            conversation=self.conversation, direction="out", sender_role="patient", body="Is nausea normal?"
        )

    def send(self, adapter):
        with mock.patch("apps.integrations.services.get_network_adapter", return_value=adapter):
            return services.send_chat_to_network(self.message)

    def test_success_marks_delivered_and_posts_masterid(self):
        adapter, transport = fake_adapter(TransportResponse(200, {"status": 200}))
        self.assertTrue(self.send(adapter))
        self.message.refresh_from_db()
        self.assertEqual(self.message.delivery_status, "delivered")
        self.assertIsNotNone(self.message.sent_at)
        sent = transport.calls[0]["json"]
        self.assertEqual((sent["masterId"], sent["content"], sent["firstName"]), (self.visit.external_id, "Is nausea normal?", "Pat"))

    def test_failure_raises_and_keeps_message_queued_without_content_in_error(self):
        adapter, _ = fake_adapter(TransportResponse(500))
        with self.assertRaises(VendorRejected) as ctx:
            self.send(adapter)
        self.assertNotIn("nausea", str(ctx.exception))
        self.message.refresh_from_db()
        self.assertEqual(self.message.delivery_status, "queued")
        call = OutboundCall.objects.get()
        self.assertNotIn("nausea", str(call.request_summary))

    def test_support_conversation_never_leaves_beema(self):
        self.conversation.kind = "support"
        self.conversation.save()
        adapter, transport = fake_adapter(TransportResponse(200, OK))
        self.assertTrue(self.send(adapter))
        self.assertEqual(transport.calls, [])

    def test_falls_back_to_treatment_visit_when_conversation_has_none(self):
        self.conversation.visit = None
        self.conversation.save()
        adapter, transport = fake_adapter(TransportResponse(200, OK))
        self.send(adapter)
        self.assertEqual(transport.calls[0]["json"]["masterId"], self.visit.external_id)

    def test_no_visit_at_network_raises(self):
        self.conversation.visit = None
        self.conversation.save()
        Visit.objects.all().update(external_id="")
        with self.assertRaises(NotConfigured):
            self.send(fake_adapter(TransportResponse(200, OK))[0])


def resolved(rx=True, status="resolved"):
    return TransportResponse(
        200,
        {
            "status": 200, "masterId": "m", "visitStatus": status, "resolvedStatus": "closed",
            "data": {"rxHistory": [{"rxId": "RX-9", "medId": "MED-1", "name": "Sema", "strength": "0.5mg", "quantity": "1", "refills": "1"}] if rx else []},
        },
    )


@override_settings(**SETTINGS)
class ReconcileTests(TestCase):
    def setUp(self):
        self.profile, self.treatment, self.visit = make_graph()
        for target in ("apps.clinical.hooks.record_event", "apps.clinical.hooks.notify_patient", "apps.clinical.hooks.refund_not_prescribed"):
            patcher = mock.patch(target)
            patcher.start()
            self.addCleanup(patcher.stop)

    def run_reconcile(self, *responses):
        adapter, transport = fake_adapter(*responses)
        with mock.patch("apps.integrations.services.get_network_adapter", return_value=adapter):
            return services.reconcile_visits(), transport

    def test_repairs_missed_prescription_and_conclusion(self):
        report, transport = self.run_reconcile(resolved())
        self.assertEqual((report.checked, report.repaired, report.errors), (1, 1, []))
        self.assertTrue(transport.calls[0]["url"].endswith(f"/visit/externalFetch/{self.visit.external_id}"))
        self.assertEqual(Prescription.objects.get().external_rx_id, "RX-9")
        self.visit.refresh_from_db()
        self.treatment.refresh_from_db()
        self.assertEqual((self.visit.outcome, self.treatment.status), ("prescribed", "prescribed"))
        self.assertEqual(InboundEvent.objects.filter(status="processed").count(), 2)

    def test_second_run_is_a_noop(self):
        self.run_reconcile(resolved())
        report, transport = self.run_reconcile(resolved())
        self.assertEqual(report.checked, 0)  # visit now concluded, no longer open
        self.assertEqual(transport.calls, [])

    def test_does_not_replay_prescription_the_webhook_already_stored(self):
        Prescription.objects.create(treatment=self.treatment, visit=self.visit, external_rx_id="RX-9")
        report, _ = self.run_reconcile(resolved())
        self.assertEqual(Prescription.objects.count(), 1)
        self.assertEqual(report.errors, [])
        self.visit.refresh_from_db()
        self.assertEqual(self.visit.outcome, "prescribed")

    def test_resolved_without_rx_is_referred(self):
        self.run_reconcile(resolved(rx=False))
        self.visit.refresh_from_db()
        self.treatment.refresh_from_db()
        self.assertEqual((self.visit.outcome, self.treatment.status), ("referred", "referred"))

    def test_canceled_visit_is_applied(self):
        self.run_reconcile(TransportResponse(200, {"status": 200, "masterId": "m", "visitStatus": "canceled", "data": {}}))
        self.treatment.refresh_from_db()
        self.assertEqual(self.treatment.status, "canceled")

    def test_still_pending_visit_is_unchanged(self):
        report, _ = self.run_reconcile(TransportResponse(200, {"status": 200, "masterId": "m", "visitStatus": "pending", "data": {}}))
        self.assertEqual((report.repaired, report.unchanged), (0, 1))
        self.assertEqual(InboundEvent.objects.count(), 0)

    def test_unfetchable_visit_is_reported_and_others_continue(self):
        make_graph(external_id="second")
        report, _ = self.run_reconcile(TransportResponse(200, {"status": 400, "error": "Visit not found"}), resolved())
        self.assertEqual(report.checked, 2)
        self.assertEqual(len(report.errors), 1)
        self.assertEqual(report.repaired, 1)

    def test_skips_closed_visits_and_visits_without_master_id(self):
        Visit.objects.filter(pk=self.visit.pk).update(status="concluded")
        make_graph(external_id="x")
        Visit.objects.filter(external_id="x").update(external_id="")
        report, transport = self.run_reconcile(resolved())
        self.assertEqual(report.checked, 0)
        self.assertEqual(transport.calls, [])

    def test_vendor_outage_does_not_crash_run(self):
        report, _ = self.run_reconcile(TransportResponse(500))
        self.assertEqual((report.checked, len(report.errors)), (1, 1))


class CommandTests(TestCase):
    def test_process_pending_events_command(self):
        InboundEvent.objects.create(vendor="beluga", dedupe_key="a" * 64, event_type="SOMETHING_NEW", raw_payload={"event": "SOMETHING_NEW", "masterId": "m"})
        out = StringIO()
        call_command("process_pending_events", stdout=out)
        self.assertIn("ignored=1", out.getvalue())

    def test_process_pending_events_vendor_flag(self):
        out = StringIO()
        call_command("process_pending_events", "--vendor", "stripe", "--limit", "5", stdout=out)
        self.assertIn("processed=0", out.getvalue())

    @override_settings(**SETTINGS)
    def test_reconcile_visits_command(self):
        out = StringIO()
        call_command("reconcile_visits", stdout=out)
        self.assertIn("checked=0", out.getvalue())
