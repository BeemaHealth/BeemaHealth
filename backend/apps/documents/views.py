from django.http import FileResponse
from django.conf import settings
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.audit.services import log_audit_event
from apps.documents.models import UploadedDocument
from apps.documents.serializers import (
    DocumentUpdateSerializer,
    DocumentUploadRequestSerializer,
    UploadedDocumentSerializer,
)
from apps.documents.storage import (
    delete_stored_document,
    generate_presigned_upload,
    local_document_path,
    save_local_upload,
)


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
        return Response(
            UploadedDocumentSerializer(
                docs,
                many=True,
                context={"request": request},
            ).data
        )

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
                "document": UploadedDocumentSerializer(
                    doc,
                    context={"request": request},
                ).data,
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

        return Response(
            UploadedDocumentSerializer(doc, context={"request": request}).data
        )


class DocumentFileView(APIView):
    """Stream an uploaded document file for the authenticated patient."""

    permission_classes = [IsPatient]

    def get(self, request, document_id):
        try:
            doc = UploadedDocument.objects.get(id=document_id, user=request.user)
        except UploadedDocument.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if settings.USE_S3_STORAGE:
            return Response(
                {"detail": "Use the presigned file_url from the document record."},
                status=status.HTTP_405_METHOD_NOT_ALLOWED,
            )

        prefix = f"local/{request.user.id}/"
        if not doc.file_key.startswith(prefix):
            return Response(status=status.HTTP_403_FORBIDDEN)

        try:
            path = local_document_path(doc.file_key)
        except ValueError:
            return Response(status=status.HTTP_403_FORBIDDEN)

        if not path.is_file():
            return Response(status=status.HTTP_404_NOT_FOUND)

        log_audit_event(
            user=request.user,
            action="read",
            resource_type="document_file",
            resource_id=str(doc.id),
            request=request,
        )

        response = FileResponse(
            path.open("rb"),
            content_type=doc.content_type or "application/octet-stream",
            as_attachment=False,
            filename=doc.original_filename,
        )
        response["Content-Disposition"] = (
            f'inline; filename="{doc.original_filename}"'
        )
        return response


class DocumentDetailView(APIView):
    permission_classes = [IsPatient]

    def _get_document(self, request, document_id):
        try:
            return UploadedDocument.objects.get(id=document_id, user=request.user)
        except UploadedDocument.DoesNotExist:
            return None

    def patch(self, request, document_id):
        doc = self._get_document(request, document_id)
        if not doc:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = DocumentUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        doc.document_type = serializer.validated_data["document_type"]
        doc.save(update_fields=["document_type"])
        log_audit_event(
            user=request.user,
            action="update",
            resource_type="document",
            resource_id=str(doc.id),
            request=request,
        )
        return Response(
            UploadedDocumentSerializer(doc, context={"request": request}).data
        )

    def delete(self, request, document_id):
        doc = self._get_document(request, document_id)
        if not doc:
            return Response(status=status.HTTP_404_NOT_FOUND)

        file_key = doc.file_key
        doc_id = str(doc.id)
        doc.delete()
        try:
            delete_stored_document(file_key)
        except Exception:
            pass
        log_audit_event(
            user=request.user,
            action="delete",
            resource_type="document",
            resource_id=doc_id,
            request=request,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
