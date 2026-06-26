from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.audit.models import AuditEvent
from apps.common.validation.payloads import STRICT_FIELD_ATTACKS
from apps.eligibility.models import EligibilityResponse
from apps.intakes.models import MedicalIntake
from apps.questionnaires.models import (
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)


def valid_consent_payload(**overrides):
    payload = {
        "telehealth_consent": True,
        "no_guarantee_acknowledgment": True,
        "emergency_disclaimer_acknowledgment": True,
        "medication_risk_acknowledgment": True,
        "compounded_medication_acknowledgment": True,
        "typed_signature": "Jane Doe",
    }
    payload.update(overrides)
    return payload


class ConsentApiValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        EligibilityResponse.objects.create(
            user=self.user,
            pre_signup_consents={"terms": True, "privacy": True, "telehealth": True},
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_valid_consent(self):
        response = self.client.post(reverse("consent-me"), valid_consent_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_consent_submit_audits_intake_update(self):
        intake = MedicalIntake.objects.create(user=self.user, status="draft")
        response = self.client.post(reverse("consent-me"), valid_consent_payload(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        intake.refresh_from_db()
        self.assertEqual(intake.status, "submitted")
        self.assertEqual(
            AuditEvent.objects.filter(
                user=self.user,
                action="update",
                resource_type="medical_intake",
                resource_id=str(intake.id),
            ).count(),
            1,
        )

    def test_rejects_false_acknowledgments(self):
        response = self.client.post(
            reverse("consent-me"),
            valid_consent_payload(telehealth_consent=False),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_accepts_dynamic_legal_consent_without_eligibility_consents(self):
        # No pre-signup consents at eligibility; the patient instead accepted a
        # legal_consent field during the dynamic intake.
        EligibilityResponse.objects.filter(user=self.user).update(
            pre_signup_consents={}
        )
        questionnaire = Questionnaire.objects.create(
            slug="intake",
            title="Intake",
            questionnaire_type=Questionnaire.QuestionnaireType.INTAKE,
        )
        version = QuestionnaireVersion.objects.create(
            questionnaire=questionnaire,
            version_label="1.0.0",
            status=QuestionnaireVersion.Status.PUBLISHED,
        )
        step = QuestionnaireStep.objects.create(
            version=version, step_key="legal", sort_order=0, title="Legal"
        )
        QuestionnaireField.objects.create(
            step=step,
            field_key="legal_consent",
            field_type=QuestionnaireField.FieldType.LEGAL_CONSENT,
            label="Legal agreements",
            required=True,
            maps_to_section="beluga:consentsSigned",
        )
        MedicalIntake.objects.create(
            user=self.user,
            status="draft",
            questionnaire_version_id=version.id,
            questionnaire_responses={"legal_consent": True},
        )
        response = self.client.post(
            reverse("consent-me"), valid_consent_payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.content)

    def test_rejects_when_no_consents_anywhere(self):
        EligibilityResponse.objects.filter(user=self.user).update(
            pre_signup_consents={}
        )
        response = self.client.post(
            reverse("consent-me"), valid_consent_payload(), format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rejects_malicious_signature(self):
        for payload in STRICT_FIELD_ATTACKS:
            if payload == "admin'--":
                continue
            with self.subTest(payload=payload):
                response = self.client.post(
                    reverse("consent-me"),
                    valid_consent_payload(typed_signature=payload),
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
