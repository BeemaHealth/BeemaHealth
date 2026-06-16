from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.audit.services import log_audit_event
from apps.eligibility.models import EligibilityResponse
from apps.eligibility.serializers import EligibilitySerializer


class EligibilityMeView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        try:
            record = EligibilityResponse.objects.get(user=request.user)
        except EligibilityResponse.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="eligibility",
            resource_id=str(record.id),
            request=request,
        )
        return Response(EligibilitySerializer(record).data)

    def post(self, request):
        if EligibilityResponse.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "Eligibility record already exists. Use PATCH to update."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = EligibilitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        record = serializer.save(user=request.user)
        log_audit_event(
            user=request.user,
            action="create",
            resource_type="eligibility",
            resource_id=str(record.id),
            request=request,
        )
        return Response(EligibilitySerializer(record).data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        try:
            record = EligibilityResponse.objects.get(user=request.user)
        except EligibilityResponse.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = EligibilitySerializer(record, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        record = serializer.save()
        log_audit_event(
            user=request.user,
            action="update",
            resource_type="eligibility",
            resource_id=str(record.id),
            request=request,
        )
        return Response(EligibilitySerializer(record).data)
