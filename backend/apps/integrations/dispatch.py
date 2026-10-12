"""Map verified inbound events to domain services.

Other apps are imported lazily so a missing app fails the one event (retried later) instead of
the whole process. Handlers raise ``UnresolvedReference`` for unknown ids so events are marked
``failed`` and retried, which also covers out of order delivery. Never log payloads.
"""
from __future__ import annotations

import importlib
import logging
from datetime import datetime
from types import ModuleType
from typing import Any

from django.conf import settings
from django.utils import timezone
from django.utils.dateparse import parse_datetime

from apps.integrations.adapters.beluga import KNOWN_EVENTS, BelugaAdapter
from apps.integrations.exceptions import IntegrationError, PayloadInvalid, UnresolvedReference, safe_location

logger = logging.getLogger(__name__)

HANDLED = "handled"
IGNORED = "ignored"

PHARMACY_EVENTS = {"PHARMACY_ORDER_IN_FULFILLMENT", "PHARMACY_ORDER_SHIPPED", "PHARMACY_ORDER_DELIVERED"}
PACKAGE_EVENTS = {"PACKAGE_IN_TRANSIT", "PACKAGE_OUT_FOR_DELIVERY", "PACKAGE_DELIVERED", "PACKAGE_DELIVERY_FAILED"}
BOOKING_EVENTS = {"BOOKING_CREATED", "BOOKING_RESCHEDULED", "BOOKING_CANCELLED", "NO_SHOW"}


def _module(path: str) -> ModuleType:
    """Import an app module or raise a retryable integration error naming only the module."""
    try:
        return importlib.import_module(path)
    except ModuleNotFoundError as exc:
        if exc.name and path.startswith(exc.name):
            raise IntegrationError(f"Module unavailable: {path}") from exc
        raise


def clinical_services() -> ModuleType:
    return _module("apps.clinical.services")


def messaging_services() -> ModuleType:
    return _module("apps.messaging.services")


def fulfillment_services() -> ModuleType:
    return _module("apps.fulfillment.services")


def billing_webhooks() -> ModuleType:
    return _module("apps.billing.webhooks")


def notify_patient(patient: Any, template_key: str) -> None:
    """Content free SMS and email alert. Best effort: a failure never fails the event."""
    try:
        messaging_services().notify_patient(patient, template_key, {})
    except Exception as exc:  # noqa: BLE001
        logger.error("notify failed patient=%s template=%s error=%s", getattr(patient, "pk", None), template_key, safe_location(exc))


def resolve_visit(master_id: str) -> Any:
    """Latest Visit for a masterId (masterId is not unique). Raises ``UnresolvedReference``."""
    from apps.clinical.models import Visit

    visit = (
        Visit.objects.filter(external_id=master_id)
        .select_related("treatment", "treatment__patient", "treatment__product")
        .order_by("-created_at")
        .first()
    )
    if visit is None:
        raise UnresolvedReference("Unknown masterId")
    return visit


def _int_or_none(value: Any) -> int | None:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _parse_dt(value: Any) -> datetime | None:
    parsed = parse_datetime(str(value)) if value else None
    if parsed is not None and timezone.is_naive(parsed):
        parsed = timezone.make_aware(parsed, timezone.utc)
    return parsed


def dispatch_event(event: Any) -> str:
    """Apply one InboundEvent. Returns ``HANDLED`` or ``IGNORED``; raises on failure."""
    handler = {"beluga": _beluga, "stripe": _stripe, "lifefile": _lifefile}.get(event.vendor)
    if handler is None:
        return IGNORED
    return handler(event)


def _beluga(event: Any) -> str:
    parsed = BelugaAdapter().parse_webhook(event.raw_payload)
    if parsed.event not in KNOWN_EVENTS:
        return IGNORED
    if not parsed.master_id:
        raise PayloadInvalid(["masterId"])
    payload = parsed.payload
    visit = resolve_visit(parsed.master_id)
    name = parsed.event
    if name == "RX_WRITTEN":
        _rx_written(visit, payload)
    elif name == "CONSULT_CONCLUDED":
        outcome = str(payload.get("visitOutcome") or "").lower()
        if outcome not in ("prescribed", "referred"):
            raise PayloadInvalid(["visitOutcome"])
        clinical_services().apply_visit_outcome(visit, outcome)
    elif name == "CONSULT_CANCELED":
        clinical_services().apply_visit_outcome(visit, "canceled")
    elif name == "DOCTOR_CHAT":
        content = str(payload.get("content") or "")
        if not content.strip():
            raise PayloadInvalid(["content"])
        messaging_services().receive_doctor_message(visit, content, event.dedupe_key, visit.doctor_name or "Doctor")
    elif name == "CS_MESSAGE":
        content = str(payload.get("content") or "")
        if not content.strip():
            raise PayloadInvalid(["content"])
        messaging_services().receive_cs_message(visit.treatment.patient, content, event.dedupe_key)
    elif name in BOOKING_EVENTS:
        _booking(visit, name, payload)
    else:
        fulfillment_services().apply_network_event(
            treatment=visit.treatment,
            event=name,
            order_ref=parsed.order_id,
            info=payload.get("info") if isinstance(payload.get("info"), dict) else {},
            occurred_at=event.received_at,
        )
    return HANDLED


def _rx_written(visit: Any, payload: dict[str, Any]) -> None:
    meds = payload.get("medsPrescribed")
    if not isinstance(meds, list) or not meds:
        raise PayloadInvalid(["medsPrescribed"])
    clinical = clinical_services()
    doctor = str(payload.get("docName") or "")
    if doctor and not visit.doctor_name:
        visit.doctor_name = doctor
        visit.save(update_fields=["doctor_name", "updated_at"])
    prescriptions = []
    for med in meds:
        if not isinstance(med, dict):
            raise PayloadInvalid(["medsPrescribed"])
        prescriptions.append(
            clinical.apply_prescription(
                visit,
                {
                    "external_rx_id": str(med.get("rxId") or ""),
                    "external_med_id": str(med.get("medId") or ""),
                    "drug": str(med.get("name") or ""),
                    "strength": str(med.get("strength") or ""),
                    "quantity": _int_or_none(med.get("quantity")),
                    "refills": _int_or_none(med.get("refills")) or 0,
                    "prescriber_name": doctor,
                    "pharmacy_notes": str(med.get("pharmacyNotes") or ""),
                },
            )
        )
    treatment = visit.treatment
    if getattr(treatment.product, "routing_mode", "") == "beema_routes" and getattr(
        settings, "BEEMA_PHARMACY_ROUTING_ENABLED", False
    ):
        fulfillment = fulfillment_services()
        for prescription in prescriptions:
            fulfillment.create_order_for_prescription(prescription)


def _booking(visit: Any, name: str, payload: dict[str, Any]) -> None:
    from apps.clinical.models import ActionItem, Visit

    if visit.status in (Visit.Status.CONCLUDED, Visit.Status.CANCELED):
        return
    treatment = visit.treatment
    fields = ["status", "updated_at"]
    if name in ("BOOKING_CREATED", "BOOKING_RESCHEDULED"):
        scheduled = _parse_dt(payload.get("scheduledDate"))
        if scheduled is None:
            raise PayloadInvalid(["scheduledDate"])
        visit.status = Visit.Status.SCHEDULED
        visit.scheduled_at = scheduled
        fields.append("scheduled_at")
        if payload.get("location"):
            visit.video_location = str(payload["location"])
            fields.append("video_location")
        if payload.get("docName"):
            visit.doctor_name = str(payload["docName"])
            fields.append("doctor_name")
        visit.save(update_fields=fields)
        ActionItem.objects.filter(treatment=treatment, kind="book_visit", is_open=True).update(
            is_open=False, resolved_at=timezone.now()
        )
        notify_patient(treatment.patient, "visit_scheduled")
        return
    visit.status = Visit.Status.NO_SHOW if name == "NO_SHOW" else Visit.Status.PENDING
    visit.scheduled_at = None
    visit.save(update_fields=[*fields, "scheduled_at"])
    if not ActionItem.objects.filter(treatment=treatment, kind="book_visit", is_open=True).exists():
        ActionItem.objects.create(
            treatment=treatment,
            patient=treatment.patient,
            kind="book_visit",
            title="Book your video visit",
            body="Your appointment needs to be rescheduled.",
        )
    notify_patient(treatment.patient, "action_required")


def _stripe(event: Any) -> str:
    """Hand a verified Stripe event to billing. Unhandled types and foreign intents are ignored."""
    data_object = (event.raw_payload.get("data") or {}).get("object") or {}
    result = billing_webhooks().dispatch(event.event_type, data_object)
    return HANDLED if result else IGNORED


def _lifefile(event: Any) -> str:
    return fulfillment_services().apply_pharmacy_webhook("lifefile", event.raw_payload, received_at=event.received_at)
