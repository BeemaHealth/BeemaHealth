"""Integration services called by other apps: visit submission, chat bridge, reconciliation."""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.integrations.adapters import get_network_adapter
from apps.integrations.adapters.mapper import build_visit_body, neutral_from_questionnaire
from apps.integrations.exceptions import IntegrationError, NotConfigured, VendorRejected

logger = logging.getLogger(__name__)

DEFAULT_VISIT_TYPE = "weightloss"
OPEN_VISIT_EXCLUDED_STATUSES = ("concluded", "canceled")


def _questionnaire_payload(submission: Any) -> dict[str, Any]:
    """Neutral mapper input built from the submission. Empty when there is no submission."""
    if submission is None:
        return {}
    from apps.questionnaires import services as questionnaire_services

    return neutral_from_questionnaire(questionnaire_services.build_visit_payload(submission))


def _join(values: Any) -> str:
    return "; ".join(v for v in values if v)


def _patient_block(treatment: Any) -> dict[str, Any]:
    """Demographics from the account and default address, used to fill gaps in the questionnaire payload."""
    profile = treatment.patient
    user = profile.user
    address = (
        profile.addresses.filter(kind__in=["shipping", "home"]).order_by("-is_default", "-created_at").first()
        or profile.addresses.order_by("-is_default", "-created_at").first()
    )
    block: dict[str, Any] = {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "phone": user.phone,
        "email": user.email,
        "dob": profile.date_of_birth,
        "sex": profile.sex_at_birth or profile.gender_identity,
    }
    if address is not None:
        block.update(
            address=_join([address.line1, address.line2]), city=address.city, state=address.state, zip=address.zip_code
        )
    return {k: v for k, v in block.items() if v not in (None, "")}


def _medication_preference(treatment: Any, network: Any) -> list[dict[str, Any]]:
    """One patientPreference row from the variant mapping (vendor SKU is Beluga's medId)."""
    variant = treatment.variant
    if variant is None or network is None:
        return []
    from apps.catalog.models import VariantMapping

    mapping = VariantMapping.objects.filter(variant=variant, organization=network).first()
    if mapping is None:
        return []
    plan = treatment.plan
    strength = treatment.requested_strength_mg if treatment.requested_strength_mg is not None else variant.strength_mg
    return [
        {
            "name": f"{variant.drug.title()} {variant.phase}".strip(),
            "strength": f"{strength.normalize():f}mg" if strength is not None else "",
            "quantity": getattr(settings, "BELUGA_DEFAULT_QUANTITY", "1"),
            "refills": getattr(settings, "BELUGA_DEFAULT_REFILLS", "0"),
            "days_supply": str(plan.supply_days_per_shipment) if plan is not None else "",
            "med_id": mapping.vendor_sku,
        }
    ]


def build_neutral_payload(treatment: Any, network: Any) -> dict[str, Any]:
    """Questionnaire payload completed with account data and the medication preference."""
    neutral = _questionnaire_payload(treatment.submission)
    patient = {**_patient_block(treatment), **{k: v for k, v in (neutral.get("patient") or {}).items() if v not in (None, "")}}
    neutral["patient"] = patient
    if "consents_signed" not in neutral:
        neutral["consents_signed"] = treatment.patient.consents.filter(kind="telehealth").exists()
    if not neutral.get("patient_preference"):
        neutral["patient_preference"] = _medication_preference(treatment, network)
    return neutral


def submit_visit_for_treatment(treatment: Any) -> Any:
    """POST the visit to the doctor network and mark the treatment submitted. Idempotent.

    Reuses the masterId of an earlier unsubmitted attempt so a retry after a timeout cannot
    create a second visit at the vendor. Raises ``IntegrationError`` subclasses with PHI free text.
    """
    from apps.clinical import services as clinical
    from apps.clinical.models import Visit

    existing = Visit.objects.filter(treatment=treatment, kind=Visit.Kind.INITIAL).order_by("created_at").first()
    if existing is not None and existing.submitted_at is not None:
        return existing

    network = treatment.network
    adapter = get_network_adapter(network)
    neutral = build_neutral_payload(treatment, network)
    master_id = existing.external_id if existing is not None and existing.external_id else uuid.uuid4().hex
    body = build_visit_body(
        neutral,
        master_id=master_id,
        company=getattr(settings, "BELUGA_COMPANY", "beemahealth"),
        visit_type=neutral.get("visit_type") or getattr(settings, "BELUGA_VISIT_TYPE", DEFAULT_VISIT_TYPE),
        pharmacy_id=str(neutral.get("pharmacy_id") or getattr(settings, "BELUGA_PHARMACY_ID", "")),
    )
    visit = existing or Visit.objects.create(treatment=treatment, kind=Visit.Kind.INITIAL, external_id=master_id)
    result = adapter.submit_visit(body, treatment=treatment)
    if not result.ok:
        raise VendorRejected(f"Visit submission failed: {result.error or 'unknown'}")
    with transaction.atomic():
        if result.master_id and result.master_id != visit.external_id:
            visit.external_id = result.master_id
            visit.save(update_fields=["external_id", "updated_at"])
        clinical.mark_submitted_to_network(treatment, visit)
    logger.info("visit submitted treatment=%s visit=%s", treatment.pk, visit.pk)
    return visit


def send_chat_to_network(message: Any) -> bool:
    """Deliver a patient message to the doctor. Marks it delivered; raises on failure.

    Support conversations never leave Beema. Error text carries codes only, never content.
    """
    conversation = message.conversation
    if conversation.kind != "doctor":
        return True
    visit = conversation.visit
    master_id = visit.external_id if visit is not None else ""
    if not master_id and conversation.treatment_id:
        from apps.clinical.models import Visit

        latest = Visit.objects.filter(treatment_id=conversation.treatment_id).exclude(external_id="").order_by("-created_at").first()
        master_id = latest.external_id if latest else ""
    if not master_id:
        raise NotConfigured("No network visit to send the message to")
    treatment = conversation.treatment or (visit.treatment if visit is not None else None)
    user = conversation.patient.user
    adapter = get_network_adapter(getattr(treatment, "network", None))
    result = adapter.send_message(
        master_id=master_id,
        content=message.body,
        first_name=user.first_name,
        last_name=user.last_name,
        treatment=treatment,
    )
    if not result.ok:
        raise VendorRejected(f"Chat delivery failed: {result.error or 'unknown'}")
    message.delivery_status = "delivered"
    message.sent_at = timezone.now()
    message.save(update_fields=["delivery_status", "sent_at", "updated_at"])
    return True


@dataclass
class ReconcileReport:
    checked: int = 0
    repaired: int = 0
    unchanged: int = 0
    errors: list[str] = field(default_factory=list)


def _synthetic_event(master_id: str, name: str, extra: dict[str, Any]) -> Any:
    """Store a reconcile generated event through the normal pipeline (deduped by content)."""
    from apps.integrations.webhooks import make_dedupe_key, store_event

    payload = {"masterId": master_id, "event": name, "_source": "reconcile", **extra}
    return store_event("beluga", make_dedupe_key("beluga", master_id, name, payload), name, master_id, payload)


def reconcile_visits(limit: int = 200) -> ReconcileReport:
    """Fetch every open visit from the network and repair events we missed.

    Missed events are replayed through the same pipeline as webhooks, so repair logic is
    never duplicated. Prescriptions already stored (by rx id) are not replayed.
    """
    from apps.clinical.models import Prescription, Visit
    from apps.integrations.webhooks import process

    report = ReconcileReport()
    open_visits = (
        Visit.objects.exclude(external_id="")
        .exclude(status__in=OPEN_VISIT_EXCLUDED_STATUSES)
        .select_related("treatment", "treatment__network")
        .order_by("created_at")[:limit]
    )
    for visit in open_visits:
        report.checked += 1
        try:
            snapshot = get_network_adapter(visit.treatment.network).fetch_visit(visit.external_id, treatment=visit.treatment)
            if snapshot is None:
                report.errors.append(f"visit {visit.pk}: not fetched")
                continue
            events: list[Any] = []
            known_rx = set(
                Prescription.objects.filter(treatment=visit.treatment).values_list("external_rx_id", flat=True)
            )
            new_rx = [r for r in snapshot.rx_history if r["rx_id"] and r["rx_id"] not in known_rx]
            if snapshot.visit_status == "canceled":
                events.append(_synthetic_event(visit.external_id, "CONSULT_CANCELED", {}))
            elif snapshot.visit_status == "resolved" or snapshot.resolved_status == "closed":
                if new_rx:
                    meds = [
                        {
                            "rxId": r["rx_id"],
                            "medId": r["med_id"],
                            "name": r["name"],
                            "strength": r["strength"],
                            "quantity": r["quantity"],
                            "refills": r["refills"],
                            "pharmacyNotes": r["pharmacy_notes"],
                        }
                        for r in new_rx
                    ]
                    events.append(_synthetic_event(visit.external_id, "RX_WRITTEN", {"medsPrescribed": meds}))
                if visit.concluded_at is None:
                    outcome = "prescribed" if snapshot.rx_history else "referred"
                    events.append(_synthetic_event(visit.external_id, "CONSULT_CONCLUDED", {"visitOutcome": outcome}))
            pending = [e for e in events if e.status in ("received", "failed")]
            for event in pending:
                result = process(event)
                if result.status != "processed":
                    report.errors.append(f"visit {visit.pk}: {event.event_type} {result.status}")
            if pending:
                report.repaired += 1
            else:
                report.unchanged += 1
        except IntegrationError as exc:
            report.errors.append(f"visit {visit.pk}: {type(exc).__name__}")
    return report
