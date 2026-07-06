from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.validation.payloads import STRICT_FIELD_ATTACKS
from apps.prescriptions.models import PatientPrescription


class PatientPrescriptionApiTests(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        self.provider = User.objects.create_user(
            email="provider@example.com",
            password="secure-pass-1",
            first_name="Dr",
            last_name="Smith",
            is_provider=True,
        )
        self.patient_client = APIClient()
        self.patient_client.force_authenticate(user=self.patient)
        self.provider_client = APIClient()
        self.provider_client.force_authenticate(user=self.provider)

    def _create_prescription(self, **overrides):
        payload = {
            "medication_name": "Wegovy",
            "dosage": "0.25 mg",
            "frequency": "Once weekly",
            "route": "injection",
            "instructions": "Inject subcutaneously on the same day each week.",
            "pharmacy_name": "Beema Health Pharmacy Partner",
        }
        payload.update(overrides)
        return self.provider_client.post(
            reverse("admin-patient-prescription", kwargs={"patient_id": self.patient.id}),
            payload,
            format="json",
        )

    def test_patient_reads_active_prescription(self):
        create = self._create_prescription()
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)

        response = self.patient_client.get(reverse("prescription-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["medication_name"], "Wegovy")
        self.assertEqual(response.data["dosage"], "0.25 mg")
        self.assertEqual(response.data["frequency"], "Once weekly")

    def test_patient_get_returns_null_without_prescription(self):
        response = self.patient_client.get(reverse("prescription-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data)

    def test_provider_can_update_prescription(self):
        self._create_prescription()
        response = self.provider_client.patch(
            reverse("admin-patient-prescription", kwargs={"patient_id": self.patient.id}),
            {"dosage": "0.5 mg"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["dosage"], "0.5 mg")
        self.assertEqual(
            PatientPrescription.objects.filter(user=self.patient, is_active=True).count(),
            1,
        )

    def test_patient_cannot_create_prescription(self):
        response = self.patient_client.post(
            reverse("prescription-me"),
            {
                "medication_name": "Wegovy",
                "dosage": "0.25 mg",
                "frequency": "Once weekly",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_provider_rejects_malicious_medication_name(self):
        for attack in STRICT_FIELD_ATTACKS:
            response = self._create_prescription(medication_name=attack)
            self.assertEqual(
                response.status_code,
                status.HTTP_400_BAD_REQUEST,
                msg=f"Expected 400 for attack: {attack!r}",
            )

    def test_requires_auth(self):
        client = APIClient()
        response = client.get(reverse("prescription-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
