from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.audit.services import log_audit_event
from apps.intakes.models import MedicalIntake
from apps.intakes.serializers import MedicalIntakeSerializer


class MedicalIntakeMeView(APIView):
    permission_classes = [IsPatient]

    def get_object(self, user):
        intake, _ = MedicalIntake.objects.get_or_create(user=user)
        return intake

    def get(self, request):
        intake = self.get_object(request.user)
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="medical_intake",
            resource_id=str(intake.id),
            request=request,
        )
        return Response(MedicalIntakeSerializer(intake).data)

    def post(self, request):
        if MedicalIntake.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "Intake exists. Use PATCH to update."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = MedicalIntakeSerializer(data=request.data, context={"user": request.user})
        serializer.is_valid(raise_exception=True)
        intake = serializer.save(user=request.user)
        log_audit_event(
            user=request.user,
            action="create",
            resource_type="medical_intake",
            resource_id=str(intake.id),
            request=request,
        )
        return Response(MedicalIntakeSerializer(intake).data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        intake = self.get_object(request.user)
        serializer = MedicalIntakeSerializer(intake, data=request.data, partial=True, context={"user": request.user})
        serializer.is_valid(raise_exception=True)
        intake = serializer.save()
        log_audit_event(
            user=request.user,
            action="update",
            resource_type="medical_intake",
            resource_id=str(intake.id),
            request=request,
        )
        return Response(MedicalIntakeSerializer(intake).data)
