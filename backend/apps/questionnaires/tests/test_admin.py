from django.contrib import admin
from django.contrib.admin.sites import site
from django.test import RequestFactory, TestCase
from django.urls import reverse

from apps.accounts.models import User
from apps.audit.models import AuditEvent
from apps.questionnaires import services
from apps.questionnaires.admin import QuestionnaireVersionAdmin
from apps.questionnaires.models import Layout, Questionnaire, QuestionnaireVersion, Submission, SubmissionFile

from .support import make_plans, publish_weight_loss


class AdminTests(TestCase):
    def setUp(self):
        self.version = publish_weight_loss()
        self.admin_user = User.objects.create_superuser("admin@example.com", "S0me-long-passw0rd!")
        self.client.force_login(self.admin_user)
        self.model_admin = QuestionnaireVersionAdmin(QuestionnaireVersion, site)
        self.request = RequestFactory().get("/")
        self.request.user = self.admin_user

    def test_every_model_is_registered(self):
        for model in (Questionnaire, QuestionnaireVersion, Layout, Submission, SubmissionFile):
            self.assertIn(model, admin.site._registry)

    def test_changelists_render(self):
        sub, _ = services.start("weight_loss")
        for model in ("questionnaire", "questionnaireversion", "layout", "submission", "submissionfile"):
            response = self.client.get(reverse(f"admin:questionnaires_{model}_changelist"))
            self.assertEqual(response.status_code, 200, model)

    def test_published_version_definition_is_read_only(self):
        readonly = self.model_admin.get_readonly_fields(self.request, self.version)
        for field in ("definition", "version_label", "questionnaire", "layout", "status", "definition_hash"):
            self.assertIn(field, readonly)
        draft = services.duplicate_version(self.version)
        self.assertNotIn("definition", self.model_admin.get_readonly_fields(self.request, draft))
        self.assertIn("definition", self.model_admin.get_fields(self.request, draft))
        self.assertNotIn("definition", self.model_admin.get_fields(self.request, self.version))

    def test_pretty_json_is_displayed(self):
        response = self.client.get(reverse("admin:questionnaires_questionnaireversion_change", args=[self.version.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "motivation")
        self.assertContains(response, "<pre")

    def test_only_drafts_can_be_deleted(self):
        draft = services.duplicate_version(self.version)
        self.assertFalse(self.model_admin.has_delete_permission(self.request, self.version))
        self.assertTrue(self.model_admin.has_delete_permission(self.request, draft))

    def test_duplicate_action_creates_draft(self):
        self.client.post(
            reverse("admin:questionnaires_questionnaireversion_changelist"),
            {"action": "duplicate_as_draft", "_selected_action": [str(self.version.pk)]},
        )
        self.assertEqual(QuestionnaireVersion.objects.filter(status="draft").count(), 1)

    def test_publish_action_publishes_valid_and_reports_invalid(self):
        good = services.duplicate_version(self.version)
        bad = services.duplicate_version(self.version)
        bad.definition = {"start": "x", "nodes": {}}
        bad.save()
        response = self.client.post(
            reverse("admin:questionnaires_questionnaireversion_changelist"),
            {"action": "publish_drafts", "_selected_action": [str(good.pk), str(bad.pk)]},
            follow=True,
        )
        good.refresh_from_db()
        bad.refresh_from_db()
        self.assertEqual((good.status, bad.status), ("published", "draft"))
        self.assertContains(response, "Published")

    def test_submission_change_view_is_audited_and_shows_answers(self):
        make_plans()
        sub, _ = services.start("weight_loss")
        sub = services.answer(sub, "motivation", "doctor")
        response = self.client.get(reverse("admin:questionnaires_submission_change", args=[sub.pk]))
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, "doctor")
        event = AuditEvent.objects.get(action="read", object_id=str(sub.pk))
        self.assertEqual(event.object_type, "questionnaires.submission")
        self.assertNotIn("doctor", str(event.metadata))
