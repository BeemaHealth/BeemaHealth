from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from apps.intakes.models import RefillRequest
from apps.prescriptions.models import PatientPrescription
from apps.reviews.models import ProviderReview

User = get_user_model()


class StaffPermissionTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            email="staff@example.com",
            password="securepass123",
            is_staff=True,
            is_patient=False,
        )
        self.patient = User.objects.create_user(
            email="patient@example.com",
            password="securepass123",
            is_patient=True,
        )
        self.provider = User.objects.create_user(
            email="provider@example.com",
            password="securepass123",
            is_provider=True,
            is_patient=False,
        )

    def test_staff_summary_allowed_for_staff(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get("/api/staff/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("total_patients", response.json())

    def test_staff_summary_denied_for_patient(self):
        self.client.force_authenticate(user=self.patient)
        response = self.client.get("/api/staff/summary/")
        self.assertEqual(response.status_code, 403)

    def test_staff_summary_denied_for_provider_without_staff(self):
        self.client.force_authenticate(user=self.provider)
        response = self.client.get("/api/staff/summary/")
        self.assertEqual(response.status_code, 403)

    def test_staff_patients_denied_for_anonymous(self):
        response = self.client.get("/api/staff/patients/")
        self.assertEqual(response.status_code, 401)


@override_settings(DEBUG=True)
class StaffDevBelugaMockTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            email="mock-staff@example.com",
            password="securepass123",
            is_staff=True,
            is_patient=False,
        )
        self.patient = User.objects.create_user(
            email="mock-patient@example.com",
            password="securepass123",
            is_patient=True,
            first_name="Mock",
            last_name="Patient",
        )
        self.client.force_authenticate(user=self.staff)

    def test_targets_denied_when_not_debug(self):
        with override_settings(DEBUG=False):
            response = self.client.get(
                "/api/staff/dev/beluga-mock-targets/",
                {"patient_email": self.patient.email},
            )
        self.assertEqual(response.status_code, 403)

    def test_targets_returns_initial_consult_with_no_master_id_for_fresh_patient(self):
        response = self.client.get(
            "/api/staff/dev/beluga-mock-targets/",
            {"patient_email": self.patient.email},
        )
        self.assertEqual(response.status_code, 200)
        targets = response.data["targets"]
        self.assertEqual(targets[0]["kind"], "initial_consult")
        self.assertEqual(targets[0]["master_id"], "")

    def test_targets_lists_refill_requests(self):
        ProviderReview.objects.create(
            user=self.patient, external_review_id="original-001"
        )
        RefillRequest.objects.create(
            user=self.patient,
            request_type="titration",
            beluga_master_id="titration-001",
            status="pending",
        )
        response = self.client.get(
            "/api/staff/dev/beluga-mock-targets/",
            {"patient_email": self.patient.email},
        )
        targets = response.data["targets"]
        self.assertEqual(len(targets), 2)
        self.assertEqual(targets[0]["master_id"], "original-001")
        self.assertEqual(targets[1]["kind"], "refill")
        self.assertEqual(targets[1]["master_id"], "titration-001")

    def test_fire_denied_for_non_staff(self):
        patient_client = APIClient()
        patient_client.force_authenticate(user=self.patient)
        response = patient_client.post(
            "/api/staff/dev/beluga-webhook/",
            {
                "patient_email": self.patient.email,
                "target_kind": "initial_consult",
                "event": "CONSULT_CONCLUDED",
                "visitOutcome": "prescribed",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_fire_against_initial_consult_generates_master_id_and_applies_webhook(self):
        response = self.client.post(
            "/api/staff/dev/beluga-webhook/",
            {
                "patient_email": self.patient.email,
                "target_kind": "initial_consult",
                "event": "CONSULT_CONCLUDED",
                "visitOutcome": "prescribed",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "prescription_sent")

        review = ProviderReview.objects.get(user=self.patient)
        self.assertTrue(review.external_review_id)
        self.assertEqual(review.status, "prescription_sent")

    def test_fire_against_titration_target_uses_real_routing_and_updates_refill(self):
        ProviderReview.objects.create(
            user=self.patient, external_review_id="original-002"
        )
        PatientPrescription.objects.create(
            user=self.patient,
            medication_name="Semaglutide",
            dosage="0.5 mg",
            frequency="Once weekly",
            is_active=True,
        )
        refill = RefillRequest.objects.create(
            user=self.patient,
            request_type="titration",
            beluga_master_id="titration-mock-001",
            status="pending",
        )

        response = self.client.post(
            "/api/staff/dev/beluga-webhook/",
            {
                "patient_email": self.patient.email,
                "target_kind": "refill",
                "master_id": "titration-mock-001",
                "event": "RX_WRITTEN",
                "docName": "Dev Doctor",
                "medsPrescribed": [
                    {
                        "name": "Semaglutide",
                        "strength": "1.0 mg",
                        "refills": "3",
                        "quantity": "1",
                        "rxId": "rx-mock-1",
                    }
                ],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)

        refill.refresh_from_db()
        self.assertEqual(refill.status, "approved")

    def test_fire_with_unknown_master_id_returns_400(self):
        response = self.client.post(
            "/api/staff/dev/beluga-webhook/",
            {
                "patient_email": self.patient.email,
                "target_kind": "refill",
                "master_id": "does-not-exist",
                "event": "RX_WRITTEN",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
