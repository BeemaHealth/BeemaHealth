from __future__ import annotations

import logging
import uuid
from datetime import date

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.accounts.models import User
from apps.common.dev_logging import dev_log
from apps.intakes.models import MedicalIntake, RefillRequest
from apps.prescriptions.models import PatientPrescription
from apps.prescriptions.services import deactivate_prescriptions
from apps.reviews.models import ProviderReview
from apps.integrations.adapters.base import DoctorWebhookResult
from apps.integrations.adapters.beluga import BelugaWebhookEvent
from apps.patients.notifications import (
    queue_care_team_message_notification,
    queue_status_notification,
)
from apps.patients.care_events import record_beluga_fulfillment_event

logger = logging.getLogger(__name__)


def _parse_date(value) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    return parse_date(str(value))


@transaction.atomic
def apply_doctor_webhook(result: DoctorWebhookResult) -> tuple[ProviderReview, PatientPrescription | None]:
    user = User.objects.get(id=result.patient_id, is_patient=True)
    review, _ = ProviderReview.objects.get_or_create(user=user)
    review.external_review_id = result.external_review_id or review.external_review_id
    review.doctor_partner = review.doctor_partner or "mock"
    review.status = result.status or review.status
    review.decision = result.decision or review.decision
    review.patient_note = result.patient_note or review.patient_note
    review.internal_note = result.internal_note or review.internal_note
    review.reviewed_at = timezone.now()
    review.save()

    intake = MedicalIntake.objects.filter(user=user).first()
    if intake and result.status:
        intake.status = result.status
        intake.save(update_fields=["status", "updated_at"])

    prescription = None
    if result.prescription and result.status in ("approved", "prescription_sent"):
        prescription = _upsert_prescription_from_webhook(
            user=user,
            review=review,
            prescription_data=result.prescription,
            prescriber_data=result.prescriber or {},
        )
    return review, prescription


def _upsert_prescription_from_webhook(
    *,
    user: User,
    review: ProviderReview,
    prescription_data: dict,
    prescriber_data: dict,
) -> PatientPrescription:
    deactivate_prescriptions(user)
    rx_uuid = prescription_data.get("rx_uuid") or prescription_data.get("uuid")
    try:
        parsed_uuid = uuid.UUID(str(rx_uuid)) if rx_uuid else uuid.uuid4()
    except ValueError:
        parsed_uuid = uuid.uuid4()

    from apps.integrations.drug_categories import infer_drug_category

    medication_name = str(
        prescription_data.get("drug_name") or prescription_data.get("medication_name") or ""
    )
    prescription = PatientPrescription.objects.create(
        user=user,
        provider_review=review,
        medication_name=medication_name,
        dosage=str(prescription_data.get("dosage") or prescription_data.get("drug_strength") or ""),
        frequency=str(prescription_data.get("frequency") or ""),
        route=str(prescription_data.get("route") or ""),
        instructions=str(prescription_data.get("instructions") or prescription_data.get("directions") or ""),
        rx_type=str(prescription_data.get("rx_type") or "new"),
        drug_strength=str(prescription_data.get("drug_strength") or prescription_data.get("dosage") or ""),
        drug_form=str(prescription_data.get("drug_form") or ""),
        quantity=str(prescription_data.get("quantity") or "1"),
        quantity_units=str(prescription_data.get("quantity_units") or ""),
        refills=int(prescription_data.get("refills") or 0),
        days_supply=prescription_data.get("days_supply"),
        date_written=_parse_date(prescription_data.get("date_written")),
        effective_date=_parse_date(prescription_data.get("effective_date")),
        schedule_code=str(prescription_data.get("schedule_code") or "0"),
        lf_product_id=prescription_data.get("lf_product_id"),
        rx_uuid=parsed_uuid,
        clinical_difference_statement=str(prescription_data.get("clinical_difference_statement") or ""),
        prescriber_npi=str(prescriber_data.get("npi") or ""),
        prescriber_first_name=str(prescriber_data.get("first_name") or ""),
        prescriber_last_name=str(prescriber_data.get("last_name") or ""),
        prescriber_license_state=str(prescriber_data.get("license_state") or ""),
        prescriber_license_number=str(prescriber_data.get("license_number") or ""),
        prescriber_dea=str(prescriber_data.get("dea") or ""),
        prescriber_address1=str(prescriber_data.get("address1") or prescriber_data.get("address") or ""),
        prescriber_address2=str(prescriber_data.get("address2") or ""),
        prescriber_city=str(prescriber_data.get("city") or ""),
        prescriber_state=str(prescriber_data.get("state") or ""),
        prescriber_zip=str(prescriber_data.get("zip") or prescriber_data.get("zip_code") or ""),
        prescriber_phone=str(prescriber_data.get("phone") or ""),
        prescriber_email=str(prescriber_data.get("email") or ""),
        practice_id=prescriber_data.get("practice_id"),
        external_prescriber_id=str(prescriber_data.get("external_prescriber_id") or ""),
        beluga_med_id=str(prescription_data.get("medId", "")),
        drug_category=infer_drug_category(medication_name),
        fulfillment_status="signed",
        is_active=True,
        signed_at=timezone.now(),
    )
    return prescription


_CONSULT_OUTCOME_MAP = {
    "prescribed": ("prescription_sent", "approved"),
    "referred": ("not_approved", "not_appropriate"),
}

_SHIPPING_EVENT_SUMMARIES = {
    "PHARMACY_ORDER_IN_FULFILLMENT": "The pharmacy is preparing your order.",
    "PHARMACY_ORDER_SHIPPED": "Your order has shipped.",
    "PHARMACY_ORDER_DELIVERED": "Your order has been delivered.",
    "PACKAGE_IN_TRANSIT": "Your package is on its way.",
    "PACKAGE_OUT_FOR_DELIVERY": "Your package is out for delivery.",
    "PACKAGE_DELIVERED": "Your package has been delivered.",
    "PACKAGE_DELIVERY_FAILED": (
        "We weren't able to deliver your package. "
        "Please contact our support team at support@aretide.com — "
        "do not submit a refill request for a delivery issue."
    ),
}

_SHIPPING_EVENT_SUBJECTS = {
    "PACKAGE_DELIVERY_FAILED": "Delivery issue with your Aretide order",
}

_LAB_EVENT_SUMMARIES = {
    "LAB_ORDER_REQUISITION_CREATED": "Your lab requisition is ready.",
    "LAB_ORDER_SHIPPED_TO_PATIENT": "Your lab kit has shipped.",
    "LAB_ORDER_DELIVERED_TO_PATIENT": "Your lab kit has been delivered.",
    "LAB_ORDER_SHIPPED_TO_LAB": "Your sample is on its way to the lab.",
    "LAB_ORDER_RECEIVED_BY_LAB": "The lab has received your sample.",
    "LAB_ORDER_RESULTS": "Your lab results are ready.",
}

_BOOKING_EVENT_SUMMARIES = {
    "BOOKING_CREATED": "Your appointment has been scheduled.",
    "BOOKING_RESCHEDULED": "Your appointment has been rescheduled.",
    "BOOKING_CANCELLED": "Your appointment has been canceled.",
    "NO_SHOW": "You missed your scheduled appointment. Please rebook if needed.",
}


@transaction.atomic
def apply_beluga_webhook(event: BelugaWebhookEvent) -> dict:
    """
    Apply a Beluga webhook event to our data models.

    Resolves the patient from event.master_id in two steps:
      1. A titration RefillRequest whose beluga_master_id matches (each titration
         visit gets a freshly generated masterId, so this match is unambiguous).
      2. Otherwise, the ProviderReview whose external_review_id matches — covers
         the initial consult and same-dose refills, which share that masterId.
    Raises ValueError (-> 400 at the view layer) if neither resolves.
    """
    refill = (
        RefillRequest.objects.select_related("user")
        .filter(beluga_master_id=event.master_id, request_type="titration")
        .exclude(beluga_master_id="")
        .first()
    )
    if refill is not None:
        user = refill.user
        review, _ = ProviderReview.objects.get_or_create(user=user)
        logger.info(
            "[BELUGA WEBHOOK] resolved masterId=%s -> titration RefillRequest id=%s user=%s",
            event.master_id, refill.id, user.id,
        )
    else:
        try:
            review = ProviderReview.objects.select_related("user").get(
                external_review_id=event.master_id
            )
            user = review.user
            logger.info(
                "[BELUGA WEBHOOK] resolved masterId=%s -> ProviderReview id=%s user=%s "
                "(initial consult or same-dose refill)",
                event.master_id, review.id, user.id,
            )
        except ProviderReview.DoesNotExist:
            logger.warning(
                "[BELUGA WEBHOOK] unresolved masterId=%s event=%s — no titration RefillRequest "
                "or ProviderReview matched",
                event.master_id, event.event,
            )
            raise ValueError(
                f"No visit found for masterId={event.master_id!r}"
            )

    review.doctor_partner = "beluga"
    result: dict = {"event": event.event, "master_id": event.master_id}

    if event.event == "CONSULT_CONCLUDED":
        outcome = (event.visit_outcome or "").lower()
        new_status, new_decision = _CONSULT_OUTCOME_MAP.get(
            outcome, ("not_approved", "not_appropriate")
        )
        review.status = new_status
        review.decision = new_decision
        review.reviewed_at = timezone.now()
        review.save()
        _sync_intake_status(user, new_status)
        if refill is not None:
            refill.status = "approved" if outcome == "prescribed" else "denied"
            refill.save(update_fields=["status"])
        if new_status == "prescription_sent":
            summary = "Your provider has completed your visit and approved treatment."
        else:
            summary = "Your provider has completed your visit. Treatment was not approved at this time."
        queue_status_notification(
            user,
            category="review",
            subject="Update on your Aretide visit",
            summary=summary,
        )
        result.update({"status": new_status, "decision": new_decision})
        logger.info(
            "[BELUGA WEBHOOK] CONSULT_CONCLUDED masterId=%s user=%s visitOutcome=%s -> "
            "review.status=%s review.decision=%s refill_status=%s notification=queued(review)",
            event.master_id, user.id, event.visit_outcome, new_status, new_decision,
            (refill.status if refill is not None else "n/a"),
        )

    elif event.event == "CONSULT_CANCELED":
        review.status = "not_approved"
        review.reviewed_at = timezone.now()
        review.save()
        _sync_intake_status(user, "not_approved")
        if refill is not None:
            refill.status = "denied"
            refill.save(update_fields=["status"])
        queue_status_notification(
            user,
            category="review",
            subject="Your Aretide visit was canceled",
            summary="Your visit has been canceled. Please start a new visit if you would still like to be seen.",
        )
        result["status"] = "not_approved"
        logger.info(
            "[BELUGA WEBHOOK] CONSULT_CANCELED masterId=%s user=%s -> review.status=not_approved "
            "refill_status=%s notification=queued(review)",
            event.master_id, user.id, (refill.status if refill is not None else "n/a"),
        )

    elif event.event == "RX_WRITTEN":
        review.status = "prescription_sent"
        review.decision = "approved"
        review.reviewed_at = timezone.now()
        review.save()
        _sync_intake_status(user, "prescription_sent")
        if refill is not None:
            refill.status = "approved"
            refill.save(update_fields=["status"])
        rxs = _upsert_beluga_prescriptions(user, review, event)
        queue_status_notification(
            user,
            category="prescription",
            subject="Your Aretide prescription has been written and is on its way to the pharmacy.",
            summary="Your provider has written your prescription and it's on its way to the pharmacy.",
        )
        result["prescriptions_created"] = len(rxs)
        logger.info(
            "[BELUGA WEBHOOK] RX_WRITTEN masterId=%s user=%s docName=%s prescriptions_created=%d "
            "-> review.status=prescription_sent notification=queued(prescription)",
            event.master_id, user.id, event.doc_name, len(rxs),
        )
        dev_log(
            logger,
            "[BELUGA WEBHOOK] RX_WRITTEN masterId=%s medsPrescribed=%s",
            event.master_id, event.meds_prescribed,
        )

    elif event.event in ("DOCTOR_CHAT", "CS_MESSAGE"):
        prefix = "[Provider]" if event.event == "DOCTOR_CHAT" else "[Support]"
        msg = f"{prefix} {(event.content or '').strip()}".strip()
        if msg:
            existing = review.patient_note or ""
            review.patient_note = (existing + "\n\n" + msg).strip() if existing else msg
            review.save(update_fields=["patient_note"])
            queue_care_team_message_notification(
                user,
                sender_label="your provider"
                if event.event == "DOCTOR_CHAT"
                else "support",
                message_preview=(event.content or "").strip(),
            )
            # A doctor chat message on a titration (dose-change) visit still
            # awaiting a decision means the provider needs something from the
            # patient before the review can conclude.
            flipped_to_more_info = False
            if (
                event.event == "DOCTOR_CHAT"
                and refill is not None
                and refill.status == "pending"
            ):
                refill.status = "more_info_needed"
                refill.save(update_fields=["status"])
                flipped_to_more_info = True
        result["appended_message"] = bool(msg)
        logger.info(
            "[BELUGA WEBHOOK] %s masterId=%s user=%s appended_message=%s "
            "refill_flipped_to_more_info_needed=%s notification=queued(messages)",
            event.event, event.master_id, user.id, bool(msg),
            flipped_to_more_info if msg else "n/a",
        )
        dev_log(
            logger,
            "[BELUGA WEBHOOK] %s masterId=%s content=%r",
            event.event, event.master_id, event.content,
        )

    elif event.event in _SHIPPING_EVENT_SUMMARIES:
        logger.info(
            "[BELUGA WEBHOOK] %s masterId=%s user=%s orderId=%s info=%s",
            event.event, event.master_id, user.id, event.order_id, event.info,
        )
        _attach_order_id(user=user, refill=refill, master_id=event.master_id, order_id=event.order_id)
        care_event = record_beluga_fulfillment_event(
            user,
            event_type=event.event,
            master_id=event.master_id,
            order_id=event.order_id,
            info=event.info,
        )
        queue_status_notification(
            user,
            category="shipping",
            subject=_SHIPPING_EVENT_SUBJECTS.get(event.event, "Your Aretide order update"),
            summary=_SHIPPING_EVENT_SUMMARIES[event.event],
        )
        result["logged"] = True
        logger.info(
            "[BELUGA WEBHOOK] %s masterId=%s -> care_event=%s notification=queued(shipping)",
            event.event, event.master_id,
            f"created id={care_event.id}" if care_event is not None else "skipped(duplicate)",
        )

    elif event.event.startswith("LAB_ORDER_"):
        logger.info(
            "[BELUGA WEBHOOK] %s masterId=%s user=%s orderId=%s",
            event.event, event.master_id, user.id, event.order_id,
        )
        queue_status_notification(
            user,
            category="labs",
            subject="Your Aretide lab update",
            summary=_LAB_EVENT_SUMMARIES.get(
                event.event, "There's an update on your lab order."
            ),
        )
        result["logged"] = True
        logger.info(
            "[BELUGA WEBHOOK] %s masterId=%s -> notification=queued(labs)",
            event.event, event.master_id,
        )

    elif event.event in ("BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED", "NO_SHOW"):
        logger.info("[BELUGA WEBHOOK] %s masterId=%s user=%s", event.event, event.master_id, user.id)
        queue_status_notification(
            user,
            category="appointments",
            subject="Your Aretide appointment update",
            summary=_BOOKING_EVENT_SUMMARIES.get(
                event.event, "There's an update on your appointment."
            ),
        )
        result["logged"] = True
        logger.info(
            "[BELUGA WEBHOOK] %s masterId=%s -> notification=queued(appointments)",
            event.event, event.master_id,
        )

    else:
        logger.warning(
            "[BELUGA WEBHOOK] UNHANDLED event=%s masterId=%s user=%s — no state change, "
            "no notification queued. Add a branch in apply_beluga_webhook() if this event "
            "should do something.",
            event.event, event.master_id, user.id,
        )
        result["unhandled"] = True

    return result


def _sync_intake_status(user: User, status: str) -> None:
    intake = MedicalIntake.objects.filter(user=user).first()
    if intake:
        intake.status = status
        intake.save(update_fields=["status", "updated_at"])


def _attach_order_id(*, user: User, refill: RefillRequest | None, master_id: str, order_id: str) -> None:
    """
    Link a fulfillment webhook's orderId to the RefillRequest it belongs to,
    so the patient-facing timeline can group shipping events with the refill
    that triggered them (see PatientCareEvent grouping by order_id).

    - Titration: `refill` is already resolved via its unique masterId (see
      apply_beluga_webhook) — attach directly, once.
    - Same-dose / initial consult: masterId is shared across requests, so the
      best match is the most recently created RefillRequest for that masterId
      that hasn't been attached to an order yet. If none exists (e.g. this is
      the initial consult's own first shipment), no RefillRequest is touched —
      it belongs to the "Initial consultation" timeline group instead.
    """
    if not order_id:
        return
    if refill is not None:
        if not refill.beluga_order_id:
            refill.beluga_order_id = order_id
            refill.save(update_fields=["beluga_order_id"])
            logger.info(
                "[BELUGA WEBHOOK] attached orderId=%s -> RefillRequest id=%s (titration, direct)",
                order_id, refill.id,
            )
        return

    candidate = (
        RefillRequest.objects.filter(
            user=user, beluga_master_id=master_id, beluga_order_id=""
        )
        .order_by("-created_at")
        .first()
    )
    if candidate is not None:
        candidate.beluga_order_id = order_id
        candidate.save(update_fields=["beluga_order_id"])
        logger.info(
            "[BELUGA WEBHOOK] attached orderId=%s -> RefillRequest id=%s "
            "(most-recent-unattached match for masterId=%s)",
            order_id, candidate.id, master_id,
        )
    else:
        logger.info(
            "[BELUGA WEBHOOK] orderId=%s on masterId=%s not attached to any RefillRequest "
            "-> belongs to initial-consultation timeline group",
            order_id, master_id,
        )


def _upsert_beluga_prescriptions(
    user: User, review: ProviderReview, event: BelugaWebhookEvent
) -> list[PatientPrescription]:
    from apps.integrations.drug_categories import infer_drug_category

    deactivate_prescriptions(user)
    doc_name = event.doc_name or ""
    doc_first, _, doc_last = doc_name.partition(" ")
    created = []
    for med in event.meds_prescribed:
        strength = str(med.get("strength", ""))
        medication_name = str(med.get("name", ""))
        rx = PatientPrescription.objects.create(
            user=user,
            provider_review=review,
            medication_name=medication_name,
            dosage=strength,
            drug_strength=strength,
            frequency="",
            refills=_safe_int(med.get("refills")),
            quantity=str(med.get("quantity", "")),
            instructions=str(med.get("pharmacyNotes", "")),
            external_prescriber_id=str(med.get("rxId", "")),
            prescriber_first_name=doc_first[:30],
            prescriber_last_name=doc_last[:30],
            fulfillment_status="signed",
            is_active=True,
            signed_at=timezone.now(),
        )
        rx.beluga_med_id = str(med.get("medId", ""))
        rx.drug_category = infer_drug_category(rx.medication_name)
        rx.save(update_fields=["beluga_med_id", "drug_category"])
        created.append(rx)

    dev_log(
        logger,
        "[BELUGA WEBHOOK] RX_WRITTEN -> created/updated PatientPrescription rows: %s",
        [
            {
                "id": str(rx.id),
                "medication_name": rx.medication_name,
                "dosage": rx.dosage,
                "beluga_med_id": rx.beluga_med_id,
                "drug_category": rx.drug_category,
            }
            for rx in created
        ],
    )
    return created


def _safe_int(value, default: int = 0) -> int:
    try:
        return int(value or default)
    except (ValueError, TypeError):
        return default


def resolve_lf_product_id(prescription: PatientPrescription, snapshot: dict) -> int | None:
    if prescription.lf_product_id:
        return prescription.lf_product_id
    from apps.pharmacy.models import PharmacyProductCatalog

    clinical = (snapshot or {}).get("clinical") or {}
    prefs = clinical.get("medication_preferences") or {}
    slug = str(prefs.get("treatment") or "").strip()
    if not slug:
        return None
    catalog = PharmacyProductCatalog.objects.filter(offering_slug=slug, is_active=True).first()
    if catalog and catalog.lf_product_id:
        prescription.lf_product_id = catalog.lf_product_id
        if not prescription.drug_strength and catalog.drug_strength:
            prescription.drug_strength = catalog.drug_strength
        if not prescription.drug_form and catalog.drug_form:
            prescription.drug_form = catalog.drug_form
        if not prescription.schedule_code and catalog.schedule_code:
            prescription.schedule_code = catalog.schedule_code
        if prescription.medication_name in ("", catalog.drug_name):
            prescription.medication_name = catalog.drug_name
        prescription.save()
        return catalog.lf_product_id
    return None
