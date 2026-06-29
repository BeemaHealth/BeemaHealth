from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.consents.models import ConsentRecord
from apps.eligibility.models import EligibilityResponse
from apps.intakes.models import IntakeSubmission, MedicalIntake
from apps.intakes.submissions import build_submission_snapshot, create_intake_submission, resubmit_intake
from apps.patients.models import PatientProfile
from apps.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)


class IntakeSubmissionTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
            state="Colorado",
        )
        self.eligibility = EligibilityResponse.objects.create(
            user=self.user,
            height_ft=5,
            height_in=8,
            weight_lbs="170.0",
            goal_weight_lbs="150.0",
        )
        self.intake = MedicalIntake.objects.create(
            user=self.user,
            status="draft",
            identity={
                "address": "123 Main St",
                "city": "Denver",
                "zip": "80202",
                "emergency_name": "John Doe",
                "emergency_phone": "3035550101",
            },
        )
        PatientProfile.objects.create(
            user=self.user,
            address="123 Main St",
            city="Denver",
            zip_code="80202",
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_consent_creates_submission_v1(self):
        EligibilityResponse.objects.filter(user=self.user).update(
            pre_signup_consents={"terms": True, "privacy": True, "telehealth": True},
        )
        payload = {
            "telehealth_consent": True,
            "no_guarantee_acknowledgment": True,
            "emergency_disclaimer_acknowledgment": True,
            "medication_risk_acknowledgment": True,
            "compounded_medication_acknowledgment": True,
            "typed_signature": "Jane Doe",
        }
        response = self.client.post(reverse("consent-me"), payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        submission = IntakeSubmission.objects.get(user=self.user, version=1)
        self.assertEqual(submission.snapshot["account"]["first_name"], "Jane")
        self.intake.refresh_from_db()
        self.assertEqual(self.intake.active_submission_version, 1)

    def test_dynamic_submission_snapshot_includes_beluga_visit_payload(self):
        questionnaire = Questionnaire.objects.create(
            slug="intake-dynamic",
            title="Intake",
            questionnaire_type=Questionnaire.QuestionnaireType.INTAKE,
        )
        version = QuestionnaireVersion.objects.create(
            questionnaire=questionnaire,
            version_label="1.0.0",
        )
        step = QuestionnaireStep.objects.create(
            version=version,
            step_key="meds",
            sort_order=0,
            title="Meds",
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="meds",
            field_type=QuestionnaireField.FieldType.TEXTAREA,
            label="Medications",
            maps_to_section="beluga:selfReportedMeds",
            sort_order=0,
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="allergies",
            field_type=QuestionnaireField.FieldType.TEXTAREA,
            label="Allergies",
            maps_to_section="beluga:allergies",
            sort_order=1,
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="conditions",
            field_type=QuestionnaireField.FieldType.TEXTAREA,
            label="Conditions",
            maps_to_section="beluga:medicalConditions",
            sort_order=2,
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="sex",
            field_type=QuestionnaireField.FieldType.SINGLE_CHOICE,
            label="Sex",
            maps_to_section="beluga:sex",
            options=[{"value": "female", "label": "Female"}],
            sort_order=3,
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="dob",
            field_type=QuestionnaireField.FieldType.DOB,
            label="DOB",
            maps_to_section="beluga:dob",
            sort_order=4,
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="ship",
            field_type=QuestionnaireField.FieldType.ADDRESS_GROUP,
            label="Address",
            options=[
                {"value": "address", "label": "Street", "beluga": "beluga:address"},
                {"value": "city", "label": "City", "beluga": "beluga:city"},
                {"value": "state", "label": "State", "beluga": "beluga:state"},
                {"value": "zip", "label": "ZIP", "beluga": "beluga:zip"},
            ],
            sort_order=5,
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="review_confirm",
            field_type=QuestionnaireField.FieldType.REVIEW,
            label="Review",
            sort_order=6,
        )
        self.intake.questionnaire_version_id = version.id
        self.intake.questionnaire_responses = {
            "meds": "None",
            "allergies": "None",
            "conditions": "None",
            "sex": "female",
            "dob": "1990-01-15",
            "ship": {
                "address": "123 Main St",
                "city": "Denver",
                "state": "CO",
                "zip": "80202",
                "verified": True,
            },
            "review_confirm": True,
        }
        self.intake.save()
        self.user.dob = timezone.datetime(1990, 1, 15).date()
        self.user.save(update_fields=["dob"])
        self.eligibility.sex_assigned_at_birth = "female"
        self.eligibility.save(update_fields=["sex_assigned_at_birth"])

        snapshot = build_submission_snapshot(
            self.user,
            self.intake,
            version=1,
            submitted_at=timezone.now(),
        )
        beluga = snapshot.get("beluga_visit_payload")
        self.assertIsNotNone(beluga)
        self.assertTrue(beluga["ready"])
        self.assertEqual(beluga["form_obj"]["selfReportedMeds"], "None")

    def test_snapshot_frozen_after_account_rename(self):
        consent = ConsentRecord.objects.create(
            user=self.user,
            telehealth_consent=True,
            no_guarantee_acknowledgment=True,
            emergency_disclaimer_acknowledgment=True,
            medication_risk_acknowledgment=True,
            compounded_medication_acknowledgment=True,
            privacy_acknowledgment=True,
            typed_signature="Jane Doe",
            signed_at=timezone.now(),
        )
        self.intake.status = "submitted"
        self.intake.submitted_at = timezone.now()
        self.intake.save()
        create_intake_submission(self.user, self.intake, submitted_at=self.intake.submitted_at)

        self.user.first_name = "Janet"
        self.user.save(update_fields=["first_name", "updated_at"])

        submission = IntakeSubmission.objects.get(user=self.user, version=1)
        self.assertEqual(submission.snapshot["account"]["first_name"], "Jane")
        self.assertEqual(submission.snapshot["account_summary"]["first_name"], "Jane")

    def test_account_tab_name_change_does_not_alter_submission_snapshot(self):
        self.intake.status = "submitted"
        self.intake.submitted_at = timezone.now()
        self.intake.save()
        create_intake_submission(self.user, self.intake, submitted_at=self.intake.submitted_at)

        response = self.client.patch(
            reverse("auth-me"),
            {"first_name": "Janet"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, "Janet")

        submission = IntakeSubmission.objects.get(user=self.user, version=1)
        self.assertEqual(submission.snapshot["account"]["first_name"], "Jane")
        self.intake.refresh_from_db()
        self.assertEqual(self.intake.account_screening["first_name"], "Jane")

    def test_intake_get_includes_account_screening(self):
        response = self.client.get(reverse("intake-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        screening = response.json()["account_screening"]
        self.assertEqual(screening["first_name"], "Jane")
        self.assertEqual(screening["weight_lbs"], "170.0")

    def test_refresh_account_screening_endpoint(self):
        self.user.first_name = "Janet"
        self.user.save(update_fields=["first_name", "updated_at"])
        response = self.client.post(
            reverse("intake-refresh-account-screening"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["account_screening"]["first_name"], "Janet")

    def test_refresh_account_screening_blocked_when_submitted(self):
        self.intake.status = "submitted"
        self.intake.save()
        response = self.client.post(
            reverse("intake-refresh-account-screening"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_resubmit_creates_v2(self):
        consent = ConsentRecord.objects.create(
            user=self.user,
            telehealth_consent=True,
            no_guarantee_acknowledgment=True,
            emergency_disclaimer_acknowledgment=True,
            medication_risk_acknowledgment=True,
            compounded_medication_acknowledgment=True,
            privacy_acknowledgment=True,
            typed_signature="Jane Doe",
            signed_at=timezone.now(),
        )
        self.intake.status = "more_info_needed"
        self.intake.submitted_at = timezone.now()
        self.intake.identity = {**self.intake.identity, "address": "456 Oak Ave"}
        self.intake.save()
        create_intake_submission(self.user, self.intake, submitted_at=self.intake.submitted_at)

        resubmit_intake(self.user, self.intake)
        self.assertEqual(IntakeSubmission.objects.filter(user=self.user).count(), 2)
        v2 = IntakeSubmission.objects.get(user=self.user, version=2)
        self.assertEqual(v2.snapshot["identity_contact"]["address"], "456 Oak Ave")
        self.intake.refresh_from_db()
        self.assertEqual(self.intake.status, "submitted")
        self.assertEqual(self.intake.active_submission_version, 2)

    def test_patch_blocked_when_submitted(self):
        self.intake.status = "submitted"
        self.intake.save()
        response = self.client.patch(
            reverse("intake-me"),
            {"identity": {"address": "999 Hack St"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_allowed_when_more_info_needed(self):
        self.intake.status = "more_info_needed"
        self.intake.save()
        response = self.client.patch(
            reverse("intake-me"),
            {"identity": {"address": "789 Pine Rd", "city": "Denver", "zip": "80202"}},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.intake.refresh_from_db()
        self.assertEqual(self.intake.identity["address"], "789 Pine Rd")

    def test_get_includes_can_edit_and_active_submission(self):
        self.intake.status = "submitted"
        self.intake.submitted_at = timezone.now()
        self.intake.save()
        create_intake_submission(self.user, self.intake, submitted_at=self.intake.submitted_at)

        response = self.client.get(reverse("intake-me"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertFalse(body["can_edit"])
        self.assertIsNotNone(body["active_submission"])
        self.assertEqual(body["active_submission"]["version"], 1)

    def test_resubmit_endpoint(self):
        self.intake.status = "more_info_needed"
        self.intake.submitted_at = timezone.now()
        self.intake.save()
        create_intake_submission(self.user, self.intake, submitted_at=self.intake.submitted_at)

        response = self.client.post(reverse("intake-resubmit-me"), format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["active_submission_version"], 2)
        self.assertFalse(response.json()["can_edit"])
