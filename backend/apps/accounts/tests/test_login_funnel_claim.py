from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.eligibility.models import EligibilityResponse, FunnelSession


class LoginFunnelClaimTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        self.existing_eligibility = EligibilityResponse.objects.create(
            user=self.user,
            treatment_interest="glp1_pills",
            height_ft=5,
            height_in=10,
        )

        funnel_response = self.client.post(reverse("funnel-session"))
        self.assertEqual(funnel_response.status_code, status.HTTP_201_CREATED)
        self.client.cookies.load(funnel_response.cookies)
        funnel_eligibility = EligibilityResponse.objects.get(id=funnel_response.json()["id"])
        self.funnel_session = funnel_eligibility.funnel_session

        patch_response = self.client.patch(
            reverse("funnel-eligibility"),
            {
                "treatment_interest": "glp1_injections",
                "primary_goal": "lose_weight",
                "height_ft": 6,
            },
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)

    def test_login_with_funnel_cookie_when_user_already_has_eligibility(self):
        response = self.client.post(
            reverse("auth-login"),
            {"email": "patient@example.com", "password": "secure-pass-1"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("token", response.json())

        self.existing_eligibility.refresh_from_db()
        self.assertEqual(self.existing_eligibility.treatment_interest, "glp1_pills")
        self.assertEqual(self.existing_eligibility.primary_goal, "lose_weight")
        self.assertEqual(self.existing_eligibility.height_ft, 5)
        self.assertEqual(EligibilityResponse.objects.filter(user=self.user).count(), 1)
        self.assertFalse(
            EligibilityResponse.objects.filter(funnel_session__isnull=False).exists()
        )

        funnel_session = FunnelSession.objects.get(id=self.funnel_session.id)
        self.assertEqual(funnel_session.status, FunnelSession.Status.CLAIMED)
        self.assertEqual(funnel_session.claimed_by_user_id, self.user.id)

    def test_register_with_funnel_cookie_claims_eligibility_for_new_user(self):
        register_response = self.client.post(
            reverse("auth-register"),
            {
                "email": "new.patient@example.com",
                "password": "secure-pass-1",
                "first_name": "New",
                "last_name": "Patient",
                "phone": "(303) 555-0199",
                "state": "Colorado",
            },
            format="json",
        )

        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        new_user = User.objects.get(email="new.patient@example.com")
        self.assertEqual(EligibilityResponse.objects.filter(user=new_user).count(), 1)
        claimed = EligibilityResponse.objects.get(user=new_user)
        self.assertEqual(claimed.primary_goal, "lose_weight")
        self.assertFalse(
            EligibilityResponse.objects.filter(funnel_session__isnull=False).exists()
        )
