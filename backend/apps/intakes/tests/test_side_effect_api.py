from datetime import date

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake, SideEffectCheckIn
from apps.reviews.models import ProviderReview


class SideEffectCheckInApiTests(TestCase):
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

    def test_create_and_list_check_in(self):
        self._mark_prescription_sent()
        payload = {"side_effect": "mild_nausea", "experienced_on": "2026-06-15"}
        create = self.client.post(
            reverse("side-effect-check-in-me"),
            payload,
            format="json",
        )
        self.assertEqual(create.status_code, status.HTTP_201_CREATED)
        self.assertEqual(create.data["side_effect"], "mild_nausea")

        listing = self.client.get(reverse("side-effect-check-in-me"))
        self.assertEqual(listing.status_code, status.HTTP_200_OK)
        self.assertEqual(len(listing.data), 1)
        self.assertEqual(SideEffectCheckIn.objects.filter(user=self.user).count(), 1)

    def test_rejects_future_date(self):
        self._mark_prescription_sent()
        response = self.client.post(
            reverse("side-effect-check-in-me"),
            {
                "side_effect": "fatigue",
                "experienced_on": date.today().replace(year=date.today().year + 1).isoformat(),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_check_in_without_prescription(self):
        response = self.client.post(
            reverse("side-effect-check-in-me"),
            {"side_effect": "fatigue", "experienced_on": "2026-06-15"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_requires_auth(self):
        client = APIClient()
        response = client.get(reverse("side-effect-check-in-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
