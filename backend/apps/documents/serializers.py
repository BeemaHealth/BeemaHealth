from rest_framework import serializers

from apps.common.validation.documents import (
    normalize_document_filename,
    validate_document_content_type,
    validate_document_filename,
)
from apps.documents.models import UploadedDocument


class DocumentUploadRequestSerializer(serializers.Serializer):
    document_type = serializers.ChoiceField(choices=UploadedDocument.DOCUMENT_TYPES)
    filename = serializers.CharField(max_length=255)
    content_type = serializers.CharField(max_length=128, default="application/octet-stream")

    def validate_filename(self, value: str) -> str:
        normalized = normalize_document_filename(value)
        err = validate_document_filename(normalized)
        if err:
            raise serializers.ValidationError(err)
        return normalized

    def validate_content_type(self, value: str) -> str:
        err = validate_document_content_type(value)
        if err:
            raise serializers.ValidationError(err)
        return value.strip().lower()


class UploadedDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = UploadedDocument
        fields = [
            "id",
            "document_type",
            "file_key",
            "file_url",
            "original_filename",
            "content_type",
            "uploaded_at",
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        from django.conf import settings

        if not settings.USE_S3_STORAGE:
            return None
        from apps.documents.storage import get_s3_client

        client = get_s3_client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.AWS_STORAGE_BUCKET_NAME, "Key": obj.file_key},
            ExpiresIn=3600,
        )
