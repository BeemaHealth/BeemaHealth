from datetime import timedelta

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.accounts import auth_service
from apps.accounts.models import MagicLinkToken, User


class MagicLinkTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("p@example.com")

    def test_token_and_code_stored_hashed(self):
        token, code = auth_service.issue_token(self.user)
        rec = MagicLinkToken.objects.get()
        self.assertNotIn(token, rec.token_hash)
        self.assertNotEqual(rec.code_hash, code)
        self.assertEqual(len(code), 6)

    def test_token_single_use(self):
        token, _ = auth_service.issue_token(self.user)
        self.assertEqual(auth_service.consume_token(token), self.user)
        self.assertIsNone(auth_service.consume_token(token))

    def test_code_single_use(self):
        _, code = auth_service.issue_token(self.user)
        self.assertEqual(auth_service.consume_code("P@example.com", code), self.user)
        self.assertIsNone(auth_service.consume_code("p@example.com", code))

    def test_token_expiry(self):
        token, code = auth_service.issue_token(self.user)
        MagicLinkToken.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertIsNone(auth_service.consume_token(token))
        self.assertIsNone(auth_service.consume_code("p@example.com", code))

    def test_new_token_supersedes_old(self):
        old, old_code = auth_service.issue_token(self.user)
        new, _ = auth_service.issue_token(self.user)
        self.assertIsNone(auth_service.consume_token(old))
        self.assertIsNone(auth_service.consume_code("p@example.com", old_code))
        self.assertEqual(auth_service.consume_token(new), self.user)

    def test_unknown_token_and_garbage(self):
        for bad in ["", "nope", "a" * 5000, "' OR 1=1 --"]:
            self.assertIsNone(auth_service.consume_token(bad))

    def test_success_verifies_email_and_resets_counters(self):
        self.user.failed_login_count = 3
        self.user.save()
        token, _ = auth_service.issue_token(self.user)
        auth_service.consume_token(token, ip="1.2.3.4")
        self.user.refresh_from_db()
        self.assertIsNotNone(self.user.email_verified_at)
        self.assertEqual(self.user.failed_login_count, 0)
        self.assertEqual(self.user.last_login_ip, "1.2.3.4")

    def test_inactive_user_cannot_use_token(self):
        token, code = auth_service.issue_token(self.user)
        User.objects.filter(pk=self.user.pk).update(is_active=False)
        self.assertIsNone(auth_service.consume_token(token))
        self.assertIsNone(auth_service.consume_code("p@example.com", code))

    def test_other_users_code_does_not_work(self):
        other = User.objects.create_user("o@example.com")
        _, code_other = auth_service.issue_token(other)
        auth_service.issue_token(self.user)
        self.assertIsNone(auth_service.consume_code("p@example.com", code_other))


class LockoutTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("p@example.com")

    def test_lockout_after_repeated_failures_blocks_correct_code(self):
        _, code = auth_service.issue_token(self.user)
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(5):
            self.assertIsNone(auth_service.consume_code("p@example.com", wrong))
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_locked)
        self.assertIsNone(auth_service.consume_code("p@example.com", code))

    def test_locked_user_token_rejected_and_no_new_link(self):
        token, _ = auth_service.issue_token(self.user)
        self.user.locked_until = timezone.now() + timedelta(minutes=5)
        self.user.save()
        self.assertIsNone(auth_service.consume_token(token))
        auth_service.request_login("p@example.com")
        self.assertEqual(len(mail.outbox), 0)

    def test_lock_expires(self):
        _, code = auth_service.issue_token(self.user)
        self.user.locked_until = timezone.now() - timedelta(seconds=1)
        self.user.save()
        self.assertEqual(auth_service.consume_code("p@example.com", code), self.user)

    def test_attempt_cap_burns_code(self):
        _, code = auth_service.issue_token(self.user)
        wrong = "000000" if code != "000000" else "111111"
        with override_settings(LOGIN_LOCKOUT_THRESHOLD=100):
            for _ in range(5):
                auth_service.consume_code("p@example.com", wrong)
            self.assertIsNone(auth_service.consume_code("p@example.com", code))

    def test_unknown_email_code_is_none(self):
        self.assertIsNone(auth_service.consume_code("ghost@example.com", "123456"))


class RequestLoginTests(TestCase):
    def test_creates_patient_and_sends_email(self):
        auth_service.request_login("New@Example.com")
        user = User.objects.get(email="new@example.com")
        self.assertEqual(user.kind, User.Kind.PATIENT)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["new@example.com"])
        self.assertIn("/portal/login/verify?token=", mail.outbox[0].body)

    def test_inactive_gets_nothing(self):
        User.objects.create_user("x@example.com", is_active=False)
        auth_service.request_login("x@example.com")
        self.assertEqual(len(mail.outbox), 0)

    def test_delivery_failure_is_swallowed(self):
        with override_settings(EMAIL_BACKEND="apps.accounts.tests.test_auth_service.BrokenBackend"):
            with self.assertLogs("apps.accounts.auth_service", level="ERROR") as logs:
                auth_service.request_login("fail@example.com")
        self.assertNotIn("fail@example.com", "".join(logs.output))


from django.core.mail.backends.base import BaseEmailBackend  # noqa: E402


class BrokenBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        raise RuntimeError("smtp down")
