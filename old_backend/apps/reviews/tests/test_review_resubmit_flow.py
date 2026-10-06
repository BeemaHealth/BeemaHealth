from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.consents.models import ConsentRecord
from apps.intakes.models import IntakeSubmission, MedicalIntake
from apps.intakes.submissions import create_intake_submission


class ReviewResubmitFlowTests(TestCase):
    """End-to-end: provider sets more_info_needed → patient edits → resubmit creates v2."""

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
        self.intake = MedicalIntake.objects.create(
            user=self.patient,
            status="submitted",
            submitted_at=timezone.now(),
            identity={"address": "123 Main St", "city": "Denver", "zip": "80202"},
        )
        create_intake_submission(
            self.patient, self.intake, submitted_at=self.intake.submitted_at
        )
        ConsentRecord.objects.create(
            user=self.patient,
            telehealth_consent=True,
            no_guarantee_acknowledgment=True,
            emergency_disclaimer_acknowledgment=True,
            medication_risk_acknowledgment=True,
            compounded_medication_acknowledgment=True,
            privacy_acknowledgment=True,
            typed_signature="Jane Doe",
            signed_at=timezone.now(),
        )
        self.provider_client = APIClient()
        self.provider_client.force_authenticate(user=self.provider)
        self.patient_client = APIClient()
        self.patient_client.force_authenticate(user=self.patient)

    def test_provider_more_info_then_patient_resubmit_creates_v2(self):
        patch_response = self.provider_client.patch(
            reverse("admin-patient-detail", kwargs={"patient_id": self.patient.id}),
            {
                "status": "more_info_needed",
                "decision": "needs_more_info",
                "patient_note": "Please update your shipping address.",
            },
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_response.data["status"], "more_info_needed")

        self.intake.refresh_from_db()
        self.assertEqual(self.intake.status, "more_info_needed")

        get_response = self.patient_client.get(reverse("intake-me"))
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertTrue(get_response.data["can_edit"])

        patch_intake = self.patient_client.patch(
            reverse("intake-me"),
            {"identity": {"address": "456 Oak Ave", "city": "Denver", "zip": "80203"}},
            format="json",
        )
        self.assertEqual(patch_intake.status_code, status.HTTP_200_OK)

        resubmit_response = self.patient_client.post(
            reverse("intake-resubmit-me"), format="json"
        )
        self.assertEqual(resubmit_response.status_code, status.HTTP_200_OK)

        self.intake.refresh_from_db()
        self.assertEqual(self.intake.status, "submitted")
        self.assertEqual(self.intake.active_submission_version, 2)

        submissions = IntakeSubmission.objects.filter(user=self.patient).order_by("version")
        self.assertEqual(submissions.count(), 2)
        v2 = submissions.get(version=2)
        self.assertEqual(v2.snapshot["identity_contact"]["address"], "456 Oak Ave")

        detail = self.provider_client.get(
            reverse("admin-patient-detail", kwargs={"patient_id": self.patient.id}),
        )
        self.assertEqual(detail.status_code, status.HTTP_200_OK)
        self.assertEqual(detail.data["submission"]["version"], 2)
