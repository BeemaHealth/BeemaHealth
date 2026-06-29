from django.core import mail
from django.test import TestCase, override_settings

from apps.accounts.models import User
from apps.patients.models import PatientSettings
from apps.patients.notifications import notify_care_team_message, notify_patient_event


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    SMS_BACKEND="console",
    FRONTEND_URL="http://localhost:8080",
)
class PatientNotificationTests(TestCase):
    def setUp(self):
        self.patient = User.objects.create_user(
            email="patient@example.com",
            password="secure-pass-1",
            first_name="Jane",
            last_name="Doe",
            phone="3035550100",
        )
        PatientSettings.objects.create(
            user=self.patient,
            email_notifications=True,
            sms_notifications=True,
        )

    def _html_body(self, msg) -> str:
        """Extract the HTML alternative from an EmailMultiAlternatives message."""
        for content, mimetype in getattr(msg, "alternatives", []):
            if mimetype == "text/html":
                return content
        return ""

    def test_notify_care_team_message_sends_email_and_sms(self):
        sent = notify_care_team_message(
            self.patient,
            sender_label="your provider",
            message_preview="hello i need more info",
        )

        self.assertTrue(sent["email"])
        self.assertTrue(sent["sms"])
        self.assertEqual(len(mail.outbox), 1)
        msg = mail.outbox[0]
        self.assertIn("New message from your Aretide care team", msg.subject)
        self.assertIn("hello i need more info", msg.body)
        self.assertIn("/dashboard", msg.body)

    def test_email_has_html_alternative_with_dashboard_link(self):
        notify_care_team_message(
            self.patient,
            sender_label="your provider",
            message_preview="HTML test",
        )
        self.assertEqual(len(mail.outbox), 1)
        msg = mail.outbox[0]
        html = self._html_body(msg)
        self.assertTrue(html, "Expected an HTML alternative on the email")
        self.assertIn("/dashboard", html)
        self.assertIn("<!DOCTYPE html", html)
        self.assertIn("Aretide", html)

    def test_email_plain_text_fallback_present(self):
        notify_care_team_message(
            self.patient,
            sender_label="support",
            message_preview="Checking in.",
        )
        msg = mail.outbox[0]
        self.assertTrue(msg.body, "Expected a plain-text body")
        self.assertIn("/dashboard", msg.body)

    def test_status_notification_html_includes_dashboard_link(self):
        notify_patient_event(
            self.patient,
            category="shipping",
            subject="Your Aretide order update",
            email_body="Hi Jane,\n\nYour order has shipped.\n\nView: http://localhost:8080/dashboard",
            sms_body="Aretide: Your order has shipped.",
        )
        self.assertEqual(len(mail.outbox), 1)
        html = self._html_body(mail.outbox[0])
        self.assertIn("/dashboard", html)
        self.assertIn("<!DOCTYPE html", html)

    def test_notify_care_team_message_respects_disabled_email(self):
        settings_obj = self.patient.patient_settings
        settings_obj.email_notifications = False
        settings_obj.save(update_fields=["email_notifications"])

        sent = notify_care_team_message(
            self.patient,
            sender_label="support",
            message_preview="Please call us.",
        )

        self.assertFalse(sent["email"])
        self.assertTrue(sent["sms"])
        self.assertEqual(len(mail.outbox), 0)

    def test_notify_care_team_message_respects_disabled_sms(self):
        settings_obj = self.patient.patient_settings
        settings_obj.sms_notifications = False
        settings_obj.save(update_fields=["sms_notifications"])

        sent = notify_care_team_message(
            self.patient,
            sender_label="your provider",
            message_preview="Need more details.",
        )

        self.assertTrue(sent["email"])
        self.assertFalse(sent["sms"])
        self.assertEqual(len(mail.outbox), 1)

    def test_category_toggle_off_suppresses_all_channels(self):
        settings_obj = self.patient.patient_settings
        settings_obj.notify_shipping = False
        settings_obj.save(update_fields=["notify_shipping"])

        sent = notify_patient_event(
            self.patient,
            category="shipping",
            subject="Your Aretide order update",
            email_body="Your order has shipped.",
            sms_body="Aretide: Your order has shipped.",
        )

        self.assertFalse(sent["email"])
        self.assertFalse(sent["sms"])
        self.assertEqual(len(mail.outbox), 0)

    def test_category_toggle_on_uses_channel_preferences(self):
        settings_obj = self.patient.patient_settings
        settings_obj.sms_notifications = False
        settings_obj.save(update_fields=["sms_notifications"])

        sent = notify_patient_event(
            self.patient,
            category="prescription",
            subject="Your Aretide prescription has been written and is on its way to the pharmacy.",
            email_body="Your prescription is on its way.",
            sms_body="Aretide: prescription ready.",
        )

        self.assertTrue(sent["email"])
        self.assertFalse(sent["sms"])
        self.assertEqual(len(mail.outbox), 1)

    def test_care_team_message_respects_category_toggle(self):
        settings_obj = self.patient.patient_settings
        settings_obj.notify_messages = False
        settings_obj.save(update_fields=["notify_messages"])

        sent = notify_care_team_message(
            self.patient,
            sender_label="your provider",
            message_preview="Need more details.",
        )

        self.assertFalse(sent["email"])
        self.assertFalse(sent["sms"])
        self.assertEqual(len(mail.outbox), 0)
