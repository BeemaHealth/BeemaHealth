from __future__ import annotations

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.audit.services import log_audit_event
from apps.intakes.submissions import get_active_submission
from apps.pharmacy.adapters import get_pharmacy_adapter
from apps.pharmacy.models import PharmacyOrder, PharmacyOrderEvent
from apps.pharmacy.preflight import PreflightError, run_preflight
from apps.integrations.services import resolve_lf_product_id


STATUS_MAP = {
    "received": "received",
    "processing": "processing",
    "in_process": "processing",
    "shipped": "shipped",
    "delivered": "delivered",
    "cancelled": "cancelled",
    "canceled": "cancelled",
    "on_hold": "on_hold",
    "on hold": "on_hold",
    "error": "error",
}


@transaction.atomic
def create_and_submit_pharmacy_order(
    *,
    prescription,
    partner: str | None = None,
    request=None,
) -> PharmacyOrder:
    submission = None
    from apps.intakes.models import MedicalIntake

    intake = MedicalIntake.objects.filter(user=prescription.user).first()
    if intake:
        submission = get_active_submission(intake)
    snapshot = submission.snapshot if submission else {}

    resolve_lf_product_id(prescription, snapshot)

    partner_slug = partner or getattr(settings, "PHARMACY_ADAPTER", "mock")
    order = PharmacyOrder.objects.create(
        prescription=prescription,
        user=prescription.user,
        pharmacy_partner=partner_slug if partner_slug != "mock" else "mock",
        external_reference_id=str(prescription.id),
        status="created",
        recipient_type="patient",
        shipping_service_code=getattr(settings, "LIFEFILE_SHIPPING_SERVICE", None),
        handling_service_code=getattr(settings, "LIFEFILE_HANDLING_SERVICE", None),
    )
    _populate_ship_to_from_snapshot(order, snapshot)

    run_preflight(order=order, prescription=prescription, snapshot=snapshot)

    adapter = get_pharmacy_adapter(partner_slug)
    message_id = PharmacyOrder.objects.count()
    payload = adapter.build_order_payload(
        order=order,
        prescription=prescription,
        snapshot=snapshot,
        message_id=message_id,
    )
    order.submitted_payload = payload
    order.save(update_fields=["submitted_payload", "updated_at"])

    try:
        result = adapter.submit_order(payload)
    except Exception as exc:
        order.status = "error"
        order.error_message = str(exc)
        order.save(update_fields=["status", "error_message", "updated_at"])
        raise

    order.external_order_id = result.external_order_id
    order.last_response_payload = result.response_payload
    order.status = result.status
    order.submitted_at = timezone.now()
    order.save()

    prescription.fulfillment_status = "sent_to_pharmacy"
    prescription.save(update_fields=["fulfillment_status", "updated_at"])

    log_audit_event(
        user=getattr(request, "user", None) if request else None,
        action="update",
        resource_type="pharmacy_order",
        resource_id=str(order.id),
        request=request,
    )
    return order


def _populate_ship_to_from_snapshot(order: PharmacyOrder, snapshot: dict) -> None:
    account = snapshot.get("account") or {}
    identity = snapshot.get("identity_contact") or {}
    clinical = snapshot.get("clinical") or {}
    prefs = clinical.get("medication_preferences") or {}

    use_alt = prefs.get("use_different_shipping_address") is True
    if use_alt:
        order.ship_to_address_line_1 = str(prefs.get("shipping_address") or "")
        order.ship_to_city = str(prefs.get("shipping_city") or "")
        order.ship_to_zip_code = str(prefs.get("shipping_zip") or "")
        order.ship_to_state = str(account.get("state") or "")
    else:
        order.ship_to_address_line_1 = str(identity.get("address") or "")
        order.ship_to_city = str(identity.get("city") or "")
        order.ship_to_zip_code = str(identity.get("zip") or "")
        order.ship_to_state = str(account.get("state") or "")

    order.ship_to_first_name = str(account.get("first_name") or "")
    order.ship_to_last_name = str(account.get("last_name") or "")
    order.ship_to_phone = str(account.get("phone") or "")
    order.ship_to_email = str(account.get("email") or "")
    order.save()


@transaction.atomic
def process_pharmacy_webhook(*, partner: str, payload: dict, request=None) -> PharmacyOrderEvent:
    adapter = get_pharmacy_adapter(partner)
    parsed = adapter.parse_webhook(payload)

    if parsed.idempotency_key and PharmacyOrderEvent.objects.filter(
        idempotency_key=parsed.idempotency_key
    ).exists():
        return PharmacyOrderEvent.objects.get(idempotency_key=parsed.idempotency_key)

    order = None
    if parsed.external_reference_id:
        order = PharmacyOrder.objects.filter(external_reference_id=parsed.external_reference_id).first()
    if order is None and parsed.external_order_id:
        order = PharmacyOrder.objects.filter(external_order_id=parsed.external_order_id).first()

    event = PharmacyOrderEvent.objects.create(
        pharmacy_order=order,
        partner=partner,
        external_order_id=parsed.external_order_id,
        event_type=parsed.event_type,
        status=parsed.status,
        tracking_number=parsed.tracking_number,
        carrier=parsed.carrier,
        raw_payload=payload,
        idempotency_key=parsed.idempotency_key,
        processed_at=timezone.now(),
    )

    if order:
        mapped = STATUS_MAP.get(parsed.status.lower(), parsed.status.lower())
        if mapped in dict(PharmacyOrder.STATUS_CHOICES):
            order.status = mapped
        if parsed.tracking_number:
            order.tracking_number = parsed.tracking_number
        if parsed.carrier:
            order.carrier = parsed.carrier
        order.save()

    log_audit_event(
        user=None,
        action="update",
        resource_type="pharmacy_order_event",
        resource_id=str(event.id),
        request=request,
    )
    return event


def get_latest_pharmacy_order_for_user(user):
    return PharmacyOrder.objects.filter(user=user).order_by("-created_at").first()
