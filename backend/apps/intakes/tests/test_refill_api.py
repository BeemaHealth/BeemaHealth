from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake, RefillRequest, SideEffectCheckIn
from apps.prescriptions.models import PatientPrescription
from apps.reviews.models import ProviderReview


class RefillRequestApiTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _mark_prescription_sent(self):
        MedicalIntake.objects.create(user=self.user, status="prescription_sent")
        ProviderReview.objects.create(user=self.user, status="prescription_sent")
        PatientPrescription.objects.create(
            user=self.user,
            medication_name="Wegovy",
            dosage="0.25 mg",
            frequency="Once weekly",
        )

    def test_create_and_list_refill_request(self):
        self._mark_prescription_sent()
        check_in = SideEffectCheckIn.objects.create(
            user=self.user,
            side_effect="mild_nausea",
            experienced_on="2026-06-15",
        )
        create = self.client.post(
            reverse("refill-request-me"),
            {"side_effect_check_in_id": str(check_in.id)},
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create.data["status"], "pending")

        listing = self.client.get(reverse("refill-request-me"))
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 1)
        self.assertEqual(RefillRequest.objects.filter(user=self.user).count(), 1)

    def test_rejects_refill_without_prescription(self):
        MedicalIntake.objects.create(user=self.user, status="prescription_sent")
        ProviderReview.objects.create(user=self.user, status="prescription_sent")
        response = self.client.post(reverse("refill-request-me"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_requires_auth(self):
        client = APIClient()
        response = client.get(reverse("refill-request-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
