from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.audit.services import log_audit_event
from apps.intakes.models import MedicalIntake, RefillRequest, SideEffectCheckIn
from apps.intakes.permissions import (
    patient_can_edit_intake,
    patient_can_edit_intake_screening,
    patient_has_active_prescription,
)
from apps.intakes.screening import refresh_account_screening
from apps.intakes.questionnaire_sync import sync_canonical_fields_from_questionnaire
from apps.common.validation.refill import (
    get_refill_cooldown,
    validate_refill_request_allowed,
)
from apps.intakes.serializers import (
    IntakeSubmissionSerializer,
    MedicalIntakeSerializer,
    SideEffectCheckInSerializer,
)
from apps.intakes.submissions import get_active_submission, resubmit_intake


def intake_response(intake: MedicalIntake) -> dict:
    data = MedicalIntakeSerializer(intake).data
    data["can_edit"] = patient_can_edit_intake(intake)
    active = get_active_submission(intake)
    data["active_submission"] = (
        IntakeSubmissionSerializer(active).data if active else None
    )
    return data


class MedicalIntakeMeView(APIView):
    permission_classes = [IsPatient]

    def get_object(self, user):
        intake, _ = MedicalIntake.objects.get_or_create(user=user)
        return intake

    def get(self, request):
        intake = self.get_object(request.user)
        sync_canonical_fields_from_questionnaire(intake)
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="medical_intake",
            resource_id=str(intake.id),
            request=request,
        )
        return Response(intake_response(intake))

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
        return Response(intake_response(intake), status=status.HTTP_201_CREATED)

    def patch(self, request):
        intake = self.get_object(request.user)
        if not patient_can_edit_intake(intake):
            return Response(
                {
                    "detail": (
                        "This intake cannot be edited. "
                        "If your clinician requested changes, use the resubmit flow."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = MedicalIntakeSerializer(
            intake, data=request.data, partial=True, context={"user": request.user}
        )
        serializer.is_valid(raise_exception=True)
        intake = serializer.save()
        log_audit_event(
            user=request.user,
            action="update",
            resource_type="medical_intake",
            resource_id=str(intake.id),
            request=request,
        )
        return Response(intake_response(intake))


class IntakeRefreshAccountScreeningView(APIView):
    permission_classes = [IsPatient]

    def post(self, request):
        intake = MedicalIntake.objects.filter(user=request.user).first()
        if intake is None:
            return Response(
                {"detail": "No intake found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not patient_can_edit_intake_screening(intake):
            return Response(
                {
                    "detail": (
                        "Account and eligibility screening cannot be changed "
                        "while your intake is under review."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        refresh_account_screening(intake)
        log_audit_event(
            user=request.user,
            action="update",
            resource_type="medical_intake",
            resource_id=str(intake.id),
            request=request,
        )
        intake.refresh_from_db()
        return Response(intake_response(intake))


class IntakeSubmissionsMeView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        from apps.intakes.models import IntakeSubmission

        submissions = IntakeSubmission.objects.filter(user=request.user).order_by("-version")
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="intake_submission",
            resource_id="list",
            request=request,
        )
        return Response(IntakeSubmissionSerializer(submissions, many=True).data)


class IntakeResubmitMeView(APIView):
    permission_classes = [IsPatient]

    def post(self, request):
        intake = MedicalIntake.objects.filter(user=request.user).first()
        if intake is None:
            return Response(
                {"detail": "No intake found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if intake.status != "more_info_needed":
            return Response(
                {"detail": "Resubmit is only available when more information is needed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        submission = resubmit_intake(request.user, intake)
        log_audit_event(
            user=request.user,
            action="create",
            resource_type="intake_submission",
            resource_id=str(submission.id),
            request=request,
        )
        intake.refresh_from_db()
        return Response(intake_response(intake), status=status.HTTP_200_OK)


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
        if not patient_has_active_prescription(request.user):
            return Response(
                {
                    "detail": "Side effect check-ins are available after your prescription is active."
                },
                status=status.HTTP_403_FORBIDDEN,
            )
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
    side_effect_check_in_id = serializers.UUIDField(required=False, allow_null=True)

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


def _refill_cooldown_payload(user) -> dict:
    last_refill = RefillRequest.objects.filter(user=user).order_by("-created_at").first()
    cooldown = get_refill_cooldown(last_refill)
    payload = {
        "active": cooldown.active,
        "retry_after": cooldown.retry_after.isoformat() if cooldown.retry_after else None,
        "hours_remaining": cooldown.hours_remaining,
    }
    return payload


class RefillRequestMeView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        requests = RefillRequest.objects.filter(user=request.user)
        return Response(
            {
                "refill_requests": RefillRequestSerializer(requests, many=True).data,
                "cooldown": _refill_cooldown_payload(request.user),
            }
        )

    def post(self, request):
        if not patient_has_active_prescription(request.user):
            return Response(
                {"detail": "Refill requests are available after your prescription is active."},
                status=status.HTTP_403_FORBIDDEN,
            )
        last_refill = (
            RefillRequest.objects.filter(user=request.user).order_by("-created_at").first()
        )
        cooldown_error = validate_refill_request_allowed(last_refill)
        if cooldown_error:
            cooldown = get_refill_cooldown(last_refill)
            return Response(
                {
                    "detail": cooldown_error,
                    "retry_after": (
                        cooldown.retry_after.isoformat() if cooldown.retry_after else None
                    ),
                    "hours_remaining": cooldown.hours_remaining,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
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