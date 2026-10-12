from django.test import TestCase

from apps.accounts.tests.helpers import make_patient
from apps.patients.models import Address, Allergy, ConsentRecord, ImmutableError, MedicalCondition
from django.db import connection


class ConsentImmutabilityTests(TestCase):
    def setUp(self):
        self.patient = make_patient().patient_profile
        self.consent = ConsentRecord.objects.create(patient=self.patient, kind="terms", version="1")

    def test_save_update_blocked(self):
        self.consent.version = "2"
        with self.assertRaises(ImmutableError):
            self.consent.save()
        self.consent.refresh_from_db()
        self.assertEqual(self.consent.version, "1")

    def test_delete_blocked(self):
        with self.assertRaises(ImmutableError):
            self.consent.delete()
        self.assertEqual(ConsentRecord.objects.count(), 1)

    def test_queryset_update_delete_blocked(self):
        with self.assertRaises(ImmutableError):
            ConsentRecord.objects.update(version="9")
        with self.assertRaises(ImmutableError):
            ConsentRecord.objects.all().delete()

    def test_new_acceptance_creates_new_row(self):
        ConsentRecord.objects.create(patient=self.patient, kind="terms", version="2")
        self.assertEqual(ConsentRecord.objects.filter(patient=self.patient, kind="terms").count(), 2)

    def test_str_has_no_phi(self):
        self.assertIn("terms", str(self.consent))


class PatientModelTests(TestCase):
    def setUp(self):
        self.patient = make_patient("pii@example.com", first_name="Jane").patient_profile

    def test_single_default_address_per_kind(self):
        a = Address.objects.create(patient=self.patient, kind="shipping", line1="1 A St", city="X", state="tx", zip_code="75001", is_default=True)
        b = Address.objects.create(patient=self.patient, kind="shipping", line1="2 B St", city="X", state="TX", zip_code="75001", is_default=True)
        home = Address.objects.create(patient=self.patient, kind="home", line1="3 C St", city="X", state="TX", zip_code="75001", is_default=True)
        a.refresh_from_db()
        self.assertFalse(a.is_default)
        self.assertTrue(b.is_default and home.is_default)
        self.assertEqual(a.state, "TX")

    def test_free_text_encrypted_at_rest(self):
        Allergy.objects.create(patient=self.patient, name="Penicillin", reaction="hives and swelling")
        MedicalCondition.objects.create(patient=self.patient, name="Asthma", notes="uses inhaler")
        with connection.cursor() as cur:
            cur.execute("SELECT reaction FROM patients_allergy")
            self.assertNotIn("hives", cur.fetchone()[0])
            cur.execute("SELECT notes FROM patients_medicalcondition")
            self.assertNotIn("inhaler", cur.fetchone()[0])
        self.assertEqual(Allergy.objects.get().reaction, "hives and swelling")

    def test_str_methods_contain_no_phi(self):
        addr = Address.objects.create(patient=self.patient, kind="home", line1="1 Secret Rd", city="Town", state="TX", zip_code="75001")
        allergy = Allergy.objects.create(patient=self.patient, name="Penicillin")
        for obj in (self.patient, addr, allergy):
            for needle in ("pii@example.com", "Jane", "Secret", "Town", "Penicillin"):
                self.assertNotIn(needle, str(obj))
