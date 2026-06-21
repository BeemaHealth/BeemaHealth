from __future__ import annotations

import uuid
from datetime import date

from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date

from apps.accounts.models import User
from apps.intakes.models import MedicalIntake
from apps.prescriptions.models import PatientPrescription
from apps.prescriptions.services import deactivate_prescriptions
from apps.reviews.models import ProviderReview
from apps.integrations.adapters.base import DoctorWebhookResult


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

    prescription = PatientPrescription.objects.create(
        user=user,
        provider_review=review,
        medication_name=str(prescription_data.get("drug_name") or prescription_data.get("medication_name") or ""),
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
        fulfillment_status="signed",
        is_active=True,
        signed_at=timezone.now(),
    )
    return prescription


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
