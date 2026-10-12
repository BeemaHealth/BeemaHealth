import re

from django.core import mail
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.audit.models import AuditEvent
from apps.patients.models import PatientProfile

from .helpers import make_patient

BASE = "/api/v1/auth/"


def code_from_mail() -> str:
    return re.search(r"code to sign in to Beema Health: (\d{6})", mail.outbox[-1].body).group(1)


def token_from_mail() -> str:
    return re.search(r"token=([\w\-]+)", mail.outbox[-1].body).group(1)


class AuthApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_request_link_response_identical_for_known_and_unknown(self):
        make_patient("known@example.com")
        a = self.client.post(BASE + "request-link/", {"email": "known@example.com"}, format="json")
        b = self.client.post(BASE + "request-link/", {"email": "unknown@example.com"}, format="json")
        self.assertEqual(a.status_code, 202)
        self.assertEqual((a.status_code, a.json()), (b.status_code, b.json()))

    def test_request_link_inactive_same_response_no_email(self):
        User.objects.create_user("off@example.com", is_active=False)
        r = self.client.post(BASE + "request-link/", {"email": "off@example.com"}, format="json")
        self.assertEqual(r.status_code, 202)
        self.assertEqual(len(mail.outbox), 0)

    def test_request_link_rejects_invalid_email(self):
        r = self.client.post(BASE + "request-link/", {"email": "nope"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_full_code_login_creates_profile_and_session(self):
        self.client.post(BASE + "request-link/", {"email": "new@example.com"}, format="json")
        r = self.client.post(BASE + "verify/", {"email": "new@example.com", "code": code_from_mail()}, format="json")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["email"], "new@example.com")
        self.assertTrue(body["email_verified"])
        self.assertTrue(PatientProfile.objects.filter(user__email="new@example.com").exists())
        self.assertEqual(self.client.get(BASE + "me/").status_code, 200)
        self.assertTrue(AuditEvent.objects.filter(action="login").exists())
        self.assertTrue(self.client.cookies["sessionid"]["httponly"])

    def test_magic_link_login_single_use(self):
        self.client.post(BASE + "request-link/", {"email": "m@example.com"}, format="json")
        token = token_from_mail()
        self.assertEqual(self.client.post(BASE + "verify/", {"token": token}, format="json").status_code, 200)
        self.client.post(BASE + "logout/")
        r = self.client.post(BASE + "verify/", {"token": token}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_verify_failures_share_one_message(self):
        make_patient("real@example.com")
        self.client.post(BASE + "request-link/", {"email": "real@example.com"}, format="json")
        a = self.client.post(BASE + "verify/", {"email": "real@example.com", "code": "000000"}, format="json")
        b = self.client.post(BASE + "verify/", {"email": "ghost@example.com", "code": "000000"}, format="json")
        c = self.client.post(BASE + "verify/", {"token": "bad"}, format="json")
        self.assertEqual({a.status_code, b.status_code, c.status_code}, {400})
        self.assertEqual(a.json(), b.json())
        self.assertEqual(a.json(), c.json())

    def test_verify_validation(self):
        for payload in [{}, {"email": "a@example.com"}, {"email": "a@example.com", "code": "12"}, {"code": "123456"}]:
            self.assertEqual(self.client.post(BASE + "verify/", payload, format="json").status_code, 400)

    def test_lockout_through_api(self):
        self.client.post(BASE + "request-link/", {"email": "lock@example.com"}, format="json")
        code = code_from_mail()
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(5):
            self.client.post(BASE + "verify/", {"email": "lock@example.com", "code": wrong}, format="json")
        r = self.client.post(BASE + "verify/", {"email": "lock@example.com", "code": code}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertTrue(User.objects.get(email="lock@example.com").is_locked)

    def test_request_link_throttled_per_email(self):
        codes = [self.client.post(BASE + "request-link/", {"email": "t@example.com"}, format="json").status_code for _ in range(8)]
        self.assertEqual(codes[:6], [202] * 6)
        self.assertEqual(codes[6], 429)

    def test_csrf_enforced_on_anonymous_post(self):
        strict = APIClient(enforce_csrf_checks=True)
        r = strict.post(BASE + "request-link/", {"email": "a@example.com"}, format="json")
        self.assertEqual(r.status_code, 403)
        token = strict.get(BASE + "csrf/").json()["csrfToken"]
        r = strict.post(BASE + "request-link/", {"email": "a@example.com"}, format="json", HTTP_X_CSRFTOKEN=token)
        self.assertEqual(r.status_code, 202)

    def test_csrf_endpoint_sets_cookie(self):
        r = self.client.get(BASE + "csrf/")
        self.assertIn("csrftoken", r.cookies)

    def test_me_requires_login(self):
        self.assertIn(self.client.get(BASE + "me/").status_code, (401, 403))

    def test_me_get_patch(self):
        user = make_patient("me@example.com")
        self.client.force_authenticate(user)
        r = self.client.patch(BASE + "me/", {"first_name": " Jane ", "phone": "(555) 555-0123", "timezone": "America/Chicago"}, format="json")
        self.assertEqual(r.status_code, 200)
        user.refresh_from_db()
        self.assertEqual((user.first_name, user.phone, user.timezone), ("Jane", "+15555550123", "America/Chicago"))
        self.assertTrue(r.json()["has_patient_profile"])

    def test_me_patch_cannot_escalate(self):
        user = make_patient("me@example.com")
        self.client.force_authenticate(user)
        self.client.patch(BASE + "me/", {"kind": "staff", "is_staff": True, "is_superuser": True, "email": "x@example.com"}, format="json")
        user.refresh_from_db()
        self.assertEqual((user.kind, user.is_staff, user.is_superuser, user.email), ("patient", False, False, "me@example.com"))

    def test_me_patch_validation(self):
        self.client.force_authenticate(make_patient())
        for payload in [{"phone": "abc"}, {"timezone": "Mars/Base"}, {"first_name": "x" * 101}]:
            self.assertEqual(self.client.patch(BASE + "me/", payload, format="json").status_code, 400)

    def test_logout_ends_session(self):
        self.client.post(BASE + "request-link/", {"email": "o@example.com"}, format="json")
        self.client.post(BASE + "verify/", {"email": "o@example.com", "code": code_from_mail()}, format="json")
        self.assertEqual(self.client.post(BASE + "logout/").status_code, 204)
        self.assertIn(self.client.get(BASE + "me/").status_code, (401, 403))
        self.assertTrue(AuditEvent.objects.filter(action="logout").exists())

    def test_logout_requires_auth(self):
        self.assertIn(self.client.post(BASE + "logout/").status_code, (401, 403))
