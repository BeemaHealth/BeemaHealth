"""Scenario 7: the doctor prescribes a different strength than the patient requested."""
from __future__ import annotations

import json
from decimal import Decimal

from apps.clinical.models import DoseLog, Prescription
from apps.messaging.models import NotificationDelivery

from .base import E2ECase, beluga_event, glue_submitted, rx_event


class DoseChangeTests(E2ECase):
    def test_doctor_changes_dose(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        self.assertEqual(treatment.requested_strength_mg, Decimal("0.2"))
        self.assertFalse(treatment.dose_changed_by_doctor)
        before = len(self.notifier.sent)
        self.post_beluga(rx_event(master, strength="0.5 mg"))
        self.post_beluga(beluga_event(master, "CONSULT_CONCLUDED", visitOutcome="prescribed"))
        treatment.refresh_from_db()
        self.assertTrue(treatment.dose_changed_by_doctor)
        self.assertEqual(treatment.prescribed_strength_mg, Decimal("0.5"))
        self.assertEqual(treatment.requested_strength_mg, Decimal("0.2"))
        self.assertEqual(treatment.status, "prescribed")
        # Patient is told, without any drug or dose in the message.
        sent = self.notifier.sent[before:]
        self.assertIn("rx_written", [n["template_key"] for n in sent])
        self.assertTrue(NotificationDelivery.objects.filter(patient=treatment.patient, template_key="rx_written").exists())
        for n in sent:
            self.assertNotIn("0.5", json.dumps(n["context"]))
        # The schedule uses the doctor's strength, and the portal API shows the flag.
        strengths = set(DoseLog.objects.filter(treatment=treatment).values_list("strength_mg", flat=True))
        self.assertEqual(strengths, {Decimal("0.5")})
        detail = actor.client.get(f"/api/v1/treatments/{treatment.pk}/").json()
        self.assertTrue(detail["dose_changed_by_doctor"])
        self.assertEqual(Prescription.objects.get(treatment=treatment).strength, "0.5 mg")

    def test_same_strength_does_not_flag(self):
        actor, treatment, invoice, master = glue_submitted(self, "semaglutide-monthly")
        self.post_beluga(rx_event(master, strength="0.2 mg"))
        treatment.refresh_from_db()
        self.assertFalse(treatment.dose_changed_by_doctor)
        self.assertEqual(treatment.prescribed_strength_mg, Decimal("0.2"))

    def test_new_patient_is_requested_at_titration_strength(self):
        _, treatment, _, _ = glue_submitted(self, "semaglutide-monthly")
        self.assertEqual(treatment.variant.phase, "titration")
        self.assertEqual(treatment.requested_strength_mg, Decimal("0.2"))

    def test_current_user_staying_on_their_dose_is_requested_at_maintenance_strength(self):
        _, treatment, _, master = glue_submitted(
            self, "semaglutide-monthly", overrides={"glp1_history": "current", "dose_preference": "same"}
        )
        self.assertEqual(treatment.variant.phase, "maintenance")
        self.assertEqual(treatment.requested_strength_mg, Decimal("0.25"))
        self.post_beluga(rx_event(master, strength="0.25 mg"))
        treatment.refresh_from_db()
        self.assertFalse(treatment.dose_changed_by_doctor)
