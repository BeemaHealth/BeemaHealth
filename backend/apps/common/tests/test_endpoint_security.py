"""Security net over every URL reachable from ``config.urls``.

The resolver is walked at test time, so a new endpoint is covered the moment it is routed:
it must reject anonymous callers unless it is on the explicit public list below.
"""
from __future__ import annotations

import re
import uuid

from django.contrib import admin
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import URLPattern, URLResolver, get_resolver, reverse
from rest_framework.test import APIClient

DUMMY_UUID = "00000000-0000-0000-0000-000000000001"
METHODS = ("get", "post", "put", "patch", "delete")
UNSAFE = ("post", "put", "patch", "delete")
DENIED = {401, 403}

# Anonymous access is intended here (everything else must answer 401 or 403).
PUBLIC_PREFIXES = (
    "/api/v1/catalog/",  # read only catalog, unsafe methods checked separately
    "/api/v1/auth/csrf/",
    "/api/v1/auth/request-link/",
    "/api/v1/auth/verify/",
    "/api/v1/questionnaires/start/",
    "/api/v1/questionnaires/current/",
    "/api/v1/questionnaires/answer/",
    "/api/v1/questionnaires/back/",
    "/api/v1/questionnaires/upload-url/",
)
# These authenticate themselves (shared secret, basic auth, Stripe signature).
WEBHOOK_PREFIX = "/api/v1/webhooks/"
ADMIN_PREFIX = "/admin/"


def _route_to_path(route: str) -> str | None:
    if "drf_format_suffix" in route:
        return None  # ".json" style duplicates of routes already covered

    def repl(match: re.Match) -> str:
        return "1" if match.group(1) == "int" else DUMMY_UUID if match.group(1) == "uuid" else "x"

    return re.sub(r"<(?:(\w+):)?\w+>", repl, route)


def _regex_to_path(regex: str) -> str | None:
    if "(?P<format>" in regex:
        return None
    out = re.sub(r"\(\?P<\w+>[^)]*\)", DUMMY_UUID, regex)
    out = out.replace("^", "").replace("$", "").replace("\\Z", "").replace("\\.", ".").replace("/?", "/")
    return out


def _pattern_text(pattern) -> str | None:
    route = getattr(pattern, "_route", None)
    if route is not None:
        return _route_to_path(route)
    return _regex_to_path(pattern._regex)


def iter_urls(patterns=None, prefix: str = ""):
    """Yield ``(path, callback)`` for every leaf pattern."""
    for entry in patterns if patterns is not None else get_resolver().url_patterns:
        text = _pattern_text(entry.pattern)
        if text is None:
            continue
        if isinstance(entry, URLResolver):
            yield from iter_urls(entry.url_patterns, prefix + text)
        elif isinstance(entry, URLPattern):
            yield "/" + (prefix + text).lstrip("/"), entry.callback


def api_urls():
    return [(p, cb) for p, cb in iter_urls() if not p.startswith(ADMIN_PREFIX)]


class EndpointInventoryTests(TestCase):
    def test_enumeration_finds_the_expected_surface(self):
        paths = {p for p, _ in api_urls()}
        for expected in (
            "/api/v1/auth/me/",
            "/api/v1/patients/addresses/",
            f"/api/v1/billing/invoices/{DUMMY_UUID}/",
            f"/api/v1/treatments/{DUMMY_UUID}/cancel/",
            "/api/v1/webhooks/stripe/",
        ):
            self.assertIn(expected, paths)
        self.assertGreater(len(paths), 40)


class AnonymousAccessTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def test_every_non_public_endpoint_rejects_anonymous_callers(self):
        failures = []
        for path, _cb in api_urls():
            if path.startswith(PUBLIC_PREFIXES) or path.startswith(WEBHOOK_PREFIX):
                continue
            for method in METHODS:
                response = getattr(self.client, method)(path, {}, format="json")
                if response.status_code not in DENIED:
                    failures.append(f"{method.upper()} {path} -> {response.status_code}")
        self.assertEqual(failures, [], "Endpoints reachable without authentication")

    def test_public_endpoints_never_error_for_anonymous_callers(self):
        failures = []
        for path, _cb in api_urls():
            if not path.startswith(PUBLIC_PREFIXES):
                continue
            for method in METHODS:
                response = getattr(self.client, method)(path, {}, format="json")
                if response.status_code >= 500:
                    failures.append(f"{method.upper()} {path} -> {response.status_code}")
        self.assertEqual(failures, [])

    def test_public_catalog_is_read_only(self):
        for path, _cb in api_urls():
            if not path.startswith("/api/v1/catalog/"):
                continue
            for method in UNSAFE:
                response = getattr(self.client, method)(path, {}, format="json")
                self.assertIn(response.status_code, DENIED | {405}, f"{method.upper()} {path}")

    def test_claim_requires_a_signed_in_user(self):
        response = self.client.post("/api/v1/questionnaires/claim/", {}, format="json")
        self.assertIn(response.status_code, DENIED)

    def test_every_admin_page_redirects_anonymous_users_to_login(self):
        self.assertEqual(self.client.get("/admin/").status_code, 302)
        for model in admin.site._registry:
            info = (model._meta.app_label, model._meta.model_name)
            for name in ("changelist", "add"):
                url = reverse(f"admin:{info[0]}_{info[1]}_{name}")
                response = self.client.get(url)
                self.assertEqual(response.status_code, 302, url)
                self.assertIn("/admin/login/", response["Location"], url)


class PublicEndpointHardeningTests(TestCase):
    def test_anonymous_questionnaire_endpoints_are_throttled(self):
        from apps.questionnaires import views

        for view in (views.StartView, views.CurrentView, views.AnswerView, views.BackView, views.UploadUrlView):
            self.assertTrue(view.throttle_classes, f"{view.__name__} has no throttle")

    def test_auth_entry_points_are_throttled(self):
        from apps.accounts import views

        for view in (views.RequestLinkView, views.VerifyView, views.CsrfView):
            self.assertTrue(view.throttle_classes, f"{view.__name__} has no throttle")

    def test_login_endpoints_enforce_csrf_even_when_anonymous(self):
        client = APIClient(enforce_csrf_checks=True)
        response = client.post("/api/v1/auth/request-link/", {"email": "a@example.com"}, format="json")
        self.assertEqual(response.status_code, 403)
        response = client.post("/api/v1/auth/verify/", {"token": "x"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_signed_in_session_writes_require_a_csrf_token(self):
        from apps.accounts.tests.helpers import make_patient

        user = make_patient()
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(user)
        for path in ("/api/v1/patients/addresses/", "/api/v1/messaging/conversations/mark_read/", "/api/v1/auth/logout/"):
            response = client.post(path, {}, format="json")
            self.assertEqual(response.status_code, 403, path)

    def test_only_webhooks_are_csrf_exempt_plain_views(self):
        exempt = []
        for path, cb in iter_urls():
            is_drf = hasattr(cb, "cls") or hasattr(cb, "initkwargs")
            if getattr(cb, "csrf_exempt", False) and not is_drf and not path.startswith(ADMIN_PREFIX):
                exempt.append(path)
        self.assertTrue(exempt)
        for path in exempt:
            self.assertTrue(path.startswith(WEBHOOK_PREFIX), path)

    def test_oversized_request_body_is_refused_before_parsing(self):
        with override_settings(REQUEST_BODY_MAX_BYTES=100):
            response = APIClient().post("/api/v1/questionnaires/answer/", {"node_id": "a" * 500, "value": "x"}, format="json")
        self.assertEqual(response.status_code, 413)


@override_settings(BELUGA_WEBHOOK_SECRET="", STRIPE_WEBHOOK_SECRET="", LIFEFILE_WEBHOOK_USER="", LIFEFILE_WEBHOOK_PASSWORD="")
class WebhooksFailClosedTests(TestCase):
    """An unset secret must never mean 'accept everything'."""

    def post(self, vendor: str, body: bytes = b"{}", **headers):
        return self.client.post(f"/api/v1/webhooks/{vendor}/", data=body, content_type="application/json", **headers)

    def test_beluga_without_secret_rejects_every_request(self):
        for headers in ({}, {"HTTP_X_WEBHOOK_SECRET": ""}, {"HTTP_AUTHORIZATION": "Bearer "}, {"HTTP_AUTHORIZATION": "Bearer anything"}):
            self.assertEqual(self.post("beluga", **headers).status_code, 401, headers)

    def test_stripe_without_secret_rejects_even_signed_looking_requests(self):
        self.assertEqual(self.post("stripe", HTTP_STRIPE_SIGNATURE="t=1,v1=abc").status_code, 401)
        self.assertEqual(self.post("stripe").status_code, 401)

    def test_lifefile_without_credentials_rejects_empty_basic_auth(self):
        import base64

        empty = "Basic " + base64.b64encode(b":").decode()
        self.assertEqual(self.post("lifefile", HTTP_AUTHORIZATION=empty).status_code, 401)
        self.assertEqual(self.post("lifefile").status_code, 401)

    @override_settings(BELUGA_WEBHOOK_SECRET="s3cret-value")
    def test_wrong_secret_and_error_bodies_leak_nothing(self):
        response = self.post("beluga", HTTP_X_WEBHOOK_SECRET="s3cret-valuf")
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"ok": False})

    @override_settings(BELUGA_WEBHOOK_SECRET="s3cret-value", WEBHOOK_MAX_BODY_BYTES=50)
    def test_oversized_webhook_body_is_rejected_unauthenticated_or_not(self):
        big = b'{"event":"' + b"a" * 200 + b'"}'
        self.assertEqual(self.post("beluga", big).status_code, 413)
        self.assertEqual(self.post("beluga", big, HTTP_X_WEBHOOK_SECRET="s3cret-value").status_code, 413)

    def test_get_is_not_allowed_on_webhooks(self):
        for vendor in ("beluga", "stripe", "lifefile"):
            self.assertEqual(self.client.get(f"/api/v1/webhooks/{vendor}/").status_code, 405)


class UuidShapeTests(TestCase):
    def test_dummy_uuid_is_valid(self):
        uuid.UUID(DUMMY_UUID)
