from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
import uuid

from apps.analytics.models import FunnelEvent, LandingPage
from apps.analytics.services import (
    dropoff_rates,
    funnel_step_counts,
    questionnaire_step_analytics,
    landing_page_views_by_day,
    page_views_by_day,
)
from apps.analytics.validation import sanitize_event_properties, validate_event_name
from apps.eligibility.services import create_funnel_session
from apps.questionnaires.models import Questionnaire, QuestionnaireField, QuestionnaireStep, QuestionnaireVersion

User = get_user_model()


class AnalyticsValidationTests(TestCase):
    def test_valid_event_name(self):
        self.assertEqual(validate_event_name("step_viewed"), "step_viewed")

    def test_invalid_event_name_rejected(self):
        with self.assertRaises(ValueError):
            validate_event_name("patient_name_logged")

    def test_phi_property_key_rejected(self):
        with self.assertRaises(ValueError):
            sanitize_event_properties({"email": "test@example.com"})

    def test_allowed_properties_pass(self):
        props = sanitize_event_properties({"duration_ms": 1200, "step_index": 2})
        self.assertEqual(props["duration_ms"], 1200)


class AnalyticsEventApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_step_viewed_empty_step_key_rejected(self):
        response = self.client.post(
            reverse("analytics-events"),
            {"event_name": "step_viewed", "questionnaire_slug": "qualify", "step_key": ""},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_step_viewed_whitespace_only_step_key_rejected(self):
        response = self.client.post(
            reverse("analytics-events"),
            {"event_name": "step_viewed", "questionnaire_slug": "qualify", "step_key": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_step_key_stored_stripped(self):
        """Whitespace-padded step_key is normalized before storage."""
        response = self.client.post(
            reverse("analytics-events"),
            {"event_name": "step_viewed", "questionnaire_slug": "qualify", "step_key": "  review  "},
            format="json",
            REMOTE_ADDR="203.0.113.1",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        event = FunnelEvent.objects.get(id=response.json()["id"])
        self.assertEqual(event.step_key, "review")

    def test_step_key_whitespace_variants_dedup(self):
        """Same step with different whitespace padding collapses to one event."""
        first = self.client.post(
            reverse("analytics-events"),
            {"event_name": "step_viewed", "questionnaire_slug": "qualify", "step_key": "review"},
            format="json",
            REMOTE_ADDR="203.0.113.1",
        )
        second = self.client.post(
            reverse("analytics-events"),
            {"event_name": "step_viewed", "questionnaire_slug": "qualify", "step_key": "  review  "},
            format="json",
            REMOTE_ADDR="203.0.113.1",
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(FunnelEvent.objects.count(), 1)

    def test_anonymous_same_client_dedups_double_fire(self):
        """Same anonymous client double-firing within 1s collapses to one event."""
        payload = {"event_name": "page_viewed", "properties": {"page": "home"}}
        first = self.client.post(
            reverse("analytics-events"), payload, format="json", REMOTE_ADDR="203.0.113.1"
        )
        second = self.client.post(
            reverse("analytics-events"), payload, format="json", REMOTE_ADDR="203.0.113.1"
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(FunnelEvent.objects.count(), 1)

    def test_anonymous_different_clients_not_deduped(self):
        """Two different anonymous clients firing the same event must NOT collapse."""
        payload = {"event_name": "page_viewed", "properties": {"page": "home"}}
        first = self.client.post(
            reverse("analytics-events"), payload, format="json", REMOTE_ADDR="203.0.113.1"
        )
        second = self.client.post(
            reverse("analytics-events"), payload, format="json", REMOTE_ADDR="203.0.113.2"
        )
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(first.json()["id"], second.json()["id"])
        self.assertEqual(FunnelEvent.objects.count(), 2)


class AnalyticsServicesTests(TestCase):
    def test_funnel_step_counts_ignores_empty_step_key(self):
        session, _token = create_funnel_session(
            type("R", (), {"META": {}})(),
        )
        now = timezone.now()
        FunnelEvent.objects.create(
            event_name="step_viewed",
            funnel_session=session,
            questionnaire_slug="qualify",
            step_key="",
            created_at=now,
        )
        FunnelEvent.objects.create(
            event_name="step_viewed",
            funnel_session=session,
            questionnaire_slug="qualify",
            step_key="review",
            properties={"step_index": 10},
            created_at=now,
        )
        steps = funnel_step_counts(questionnaire_slug="qualify")
        step_keys = [row["step_key"] for row in steps]
        self.assertEqual(step_keys, ["review"])
        self.assertNotIn("", step_keys)

    def test_funnel_step_counts_by_version_id_ignores_slug_mismatch(self):
        """Dynamic flows may log legacy type slugs while staff views use canonical slug."""
        session, _token = create_funnel_session(
            type("R", (), {"META": {}})(),
        )
        version_id = uuid.uuid4()
        now = timezone.now()
        FunnelEvent.objects.create(
            event_name="step_viewed",
            funnel_session=session,
            questionnaire_slug="qualify",
            questionnaire_version_id=version_id,
            step_key="drugs",
            properties={"step_index": 0},
            created_at=now,
        )
        FunnelEvent.objects.create(
            event_name="step_completed",
            funnel_session=session,
            questionnaire_slug="qualify",
            questionnaire_version_id=version_id,
            step_key="drugs",
            properties={"step_index": 0},
            created_at=now,
        )
        steps = funnel_step_counts(
            questionnaire_slug="default_weight_loss_mvp_questionnaire",
            version_id=str(version_id),
        )
        self.assertEqual(len(steps), 1)
        self.assertEqual(steps[0]["step_key"], "drugs")
        self.assertEqual(steps[0]["views"], 1)
        self.assertEqual(steps[0]["completions"], 1)

        dropoff = dropoff_rates(
            questionnaire_slug="default_weight_loss_mvp_questionnaire",
            version_id=str(version_id),
        )
        self.assertEqual(dropoff[0]["dropoff_percent"], 0.0)

    def test_questionnaire_step_analytics_counts_actual_edge_transitions(self):
        questionnaire = Questionnaire.objects.create(
            slug="default_weight_loss_mvp_questionnaire",
            title="Weight loss",
        )
        version = QuestionnaireVersion.objects.create(
            questionnaire=questionnaire,
            version_label="v1.0.1",
            status=QuestionnaireVersion.Status.PUBLISHED,
        )
        QuestionnaireStep.objects.create(
            version=version,
            step_key="step_3",
            title="Injection type",
            sort_order=0,
        )
        QuestionnaireStep.objects.create(
            version=version,
            step_key="step_5",
            title="Compounding type",
            sort_order=1,
        )
        QuestionnaireStep.objects.create(
            version=version,
            step_key="step_4",
            title="Account",
            sort_order=2,
        )

        session_a, _ = create_funnel_session(type("R", (), {"META": {}})())
        session_b, _ = create_funnel_session(type("R", (), {"META": {}})())

        # Both participants reached step_4, but only one arrived from step_5.
        FunnelEvent.objects.create(
            event_name="step_viewed",
            funnel_session=session_a,
            questionnaire_slug="qualify",
            questionnaire_version_id=version.id,
            step_key="step_5",
        )
        FunnelEvent.objects.create(
            event_name="step_viewed",
            funnel_session=session_a,
            questionnaire_slug="qualify",
            questionnaire_version_id=version.id,
            step_key="step_4",
        )
        FunnelEvent.objects.create(
            event_name="step_viewed",
            funnel_session=session_b,
            questionnaire_slug="qualify",
            questionnaire_version_id=version.id,
            step_key="step_3",
        )
        FunnelEvent.objects.create(
            event_name="step_viewed",
            funnel_session=session_b,
            questionnaire_slug="qualify",
            questionnaire_version_id=version.id,
            step_key="step_4",
        )

        data = questionnaire_step_analytics(version_id=str(version.id))
        self.assertIsNotNone(data)
        transitions = {
            (row["source_step_key"], row["target_step_key"]): row["count"]
            for row in data["edge_transitions"]
        }
        self.assertEqual(transitions[("step_5", "step_4")], 1)
        self.assertEqual(transitions[("step_3", "step_4")], 1)


class StepAnalyticsPHITests(TestCase):
    """PHI field types must never expose individual response values in distributions."""

    def setUp(self):
        questionnaire = Questionnaire.objects.create(
            slug="qualify",
            title="Qualify",
        )
        self.version = QuestionnaireVersion.objects.create(
            questionnaire=questionnaire,
            version_label="v1",
            status=QuestionnaireVersion.Status.PUBLISHED,
        )
        self.step = QuestionnaireStep.objects.create(
            version=self.version,
            step_key="personal_info",
            title="Personal info",
            sort_order=0,
        )

    def _add_field(self, field_key, field_type):
        return QuestionnaireField.objects.create(
            step=self.step,
            field_key=field_key,
            field_type=field_type,
            label=field_key,
            sort_order=0,
        )

    def _responses_with(self, **kwargs):
        from apps.eligibility.models import EligibilityResponse
        EligibilityResponse.objects.create(
            questionnaire_version_id=self.version.id,
            questionnaire_responses=kwargs,
        )

    def test_email_field_distribution_is_blank(self):
        self._add_field("email_address", "email")
        self._responses_with(email_address="patient@example.com")
        data = questionnaire_step_analytics(version_id=str(self.version.id))
        field = next(f for f in data["steps"][0]["fields"] if f["field_key"] == "email_address")
        self.assertEqual(field["total_answers"], 1)
        self.assertEqual(field["answer_distribution"], [])

    def test_phone_field_distribution_is_blank(self):
        self._add_field("phone_number", "phone")
        self._responses_with(phone_number="5551234567")
        data = questionnaire_step_analytics(version_id=str(self.version.id))
        field = next(f for f in data["steps"][0]["fields"] if f["field_key"] == "phone_number")
        self.assertEqual(field["total_answers"], 1)
        self.assertEqual(field["answer_distribution"], [])

    def test_dob_field_distribution_is_blank(self):
        self._add_field("date_of_birth", "dob")
        self._responses_with(date_of_birth="1985-04-12")
        data = questionnaire_step_analytics(version_id=str(self.version.id))
        field = next(f for f in data["steps"][0]["fields"] if f["field_key"] == "date_of_birth")
        self.assertEqual(field["total_answers"], 1)
        self.assertEqual(field["answer_distribution"], [])

    def test_review_field_excluded_entirely(self):
        self._add_field("confirm", "review")
        self._add_field("goal", "yes_no")
        self._responses_with(confirm="reviewed", goal="yes")
        data = questionnaire_step_analytics(version_id=str(self.version.id))
        field_keys = [f["field_key"] for f in data["steps"][0]["fields"]]
        self.assertNotIn("confirm", field_keys)
        self.assertIn("goal", field_keys)

    def test_choice_field_distribution_is_preserved(self):
        field = self._add_field("treatment", "single_choice")
        field.options = [
            {"value": "glp1", "label": "GLP-1"},
            {"value": "other", "label": "Other"},
        ]
        field.save()
        self._responses_with(treatment="glp1")
        self._responses_with(treatment="glp1")
        data = questionnaire_step_analytics(version_id=str(self.version.id))
        f = next(f for f in data["steps"][0]["fields"] if f["field_key"] == "treatment")
        self.assertEqual(f["total_answers"], 2)
        self.assertTrue(len(f["answer_distribution"]) > 0)
        glp1 = next(d for d in f["answer_distribution"] if d["value"] == "glp1")
        self.assertEqual(glp1["count"], 2)


class PageViewsAggregationTests(TestCase):
    def setUp(self):
        self.now = timezone.now()

    def _page_view(self, *, page: str, landing_page_slug: str = ""):
        props = {"page": page}
        if landing_page_slug:
            props["landing_page_slug"] = landing_page_slug
        FunnelEvent.objects.create(
            event_name="page_viewed",
            properties=props,
            created_at=self.now,
        )

    def test_page_views_exclude_landing_pages(self):
        self._page_view(page="home")
        self._page_view(page="pricing")
        self._page_view(page="landing_page", landing_page_slug="fb-test")

        rows = page_views_by_day()
        pages = {row["page"]: row["count"] for row in rows}
        self.assertEqual(pages, {"home": 1, "pricing": 1})
        self.assertNotIn("lp:fb-test", pages)
        self.assertNotIn("landing_page", pages)

    def test_landing_page_views_resolve_internal_name(self):
        LandingPage.objects.create(
            slug="fb-test",
            name="Facebook Test",
            headline="Test",
        )
        self._page_view(page="landing_page", landing_page_slug="fb-test")
        self._page_view(page="landing_page", landing_page_slug="fb-test")

        rows = landing_page_views_by_day()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["slug"], "fb-test")
        self.assertEqual(rows[0]["name"], "Facebook Test")
        self.assertEqual(rows[0]["count"], 2)

    def test_deleted_landing_page_falls_back_to_slug(self):
        self._page_view(page="landing_page", landing_page_slug="old-campaign")

        rows = landing_page_views_by_day()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["slug"], "old-campaign")
        self.assertEqual(rows[0]["name"], "old-campaign")

    def test_legacy_lp_page_key_still_counted_as_landing_page(self):
        LandingPage.objects.create(slug="fb-test", name="Facebook Test")
        FunnelEvent.objects.create(
            event_name="page_viewed",
            properties={"page": "lp:fb-test"},
            created_at=self.now,
        )

        lp_rows = landing_page_views_by_day()
        page_rows = page_views_by_day()
        self.assertEqual(lp_rows[0]["name"], "Facebook Test")
        self.assertEqual(lp_rows[0]["count"], 1)
        self.assertEqual(page_rows, [])


class StaffPageViewsApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.staff = User.objects.create_user(
            email="staff@example.com",
            password="securepass123",
            is_staff=True,
            is_patient=False,
        )
        self.now = timezone.now()
        LandingPage.objects.create(slug="fb-test", name="Facebook Test")
        FunnelEvent.objects.create(
            event_name="page_viewed",
            properties={"page": "home"},
            created_at=self.now,
        )
        FunnelEvent.objects.create(
            event_name="page_viewed",
            properties={"page": "landing_page", "landing_page_slug": "fb-test"},
            created_at=self.now,
        )

    def test_staff_page_views_endpoint_splits_landing_pages(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(reverse("staff-analytics-page-views"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(
            {row["page"]: row["count"] for row in data["page_views"]},
            {"home": 1},
        )
        self.assertEqual(len(data["landing_page_views"]), 1)
        self.assertEqual(data["landing_page_views"][0]["slug"], "fb-test")
        self.assertEqual(data["landing_page_views"][0]["name"], "Facebook Test")
        self.assertEqual(data["landing_page_views"][0]["count"], 1)
