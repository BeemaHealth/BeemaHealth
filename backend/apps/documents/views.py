from django.conf import settings
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.audit.services import log_audit_event
from apps.documents.models import UploadedDocument
from apps.documents.serializers import DocumentUploadRequestSerializer, UploadedDocumentSerializer
from apps.documents.storage import generate_presigned_upload, save_local_upload


class DocumentListCreateView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        docs = UploadedDocument.objects.filter(user=request.user)
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="document_list",
            resource_id=str(request.user.id),
            request=request,
        )
        return Response(UploadedDocumentSerializer(docs, many=True).data)

    def post(self, request):
        serializer = DocumentUploadRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        presign = generate_presigned_upload(
            str(request.user.id),
            data["document_type"],
            data["filename"],
            data["content_type"],
        )
        doc = UploadedDocument.objects.create(
            user=request.user,
            document_type=data["document_type"],
            file_key=presign["file_key"],
            original_filename=data["filename"],
            content_type=data["content_type"],
        )
        log_audit_event(
            user=request.user,
            action="create",
            resource_type="document",
            resource_id=str(doc.id),
            request=request,
        )
        return Response(
            {
                "document": UploadedDocumentSerializer(doc).data,
                "upload": presign,
            },
            status=status.HTTP_201_CREATED,
        )


class DocumentFileUploadView(APIView):
    """Local-dev upload endpoint — writes bytes to MEDIA_ROOT when S3 is disabled."""

    permission_classes = [IsPatient]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, document_id):
        if settings.USE_S3_STORAGE:
            return Response(
                {"detail": "Direct upload is not available when S3 storage is enabled."},
                status=status.HTTP_405_METHOD_NOT_ALLOWED,
            )

        try:
            doc = UploadedDocument.objects.get(id=document_id, user=request.user)
        except UploadedDocument.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        prefix = f"local/{request.user.id}/"
        if not doc.file_key.startswith(prefix):
            return Response(status=status.HTTP_403_FORBIDDEN)

        file_obj = request.FILES.get("file")
        if not file_obj:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        if file_obj.size > settings.MAX_DOCUMENT_UPLOAD_BYTES:
            return Response({"detail": "File is too large."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            save_local_upload(doc.file_key, file_obj)
        except ValueError:
            return Response(status=status.HTTP_403_FORBIDDEN)

        log_audit_event(
            user=request.user,
            action="update",
            resource_type="document",
            resource_id=str(doc.id),
            request=request,
        )
        return Response(UploadedDocumentSerializer(doc).data)
