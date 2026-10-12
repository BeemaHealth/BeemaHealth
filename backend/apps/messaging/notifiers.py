"""Notification backends for SMS and email (content-free alerts only)."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from typing import Optional

from django.conf import settings
from django.template.loader import render_to_string

logger = logging.getLogger(__name__)


class Notifier(ABC):
    """Base class for notification backends."""

    @abstractmethod
    def send(self, recipient: str, template_key: str, context: dict) -> tuple[bool, str]:
        """Send a notification.

        Args:
            recipient: Phone number (E.164) or email address
            template_key: Template identifier (e.g., 'new_message', 'rx_written')
            context: Template context dict (no PHI content - only status/action keys)

        Returns:
            (success: bool, provider_message_id or error message)
        """


class ConsoleNotifier(Notifier):
    """Development notifier that logs to console."""

    def send(self, recipient: str, template_key: str, context: dict) -> tuple[bool, str]:
        # Recipient and context can identify a patient, so only the template key is logged.
        logger.info("console notification template=%s", template_key)
        return True, f"console-{template_key}"


class TwilioSmsNotifier(Notifier):
    """Send SMS via Twilio (one-way, honors STOP and opt-out)."""

    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.from_number = settings.TWILIO_FROM_NUMBER

    def send(self, recipient: str, template_key: str, context: dict) -> tuple[bool, str]:
        """Send SMS via Twilio.

        Args:
            recipient: Phone in E.164 format (e.g., +12025551234)
            template_key: Template identifier
            context: Context dict (no PHI content)

        Returns:
            (success, provider_message_id or error)
        """
        if not self.account_sid or not self.auth_token or not self.from_number:
            return False, "Twilio not configured"

        # Check SMS opt-out status (guarded import to avoid circular deps)
        try:
            from apps.patients.models import PatientProfile
            profile = PatientProfile.objects.filter(user__phone=recipient).first()
            if profile and getattr(profile, "sms_opted_out", False):
                return False, "Patient opted out of SMS"
        except Exception:
            pass

        try:
            import twilio.rest
            client = twilio.rest.Client(self.account_sid, self.auth_token)

            # Build message body from template (content-free, no drug/condition names)
            body = self._build_message_body(template_key, context)
            if not body:
                return False, f"No SMS template for {template_key}"

            message = client.messages.create(
                body=body,
                from_=self.from_number,
                to=recipient,
            )
            return True, message.sid
        except Exception as e:
            # Provider errors can echo the destination number, so keep only the exception type.
            logger.error("twilio sms send failed error=%s", type(e).__name__)
            return False, f"sms_send_failed:{type(e).__name__}"

    def _build_message_body(self, template_key: str, context: dict) -> str:
        """Build SMS body from template key (content-free)."""
        templates = {
            "new_message": "You have a new message from your Beema Health team. Sign in to view: {portal_url}",
            "rx_written": "Your prescription has been sent to the pharmacy. Check your portal for details.",
            "shipped": "Your medication has been dispatched. Tracking info coming soon.",
            "delivered": "Your medication has arrive.",
            "payment_failed": "Your payment couldn't be process. Update your payment method in your Beema Health account.",
            "action_required": "We need your attention. Sign in to your Beema Health account to see what's needed.",
            "visit_scheduled": "Your medical visit has been schedule. Check your Beema Health portal for details.",
            "refill_due": "Your medication refill is coming up soon.",
            "abandoned_checkout_1": "Complete your Beema Health order to begin.",
            "abandoned_checkout_2": "Don't miss out. Finish your checkout.",
            "abandoned_checkout_3": "Your Beema Health membership is waiting. Complete checkout today.",
            "abandoned_checkout_4": "Almost there! Finish setting up your plan.",
            "abandoned_checkout_5": "We're here to help. Complete your order now.",
            "abandoned_checkout_6": "Second chance: finish your Beema Health order.",
            "abandoned_checkout_7": "Last reminder: secure your treatment plan.",
        }
        template = templates.get(template_key, "")
        if not template:
            return ""
        # Handle missing placeholders gracefully
        safe_context = {k: str(v) for k, v in context.items() if k != "patient_id"}
        safe_context.setdefault("portal_url", "your Beema Health account")
        return template.format_map(safe_context)


class SesEmailNotifier(Notifier):
    """Send email via AWS SES (content-free templates only)."""

    def __init__(self):
        self.from_email = settings.SES_FROM_EMAIL
        self.region = settings.AWS_REGION

    def send(self, recipient: str, template_key: str, context: dict) -> tuple[bool, str]:
        """Send email via SES.

        Args:
            recipient: Email address
            template_key: Template identifier
            context: Context dict (no PHI content, only status keys)

        Returns:
            (success, provider_message_id or error)
        """
        if not self.from_email:
            return False, "SES from_email not configured"

        try:
            import boto3
            client = boto3.client("ses", region_name=self.region)

            subject, body_text, body_html = self._build_message(template_key, context)
            if not subject:
                return False, f"No email template for {template_key}"

            response = client.send_email(
                Source=self.from_email,
                Destination={"ToAddresses": [recipient]},
                Message={
                    "Subject": {"Data": subject, "Charset": "UTF-8"},
                    "Body": {
                        "Text": {"Data": body_text, "Charset": "UTF-8"},
                        "Html": {"Data": body_html, "Charset": "UTF-8"},
                    },
                },
            )
            return True, response["MessageId"]
        except Exception as e:
            # Provider errors can echo the destination address, so keep only the exception type.
            logger.error("ses email send failed error=%s", type(e).__name__)
            return False, f"email_send_failed:{type(e).__name__}"

    def _build_message(self, template_key: str, context: dict) -> tuple[str, str, str]:
        """Build email subject and body from template (content-free).

        Returns:
            (subject, body_text, body_html)
        """
        templates = {
            "new_message": {
                "subject": "New message from Beema Health",
                "body": "You have a new message from your Beema Health care team. Sign in to your portal to view it.",
            },
            "rx_written": {
                "subject": "Your prescription is ready",
                "body": "Your prescription has been sent to the pharmacy. Track its status in your Beema Health portal.",
            },
            "shipped": {
                "subject": "Your order is on the way",
                "body": "Your medication has been dispatched. You'll get tracking info soon.",
            },
            "delivered": {
                "subject": "Your order has arrive",
                "body": "Your medication is now in your hands. Check your Beema Health portal for next steps.",
            },
            "payment_failed": {
                "subject": "Payment issue - action needed",
                "body": "We couldn't process your payment. Please update your payment method in your Beema Health account.",
            },
            "action_required": {
                "subject": "Action needed for your account",
                "body": "We need your attention on your Beema Health account. Sign in to see what needs your action.",
            },
            "visit_scheduled": {
                "subject": "Your medical visit is schedule",
                "body": "Your appointment has been schedule. Check your Beema Health portal for date, time, and instructions.",
            },
            "refill_due": {
                "subject": "Your medication refill is coming",
                "body": "Your medication refill is coming up soon. Check your portal for details.",
            },
            "abandoned_checkout_1": {
                "subject": "Complete your Beema Health order",
                "body": "You left your order incomplete. Finish checkout to begin your plan right away.",
            },
            "abandoned_checkout_2": {
                "subject": "Don't miss out",
                "body": "Your Beema Health order is waiting. Complete checkout now.",
            },
            "abandoned_checkout_3": {
                "subject": "Your Beema Health membership is ready",
                "body": "It's easy to finish. Complete your order in just a few clicks.",
            },
            "abandoned_checkout_4": {
                "subject": "Almost there - finish your setup",
                "body": "Complete your Beema Health order to get access to your plan and support.",
            },
            "abandoned_checkout_5": {
                "subject": "We're here to help you",
                "body": "Don't let anything stop you. Complete your Beema Health order now.",
            },
            "abandoned_checkout_6": {
                "subject": "Second chance: secure your spot",
                "body": "Your plan is waiting. Complete your Beema Health order now.",
            },
            "abandoned_checkout_7": {
                "subject": "Last reminder: finish your order",
                "body": "This is your final reminder. Complete your Beema Health order right now.",
            },
        }

        template = templates.get(template_key)
        if not template:
            return "", "", ""

        subject = template.get("subject", "")
        body_text = template.get("body", "")

        # Build HTML version
        portal_url = context.get('portal_url', 'https://hive.beemahealth.com')
        body_html = f"""
        <html>
        <body>
            <p>{body_text}</p>
            <p>Visit your <a href="{portal_url}">Beema Health portal</a> to learn more.</p>
        </body>
        </html>
        """

        return subject, body_text, body_html


def get_notifier(backend_name: str) -> Notifier:
    """Factory function to get a notifier by name."""
    if backend_name == "console":
        return ConsoleNotifier()
    elif backend_name == "twilio":
        return TwilioSmsNotifier()
    elif backend_name == "ses":
        return SesEmailNotifier()
    else:
        return ConsoleNotifier()
