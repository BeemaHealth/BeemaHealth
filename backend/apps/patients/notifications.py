from __future__ import annotations

import logging
import threading
from dataclasses import dataclass

from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from apps.accounts.models import User
from apps.common.dev_logging import dev_log
from apps.common.sms import send_sms
from apps.patients.email_templates import render_notification_email
from apps.patients.models import PatientSettings

logger = logging.getLogger(__name__)

# Notification categories → the PatientSettings field that gates them.
# Channels (email_notifications / sms_notifications) decide HOW; these decide WHICH.
CATEGORY_FIELDS = {
    "messages": "notify_messages",
    "review": "notify_review",
    "prescription": "notify_prescription",
    "shipping": "notify_shipping",
    "labs": "notify_labs",
    "appointments": "notify_appointments",
}


@dataclass(frozen=True)
class NotificationPayload:
    email: str
    phone: str
    first_name: str
    email_enabled: bool
    sms_enabled: bool
    category_enabled: bool
    subject: str
    email_body: str
    sms_body: str


def _get_patient_settings(user: User) -> PatientSettings:
    settings_obj, _ = PatientSettings.objects.get_or_create(user=user)
    return settings_obj


def _dashboard_url() -> str:
    return f"{settings.FRONTEND_URL.rstrip('/')}/dashboard"


def build_notification_payload(
    user: User,
    *,
    category: str,
    subject: str,
    email_body: str,
    sms_body: str,
) -> NotificationPayload:
    if category not in CATEGORY_FIELDS:
        raise ValueError(f"Unknown notification category: {category!r}")
    patient_settings = _get_patient_settings(user)
    return NotificationPayload(
        email=user.email,
        phone=user.phone or "",
        first_name=user.first_name or "",
        email_enabled=patient_settings.email_notifications,
        sms_enabled=patient_settings.sms_notifications,
        category_enabled=getattr(patient_settings, CATEGORY_FIELDS[category], True),
        subject=subject,
        email_body=email_body,
        sms_body=sms_body,
    )


def deliver_notification(payload: NotificationPayload) -> dict[str, bool]:
    sent = {"email": False, "sms": False}
    if not payload.category_enabled:
        logger.info(
            "[NOTIFICATION] skipped subject=%r — category disabled in patient settings",
            payload.subject,
        )
        return sent

    if payload.email_enabled:
        html_body = render_notification_email(
            subject=payload.subject,
            heading=payload.subject,
            body_text=payload.email_body,
            cta_url=_dashboard_url(),
        )
        msg = EmailMultiAlternatives(
            subject=payload.subject,
            body=payload.email_body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[payload.email],
        )
        msg.attach_alternative(html_body, "text/html")
        msg.send(fail_silently=False)
        sent["email"] = True

    if payload.sms_enabled and payload.phone:
        send_sms(to_phone=payload.phone, body=payload.sms_body)
        sent["sms"] = True

    logger.info(
        "[NOTIFICATION] delivered subject=%r email_sent=%s sms_sent=%s "
        "(email_enabled=%s sms_enabled=%s has_phone=%s)",
        payload.subject, sent["email"], sent["sms"],
        payload.email_enabled, payload.sms_enabled, bool(payload.phone),
    )
    dev_log(
        logger,
        "[NOTIFICATION] body preview — email:\n%s\nsms:\n%s",
        payload.email_body, payload.sms_body,
    )
    return sent


def notify_patient_event(
    user: User,
    *,
    category: str,
    subject: str,
    email_body: str,
    sms_body: str,
) -> dict[str, bool]:
    payload = build_notification_payload(
        user,
        category=category,
        subject=subject,
        email_body=email_body,
        sms_body=sms_body,
    )
    return deliver_notification(payload)


def _deliver_and_log_errors(payload: NotificationPayload) -> None:
    try:
        deliver_notification(payload)
    except Exception:
        logger.exception("[NOTIFICATION] failed to send subject=%r", payload.subject)


def queue_patient_event(
    user: User,
    *,
    category: str,
    subject: str,
    email_body: str,
    sms_body: str,
) -> None:
    """Resolve preferences synchronously, then deliver off the request thread."""
    payload = build_notification_payload(
        user,
        category=category,
        subject=subject,
        email_body=email_body,
        sms_body=sms_body,
    )
    logger.info(
        "[NOTIFICATION] queued user=%s category=%s subject=%r category_enabled=%s "
        "email_enabled=%s sms_enabled=%s",
        user.id, category, subject, payload.category_enabled,
        payload.email_enabled, payload.sms_enabled,
    )
    threading.Thread(
        target=_deliver_and_log_errors,
        args=(payload,),
        daemon=True,
    ).start()


# --- Care-team message helpers (category="messages") -------------------------


def _build_care_team_bodies(sender_label: str, message_preview: str) -> tuple[str, str, str]:
    dashboard_url = _dashboard_url()
    preview = (message_preview or "").strip()
    if len(preview) > 240:
        preview = f"{preview[:237]}..."

    subject = "New message from your Aretide care team"
    email_body = f"You have a new message from {sender_label}.\n\n"
    if preview:
        email_body += f'"{preview}"\n\n'
    email_body += (
        f"View your messages: {dashboard_url}\n\n"
        "You can change notification preferences in Account settings.\n"
    )
    sms_body = (
        f"Aretide: New message from your care team ({sender_label}). "
        f"Sign in to view: {dashboard_url}"
    )
    return subject, email_body, sms_body


def _personalize(first_name: str, body: str) -> str:
    return f"Hi {first_name or 'there'},\n\n{body}"


def notify_care_team_message(
    user: User,
    *,
    sender_label: str,
    message_preview: str,
) -> dict[str, bool]:
    subject, email_body, sms_body = _build_care_team_bodies(sender_label, message_preview)
    return notify_patient_event(
        user,
        category="messages",
        subject=subject,
        email_body=_personalize(user.first_name or "", email_body),
        sms_body=sms_body,
    )


def queue_care_team_message_notification(
    user: User,
    *,
    sender_label: str,
    message_preview: str,
) -> None:
    subject, email_body, sms_body = _build_care_team_bodies(sender_label, message_preview)
    queue_patient_event(
        user,
        category="messages",
        subject=subject,
        email_body=_personalize(user.first_name or "", email_body),
        sms_body=sms_body,
    )


# --- Status / fulfillment helpers -------------------------------------------


def queue_status_notification(
    user: User,
    *,
    category: str,
    subject: str,
    summary: str,
) -> None:
    """Generic status update (review decision, prescription, shipping, labs, appointments)."""
    dashboard_url = _dashboard_url()
    email_body = _personalize(
        user.first_name or "",
        f"{summary}\n\n"
        f"View the details on your dashboard: {dashboard_url}\n\n"
        "You can change notification preferences in Account settings.\n",
    )
    sms_body = f"Aretide: {summary} Sign in: {dashboard_url}"
    queue_patient_event(
        user,
        category=category,
        subject=subject,
        email_body=email_body,
        sms_body=sms_body,
    )
