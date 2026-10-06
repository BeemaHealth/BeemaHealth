from __future__ import annotations

import json
import logging

from django.conf import settings
from django.db import transaction
from django.db.models import Max
from django.utils import timezone

from apps.common.dev_logging import dev_log

logger = logging.getLogger(__name__)

from apps.consents.models import ConsentRecord
from apps.eligibility.models import EligibilityResponse
from apps.intakes.models import IntakeSubmission, MedicalIntake
from apps.intakes.screening import (
    account_summary_from_screening,
    build_account_screening,
    ensure_account_screening,
)
from apps.intakes.services import compute_bmi
from apps.patients.models import PatientProfile


def _iso(value) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def build_submission_snapshot(
    user,
    intake: MedicalIntake,
    eligibility: EligibilityResponse | None = None,
    profile: PatientProfile | None = None,
    consent: ConsentRecord | None = None,
    *,
    version: int,
    submitted_at,
) -> dict:
    """Freeze a provider-facing denormalized payload at submit time."""
    if eligibility is None:
        eligibility = EligibilityResponse.objects.filter(user=user).first()
    if profile is None:
        profile = PatientProfile.objects.filter(user=user).first()
    if consent is None:
        consent = ConsentRecord.objects.filter(user=user).first()

    identity = dict(intake.identity or {})
    screening = intake.account_screening or ensure_account_screening(intake)
    if not screening:
        screening = build_account_screening(user, eligibility)

    account = {
        "first_name": screening.get("first_name") or user.first_name,
        "last_name": screening.get("last_name") or user.last_name,
        "email": screening.get("email") or user.email,
        "phone": screening.get("phone") or user.phone or "",
        "dob": screening.get("dob") or _iso(user.dob) or "",
        "state": screening.get("state") or user.state or "",
    }

    bmi = screening.get("bmi")
    if bmi is None and eligibility:
        bmi = eligibility.bmi
        if bmi is None and eligibility.height_ft and eligibility.weight_lbs:
            bmi = compute_bmi(
                str(eligibility.height_ft),
                str(eligibility.height_in or 0),
                str(eligibility.weight_lbs),
            )

    eligibility_screening = {}
    if eligibility:
        eligibility_screening = {
            "treatment_interest": eligibility.treatment_interest or "",
            "primary_goal": eligibility.primary_goal or "",
            "treatment_priority": eligibility.treatment_priority or "",
            "target_weight_loss_range": eligibility.target_weight_loss_range or "",
            "height_ft": screening.get("height_ft") if screening.get("height_ft") is not None else eligibility.height_ft,
            "height_in": screening.get("height_in") if screening.get("height_in") is not None else eligibility.height_in,
            "weight_lbs": (
                screening.get("weight_lbs")
                if screening.get("weight_lbs") is not None
                else (str(eligibility.weight_lbs) if eligibility.weight_lbs is not None else None)
            ),
            "goal_weight_lbs": (
                screening.get("goal_weight_lbs")
                if screening.get("goal_weight_lbs") is not None
                else (
                    str(eligibility.goal_weight_lbs)
                    if eligibility.goal_weight_lbs is not None
                    else None
                )
            ),
            "bmi": float(bmi) if bmi is not None else None,
            "sex_assigned_at_birth": eligibility.sex_assigned_at_birth or "",
            "gender_identity": eligibility.gender_identity or "",
            "safety_screen": eligibility.safety_screen or {},
        }
        if profile:
            if profile.sex_assigned_at_birth and not eligibility_screening["sex_assigned_at_birth"]:
                eligibility_screening["sex_assigned_at_birth"] = profile.sex_assigned_at_birth
            if profile.gender_identity and not eligibility_screening["gender_identity"]:
                eligibility_screening["gender_identity"] = profile.gender_identity

    identity_contact = {
        "preferred": (
            identity.get("preferred")
            or identity.get("preferred_name")
            or (profile.preferred_name if profile else "")
            or ""
        ),
        "address": identity.get("address") or (profile.address if profile else "") or "",
        "city": identity.get("city") or (profile.city if profile else "") or "",
        "county": identity.get("county") or (profile.county if profile else "") or "",
        "zip": identity.get("zip") or (profile.zip_code if profile else "") or "",
        "emergency_name": (
            identity.get("emergency_name")
            or (profile.emergency_contact_name if profile else "")
            or ""
        ),
        "emergency_phone": (
            identity.get("emergency_phone")
            or (profile.emergency_contact_phone if profile else "")
            or ""
        ),
        "address_verified": identity.get("address_verified", ""),
    }

    account_summary = account_summary_from_screening(
        {
            **screening,
            **account,
            "height_ft": eligibility_screening.get("height_ft"),
            "height_in": eligibility_screening.get("height_in"),
            "weight_lbs": eligibility_screening.get("weight_lbs"),
            "goal_weight_lbs": eligibility_screening.get("goal_weight_lbs"),
            "bmi": eligibility_screening.get("bmi"),
        }
    )

    consent_data = None
    if consent:
        consent_data = {
            "id": str(consent.id),
            "signed_at": _iso(consent.signed_at),
            "typed_signature": consent.typed_signature,
            "telehealth_consent": consent.telehealth_consent,
            "privacy_acknowledgment": consent.privacy_acknowledgment,
        }

    dynamic_questionnaire = None
    beluga_visit_payload = None
    if intake.questionnaire_version_id and intake.questionnaire_responses:
        from apps.questionnaires.beluga_payload import build_beluga_visit_payload
        from apps.questionnaires.services import build_dynamic_questionnaire_display, get_version_by_id

        dynamic_questionnaire = build_dynamic_questionnaire_display(
            intake.questionnaire_version_id,
            intake.questionnaire_responses or {},
        )
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
        beluga_visit_payload = build_beluga_visit_payload(
            intake_version=intake_version,
            intake_responses=intake.questionnaire_responses or {},
            qualify_version=qualify_version,
            qualify_responses=qualify_responses,
            account=account,
            identity_contact=identity_contact,
            sex=sex or None,
        )

    return {
        "meta": {
            "version": version,
            "submitted_at": _iso(submitted_at),
            "intake_id": str(intake.id),
            "intake_status": intake.status,
        },
        "account": account,
        "account_summary": account_summary,
        "eligibility_screening": eligibility_screening,
        "identity_contact": identity_contact,
        "clinical": {
            "identity": identity,
            "body_metrics": intake.body_metrics or {},
            "weight_history": intake.weight_history or {},
            "medical_conditions": intake.medical_conditions or {},
            "family_history": intake.family_history or {},
            "medications": intake.medications or {},
            "allergies": intake.allergies or {},
            "pregnancy": intake.pregnancy or {},
            "lifestyle": intake.lifestyle or {},
            "labs": intake.labs or {},
            "medication_preferences": intake.medication_preferences or {},
            "safety_acknowledgments": intake.safety_acknowledgments or {},
        },
        "consent": consent_data,
        "dynamic_questionnaire": dynamic_questionnaire,
        "beluga_visit_payload": beluga_visit_payload,
    }


def next_submission_version(user) -> int:
    current = IntakeSubmission.objects.filter(user=user).aggregate(Max("version"))["version__max"]
    return (current or 0) + 1


@transaction.atomic
def create_intake_submission(
    user,
    intake: MedicalIntake,
    *,
    status_at_submit: str = "submitted",
    submitted_at=None,
) -> IntakeSubmission:
    """Create an immutable intake submission snapshot and point intake at it."""
    submitted_at = submitted_at or timezone.now()
    version = next_submission_version(user)
    snapshot = build_submission_snapshot(
        user,
        intake,
        version=version,
        submitted_at=submitted_at,
    )
    submission = IntakeSubmission.objects.create(
        user=user,
        medical_intake=intake,
        version=version,
        status_at_submit=status_at_submit,
        snapshot=snapshot,
        submitted_at=submitted_at,
        questionnaire_version_id=intake.questionnaire_version_id,
    )
    intake.active_submission_version = version
    intake.working_version = version
    intake.save(update_fields=["active_submission_version", "working_version", "updated_at"])

    dev_log(
        logger,
        "[INTAKE SUBMISSION] Full frozen snapshot for user=%s submission_version=%s "
        "intake=%s status_at_submit=%s:\n%s",
        user.id,
        version,
        intake.id,
        status_at_submit,
        json.dumps(snapshot, indent=2, default=str),
    )

    beluga_payload = snapshot.get("beluga_visit_payload")
    if beluga_payload:
        destination = (
            f"{getattr(settings, 'BELUGA_BASE_URL', '') or '<BELUGA_BASE_URL unset>'}/"
            f"{getattr(settings, 'BELUGA_CREATION_PATH', '') or '<BELUGA_CREATION_PATH unset>'}"
        )
        # Structural metadata only (no PHI) — safe to log unconditionally so
        # this line survives even outside DEBUG.
        logger.info(
            "[INTAKE SUBMISSION] Beluga visit payload frozen for user=%s submission_version=%s "
            "ready=%s missing=%s. Outbound POST to Beluga is NOT WIRED YET (see "
            "docs/features/beluga-integration.md) — payload only lives in "
            "IntakeSubmission.snapshot until that lands. It SHOULD be sent to: %s",
            user.id,
            version,
            beluga_payload.get("ready"),
            beluga_payload.get("missing"),
            destination,
        )
        dev_log(
            logger,
            "[BELUGA PAYLOAD] Frozen form_obj + per-question field audit (which question "
            "answered which Beluga field) for user=%s submission_version=%s:\n%s",
            user.id,
            version,
            json.dumps(beluga_payload, indent=2, default=str),
        )
    else:
        logger.info(
            "[INTAKE SUBMISSION] Snapshot saved for user=%s submission_version=%s "
            "(no dynamic questionnaire version — classic intake path, no Beluga payload built).",
            user.id,
            version,
        )

    return submission


def get_active_submission(intake: MedicalIntake) -> IntakeSubmission | None:
    if not intake.active_submission_version:
        return None
    return (
        IntakeSubmission.objects.filter(
            medical_intake=intake,
            version=intake.active_submission_version,
        )
        .order_by("-version")
        .first()
    )


@transaction.atomic
def resubmit_intake(user, intake: MedicalIntake) -> IntakeSubmission:
    """Patient resubmits after more_info_needed — creates a new frozen version."""
    from apps.reviews.models import ProviderReview

    submitted_at = timezone.now()
    submission = create_intake_submission(
        user,
        intake,
        status_at_submit="resubmitted",
        submitted_at=submitted_at,
    )
    intake.status = "submitted"
    intake.submitted_at = submitted_at
    intake.save(update_fields=["status", "submitted_at", "updated_at"])

    review = ProviderReview.objects.filter(user=user).first()
    if review:
        review.status = "submitted"
        review.patient_note = ""
        review.save(update_fields=["status", "patient_note"])

    return submission
