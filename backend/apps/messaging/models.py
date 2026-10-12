"""Messaging models for patient - doctor and patient - support communication."""
from __future__ import annotations

from datetime import datetime, timedelta
from django.db import models
from django.utils import timezone

from apps.common.models import BaseModel
from apps.common.crypto import EncryptedTextField, EncryptedJSONField


class Conversation(BaseModel):
    """A thread between a patient and doctor(s) or customer support."""

    KIND_CHOICES = [
        ("doctor", "Doctor"),
        ("support", "Customer Support"),
    ]

    STATE_CHOICES = [
        ("awaiting_staff", "Awaiting staff response"),
        ("awaiting_doctor", "Awaiting doctor response"),
        ("awaiting_patient", "Awaiting patient response"),
        ("closed", "Closed"),
    ]

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="conversations")
    kind = models.CharField(max_length=10, choices=KIND_CHOICES)
    treatment = models.ForeignKey("clinical.Treatment", on_delete=models.SET_NULL, null=True, blank=True, related_name="conversations")
    visit = models.ForeignKey("clinical.Visit", on_delete=models.SET_NULL, null=True, blank=True, related_name="conversations")
    state = models.CharField(max_length=20, choices=STATE_CHOICES, default="awaiting_patient")
    assignee = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="assigned_conversations")
    archived = models.BooleanField(default=False)
    last_message_at = models.DateTimeField(null=True, blank=True, db_index=True)
    unread_for_patient = models.BooleanField(default=False)
    unread_for_staff = models.BooleanField(default=False)

    class Meta:
        ordering = ["-last_message_at", "-created_at"]
        indexes = [
            models.Index(fields=["patient", "kind"]),
            models.Index(fields=["state", "archived"]),
            models.Index(fields=["assignee", "archived"]),
        ]

    def __str__(self) -> str:
        return f"Conversation {self.id.hex[:8]} ({self.kind})"


class Message(BaseModel):
    """A single message within a conversation."""

    DIRECTION_CHOICES = [
        ("in", "Inbound"),
        ("out", "Outbound"),
    ]

    SENDER_ROLE_CHOICES = [
        ("patient", "Patient"),
        ("doctor", "Doctor"),
        ("customer_success", "Customer Success Manager"),
        ("support", "Support"),
        ("system", "System"),
    ]

    DELIVERY_STATUS_CHOICES = [
        ("queued", "Queued"),
        ("delivered", "Delivered"),
        ("failed", "Failed"),
    ]

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    direction = models.CharField(max_length=3, choices=DIRECTION_CHOICES)
    sender_role = models.CharField(max_length=20, choices=SENDER_ROLE_CHOICES)
    sender_user = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="sent_messages")
    sender_display_name = models.CharField(max_length=255, blank=True)
    body = EncryptedTextField()
    is_media = models.BooleanField(default=False)
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS_CHOICES, default="queued")
    attempts = models.IntegerField(default=0)
    last_error = models.TextField(blank=True, help_text="Error message from last delivery attempt - no PHI")
    external_id = models.CharField(max_length=255, blank=True, db_index=True, help_text="Vendor message ID (e.g., Beluga)")
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["external_id"]),
            models.Index(fields=["delivery_status"]),
        ]

    def __str__(self) -> str:
        return f"Message {self.id.hex[:8]} ({self.sender_role})"


class Attachment(BaseModel):
    """A file attached to a message."""

    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name="attachments")
    s3_key = models.CharField(max_length=500)
    mime = models.CharField(max_length=100)
    size = models.IntegerField(help_text="File size in bytes")

    class Meta:
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"Attachment {self.id.hex[:8]}"


class InternalNote(BaseModel):
    """A staff-only note on a conversation (not visible to patient)."""

    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="internal_notes")
    author = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="internal_notes")
    body = EncryptedTextField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"InternalNote {self.id.hex[:8]}"


class NotificationDelivery(BaseModel):
    """A record of a sent notification (SMS or email)."""

    CHANNEL_CHOICES = [
        ("sms", "SMS"),
        ("email", "Email"),
    ]

    STATUS_CHOICES = [
        ("queued", "Queued"),
        ("sent", "Sent"),
        ("failed", "Failed"),
    ]

    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, related_name="notifications")
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES)
    template_key = models.CharField(
        max_length=50,
        help_text="Template identifier (e.g., new_message, rx_written, abandoned_checkout_1)"
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="queued")
    provider_message_id = models.CharField(max_length=255, blank=True, help_text="Twilio SID, SES MessageId, etc.")
    error = models.TextField(blank=True, help_text="Error message if failed - no PHI")
    sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "template_key"]),
            models.Index(fields=["status"]),
        ]

    def __str__(self) -> str:
        return f"Notification {self.id.hex[:8]} ({self.channel}/{self.template_key})"


class AbandonedCheckout(BaseModel):
    """Track abandoned carts for the drip campaign."""

    submission = models.OneToOneField(
        "questionnaires.Submission",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="abandoned_checkout"
    )
    patient = models.ForeignKey("patients.PatientProfile", on_delete=models.CASCADE, null=True, blank=True, related_name="abandoned_checkouts")
    email = models.EmailField(help_text="Patient email at time of abandonment")
    started_at = models.DateTimeField()
    reached_checkout_at = models.DateTimeField(null=True, blank=True, help_text="When the patient reached the checkout node")
    completed_at = models.DateTimeField(null=True, blank=True, help_text="When the checkout was completed")
    emails_sent = models.JSONField(default=list, help_text="List of step numbers already sent (1-7)")
    stopped_at = models.DateTimeField(null=True, blank=True, help_text="When the drip stopped (completion or unsubscribe)")

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["patient", "completed_at"]),
            models.Index(fields=["stopped_at"]),
        ]

    def __str__(self) -> str:
        return f"AbandonedCheckout {self.id.hex[:8]}"

    def next_step_due(self, now: datetime = None) -> int | None:
        """The next drip step that is due to send, or None if all sent or completed.

        Drip schedule (hours after abandonment): 1, 3, 24, 48, 72, 168, 336, then stop.
        """
        if now is None:
            now = timezone.now()

        if self.completed_at or self.stopped_at:
            return None

        already_sent = set(self.emails_sent) if self.emails_sent else set()
        schedule_hours = [1, 3, 24, 48, 72, 168, 336]

        for step_num, hours in enumerate(schedule_hours, 1):
            if step_num in already_sent:
                continue
            due_at = self.started_at + timedelta(hours=hours)
            if now >= due_at:
                return step_num

        return None
