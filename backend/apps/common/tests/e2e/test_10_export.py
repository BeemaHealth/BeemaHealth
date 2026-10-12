"""Scenario 10: the patient export carries data from every contributing app."""
from __future__ import annotations

import json

from apps.patients.export import build_export, registered

from .base import E2ECase, beluga_event, glue_submitted, rx_event


class ExportTests(E2ECase):
    def test_export_has_every_contributing_app(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-3month", coupons=())
        self.post_beluga(rx_event(master))
        self.post_beluga(beluga_event(master, "CONSULT_CONCLUDED", visitOutcome="prescribed"))
        self.post_beluga(beluga_event(master, "PHARMACY_ORDER_SHIPPED", orderId="O1", info={"carrier": "UPS", "tracking": "T"}))
        self.post_beluga(beluga_event(master, "DOCTOR_CHAT", content="Take with food"))

        names = {fn.__module__.split(".")[1] for fn in registered()}
        self.assertTrue({"clinical", "billing", "messaging", "fulfillment"} <= names, names)

        data = build_export(actor.profile)
        self.assertNotIn("export_errors", data)
        # patients (core)
        self.assertEqual(data["account"]["email"], actor.email)
        self.assertTrue(data["addresses"])
        self.assertTrue(data["consents"])
        # clinical
        self.assertEqual(len(data["treatments"]), 1)
        self.assertTrue(data["prescriptions"])
        self.assertTrue(data["dose_logs"])
        self.assertTrue(data["visits"])
        # billing
        self.assertTrue(data["billing"]["invoices"])
        self.assertTrue(data["billing"]["subscriptions"])
        # fulfillment
        self.assertTrue(data["fulfillment"]["orders"])
        self.assertTrue(data["fulfillment"]["shipments"])
        self.assertTrue(data["fulfillment"]["care_events"])
        # messaging
        self.assertTrue(data["conversations"])
        self.assertGreaterEqual(data["conversations"][0]["message_count"], 1)
        json.dumps(data)  # JSON safe

    def test_export_endpoint_returns_the_same_sections_and_is_patient_scoped(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        resp = actor.client.get("/api/v1/patients/export/")
        self.assertEqual(resp.status_code, 200, resp.content)
        body = resp.json()
        for key in ("treatments", "billing", "conversations", "fulfillment", "consents"):
            self.assertIn(key, body)
        self.assertTrue(body["billing"]["invoices"])
        self.assertEqual(body["account"]["email"], actor.email)
        from .base import Actor

        other = Actor(self, "other@example.com")
        other.start()
        other.run()
        other_body = other.client.get("/api/v1/patients/export/").json()
        self.assertEqual(other_body["treatments"], [])
        self.assertEqual(other_body["billing"]["invoices"], [])
        self.assertNotIn(actor.email, json.dumps(other_body))
