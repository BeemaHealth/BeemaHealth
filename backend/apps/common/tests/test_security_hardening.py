"""Regression tests for the security review: boot guards, admin ledger rules, PHI free logs."""
from __future__ import annotations

import logging

from django.contrib import admin
from django.core.exceptions import ImproperlyConfigured
from django.test import RequestFactory, SimpleTestCase, TestCase
from django.test.utils import override_settings

from config.security import validate_production_settings

GOOD_KEY = "k" * 50
FERNET = "u0N0ZxQ2m3g8m4j3Qy0r2tq1o9mV6o3Qw8nJrP8n2vA="


class ProductionGuardTests(SimpleTestCase):
    def test_debug_allows_anything(self):
        validate_production_settings(debug=True, secret_key="x", field_encryption_key="")

    def test_production_accepts_strong_values(self):
        validate_production_settings(debug=False, secret_key=GOOD_KEY, field_encryption_key=FERNET)

    def test_refuses_short_or_placeholder_secret_key(self):
        for bad in ("", "x", "short", "django-insecure-" + "a" * 40, "changeme" + "a" * 40):
            with self.assertRaises(ImproperlyConfigured, msg=bad):
                validate_production_settings(debug=False, secret_key=bad, field_encryption_key=FERNET)

    def test_refuses_missing_field_encryption_key(self):
        for bad in ("", "   "):
            with self.assertRaises(ImproperlyConfigured):
                validate_production_settings(debug=False, secret_key=GOOD_KEY, field_encryption_key=bad)

    def test_settings_module_refuses_to_boot_unsafe(self):
        import os
        import subprocess
        import sys
        from pathlib import Path

        backend = Path(__file__).resolve().parents[3]
        env = {**os.environ, "DEBUG": "false", "SECRET_KEY": "x", "DATABASE_URL": "sqlite:///:memory:", "FIELD_ENCRYPTION_KEY": ""}
        result = subprocess.run(
            [sys.executable, "-c", "import config.settings"], cwd=backend, env=env, capture_output=True, text=True
        )
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("ImproperlyConfigured", result.stderr)


class LedgerAdminTests(TestCase):
    def test_refunds_cannot_be_deleted_or_have_amounts_edited(self):
        from apps.billing.models import Refund

        model_admin = admin.site._registry[Refund]
        request = RequestFactory().get("/")
        self.assertFalse(model_admin.has_delete_permission(request))
        existing = Refund(amount_cents=100)
        readonly = model_admin.get_readonly_fields(request, existing)
        for field in ("amount_cents", "invoice", "reason", "approved_by"):
            self.assertIn(field, readonly)

    def test_paid_invoices_cannot_be_deleted(self):
        from django.utils import timezone

        from apps.billing.models import Invoice

        model_admin = admin.site._registry[Invoice]
        request = RequestFactory().get("/")
        request.user = type("U", (), {"has_perm": lambda self, perm: True, "is_active": True})()
        self.assertFalse(model_admin.has_delete_permission(request, Invoice(paid_at=timezone.now())))
        self.assertTrue(model_admin.has_delete_permission(request, Invoice()))


class NotifierLogTests(SimpleTestCase):
    def test_console_notifier_logs_no_recipient_or_context(self):
        from apps.messaging.notifiers import ConsoleNotifier

        with self.assertLogs("apps.messaging.notifiers", level=logging.INFO) as logs:
            ConsoleNotifier().send("+12025551234", "new_message", {"name": "Jane Doe", "drug": "semaglutide"})
        text = "\n".join(logs.output)
        for secret in ("+12025551234", "Jane", "semaglutide"):
            self.assertNotIn(secret, text)

    @override_settings(TWILIO_ACCOUNT_SID="a", TWILIO_AUTH_TOKEN="b", TWILIO_FROM_NUMBER="+15550000000")
    def test_provider_errors_do_not_echo_the_destination(self):
        from unittest.mock import MagicMock, patch

        from apps.messaging.notifiers import TwilioSmsNotifier

        client = MagicMock()
        client.messages.create.side_effect = RuntimeError("Invalid To number +12025551234")
        with patch("twilio.rest.Client", return_value=client), self.assertLogs("apps.messaging.notifiers", level=logging.ERROR) as logs:
            ok, detail = TwilioSmsNotifier().send("+12025551234", "new_message", {})
        self.assertFalse(ok)
        self.assertNotIn("+12025551234", detail)
        self.assertNotIn("+12025551234", "\n".join(logs.output))
