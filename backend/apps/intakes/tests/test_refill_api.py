from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.common.validation.refill import REFILL_REQUEST_COOLDOWN_HOURS
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
        self.assertEqual(len(listing.data["refill_requests"]), 1)
        self.assertIn("cooldown", listing.data)
        self.assertTrue(listing.data["cooldown"]["active"])
        self.assertEqual(RefillRequest.objects.filter(user=self.user).count(), 1)

    def test_rejects_second_refill_within_cooldown(self):
        self._mark_prescription_sent()
        first = self.client.post(reverse("refill-request-me"), {}, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(reverse("refill-request-me"), {}, format="json")
        self.assertEqual(second.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", second.data)
        self.assertIn("24 hours", second.data["detail"])
        self.assertIn("retry_after", second.data)
        self.assertIn("hours_remaining", second.data)
        self.assertEqual(RefillRequest.objects.filter(user=self.user).count(), 1)

    def test_allows_refill_after_cooldown(self):
        self._mark_prescription_sent()
        first = self.client.post(reverse("refill-request-me"), {}, format="json")
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        refill = RefillRequest.objects.get(pk=first.data["id"])
        RefillRequest.objects.filter(pk=refill.pk).update(
            created_at=timezone.now()
            - timedelta(hours=REFILL_REQUEST_COOLDOWN_HOURS, minutes=1)
        )

        second = self.client.post(reverse("refill-request-me"), {}, format="json")
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertEqual(RefillRequest.objects.filter(user=self.user).count(), 2)

    def test_list_includes_active_cooldown(self):
        self._mark_prescription_sent()
        self.client.post(reverse("refill-request-me"), {}, format="json")
        listing = self.client.get(reverse("refill-request-me"))
        self.assertTrue(listing.data["cooldown"]["active"])
        self.assertIsNotNone(listing.data["cooldown"]["retry_after"])
        self.assertGreater(listing.data["cooldown"]["hours_remaining"], 0)

    def test_rejects_refill_without_prescription(self):
        MedicalIntake.objects.create(user=self.user, status="prescription_sent")
        ProviderReview.objects.create(user=self.user, status="prescription_sent")
        response = self.client.post(reverse("refill-request-me"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_requires_auth(self):
        client = APIClient()
        response = client.get(reverse("refill-request-me"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Same-dose refill via new endpoint
# ---------------------------------------------------------------------------

class SameDoseRefillViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient2@example.com",
            password="secure-pass-2",
            first_name="Alice",
            last_name="Smith",
            phone="3035550200",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _setup_active_prescription(self, drug_category="glp1"):
        MedicalIntake.objects.create(user=self.user, status="prescription_sent")
        review = ProviderReview.objects.create(
            user=self.user,
            status="prescription_sent",
            external_review_id="beluga-master-abc",
        )
        return PatientPrescription.objects.create(
            user=self.user,
            medication_name="Semaglutide",
            dosage="0.5 mg",
            frequency="Once weekly",
            beluga_med_id="med-001",
            drug_category=drug_category,
            is_active=True,
        )

    def test_same_dose_happy_path_creates_refill_request(self):
        """Happy path: creates a RefillRequest with request_type=same_dose."""
        self._setup_active_prescription()
        response = self.client.post(reverse("refill-same-dose"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["request_type"], "same_dose")
        # Beluga is not configured in tests so status should be not_configured
        self.assertEqual(response.data["beluga_status"], "not_configured")
        self.assertIn("id", response.data)
        self.assertIn("message", response.data)
        self.assertIn("created_at", response.data)

        refill = RefillRequest.objects.get(id=response.data["id"])
        self.assertEqual(refill.request_type, "same_dose")
        self.assertEqual(refill.beluga_response_status, "not_configured")

    def test_same_dose_requires_active_prescription(self):
        """Returns 403 when patient has no active prescription."""
        response = self.client.post(reverse("refill-same-dose"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_same_dose_requires_auth(self):
        anon = APIClient()
        response = anon.post(reverse("refill-same-dose"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# Titration refill via new endpoint
# ---------------------------------------------------------------------------

class TitrationRefillViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient3@example.com",
            password="secure-pass-3",
            first_name="Bob",
            last_name="Jones",
            phone="3035550300",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _setup_active_prescription(self, drug_category="glp1"):
        MedicalIntake.objects.create(user=self.user, status="prescription_sent")
        ProviderReview.objects.create(
            user=self.user,
            status="prescription_sent",
            external_review_id="beluga-master-xyz",
        )
        return PatientPrescription.objects.create(
            user=self.user,
            medication_name="Tirzepatide",
            dosage="2.5 mg",
            frequency="Once weekly",
            beluga_med_id="med-002",
            drug_category=drug_category,
            drug_strength="2.5 mg",
            quantity="4",
            refills=5,
            is_active=True,
        )

    def test_titration_increase_creates_records(self):
        """Happy path: creates SideEffectCheckIn + RefillRequest for increase."""
        self._setup_active_prescription()
        response = self.client.post(
            reverse("refill-titration"),
            {
                "titration_direction": "increase",
                "weight_lbs": "185.0",
                "notes": "Tolerating well",
                "side_effect": "none",
            },
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["request_type"], "titration")
        self.assertEqual(response.data["titration_direction"], "increase")
        self.assertIn("beluga_status", response.data)
        self.assertIn("message", response.data)

        refill = RefillRequest.objects.get(id=response.data["id"])
        self.assertEqual(refill.request_type, "titration")
        self.assertEqual(refill.titration_direction, "increase")
        self.assertIsNotNone(refill.side_effect_check_in)

        check_in = refill.side_effect_check_in
        self.assertEqual(str(check_in.weight_lbs), "185.0")
        self.assertEqual(check_in.notes, "Tolerating well")
        self.assertEqual(check_in.titration_direction, "increase")

    def test_titration_invalid_direction_returns_400(self):
        """Invalid titration_direction value returns 400."""
        self._setup_active_prescription()
        response = self.client.post(
            reverse("refill-titration"),
            {"titration_direction": "sideways"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_titration_missing_direction_returns_400(self):
        """Missing titration_direction returns 400."""
        self._setup_active_prescription()
        response = self.client.post(
            reverse("refill-titration"),
            {"notes": "Tolerating well"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_titration_requires_active_prescription(self):
        """Returns 403 when patient has no active prescription."""
        response = self.client.post(
            reverse("refill-titration"),
            {"titration_direction": "increase"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_titration_requires_auth(self):
        anon = APIClient()
        response = anon.post(reverse("refill-titration"), {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


# ---------------------------------------------------------------------------
# RefillConfigView
# ---------------------------------------------------------------------------

class RefillConfigViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient4@example.com",
            password="secure-pass-4",
            first_name="Carol",
            last_name="White",
            phone="3035550400",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_config_returns_glp1_fields_for_active_glp1_prescription(self):
        """Returns drug_category=glp1 and collects_weight=True for GLP-1 rx."""
        MedicalIntake.objects.create(user=self.user, status="prescription_sent")
        ProviderReview.objects.create(user=self.user, status="prescription_sent")
        PatientPrescription.objects.create(
            user=self.user,
            medication_name="Wegovy",
            dosage="0.25 mg",
            frequency="Once weekly",
            drug_category="glp1",
            is_active=True,
        )
        response = self.client.get(reverse("refill-config"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["drug_category"], "glp1")
        self.assertTrue(response.data["titration_field"])
        self.assertTrue(response.data["collects_weight"])
        self.assertTrue(response.data["collects_photo"])
        self.assertTrue(response.data["collects_bmi"])
        self.assertTrue(response.data["collects_notes"])

    def test_config_returns_other_when_no_prescription(self):
        """Returns drug_category=other when patient has no active prescription."""
        response = self.client.get(reverse("refill-config"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["drug_category"], "other")

    def test_config_requires_auth(self):
        anon = APIClient()
        response = anon.get(reverse("refill-config"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
