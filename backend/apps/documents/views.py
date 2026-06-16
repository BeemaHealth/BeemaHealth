from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.audit.services import log_audit_event
from apps.documents.models import UploadedDocument
from apps.documents.serializers import DocumentUploadRequestSerializer, UploadedDocumentSerializer
from apps.documents.storage import generate_presigned_upload


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
