from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.tests.helpers import make_org, make_patient, make_staff
from apps.audit.models import AuditEvent
from apps.patients.models import (
    Address,
    Allergy,
    ConsentRecord,
    DataRequest,
    IdentityDocument,
    MedicalCondition,
    PatientMedication,
)

B = "/api/v1/patients/"

ADDRESS = {"kind": "home", "line1": "1 A St", "city": "Austin", "state": "tx", "zip_code": "78701", "is_default": True}
CRUD = {
    "addresses/": (Address, ADDRESS, {"city": "Dallas"}, dict(kind="home", line1="9 Z St", city="Q", state="TX", zip_code="75001")),
    "allergies/": (Allergy, {"name": "Penicillin", "reaction": "hives", "severity": "severe"}, {"severity": "mild"}, dict(name="Peanut")),
    "medications/": (PatientMedication, {"name": "Metformin", "dose": "500mg"}, {"is_current": False}, dict(name="Lisinopril")),
    "conditions/": (MedicalCondition, {"name": "Asthma", "notes": "mild"}, {"notes": "updated"}, dict(name="Gout")),
}


class PatientApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.a, self.b = make_patient("a@example.com"), make_patient("b@example.com")
        self.client = APIClient()
        self.client.force_authenticate(self.a)

    def test_every_endpoint_requires_a_patient(self):
        anon = APIClient()
        staff = APIClient()
        staff.force_authenticate(make_staff("admin", make_org()))
        paths = ["me/profile/", "addresses/", "allergies/", "medications/", "conditions/", "consents/", "data-requests/", "export/"]
        for path in paths:
            with self.subTest(path=path):
                self.assertIn(anon.get(B + path).status_code, (401, 403))
                self.assertEqual(staff.get(B + path).status_code, 403)
        self.assertIn(anon.post(B + "identity-documents/presign/", {}, format="json").status_code, (401, 403))
        self.assertEqual(staff.post(B + "identity-documents/presign/", {}, format="json").status_code, 403)

    def test_profile_get_patch_validation(self):
        r = self.client.patch(B + "me/profile/", {"date_of_birth": "1990-05-01", "height_inches": "66", "sex_at_birth": "female"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.client.get(B + "me/profile/").json()["date_of_birth"], "1990-05-01")
        for bad in [{"date_of_birth": "2999-01-01"}, {"date_of_birth": "1800-01-01"}, {"height_inches": "5"}, {"starting_weight_lbs": "99999"}, {"sex_at_birth": "x"}]:
            self.assertEqual(self.client.patch(B + "me/profile/", bad, format="json").status_code, 400, bad)

    def test_profile_cannot_change_ownership_or_internal_fields(self):
        self.client.patch(B + "me/profile/", {"ineligible_notes": "x", "affiliate_ref": "x", "user": str(self.b.pk)}, format="json")
        p = self.a.patient_profile
        p.refresh_from_db()
        self.assertEqual((p.ineligible_notes, p.affiliate_ref, p.user_id), ("", "", self.a.pk))
        self.assertNotIn("ineligible_notes", self.client.get(B + "me/profile/").json())

    def test_crud_and_isolation(self):
        for path, (model, create, update, other_kwargs) in CRUD.items():
            with self.subTest(path=path):
                theirs = model.objects.create(patient=self.b.patient_profile, **other_kwargs)
                r = self.client.post(B + path, create, format="json")
                self.assertEqual(r.status_code, 201, r.content)
                mine_id = r.json()["id"]
                self.assertEqual(model.objects.get(pk=mine_id).patient_id, self.a.patient_profile.pk)
                ids = [row["id"] for row in self.client.get(B + path).json()]
                self.assertEqual(ids, [mine_id])
                self.assertEqual(self.client.get(f"{B}{path}{mine_id}/").status_code, 200)
                # patient A cannot read, change, or delete patient B's object
                self.assertEqual(self.client.get(f"{B}{path}{theirs.pk}/").status_code, 404)
                self.assertEqual(self.client.patch(f"{B}{path}{theirs.pk}/", update, format="json").status_code, 404)
                self.assertEqual(self.client.delete(f"{B}{path}{theirs.pk}/").status_code, 404)
                self.assertTrue(model.objects.filter(pk=theirs.pk).exists())
                self.assertEqual(self.client.patch(f"{B}{path}{mine_id}/", update, format="json").status_code, 200)
                self.assertEqual(self.client.delete(f"{B}{path}{mine_id}/").status_code, 204)

    def test_cannot_create_for_another_patient(self):
        r = self.client.post(B + "allergies/", {"name": "X", "patient": str(self.b.patient_profile.pk)}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Allergy.objects.get().patient_id, self.a.patient_profile.pk)

    def test_address_validation(self):
        for bad in [{"state": "ZZ"}, {"state": "Texas"}, {"zip_code": "1234"}, {"zip_code": "abcde"}, {"line1": ""}, {"city": "x" * 101}, {"line1": "a\x00b"}]:
            r = self.client.post(B + "addresses/", {**ADDRESS, **bad}, format="json")
            self.assertEqual(r.status_code, 400, bad)

    def test_hostile_strings_are_stored_inert(self):
        payload = "<script>alert(1)</script>'; DROP TABLE patients_allergy;--"
        r = self.client.post(B + "allergies/", {"name": payload[:200], "reaction": "../../etc/passwd; $(rm -rf /)"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Allergy.objects.count(), 1)
        self.assertEqual(self.client.post(B + "allergies/", {"name": "x" * 201}, format="json").status_code, 400)

    def test_default_address_switch(self):
        first = self.client.post(B + "addresses/", ADDRESS, format="json").json()["id"]
        self.client.post(B + "addresses/", {**ADDRESS, "line1": "2 B St"}, format="json")
        self.assertFalse(Address.objects.get(pk=first).is_default)

    def test_consents_create_list_immutable(self):
        r = self.client.post(B + "consents/", {"kind": "terms", "version": "2026-01"}, format="json", HTTP_USER_AGENT="UA/1", REMOTE_ADDR="8.8.8.8")
        self.assertEqual(r.status_code, 201)
        rec = ConsentRecord.objects.get()
        self.assertEqual((rec.patient_id, rec.ip), (self.a.patient_profile.pk, "8.8.8.8"))
        self.assertEqual(len(rec.user_agent_hash), 64)
        ConsentRecord.objects.create(patient=self.b.patient_profile, kind="privacy", version="1")
        self.assertEqual(len(self.client.get(B + "consents/").json()), 1)
        url = f"{B}consents/{rec.pk}/"
        self.assertEqual(self.client.patch(url, {"version": "9"}, format="json").status_code, 405)
        self.assertEqual(self.client.delete(url).status_code, 405)
        self.assertEqual(self.client.post(B + "consents/", {"kind": "bogus", "version": "1"}, format="json").status_code, 400)
        self.assertEqual(self.client.post(B + "consents/", {"kind": "terms", "version": "bad version!"}, format="json").status_code, 400)

    def test_data_requests(self):
        r = self.client.post(B + "data-requests/", {"kind": "export"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["status"], "requested")
        self.assertEqual(self.client.post(B + "data-requests/", {"kind": "export"}, format="json").status_code, 409)
        self.assertEqual(self.client.post(B + "data-requests/", {"kind": "deletion"}, format="json").status_code, 201)
        self.assertEqual(self.client.post(B + "data-requests/", {"kind": "nope"}, format="json").status_code, 400)
        self.assertEqual(self.client.post(B + "data-requests/", {"kind": "export", "status": "completed"}, format="json").status_code, 409)
        DataRequest.objects.create(patient=self.b.patient_profile, kind="export")
        self.assertEqual(len(self.client.get(B + "data-requests/").json()), 2)

    def test_data_request_allowed_again_after_completion(self):
        self.client.post(B + "data-requests/", {"kind": "export"}, format="json")
        DataRequest.objects.update(status="completed")
        self.assertEqual(self.client.post(B + "data-requests/", {"kind": "export"}, format="json").status_code, 201)

    def test_export_only_self_audited_no_store(self):
        Allergy.objects.create(patient=self.a.patient_profile, name="Mine")
        Allergy.objects.create(patient=self.b.patient_profile, name="Theirs")
        r = self.client.get(B + "export/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual([x["name"] for x in r.json()["allergies"]], ["Mine"])
        self.assertNotIn("b@example.com", r.content.decode())
        self.assertEqual(r["Cache-Control"], "no-store")
        ev = AuditEvent.objects.get(action="export")
        self.assertEqual(ev.patient_id, self.a.patient_profile.pk)
        self.assertEqual(ev.actor_id, self.a.pk)

    def test_presign_stub(self):
        r = self.client.post(B + "identity-documents/presign/", {"kind": "passport", "content_type": "image/png"}, format="json")
        self.assertEqual(r.status_code, 201)
        doc = IdentityDocument.objects.get()
        self.assertEqual((doc.patient_id, doc.status), (self.a.patient_profile.pk, "pending"))
        self.assertTrue(doc.s3_key.startswith(f"identity/{self.a.patient_profile.pk}/"))
        self.assertEqual(self.client.post(B + "identity-documents/presign/", {"content_type": "text/html"}, format="json").status_code, 400)

    def test_reads_and_writes_are_audited_without_values(self):
        self.client.post(B + "allergies/", {"name": "Penicillin", "reaction": "hives"}, format="json")
        self.client.get(B + "allergies/")
        self.client.get(B + "me/profile/")
        actions = set(AuditEvent.objects.values_list("action", flat=True))
        self.assertTrue({"create", "read"} <= actions)
        dump = " ".join(str(e.metadata) + e.actor_label + e.object_id for e in AuditEvent.objects.all())
        self.assertNotIn("Penicillin", dump)
        self.assertNotIn("hives", dump)
