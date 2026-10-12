import json

from django.test import TestCase

from apps.accounts.tests.helpers import make_patient
from apps.patients import export
from apps.patients.models import Address, Allergy, ConsentRecord, DataRequest, MedicalCondition, PatientMedication


class ExportTests(TestCase):
    def setUp(self):
        self.user = make_patient("e@example.com", first_name="Eve")
        self.patient = self.user.patient_profile
        self.patient.ineligible_notes = "internal staff note"
        self.patient.save()
        Address.objects.create(patient=self.patient, kind="home", line1="1 A St", city="X", state="TX", zip_code="75001")
        Allergy.objects.create(patient=self.patient, name="Penicillin", reaction="hives")
        PatientMedication.objects.create(patient=self.patient, name="Metformin")
        MedicalCondition.objects.create(patient=self.patient, name="Asthma", notes="mild")
        ConsentRecord.objects.create(patient=self.patient, kind="terms", version="1")
        DataRequest.objects.create(patient=self.patient, kind="export", notes="staff only")
        self._saved = list(export._registry)

    def tearDown(self):
        export._registry[:] = self._saved

    def test_contains_everything_and_is_json_safe(self):
        data = export.build_export(self.patient)
        json.dumps(data)
        self.assertEqual(data["account"]["email"], "e@example.com")
        self.assertEqual(data["addresses"][0]["line1"], "1 A St")
        self.assertEqual(data["allergies"][0]["reaction"], "hives")
        self.assertEqual(data["medications"][0]["name"], "Metformin")
        self.assertEqual(data["conditions"][0]["notes"], "mild")
        self.assertEqual(data["consents"][0]["kind"], "terms")
        self.assertEqual(len(data["data_requests"]), 1)
        self.assertNotIn("ineligible_notes", data["profile"])
        self.assertNotIn("notes", data["data_requests"][0])

    def test_contains_only_this_patient(self):
        other = make_patient("other@example.com").patient_profile
        Allergy.objects.create(patient=other, name="Peanut")
        data = export.build_export(self.patient)
        self.assertEqual([a["name"] for a in data["allergies"]], ["Penicillin"])
        self.assertNotIn("other@example.com", json.dumps(data))

    def test_register_contributor(self):
        @export.register
        def contrib(patient):
            return {"treatments": [{"patient": str(patient.pk)}]}

        export.register(contrib)
        self.assertEqual(export._registry.count(contrib), 1)
        data = export.build_export(self.patient)
        self.assertEqual(data["treatments"][0]["patient"], str(self.patient.pk))
        self.assertNotIn("export_errors", data)

    def test_failing_contributor_reported_not_fatal(self):
        def broken(patient):
            raise RuntimeError("name Eve leaked?")

        export.register(broken)
        with self.assertLogs("apps.patients.export", level="ERROR") as logs:
            data = export.build_export(self.patient)
        self.assertEqual(len(data["export_errors"]), 1)
        self.assertNotIn("Eve", "".join(logs.output))
        self.assertIn("allergies", data)

    def test_services_exposes_build_export(self):
        from apps.patients import services

        self.assertIs(services.build_export, export.build_export)
