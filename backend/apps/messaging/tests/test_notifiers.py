"""Tests for notification backends."""
import re
from django.test import TestCase, override_settings

from apps.messaging.notifiers import (
    ConsoleNotifier,
    TwilioSmsNotifier,
    SesEmailNotifier,
)


class ContentFreeSmsTemplateTest(TestCase):
    """Verify SMS templates contain no drug or condition names."""

    PROHIBITED_WORDS = {
        # Drugs
        "semaglutide", "tirzepatide", "ozempic", "mounjaro", "zepbound", "glp-1", "glp1",
        # Conditions
        "weight loss", "obesity", "diabetes", "thyroid", "pancreatitis", "gallbladder",
        "gastric", "hypertension", "cholesterol", "erectile dysfunction",
    }

    def _check_prohibited_words(self, text: str, template_key: str):
        """Check for prohibited words using word boundaries."""
        text_lower = text.lower()
        for word in self.PROHIBITED_WORDS:
            # Use word boundary regex for whole-word matching
            pattern = r'\b' + re.escape(word) + r'\b'
            if re.search(pattern, text_lower):
                self.fail(f"SMS template '{template_key}' contains prohibited word '{word}'")

    def test_sms_templates_no_drug_names(self):
        """SMS templates do not contain drug names."""
        notifier = TwilioSmsNotifier()
        templates = {
            "new_message": notifier._build_message_body("new_message", {"portal_url": "portal"}),
            "rx_written": notifier._build_message_body("rx_written", {}),
            "shipped": notifier._build_message_body("shipped", {}),
            "delivered": notifier._build_message_body("delivered", {}),
            "payment_failed": notifier._build_message_body("payment_failed", {}),
            "action_required": notifier._build_message_body("action_required", {}),
            "visit_scheduled": notifier._build_message_body("visit_scheduled", {}),
            "refill_due": notifier._build_message_body("refill_due", {}),
        }

        for template_key, body in templates.items():
            self._check_prohibited_words(body, template_key)

    def test_abandoned_checkout_sms_templates(self):
        """Abandoned checkout SMS templates are content-free."""
        notifier = TwilioSmsNotifier()
        for step in range(1, 8):
            template_key = f"abandoned_checkout_{step}"
            body = notifier._build_message_body(template_key, {})
            self._check_prohibited_words(body, template_key)


class ContentFreeEmailTemplateTest(TestCase):
    """Verify email templates contain no drug or condition names."""

    PROHIBITED_WORDS = {
        "semaglutide", "tirzepatide", "ozempic", "mounjaro", "zepbound", "glp-1", "glp1",
        "weight loss", "obesity", "diabetes", "thyroid", "pancreatitis", "gallbladder",
        "gastric", "hypertension", "cholesterol", "erectile dysfunction",
    }

    def _check_prohibited_words(self, text: str, template_key: str):
        """Check for prohibited words using word boundaries."""
        text_lower = text.lower()
        for word in self.PROHIBITED_WORDS:
            # Use word boundary regex for whole-word matching
            pattern = r'\b' + re.escape(word) + r'\b'
            if re.search(pattern, text_lower):
                self.fail(f"Email template '{template_key}' contains prohibited word '{word}'")

    def test_email_templates_no_drug_names(self):
        """Email templates do not contain drug or condition names."""
        notifier = SesEmailNotifier()
        templates = {
            "new_message": notifier._build_message("new_message", {}),
            "rx_written": notifier._build_message("rx_written", {}),
            "shipped": notifier._build_message("shipped", {}),
            "delivered": notifier._build_message("delivered", {}),
            "payment_failed": notifier._build_message("payment_failed", {}),
            "action_required": notifier._build_message("action_required", {}),
            "visit_scheduled": notifier._build_message("visit_scheduled", {}),
            "refill_due": notifier._build_message("refill_due", {}),
        }

        for template_key, (subject, body_text, body_html) in templates.items():
            combined = (subject + " " + body_text + " " + body_html)
            self._check_prohibited_words(combined, template_key)

    def test_abandoned_checkout_email_templates(self):
        """Abandoned checkout email templates are content-free."""
        notifier = SesEmailNotifier()
        for step in range(1, 8):
            template_key = f"abandoned_checkout_{step}"
            subject, body_text, body_html = notifier._build_message(template_key, {})
            combined = (subject + " " + body_text + " " + body_html)
            self._check_prohibited_words(combined, template_key)


class ConsoleNotifierTest(TestCase):
    """Test console notifier (development)."""

    def test_console_notifier_returns_success(self):
        """ConsoleNotifier always returns success."""
        notifier = ConsoleNotifier()
        success, msg_id = notifier.send("+12025551234", "new_message", {})
        self.assertTrue(success)
        self.assertIsNotNone(msg_id)
