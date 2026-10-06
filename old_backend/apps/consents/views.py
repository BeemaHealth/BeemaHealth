import json
import logging

from django.utils import timezone
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.audit.services import log_audit_event
from apps.common.dev_logging import dev_log
from apps.consents.models import ConsentRecord
from apps.consents.serializers import ConsentRecordSerializer
from apps.eligibility.models import EligibilityResponse
from apps.intakes.models import MedicalIntake, SafetyFlag
from apps.intakes.screening import refresh_account_screening
from apps.intakes.questionnaire_sync import sync_canonical_fields_from_questionnaire
from apps.intakes.services import compute_safety_flags
from apps.intakes.submissions import create_intake_submission
from apps.patients.models import PatientProfile
from apps.patients.services import sync_patient_profile_from_intake
from apps.questionnaires.beluga_payload import (
    beluga_payload_is_ready,
    build_beluga_visit_payload,
)
from apps.questionnaires.services import (
    get_version_by_id,
    responses_accept_legal_consent,
    version_requires_beluga_submit_validation,
)

logger = logging.getLogger(__name__)


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
        consents_accepted = bool(
            pre_signup.get("terms")
            and pre_signup.get("privacy")
            and pre_signup.get("telehealth")
        )
        # In the dynamic questionnaire flow, Terms/Privacy/Telehealth are
        # accepted via a `legal_consent` field during the intake rather than at
        # eligibility. Honor that acceptance as well.
        intake = MedicalIntake.objects.filter(user=request.user).first()
        if not consents_accepted and intake:
            consents_accepted = responses_accept_legal_consent(
                intake.questionnaire_version_id,
                intake.questionnaire_responses or {},
            )
        if not consents_accepted:
            return Response(
                {
                    "detail": (
                        "Terms of Service, Privacy Policy, and Telehealth Consent "
                        "must be accepted before submitting."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        consent = serializer.save(
            user=request.user,
            signed_at=timezone.now(),
            privacy_acknowledgment=True,
        )

        if intake:
            if (
                intake.questionnaire_version_id
                and intake.questionnaire_responses
                and version_requires_beluga_submit_validation(intake.questionnaire_version_id)
            ):
                profile = PatientProfile.objects.filter(user=request.user).first()
                intake_version = get_version_by_id(intake.questionnaire_version_id)
                qualify_version = None
                qualify_responses: dict = {}
                if eligibility and eligibility.questionnaire_version_id:
                    qualify_version = get_version_by_id(eligibility.questionnaire_version_id)
                    qualify_responses = dict(eligibility.questionnaire_responses or {})
                sex = ""
                if eligibility and eligibility.sex_assigned_at_birth:
                    sex = eligibility.sex_assigned_at_birth
                elif profile and profile.sex_assigned_at_birth:
                    sex = profile.sex_assigned_at_birth
                identity = dict(intake.identity or {})
                beluga_payload = build_beluga_visit_payload(
                    intake_version=intake_version,
                    intake_responses=intake.questionnaire_responses or {},
                    qualify_version=qualify_version,
                    qualify_responses=qualify_responses,
                    account={
                        "first_name": request.user.first_name,
                        "last_name": request.user.last_name,
                        "email": request.user.email,
                        "phone": request.user.phone or "",
                        "dob": request.user.dob.isoformat() if request.user.dob else "",
                        "state": request.user.state or "",
                    },
                    identity_contact={
                        "address": identity.get("address") or (profile.address if profile else ""),
                        "city": identity.get("city") or (profile.city if profile else ""),
                        "zip": identity.get("zip") or (profile.zip_code if profile else ""),
                    },
                    sex=sex or None,
                )
                dev_log(
                    logger,
                    "[BELUGA PAYLOAD] Consent-time validation for user=%s intake=%s — "
                    "per-question Beluga field audit (ready=%s, %s/%s required filled):\n%s",
                    request.user.id,
                    intake.id,
                    beluga_payload.get("ready"),
                    beluga_payload.get("ready_count"),
                    beluga_payload.get("required_count"),
                    json.dumps(beluga_payload.get("fields"), indent=2, default=str),
                )
                if not beluga_payload_is_ready(beluga_payload):
                    missing = ", ".join(beluga_payload.get("missing") or []) or "required fields"
                    return Response(
                        {
                            "detail": (
                                "Your intake is missing required clinician review fields "
                                f"({missing}). Please complete your intake before submitting."
                            ),
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

            intake.status = "submitted"
            intake.submitted_at = timezone.now()
            refresh_account_screening(intake)
            sync_canonical_fields_from_questionnaire(intake)
            sync_patient_profile_from_intake(
                request.user, intake.identity, intake.medication_preferences
            )
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
