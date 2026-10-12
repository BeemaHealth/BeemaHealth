from unittest import mock

from django.contrib.auth.models import Permission
from django.test import TestCase

from apps.accounts.models import User
from apps.accounts.tests.helpers import make_staff
from apps.audit.models import AuditEvent
from apps.integrations.models import InboundEvent, OutboundCall

from .helpers import make_graph


def stored(**extra):
    defaults = dict(vendor="beluga", dedupe_key="k" * 64, event_type="DOCTOR_CHAT", external_ref="m", raw_payload={"content": "Jane's secret chat"})
    return InboundEvent.objects.create(**{**defaults, **extra})


class InboundEventAdminTests(TestCase):
    def setUp(self):
        self.root = User.objects.create_superuser("root@example.com", "a-long-password-1")
        self.event = stored()

    def url(self, name="change", *args):
        return f"/admin/integrations/inboundevent/{self.event.pk}/change/" if name == "change" else "/admin/integrations/inboundevent/"

    def test_superuser_sees_raw_payload(self):
        self.client.force_login(self.root)
        response = self.client.get(self.url())
        self.assertContains(response, "Jane&#x27;s secret chat")

    def test_non_superuser_staff_never_sees_raw_payload(self):
        staff = make_staff()
        staff.user_permissions.add(Permission.objects.get(codename="view_inboundevent"))
        self.client.force_login(staff)
        response = self.client.get(self.url())
        self.assertEqual(response.status_code, 200)
        self.assertNotContains(response, "secret chat")
        self.assertNotContains(response, "Raw payload")

    def test_changelist_filters_and_search(self):
        self.client.force_login(self.root)
        stored(dedupe_key="z" * 64, vendor="stripe", status="dead", event_type="payment_intent.succeeded", external_ref="pi_1")
        for query in ("", "?vendor=stripe", "?status=dead", "?event_type=DOCTOR_CHAT", "?q=pi_1"):
            with self.subTest(query=query):
                self.assertEqual(self.client.get(f"/admin/integrations/inboundevent/{query}").status_code, 200)
        response = self.client.get("/admin/integrations/inboundevent/?vendor=stripe")
        self.assertContains(response, "pi_1")
        self.assertNotContains(response, 'value="m"')
        self.assertNotContains(response, "secret chat")

    def test_read_only_no_add_edit_delete(self):
        self.client.force_login(self.root)
        self.assertEqual(self.client.get("/admin/integrations/inboundevent/add/").status_code, 403)
        self.assertEqual(self.client.post(self.url(), {"status": "processed"}).status_code, 403)
        self.assertEqual(self.client.post(f"/admin/integrations/inboundevent/{self.event.pk}/delete/").status_code, 403)

    def test_viewing_change_page_is_audit_logged(self):
        self.client.force_login(self.root)
        self.client.get(self.url())
        self.assertTrue(AuditEvent.objects.filter(action="read", object_id=str(self.event.pk)).exists())

    def test_replay_action_resets_and_reprocesses(self):
        self.event.status, self.event.attempts = "dead", 8
        self.event.save()
        self.client.force_login(self.root)
        with mock.patch("apps.integrations.admin.process", return_value=mock.Mock(status="processed")) as process:
            self.client.post("/admin/integrations/inboundevent/", {"action": "replay", "_selected_action": [str(self.event.pk)]})
        process.assert_called_once()
        self.event.refresh_from_db()
        self.assertEqual((self.event.status, self.event.attempts, self.event.last_error), ("received", 0, ""))
        self.assertTrue(AuditEvent.objects.filter(reason="replay").exists())

    def test_replay_skips_processed_events(self):
        self.event.status = "processed"
        self.event.save()
        self.client.force_login(self.root)
        with mock.patch("apps.integrations.admin.process") as process:
            self.client.post("/admin/integrations/inboundevent/", {"action": "replay", "_selected_action": [str(self.event.pk)]})
        process.assert_not_called()

    def test_replay_runs_the_real_pipeline(self):
        _, _, visit = make_graph()
        self.event.raw_payload = {"event": "SOMETHING_NEW", "masterId": visit.external_id}
        self.event.status = "failed"
        self.event.save()
        self.client.force_login(self.root)
        self.client.post("/admin/integrations/inboundevent/", {"action": "replay", "_selected_action": [str(self.event.pk)]})
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, "ignored")

    def test_mark_ignored_action(self):
        self.event.status = "dead"
        self.event.save()
        self.client.force_login(self.root)
        self.client.post("/admin/integrations/inboundevent/", {"action": "mark_ignored", "_selected_action": [str(self.event.pk)]})
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, "ignored")
        self.assertIsNotNone(self.event.processed_at)

    def test_actions_denied_without_change_permission(self):
        staff = make_staff()
        staff.user_permissions.add(Permission.objects.get(codename="view_inboundevent"))
        self.client.force_login(staff)
        self.client.post("/admin/integrations/inboundevent/", {"action": "mark_ignored", "_selected_action": [str(self.event.pk)]})
        self.event.refresh_from_db()
        self.assertEqual(self.event.status, "received")

    def test_str_has_no_phi(self):
        self.assertNotIn("secret", str(self.event))


class OutboundCallAdminTests(TestCase):
    def test_readonly_changelist_filters_and_detail(self):
        root = User.objects.create_superuser("root@example.com", "a-long-password-1")
        _, treatment, _ = make_graph()
        call = OutboundCall.objects.create(vendor="beluga", endpoint_name="create_visit", treatment=treatment, ok=True, request_summary={"masterId": "m"})
        self.client.force_login(root)
        for query in ("", "?vendor=beluga", "?ok__exact=1", "?q=create_visit"):
            self.assertEqual(self.client.get(f"/admin/integrations/outboundcall/{query}").status_code, 200)
        self.assertEqual(self.client.get(f"/admin/integrations/outboundcall/{call.pk}/change/").status_code, 200)
        self.assertEqual(self.client.get("/admin/integrations/outboundcall/add/").status_code, 403)
        self.assertEqual(self.client.post(f"/admin/integrations/outboundcall/{call.pk}/delete/").status_code, 403)
