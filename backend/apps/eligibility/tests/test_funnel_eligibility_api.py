from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.common.validation.payloads import SQL_INJECTION
from apps.eligibility.models import EligibilityResponse, FunnelSession
from apps.eligibility.serializers import EligibilitySerializer
from apps.questionnaires.models import Questionnaire, QuestionnaireVersion


class FunnelEligibilityApiValidationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        response = self.client.post(reverse("funnel-session"))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.client.cookies.load(response.cookies)

    def test_patch_valid_body_metrics(self):
        response = self.client.patch(
            reverse("funnel-eligibility"),
            {"height_ft": 5, "height_in": 8, "weight_lbs": "190.0", "goal_weight_lbs": "160.0"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_rejects_sql_injection_in_weight(self):
        for payload in SQL_INJECTION:
            with self.subTest(payload=payload):
                response = self.client.patch(
                    reverse("funnel-eligibility"),
                    {"weight_lbs": payload},
                    format="json",
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_gender_identity(self):
        response = self.client.patch(
            reverse("funnel-eligibility"),
            {
                "sex_assigned_at_birth": "male",
                "gender_identity": "female",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["gender_identity"], "female")


class EligibilityVersionRepinTests(TestCase):
    def setUp(self):
        self.qualify = Questionnaire.objects.create(
            slug="qualify",
            title="Qualify",
            questionnaire_type=Questionnaire.QuestionnaireType.QUALIFY,
        )
        self.v1 = QuestionnaireVersion.objects.create(
            questionnaire=self.qualify, version_label="1.0.0"
        )
        self.v2 = QuestionnaireVersion.objects.create(
            questionnaire=self.qualify, version_label="2.0.0"
        )
        self.session = FunnelSession.objects.create(
            token_hash="x" * 64,
            expires_at=timezone.now() + timedelta(days=30),
            qualify_questionnaire_version_id=self.v1.id,
        )

    def _eligibility(self, **kwargs):
        return EligibilityResponse.objects.create(
            funnel_session=self.session,
            questionnaire_version_id=self.v1.id,
            **kwargs,
        )

    def test_repin_allowed_before_any_answers(self):
        instance = self._eligibility()
        serializer = EligibilitySerializer(
            instance,
            data={"questionnaire_version_id": str(self.v2.id)},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_repin_rejected_after_answers_exist_on_live_version(self):
        # Old version still published → a true mid-flow change is blocked.
        self.v1.status = QuestionnaireVersion.Status.PUBLISHED
        self.v1.save(update_fields=["status"])
        instance = self._eligibility(
            questionnaire_responses={"treatment_interest": "glp1"}
        )
        serializer = EligibilitySerializer(
            instance,
            data={"questionnaire_version_id": str(self.v2.id)},
            partial=True,
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("questionnaire_version_id", serializer.errors)

    def test_repin_allowed_when_old_version_archived_with_answers(self):
        # Old version archived → re-pin allowed and stale answers dropped.
        self.v1.status = QuestionnaireVersion.Status.ARCHIVED
        self.v1.save(update_fields=["status"])
        instance = self._eligibility(
            questionnaire_responses={"treatment_interest": "glp1"}
        )
        serializer = EligibilitySerializer(
            instance,
            data={"questionnaire_version_id": str(self.v2.id)},
            partial=True,
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

    def test_get_reconciles_pin_when_pinned_version_archived(self):
        # GET /api/funnel/eligibility/ re-pins a session whose version was
        # archived to the current published version and clears stale answers.
        from apps.eligibility.services import COOKIE_NAME, hash_token

        self.v2.status = QuestionnaireVersion.Status.PUBLISHED
        self.v2.published_at = timezone.now()
        self.v2.is_default_entry = True
        self.v2.save(update_fields=["status", "published_at", "is_default_entry"])
        self.v1.status = QuestionnaireVersion.Status.ARCHIVED
        self.v1.save(update_fields=["status"])
        self._eligibility(questionnaire_responses={"treatment_interest": "glp1"})

        self.session.token_hash = hash_token("rebind-token")
        self.session.save(update_fields=["token_hash"])
        client = APIClient()
        client.cookies[COOKIE_NAME] = "rebind-token"

        response = client.get(reverse("funnel-eligibility"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["questionnaire_version_id"], str(self.v2.id))
        self.assertEqual(body["questionnaire_responses"], {})
