from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.audit.services import log_audit_event
from apps.consents.models import ConsentRecord
from apps.consents.serializers import ConsentRecordSerializer
from apps.eligibility.models import EligibilityResponse
from apps.intakes.models import MedicalIntake, SafetyFlag
from apps.intakes.screening import refresh_account_screening
from apps.intakes.services import compute_safety_flags
from apps.intakes.submissions import create_intake_submission


class ConsentMeView(APIView):
    permission_classes = [IsPatient]

    def get(self, request):
        try:
            consent = ConsentRecord.objects.get(user=request.user)
        except ConsentRecord.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        log_audit_event(
            user=request.user,
            action="read",
            resource_type="consent",
            resource_id=str(consent.id),
            request=request,
        )
        return Response(ConsentRecordSerializer(consent).data)

    def post(self, request):
        if ConsentRecord.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "Consent already recorded and cannot be changed."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = ConsentRecordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        eligibility = EligibilityResponse.objects.filter(user=request.user).first()
        pre_signup = (eligibility.pre_signup_consents if eligibility else {}) or {}
        if (
            not pre_signup.get("terms")
            or not pre_signup.get("privacy")
            or not pre_signup.get("telehealth")
        ):
            return Response(
                {
                    "detail": (
                        "Terms of Service, Privacy Policy, and Telehealth Consent "
                        "must be accepted during eligibility."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        consent = serializer.save(
            user=request.user,
            signed_at=timezone.now(),
            privacy_acknowledgment=True,
        )

        intake = MedicalIntake.objects.filter(user=request.user).first()
        if intake:
            intake.status = "submitted"
            intake.submitted_at = timezone.now()
            refresh_account_screening(intake)
            intake.save()
            create_intake_submission(request.user, intake, submitted_at=intake.submitted_at)
            log_audit_event(
                user=request.user,
                action="update",
                resource_type="medical_intake",
                resource_id=str(intake.id),
                request=request,
            )

        SafetyFlag.objects.filter(user=request.user).delete()
        flag_data = compute_safety_flags(
            request.user, eligibility, intake, consent_complete=True
        )
        for item in flag_data:
            SafetyFlag.objects.create(user=request.user, **item)

        log_audit_event(
            user=request.user,
            action="create",
            resource_type="consent",
            resource_id=str(consent.id),
            request=request,
        )
        return Response(ConsentRecordSerializer(consent).data, status=status.HTTP_201_CREATED)
