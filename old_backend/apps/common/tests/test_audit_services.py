from datetime import timedelta

from django.test import RequestFactory, TestCase
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditEvent
from apps.audit.services import READ_DEDUPE_SECONDS, log_audit_event


class AuditReadDedupeTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="audit@example.com",
            password="secure-pass-1",
            first_name="Audit",
            last_name="User",
            phone="3035550100",
        )
        self.factory = RequestFactory()
        self.request = self.factory.get("/")
        self.request.META["REMOTE_ADDR"] = "203.0.113.10"

    def _log_read(self, *, user=None, resource_id="res-1", request=None):
        log_audit_event(
            user=user,
            action="read",
            resource_type="eligibility",
            resource_id=resource_id,
            request=request if request is not None else self.request,
        )

    def test_first_read_creates_row(self):
        self._log_read(user=self.user)
        self.assertEqual(AuditEvent.objects.count(), 1)

    def test_duplicate_read_within_window_is_skipped(self):
        self._log_read(user=self.user)
        self._log_read(user=self.user)
        self.assertEqual(AuditEvent.objects.count(), 1)

    def test_same_read_after_window_creates_new_row(self):
        self._log_read(user=self.user)
        event = AuditEvent.objects.get()
        AuditEvent.objects.filter(pk=event.pk).update(
            created_at=timezone.now() - timedelta(seconds=READ_DEDUPE_SECONDS + 1)
        )
        self._log_read(user=self.user)
        self.assertEqual(AuditEvent.objects.count(), 2)

    def test_reads_of_different_resources_both_logged(self):
        self._log_read(user=self.user, resource_id="res-1")
        self._log_read(user=self.user, resource_id="res-2")
        self.assertEqual(AuditEvent.objects.count(), 2)

    def test_anonymous_read_dedupe_respects_ip(self):
        req_a = self.factory.get("/")
        req_a.META["REMOTE_ADDR"] = "203.0.113.1"
        req_b = self.factory.get("/")
        req_b.META["REMOTE_ADDR"] = "203.0.113.2"

        self._log_read(user=None, request=req_a)
        self._log_read(user=None, request=req_a)
        self._log_read(user=None, request=req_b)

        self.assertEqual(AuditEvent.objects.count(), 2)

    def test_writes_are_never_deduped(self):
        log_audit_event(
            user=self.user,
            action="update",
            resource_type="eligibility",
            resource_id="res-1",
            request=self.request,
        )
        log_audit_event(
            user=self.user,
            action="update",
            resource_type="eligibility",
            resource_id="res-1",
            request=self.request,
        )
        self.assertEqual(AuditEvent.objects.count(), 2)

    def test_update_after_read_is_always_logged(self):
        self._log_read(user=self.user)
        log_audit_event(
            user=self.user,
            action="update",
            resource_type="eligibility",
            resource_id="res-1",
            request=self.request,
        )
        self.assertEqual(AuditEvent.objects.count(), 2)
