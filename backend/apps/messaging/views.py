"""API views for patient messaging (patient-scoped)."""
import re
import uuid
from typing import Any

from django.shortcuts import get_object_or_404
from rest_framework import viewsets, serializers, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.accounts.permissions import IsPatient, get_patient_profile
from .models import Conversation, Message, Attachment
from .services import send_patient_message, notify_patient
from django.conf import settings


class AttachmentSerializer(serializers.ModelSerializer):
    """Attachment serializer (read-only)."""

    class Meta:
        model = Attachment
        fields = ("id", "s3_key", "mime", "size", "created_at")
        read_only_fields = ("id", "created_at")


class MessageSerializer(serializers.ModelSerializer):
    """Message serializer for patient view."""

    attachments = AttachmentSerializer(many=True, read_only=True)
    sender_display_name = serializers.CharField(read_only=True)

    class Meta:
        model = Message
        fields = (
            "id",
            "direction",
            "sender_role",
            "sender_display_name",
            "body",
            "delivery_status",
            "attachments",
            "created_at",
        )
        read_only_fields = (
            "id",
            "direction",
            "sender_role",
            "sender_display_name",
            "delivery_status",
            "created_at",
        )


class ConversationSerializer(serializers.ModelSerializer):
    """Conversation serializer with messages."""

    messages = MessageSerializer(many=True, read_only=True)

    class Meta:
        model = Conversation
        fields = (
            "id",
            "kind",
            "state",
            "last_message_at",
            "unread_for_patient",
            "messages",
            "created_at",
        )
        read_only_fields = (
            "id",
            "kind",
            "state",
            "last_message_at",
            "unread_for_patient",
            "created_at",
        )


MAX_BODY_CHARS = 5000
MAX_ATTACHMENTS = 5
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
ALLOWED_ATTACHMENT_MIMES = frozenset({"image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"})
PRESIGN_SECONDS = 600


class StorageNotConfigured(Exception):
    """Upload storage is not configured."""


def _get_s3_bucket() -> str:
    """Get the S3 bucket for PHI uploads."""
    bucket = getattr(settings, "PHI_UPLOAD_BUCKET", "")
    if not bucket:
        raise StorageNotConfigured("Upload storage is not configured.")
    return bucket


def _get_s3_client() -> Any:
    """Get boto3 S3 client."""
    import boto3
    return boto3.client("s3", region_name=getattr(settings, "AWS_REGION", "us-east-1"))


def _presign_upload(key: str, content_type: str) -> dict[str, Any]:
    """Generate a presigned POST URL for S3 upload."""
    bucket = _get_s3_bucket()
    return _get_s3_client().generate_presigned_post(
        Bucket=bucket,
        Key=key,
        Fields={"Content-Type": content_type, "x-amz-server-side-encryption": "AES256"},
        Conditions=[
            {"Content-Type": content_type},
            {"x-amz-server-side-encryption": "AES256"},
            ["content-length-range", 1, MAX_ATTACHMENT_BYTES],
        ],
        ExpiresIn=PRESIGN_SECONDS,
    )


def _sanitize_filename(filename: str) -> str:
    """Sanitize filename: remove path separators and control characters."""
    if not isinstance(filename, str):
        return ""
    # Remove path separators and suspicious characters
    sanitized = re.sub(r'[/\\]', '', filename)
    # Remove control characters
    sanitized = re.sub(r'[\x00-\x1f\x7f]', '', sanitized)
    # Limit length
    return sanitized[:200] if sanitized else ""


def _clean_attachments(raw, conversation) -> list[tuple[str, str, int]] | None:
    """Validate client supplied attachment refs. Returns None when any entry is unacceptable.

    A key must sit under this conversation's own prefix, so a patient cannot attach another
    patient's stored file (identity photo, other chat) to a message and have it served back.
    """
    if raw is None:
        return []
    if not isinstance(raw, list) or len(raw) > MAX_ATTACHMENTS:
        return None
    prefix = f"messages/{conversation.id}/"
    cleaned = []
    for att in raw:
        if not isinstance(att, dict):
            return None
        key, mime, size = att.get("s3_key"), att.get("mime"), att.get("size")
        if not isinstance(key, str) or not key.startswith(prefix) or ".." in key or len(key) > 300:
            return None
        if mime not in ALLOWED_ATTACHMENT_MIMES:
            return None
        if not isinstance(size, int) or isinstance(size, bool) or not 0 < size <= MAX_ATTACHMENT_BYTES:
            return None
        cleaned.append((key, mime, size))
    return cleaned


class ConversationViewSet(viewsets.ViewSet):
    """Patient conversations (one chat UI with doctor and support threads)."""

    permission_classes = [IsAuthenticated, IsPatient]
    lookup_value_regex = "[0-9a-fA-F-]{36}"

    def list(self, request):
        """List patient's conversations (one per kind)."""
        patient = get_patient_profile(request.user)
        conversations = Conversation.objects.filter(
            patient=patient,
            archived=False,
        ).order_by("-last_message_at")

        serializer = ConversationSerializer(conversations, many=True)
        return Response(serializer.data)

    def retrieve(self, request, pk=None):
        """Get a single conversation with full message history."""
        patient = get_patient_profile(request.user)
        conversation = get_object_or_404(
            Conversation,
            id=pk,
            patient=patient,
        )

        # Mark as read
        conversation.unread_for_patient = False
        conversation.save(update_fields=["unread_for_patient"])

        serializer = ConversationSerializer(conversation)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def send_message(self, request, pk=None):
        """Send a message in a conversation.

        POST body: {"body": "...", "attachments": [{"s3_key": "...", "mime": "...", "size": ...}]}
        """
        patient = get_patient_profile(request.user)
        conversation = get_object_or_404(
            Conversation,
            id=pk,
            patient=patient,
        )

        raw_body = request.data.get("body", "") if hasattr(request.data, "get") else ""
        body = raw_body.strip() if isinstance(raw_body, str) else ""
        if not body or len(body) > MAX_BODY_CHARS:
            return Response(
                {"error": "Message body is required (5000 characters maximum)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        attachments = _clean_attachments(request.data.get("attachments"), conversation)
        if attachments is None:
            return Response({"error": "Invalid attachment"}, status=status.HTTP_400_BAD_REQUEST)

        message = send_patient_message(
            conversation,
            request.user,
            body,
            attachments=tuple(attachments),
        )

        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"])
    def mark_read(self, request):
        """Mark all conversations as read."""
        patient = get_patient_profile(request.user)
        Conversation.objects.filter(patient=patient).update(unread_for_patient=False)
        return Response({"status": "ok"})

    @action(detail=True, methods=["post"])
    def upload_url(self, request, pk=None):
        """Get a presigned S3 URL for file upload.

        POST body: {"filename": "...", "content_type": "image/jpeg", "size": 5000}

        Returns: {"upload_url": "...", "fields": {...}}
        """
        patient = get_patient_profile(request.user)
        conversation = get_object_or_404(
            Conversation,
            id=pk,
            patient=patient,
        )

        # Get and validate input
        filename = request.data.get("filename", "") if hasattr(request.data, "get") else ""
        content_type = request.data.get("content_type", "") if hasattr(request.data, "get") else ""
        file_size = request.data.get("size") if hasattr(request.data, "get") else None

        # Validate content type
        if content_type not in ALLOWED_ATTACHMENT_MIMES:
            return Response(
                {"error": f"Content type not allowed. Allowed: {', '.join(sorted(ALLOWED_ATTACHMENT_MIMES))}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate size
        if not isinstance(file_size, int) or isinstance(file_size, bool):
            return Response(
                {"error": "Size must be an integer"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if file_size <= 0 or file_size > MAX_ATTACHMENT_BYTES:
            return Response(
                {"error": f"File size must be between 1 and {MAX_ATTACHMENT_BYTES} bytes"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate filename (for user feedback, but don't use in S3 key)
        clean_filename = _sanitize_filename(filename)
        if not clean_filename:
            return Response(
                {"error": "Filename is required and must contain valid characters"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Generate S3 key: never put original filename in key, use random UUID
        # Key format: messages/{patient_id}/{conversation_id}/{random_uuid}
        s3_key = f"messages/{patient.id}/{conversation.id}/{uuid.uuid4()}"

        # Generate presigned upload URL
        try:
            presigned = _presign_upload(s3_key, content_type)
        except StorageNotConfigured:
            return Response(
                {"error": "File upload is not available at this time"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({
            "s3_key": s3_key,
            "upload_url": presigned["url"],
            "fields": presigned["fields"],
        })
