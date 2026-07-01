"""
Refill and titration views.

Endpoints:
  POST /api/refills/same-dose/      — same-dose refill via Beluga Trigger Refill
  POST /api/refills/titration/      — titration check-in via Beluga visit creation
  GET  /api/prescriptions/me/refill-config/  — drug config for active prescription
"""

from __future__ import annotations

import logging
import uuid
from decimal import Decimal, InvalidOperation

from django.conf import settings
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsPatient
from apps.audit.services import log_audit_event
from apps.common.validation.refill import (
    get_refill_cooldown,
    validate_refill_request_allowed,
)
from apps.integrations.adapters import beluga_client
from apps.intakes.models import RefillRequest, SideEffectCheckIn, WeightCheckinPhoto
from apps.intakes.permissions import patient_has_active_prescription
from apps.prescriptions.models import PatientPrescription
from apps.reviews.models import ProviderReview

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# User-facing status messages for same-dose refill
# ---------------------------------------------------------------------------

BELUGA_STATUS_MESSAGES: dict[str, str] = {
    "NEW_RX_SENT": "Your refill has been sent to the pharmacy.",
    "RX_TIME_OUT_OF_RANGE": (
        "It's too early or too late to refill right now. "
        "Your care team will follow up."
    ),
    "NO_MORE_REFILLS": (
        "You have no remaining refills. "
        "Contact support to discuss your options."
    ),
    "NEEDS_CHECKIN": (
        "A provider check-in is required before your next refill. "
        "Please use the dose change form."
    ),
    "NO_VISIT": (
        "We couldn't find an active visit with your pharmacy partner. "
        "Contact support."
    ),
    "not_configured": (
        "Refill request saved. Pharmacy integration is being set up — "
        "your care team will follow up."
    ),
    "not_sent": "Refill request saved. Your care team will process it shortly.",
    "connection_error": (
        "We couldn't reach the pharmacy system right now. "
        "Your request has been saved and your care team will follow up."
    ),
}

_DEFAULT_BELUGA_MESSAGE = (
    "Your refill request has been received. Your care team will follow up."
)

# Same-dose refills resolve synchronously (Beluga's Trigger Refill endpoint
# returns the outcome directly, no async doctor-review webhook follows) — so
# RefillRequest.status can be set immediately from the response status.
_SAME_DOSE_APPROVED_STATUSES = {"NEW_RX_SENT"}
_SAME_DOSE_DENIED_STATUSES = {
    "NO_MORE_REFILLS",
    "RX_ERROR",
    "RX_MISMATCH",
    "INCORRECT_PHARMACY_INTEGRATION",
    "GENERIC",
}


def _same_dose_refill_status(beluga_status: str) -> str:
    if beluga_status in _SAME_DOSE_APPROVED_STATUSES:
        return "approved"
    if beluga_status in _SAME_DOSE_DENIED_STATUSES:
        return "denied"
    return "pending"

# ---------------------------------------------------------------------------
# User-facing messages for titration check-in
# ---------------------------------------------------------------------------

TITRATION_MESSAGES: dict[str, str] = {
    "success": (
        "Your dose change request has been submitted to your provider for review."
    ),
    "not_configured": (
        "Your check-in has been saved. Pharmacy integration is being set up — "
        "your care team will follow up."
    ),
    "connection_error": (
        "We couldn't reach your provider's system right now. "
        "Your check-in is saved and your care team will follow up."
    ),
}

_VALID_TITRATION_DIRECTIONS = {"increase", "decrease", "same"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _compute_bmi(weight_lbs, height_ft, height_in) -> float | None:
    total_in = (height_ft or 0) * 12 + (height_in or 0)
    if total_in <= 0 or not weight_lbs:
        return None
    return round(703 * float(weight_lbs) / (total_in ** 2), 1)


def _titration_label(direction: str) -> str:
    if direction == "increase":
        return "Increase"
    if direction == "decrease":
        return "Decrease"
    return "Stay the same"


def _get_active_prescription(user) -> PatientPrescription | None:
    return (
        PatientPrescription.objects.filter(user=user, is_active=True)
        .select_related("provider_review")
        .first()
    )


def _get_master_id(rx: PatientPrescription) -> str:
    """Return the Beluga masterId stored in ProviderReview for same-dose refill."""
    review = getattr(rx, "provider_review", None)
    if review is None:
        try:
            review = ProviderReview.objects.get(user=rx.user)
        except ProviderReview.DoesNotExist:
            return ""
    return review.external_review_id or ""


# ---------------------------------------------------------------------------
# SameDoseRefillView
# ---------------------------------------------------------------------------

class SameDoseRefillView(APIView):
    """
    POST /api/refills/same-dose/

    Triggers a same-dose prescription refill via the Beluga Trigger Refill API.
    Requires an active prescription. Enforces 24-hour cooldown.
    """

    permission_classes = [IsPatient]

    def post(self, request):
        user = request.user

        if not patient_has_active_prescription(user):
            return Response(
                {"detail": "Refill requests are available after your prescription is active."},
                status=status.HTTP_403_FORBIDDEN,
            )

        last_refill = (
            RefillRequest.objects.filter(user=user).order_by("-created_at").first()
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

        rx = _get_active_prescription(user)
        if rx is None:
            return Response(
                {"detail": "No active prescription found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        master_id = _get_master_id(rx)
        pharmacy_id = rx.beluga_pharmacy_id or getattr(
            settings, "BELUGA_DEFAULT_PHARMACY_ID", ""
        )

        logger.info(
            "[REFILL] same_dose_refill user_id=%.8s rx_id=%.8s master_id=%.8s",
            str(user.id),
            str(rx.id),
            master_id,
        )

        result = beluga_client.trigger_same_dose_refill(
            master_id=master_id,
            med_id=rx.beluga_med_id,
            pharmacy_id=pharmacy_id,
        )

        beluga_status = result.get("status", "not_sent")

        refill = RefillRequest.objects.create(
            user=user,
            request_type="same_dose",
            status=_same_dose_refill_status(beluga_status),
            beluga_response_status=beluga_status,
            beluga_master_id=master_id,
        )

        log_audit_event(
            user=user,
            action="create",
            resource_type="refill_request",
            resource_id=str(refill.id),
            request=request,
        )

        message = BELUGA_STATUS_MESSAGES.get(beluga_status, _DEFAULT_BELUGA_MESSAGE)

        return Response(
            {
                "id": str(refill.id),
                "request_type": "same_dose",
                "status": refill.status,
                "beluga_status": beluga_status,
                "message": message,
                "created_at": refill.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# TitrationRefillView
# ---------------------------------------------------------------------------

class TitrationRefillView(APIView):
    """
    POST /api/refills/titration/

    Submits a dose-change check-in to Beluga for provider review.
    Accepts multipart/form-data (photo upload optional).
    """

    permission_classes = [IsPatient]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        user = request.user

        if not patient_has_active_prescription(user):
            return Response(
                {
                    "detail": (
                        "Dose change requests are available after your prescription is active."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        rx = _get_active_prescription(user)
        if rx is None:
            return Response(
                {"detail": "No active prescription found."},
                status=status.HTTP_403_FORBIDDEN,
            )

        # --- Parse and validate inputs ---
        titration_direction = (request.data.get("titration_direction") or "").strip()
        if titration_direction not in _VALID_TITRATION_DIRECTIONS:
            return Response(
                {
                    "detail": (
                        "titration_direction must be one of: "
                        + ", ".join(sorted(_VALID_TITRATION_DIRECTIONS))
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        side_effect = (request.data.get("side_effect") or "none").strip()
        side_effect_detail = (request.data.get("side_effect_detail") or "").strip()
        experienced_on_raw = (request.data.get("experienced_on") or "").strip()
        notes = (request.data.get("notes") or "").strip()
        weight_lbs_raw = (request.data.get("weight_lbs") or "").strip()
        photo_file = request.FILES.get("photo")

        # Parse weight_lbs
        weight_lbs: Decimal | None = None
        if weight_lbs_raw:
            try:
                weight_lbs = Decimal(weight_lbs_raw)
                if weight_lbs <= 0:
                    raise InvalidOperation
            except InvalidOperation:
                return Response(
                    {"detail": "weight_lbs must be a positive number."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # Parse experienced_on (optional, default today)
        from django.utils import timezone
        if experienced_on_raw:
            from django.utils.dateparse import parse_date
            experienced_on = parse_date(experienced_on_raw)
            if experienced_on is None:
                return Response(
                    {"detail": "experienced_on must be a valid date (YYYY-MM-DD)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if experienced_on > timezone.now().date():
                return Response(
                    {"detail": "experienced_on cannot be in the future."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            experienced_on = timezone.now().date()

        # Validate side_effect choice
        allowed_side_effects = {choice[0] for choice in SideEffectCheckIn.SIDE_EFFECT_CHOICES}
        if side_effect not in allowed_side_effects:
            side_effect = "none"

        # --- Compute BMI if weight provided ---
        bmi: Decimal | None = None
        eligibility = None
        try:
            from apps.eligibility.models import EligibilityResponse
            eligibility = EligibilityResponse.objects.filter(user=user).first()
        except Exception:
            pass

        if weight_lbs and eligibility:
            bmi_float = _compute_bmi(
                weight_lbs,
                eligibility.height_ft,
                eligibility.height_in,
            )
            if bmi_float is not None:
                bmi = Decimal(str(bmi_float))

        # --- Create SideEffectCheckIn ---
        check_in = SideEffectCheckIn.objects.create(
            user=user,
            side_effect=side_effect,
            side_effect_detail=side_effect_detail if side_effect == "other" else "",
            experienced_on=experienced_on,
            titration_direction=titration_direction,
            weight_lbs=weight_lbs,
            bmi=bmi,
            notes=notes,
        )

        # --- Handle photo upload ---
        photo_bytes: bytes | None = None
        if photo_file:
            try:
                from apps.common import photo_storage

                photo_bytes = photo_file.read()
                storage_key = photo_storage.save_checkin_photo(
                    photo_bytes, user_id=str(user.id)
                )
                WeightCheckinPhoto.objects.create(
                    check_in=check_in,
                    storage_key=storage_key,
                    content_type=photo_file.content_type or "image/jpeg",
                )
            except ValueError as exc:
                # Oversized photo — still proceed without it
                logger.warning(
                    "[TITRATION] photo_rejected user_id=%.8s reason=%s",
                    str(user.id),
                    str(exc),
                )
                photo_bytes = None

        # --- Build Beluga form_obj ---
        drug_cfg = getattr(settings, "BELUGA_DRUG_CONFIGS", {}).get(
            rx.drug_category, {}
        )
        visit_type = drug_cfg.get("visitType", "")

        side_effect_label = dict(SideEffectCheckIn.SIDE_EFFECT_CHOICES).get(
            side_effect, side_effect
        )

        form_obj: dict = {}

        # Identity from user
        form_obj["firstName"] = user.first_name
        form_obj["lastName"] = user.last_name
        form_obj["email"] = user.email
        if getattr(user, "dob", None):
            try:
                form_obj["dob"] = user.dob.isoformat()
            except Exception:
                pass

        # Address from PatientProfile (if available)
        try:
            profile = user.profile
            form_obj["address"] = profile.address or ""
            form_obj["city"] = profile.city or ""
            form_obj["state"] = user.state or ""
            form_obj["zip"] = profile.zip_code or ""
        except Exception:
            form_obj["state"] = user.state or ""

        # Eligibility data
        if eligibility:
            form_obj["selfReportedMeds"] = eligibility.questionnaire_responses.get(
                "medications", ""
            )
            form_obj["allergies"] = eligibility.questionnaire_responses.get(
                "allergies", ""
            )
            form_obj["medicalConditions"] = eligibility.questionnaire_responses.get(
                "medical_conditions", ""
            )
            if eligibility.height_ft is not None:
                form_obj["heightFt"] = eligibility.height_ft
            if eligibility.height_in is not None:
                form_obj["heightIn"] = eligibility.height_in

        # Weight and BMI from submission
        if weight_lbs is not None:
            form_obj["weight"] = str(weight_lbs)
        if bmi is not None:
            form_obj["bmi"] = str(bmi)

        # Titration direction
        form_obj["titration"] = _titration_label(titration_direction)

        # Medication preference
        form_obj["patientPreference"] = [
            {
                "medId": rx.beluga_med_id,
                "name": rx.medication_name,
                "strength": rx.drug_strength,
                "quantity": rx.quantity,
                "refills": str(rx.refills),
            }
        ]

        # Side effect notes as Q/A
        form_obj["Q1"] = "Have you experienced any side effects?"
        form_obj["A1"] = notes or side_effect_label

        # --- New Beluga master_id for this visit ---
        new_master_id = str(uuid.uuid4())
        company = getattr(settings, "BELUGA_COMPANY", "")
        pharmacy_id = rx.beluga_pharmacy_id or getattr(
            settings, "BELUGA_DEFAULT_PHARMACY_ID", ""
        )

        logger.info(
            "[TITRATION] submitting user_id=%.8s rx_id=%.8s drug_category=%s",
            str(user.id),
            str(rx.id),
            rx.drug_category,
        )

        result = beluga_client.submit_titration_checkin(
            master_id=new_master_id,
            form_obj=form_obj,
            visit_type=visit_type,
            company=company,
            pharmacy_id=pharmacy_id,
        )

        beluga_status = result.get("status", "not_configured")
        visit_id = ""
        data = result.get("data") or {}
        if isinstance(data, dict):
            visit_id = data.get("visitId", "") or ""

        # --- Submit photo to Beluga if we have visit_id and photo ---
        if visit_id and photo_bytes:
            beluga_client.submit_photo(visit_id=visit_id, jpeg_bytes=photo_bytes)

        # --- Determine titration message ---
        if beluga_status in ("not_configured", "connection_error"):
            message = TITRATION_MESSAGES.get(beluga_status, TITRATION_MESSAGES["not_configured"])
        else:
            message = TITRATION_MESSAGES["success"]

        # --- Create RefillRequest ---
        refill = RefillRequest.objects.create(
            user=user,
            request_type="titration",
            side_effect_check_in=check_in,
            titration_direction=titration_direction,
            beluga_response_status=beluga_status,
            beluga_visit_id=visit_id,
            beluga_master_id=new_master_id,
        )

        log_audit_event(
            user=user,
            action="create",
            resource_type="refill_request",
            resource_id=str(refill.id),
            request=request,
        )

        return Response(
            {
                "id": str(refill.id),
                "request_type": "titration",
                "status": refill.status,
                "titration_direction": titration_direction,
                "beluga_status": beluga_status,
                "beluga_visit_id": visit_id,
                "message": message,
                "created_at": refill.created_at.isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )


# ---------------------------------------------------------------------------
# RefillConfigView
# ---------------------------------------------------------------------------

class RefillConfigView(APIView):
    """
    GET /api/prescriptions/me/refill-config/

    Returns the drug category and per-drug form config for the patient's
    active prescription, so the frontend knows which fields to render.
    """

    permission_classes = [IsPatient]

    def get(self, request):
        user = request.user

        rx = _get_active_prescription(user)
        drug_category = rx.drug_category if rx else "other"

        drug_configs = getattr(settings, "BELUGA_DRUG_CONFIGS", {})
        cfg = drug_configs.get(drug_category, drug_configs.get("other", {}))

        return Response(
            {
                "drug_category": drug_category,
                "titration_field": cfg.get("titrationField", False),
                "collects_weight": cfg.get("collectsWeight", False),
                "collects_photo": cfg.get("collectsPhoto", False),
                "collects_bmi": cfg.get("collectsBMI", False),
                "collects_notes": cfg.get("collectsNotes", True),
            }
        )
