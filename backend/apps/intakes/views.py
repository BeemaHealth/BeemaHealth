from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.audit.services import log_audit_event
from apps.intakes.models import MedicalIntake, RefillRequest, SideEffectCheckIn
from apps.intakes.serializers import MedicalIntakeSerializer, SideEffectCheckInSerializer


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


class SideEffectCheckInMeView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        check_ins = SideEffectCheckIn.objects.filter(user=request.user)
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="side_effect_check_in",
            resource_id="list",
            request=request,
        )
        return Response(SideEffectCheckInSerializer(check_ins, many=True).data)

    def post(self, request):
        serializer = SideEffectCheckInSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        check_in = serializer.save(user=request.user)
        log_audit_event(
            user=request.user,
            action="create",
            resource_type="side_effect_check_in",
            resource_id=str(check_in.id),
            request=request,
        )
        return Response(
            SideEffectCheckInSerializer(check_in).data,
            status=status.HTTP_201_CREATED,
        )


class RefillRequestSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(read_only=True)

    class Meta:
        model = RefillRequest
        fields = ["id", "user_id", "side_effect_check_in_id", "status", "created_at"]
        read_only_fields = ["id", "user_id", "status", "created_at"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["user_id"] = str(instance.user_id)
        if instance.side_effect_check_in_id:
            data["side_effect_check_in_id"] = str(instance.side_effect_check_in_id)
        if instance.created_at:
            data["created_at"] = instance.created_at.isoformat()
        return data


class RefillRequestMeView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        requests = RefillRequest.objects.filter(user=request.user)
        return Response(RefillRequestSerializer(requests, many=True).data)

    def post(self, request):
        check_in_id = request.data.get("side_effect_check_in_id")
        check_in = None
        if check_in_id:
            try:
                check_in = SideEffectCheckIn.objects.get(
                    id=check_in_id, user=request.user
                )
            except SideEffectCheckIn.DoesNotExist:
                return Response(
                    {"detail": "Side effect check-in not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        refill = RefillRequest.objects.create(
            user=request.user, side_effect_check_in=check_in
        )
        log_audit_event(
            user=request.user,
            action="create",
            resource_type="refill_request",
            resource_id=str(refill.id),
            request=request,
        )
        return Response(
            RefillRequestSerializer(refill).data,
            status=status.HTTP_201_CREATED,
        )
