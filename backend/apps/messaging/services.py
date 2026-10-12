"""Messaging services: send, receive, and deliver messages."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.common.exceptions import InvalidStateTransition
from .models import Conversation, Message, NotificationDelivery, AbandonedCheckout
from .notifiers import get_notifier

logger = logging.getLogger(__name__)


def send_patient_message(
    conversation: Conversation,
    user,
    body: str,
    attachments: tuple = (),
) -> Message:
    """Patient sends a message (outbound).

    Args:
        conversation: Target conversation
        user: Patient user (from request.user)
        body: Message text
        attachments: Tuple of (s3_key, mime, size) tuples

    Returns:
        Message instance (status='queued')
    """
    if conversation.patient.user != user:
        raise PermissionError("Patient can only send messages in their own conversations")

    message = Message.objects.create(
        conversation=conversation,
        direction="out",
        sender_role="patient",
        sender_user=user,
        sender_display_name=user.get_full_name() or user.email,
        body=body,
        delivery_status="queued",
    )

    # Attach files
    for s3_key, mime, size in attachments:
        message.attachments.create(s3_key=s3_key, mime=mime, size=size)

    conversation.last_message_at = timezone.now()
    conversation.unread_for_staff = True
    conversation.save(update_fields=["last_message_at", "unread_for_staff"])

    # For doctor conversations, submit to network adapter (guarded import)
    if conversation.kind == "doctor":
        try:
            from apps.integrations.services import send_chat_to_network
            send_chat_to_network(message)
        except ImportError:
            logger.warning("integrations app not available yet")
        except Exception as e:
            logger.error("failed to send patient message to network error=%s", type(e).__name__)
            message.delivery_status = "failed"
            message.last_error = type(e).__name__
            message.save(update_fields=["delivery_status", "last_error"])

    return message


def receive_doctor_message(
    treatment_or_visit,
    body: str,
    external_id: str,
    doctor_name: str,
) -> Message:
    """Receive a message from a doctor (inbound, idempotent by external_id).

    Args:
        treatment_or_visit: Treatment or Visit instance (determines routing)
        body: Message text
        external_id: Beluga message ID (for idempotency)
        doctor_name: Doctor's display name

    Returns:
        Message instance (created or existing)
    """
    # Dedupe by external_id
    existing = Message.objects.filter(external_id=external_id).first()
    if existing:
        return existing

    # Determine conversation
    if hasattr(treatment_or_visit, "patient"):
        # It's a Treatment
        patient_profile = treatment_or_visit.patient
        visit = None
    else:
        # It's a Visit
        patient_profile = treatment_or_visit.treatment.patient
        visit = treatment_or_visit

    conversation, _ = Conversation.objects.get_or_create(
        patient=patient_profile,
        kind="doctor",
        treatment=treatment_or_visit if hasattr(treatment_or_visit, "patient") else treatment_or_visit.treatment,
        visit=visit,
    )

    message = Message.objects.create(
        conversation=conversation,
        direction="in",
        sender_role="doctor",
        sender_display_name=doctor_name,
        body=body,
        delivery_status="delivered",
        external_id=external_id,
        sent_at=timezone.now(),
    )

    conversation.last_message_at = timezone.now()
    conversation.unread_for_patient = True
    conversation.state = "awaiting_patient"
    conversation.save(update_fields=["last_message_at", "unread_for_patient", "state"])

    # Notify patient (content-free alert)
    notify_patient(patient_profile, "new_message", {"portal_url": settings.PORTAL_BASE_URL})

    return message


def receive_cs_message(
    patient_profile,
    body: str,
    external_id: str = "",
) -> Message:
    """Receive a message from Customer Success (inbound).

    Args:
        patient_profile: PatientProfile instance
        body: Message text
        external_id: Optional external ID for deduplication

    Returns:
        Message instance
    """
    # Dedupe if external_id provided
    if external_id:
        existing = Message.objects.filter(external_id=external_id).first()
        if existing:
            return existing

    conversation, _ = Conversation.objects.get_or_create(
        patient=patient_profile,
        kind="support",
    )

    message = Message.objects.create(
        conversation=conversation,
        direction="in",
        sender_role="customer_success",
        sender_display_name="Beema Health Support",
        body=body,
        delivery_status="delivered",
        external_id=external_id or "",
        sent_at=timezone.now(),
    )

    conversation.last_message_at = timezone.now()
    conversation.unread_for_patient = True
    conversation.state = "awaiting_patient"
    conversation.save(update_fields=["last_message_at", "unread_for_patient", "state"])

    # Notify patient (content-free alert)
    notify_patient(patient_profile, "new_message", {"portal_url": settings.PORTAL_BASE_URL})

    return message


def staff_reply(
    conversation: Conversation,
    staff_user,
    body: str,
) -> Message:
    """Staff replies to a conversation (in admin).

    Args:
        conversation: Target conversation
        staff_user: Staff User instance
        body: Message text

    Returns:
        Message instance (queued)
    """
    if not staff_user.is_staff:
        raise PermissionError("Only staff can reply")

    # Get staff display name
    display_name = staff_user.get_full_name() or staff_user.email
    try:
        profile = staff_user.staffprofile
        display_name = profile.display_name or display_name
        sender_role = profile.message_role or "support"
    except Exception:
        sender_role = "support"

    message = Message.objects.create(
        conversation=conversation,
        direction="out",
        sender_role=sender_role,
        sender_user=staff_user,
        sender_display_name=display_name,
        body=body,
        delivery_status="queued",
    )

    conversation.last_message_at = timezone.now()
    conversation.unread_for_patient = True
    conversation.assignee = staff_user
    conversation.state = "awaiting_patient"
    conversation.save(update_fields=["last_message_at", "unread_for_patient", "assignee", "state"])

    # Notify patient
    notify_patient(conversation.patient, "new_message", {"portal_url": settings.PORTAL_BASE_URL})

    return message


def compute_state(conversation: Conversation) -> str:
    """Compute the current conversation state based on message history.

    States:
    - awaiting_patient: Last message from staff/doctor, waiting for patient reply
    - awaiting_staff: Last message from patient in support conversation
    - awaiting_doctor: Last message from patient in doctor conversation (visit not concluded)
    - closed: Last message from system, or conversation archived

    Returns:
        The new state string
    """
    if conversation.archived:
        return "closed"

    last_msg = conversation.messages.order_by("-created_at").first()
    if not last_msg:
        return "awaiting_patient"

    if last_msg.sender_role == "patient":
        if conversation.kind == "doctor":
            return "awaiting_doctor"
        else:
            return "awaiting_staff"
    elif last_msg.sender_role in ("doctor", "customer_success", "support", "system"):
        return "awaiting_patient"

    return conversation.state


def deliver_pending_messages(now: datetime = None, max_attempts: int = 3) -> dict:
    """Retry delivery of queued outbound messages.

    Implements exponential backoff and a failure alert if a message fails
    after max_attempts.

    Args:
        now: Current time (for testing)
        max_attempts: Max delivery attempts before marking failed

    Returns:
        Stats dict: {delivered: int, failed: int, errors: []}
    """
    if now is None:
        now = timezone.now()

    stats = {"delivered": 0, "failed": 0, "errors": []}

    # Get queued messages with exponential backoff
    # Attempt 1 after 0s, 2 after 60s, 3 after 300s (5m), then give up
    backoff_delays = [0, 60, 300]

    for attempt, delay_seconds in enumerate(backoff_delays, 1):
        queued = Message.objects.filter(
            direction="out",
            delivery_status="queued",
            attempts__lt=attempt,
        )

        for message in queued:
            if (now - message.created_at).total_seconds() < delay_seconds:
                continue  # Not yet due

            message.attempts += 1

            if message.delivery_status == "delivered":
                continue

            # Try to deliver
            success, msg_id_or_error = _deliver_message(message)
            if success:
                message.delivery_status = "delivered"
                message.sent_at = now
                message.save(update_fields=["delivery_status", "sent_at", "attempts"])
                stats["delivered"] += 1
            else:
                message.last_error = msg_id_or_error[:500]
                message.save(update_fields=["last_error", "attempts"])

                if message.attempts >= max_attempts:
                    message.delivery_status = "failed"
                    message.save(update_fields=["delivery_status"])
                    stats["failed"] += 1
                    stats["errors"].append({
                        "message_id": str(message.id),
                        "error": msg_id_or_error,
                    })
                    # TODO: Alert staff

    return stats


def _deliver_message(message: Message) -> tuple[bool, str]:
    """Internal: attempt to deliver an outbound message via network adapter."""
    if message.direction != "out":
        return False, "Not an outbound message"

    if message.conversation.kind != "doctor":
        # Support messages don't go through network adapter, just mark delivered
        return True, ""

    try:
        from apps.integrations.services import send_chat_to_network
        send_chat_to_network(message)
        return True, ""
    except ImportError:
        return False, "integrations app not available"
    except Exception as e:
        return False, str(e)


def notify_patient(
    patient_profile,
    template_key: str,
    context: dict = None,
) -> None:
    """Send a content-free notification (SMS or email) to patient.

    Args:
        patient_profile: PatientProfile instance
        template_key: Template key (e.g., 'new_message', 'rx_written')
        context: Template context (no PHI content), optional (default None)
    """
    if not patient_profile or not patient_profile.user:
        return

    if context is None:
        context = {}

    user = patient_profile.user
    context_with_url = {
        "portal_url": settings.PORTAL_BASE_URL,
        **context,
    }

    # Send SMS if phone exists
    if user.phone:
        sms_notifier = get_notifier(settings.SMS_BACKEND)
        success, msg_id = sms_notifier.send(user.phone, template_key, context_with_url)
        NotificationDelivery.objects.create(
            patient=patient_profile,
            channel="sms",
            template_key=template_key,
            status="sent" if success else "failed",
            provider_message_id=msg_id if success else "",
            error=msg_id if not success else "",
        )

    # Send email
    if user.email:
        email_notifier = get_notifier(settings.EMAIL_NOTIFY_BACKEND)
        success, msg_id = email_notifier.send(user.email, template_key, context_with_url)
        NotificationDelivery.objects.create(
            patient=patient_profile,
            channel="email",
            template_key=template_key,
            status="sent" if success else "failed",
            provider_message_id=msg_id if success else "",
            error=msg_id if not success else "",
        )


def _build_patient_messages_export(patient_profile) -> dict:
    """Build messaging data for patient export (called by patients.export.build_export).

    Returns a dict with conversations and message count (no decrypted message bodies).
    """
    conversations = Conversation.objects.filter(patient=patient_profile).select_related(
        "treatment",
        "visit",
    )

    return {
        "conversations": [
            {
                "id": str(c.id),
                "kind": c.kind,
                "state": c.state,
                "message_count": c.messages.count(),
                "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
                "created_at": c.created_at.isoformat(),
            }
            for c in conversations
        ],
    }


def track_checkout_reached(submission) -> AbandonedCheckout | None:
    """Track a submission that has reached the checkout node (idempotent).

    Only creates a record if the patient email is available (after auth node).
    If already tracked, returns the existing record without modification.

    Args:
        submission: questionnaires.Submission instance

    Returns:
        AbandonedCheckout instance, or None if patient/email not available yet
    """
    if not submission.patient:
        # Patient not authenticated yet, no email to track
        return None

    patient = submission.patient
    email = patient.user.email if patient.user else None
    if not email:
        return None

    # Check if already tracking this submission
    existing = AbandonedCheckout.objects.filter(submission=submission).first()
    if existing:
        return existing

    # Stop any previous drip for this patient (they may have abandoned and started again)
    # But only if the previous one hasn't been completed yet
    try:
        old_checkout = AbandonedCheckout.objects.filter(
            patient=patient,
            completed_at__isnull=True,
            stopped_at__isnull=True,
        ).latest("created_at")
        # Only stop if it's from a different submission
        if old_checkout.submission_id != submission.id:
            old_checkout.stopped_at = timezone.now()
            old_checkout.save(update_fields=["stopped_at"])
    except AbandonedCheckout.DoesNotExist:
        pass

    # Create new drip tracking
    now = timezone.now()
    return AbandonedCheckout.objects.create(
        patient=patient,
        submission=submission,
        email=email,
        started_at=now,
        reached_checkout_at=now,
    )


def mark_checkout_completed(patient_or_submission) -> None:
    """Mark an abandoned checkout drip as completed (purchase completed).

    Idempotent: calling multiple times is safe.

    Args:
        patient_or_submission: Either a PatientProfile or questionnaires.Submission
    """
    if hasattr(patient_or_submission, "patient"):
        # It's a Submission
        submission = patient_or_submission
        patient = submission.patient
    else:
        # It's a PatientProfile
        patient = patient_or_submission
        submission = None

    now = timezone.now()

    # Mark all active drips for this patient as completed
    query = AbandonedCheckout.objects.filter(
        patient=patient,
        completed_at__isnull=True,
        stopped_at__isnull=True,
    )

    # If submission provided, prioritize that one
    if submission:
        if query.filter(submission=submission).exists():
            query.filter(submission=submission).update(
                completed_at=now,
                stopped_at=now,
            )
            return

    # Otherwise mark all as completed
    query.update(
        completed_at=now,
        stopped_at=now,
    )
