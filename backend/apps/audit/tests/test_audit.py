import uuid
from io import StringIO

from django.contrib.admin.sites import site
from django.core.management import call_command
from django.test import RequestFactory, TestCase
from rest_framework.test import APIClient

from apps.accounts.tests.helpers import make_patient, make_staff
from apps.audit.models import AuditEvent, AuditImmutableError
from apps.audit.services import log
from apps.patients.models import Allergy


class AuditServiceTests(TestCase):
    def setUp(self):
        self.user = make_patient("who@example.com")
        self.profile = self.user.patient_profile

    def test_log_with_request_and_object(self):
        req = RequestFactory().get("/", REMOTE_ADDR="5.6.7.8")
        req.user = self.user
        ev = log(req, "read", self.profile, reason="support ticket", metadata={"surface": "api"})
        self.assertEqual(ev.actor, self.user)
        self.assertEqual(ev.actor_label, f"user:{self.user.pk}")
        self.assertEqual(ev.object_type, "patients.patientprofile")
        self.assertEqual(ev.object_id, str(self.profile.pk))
        self.assertEqual(ev.patient_id, self.profile.pk)
        self.assertEqual(ev.ip, "5.6.7.8")
        self.assertNotIn("who@example.com", ev.actor_label)

    def test_patient_id_from_child_object(self):
        allergy = Allergy.objects.create(patient=self.profile, name="x")
        self.assertEqual(log(None, "read", allergy).patient_id, self.profile.pk)

    def test_system_and_anonymous_labels(self):
        self.assertEqual(log(None, "webhook").actor_label, "system")
        req = RequestFactory().get("/")
        from django.contrib.auth.models import AnonymousUser

        req.user = AnonymousUser()
        ev = log(req, "login")
        self.assertEqual((ev.actor_label, ev.actor), ("anonymous", None))

    def test_explicit_actor_and_patient_id(self):
        pid = uuid.uuid4()
        ev = log(None, "break_glass", actor=self.user, patient_id=pid, reason="r" * 900)
        self.assertEqual((ev.actor, ev.patient_id, len(ev.reason)), (self.user, pid, 500))

    def test_metadata_phi_keys_redacted(self):
        ev = log(None, "update", metadata={"email": "a@b.com", "patient_name": "Jane", "answers": {"x": 1}, "count": 3, "fields": ["a"]})
        self.assertEqual(ev.metadata["email"], "[redacted]")
        self.assertEqual(ev.metadata["patient_name"], "[redacted]")
        self.assertEqual(ev.metadata["answers"], "[redacted]")
        self.assertEqual(ev.metadata["count"], 3)

    def test_str_has_no_phi(self):
        self.assertNotIn("who@example.com", str(log(None, "read", self.profile)))


class AppendOnlyTests(TestCase):
    def setUp(self):
        self.ev = log(None, "read")

    def test_save_update_blocked(self):
        self.ev.reason = "tamper"
        with self.assertRaises(AuditImmutableError):
            self.ev.save()
        self.assertEqual(AuditEvent.objects.get().reason, "")

    def test_delete_blocked(self):
        with self.assertRaises(AuditImmutableError):
            self.ev.delete()

    def test_queryset_update_delete_blocked(self):
        with self.assertRaises(AuditImmutableError):
            AuditEvent.objects.update(reason="x")
        with self.assertRaises(AuditImmutableError):
            AuditEvent.objects.all().delete()
        self.assertEqual(AuditEvent.objects.count(), 1)

    def test_deleting_actor_keeps_events(self):
        user = make_patient()
        log(None, "login", actor=user)
        user.delete()
        self.assertEqual(AuditEvent.objects.count(), 2)

    def test_admin_is_read_only(self):
        admin = site._registry[AuditEvent]
        req = RequestFactory().get("/")
        req.user = make_staff()
        self.assertFalse(admin.has_add_permission(req))
        self.assertFalse(admin.has_change_permission(req, self.ev))
        self.assertFalse(admin.has_delete_permission(req, self.ev))
        self.assertIn("reason", admin.readonly_fields)


class AdminReadAuditTests(TestCase):
    def test_opening_patient_in_admin_logs_read(self):
        from django.contrib.auth import get_user_model

        root = get_user_model().objects.create_superuser("root@example.com", "a-long-password-1")
        profile = make_patient().patient_profile
        c = self.client
        c.force_login(root)
        r = c.get(f"/admin/patients/patientprofile/{profile.pk}/change/")
        self.assertEqual(r.status_code, 200)
        ev = AuditEvent.objects.get(action="read", object_id=str(profile.pk))
        self.assertEqual(ev.metadata, {"surface": "admin"})
        self.assertEqual(ev.actor, root)


class PruneCheckTests(TestCase):
    def test_reports_only(self):
        log(None, "read")
        out = StringIO()
        call_command("audit_prune_check", "--years", "0", stdout=out)
        self.assertIn("older_than_0y=1", out.getvalue())
        self.assertEqual(AuditEvent.objects.count(), 1)


class MixinTests(TestCase):
    def test_list_logs_single_event_with_count(self):
        user = make_patient()
        Allergy.objects.create(patient=user.patient_profile, name="a")
        Allergy.objects.create(patient=user.patient_profile, name="b")
        c = APIClient()
        c.force_authenticate(user)
        c.get("/api/v1/patients/allergies/")
        ev = AuditEvent.objects.get(action="read")
        self.assertEqual(ev.metadata["count"], 2)
        self.assertEqual(ev.metadata["object_type"], "patients.allergy")

    def test_update_and_delete_logged(self):
        user = make_patient()
        a = Allergy.objects.create(patient=user.patient_profile, name="a")
        c = APIClient()
        c.force_authenticate(user)
        c.patch(f"/api/v1/patients/allergies/{a.pk}/", {"name": "b"}, format="json")
        c.delete(f"/api/v1/patients/allergies/{a.pk}/")
        self.assertEqual(
            list(AuditEvent.objects.order_by("created_at").values_list("action", flat=True)), ["update", "delete"]
        )
        self.assertEqual(AuditEvent.objects.first().patient_id, user.patient_profile.pk)
