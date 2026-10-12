"""Fulfillment services: care events, orders, shipment batches, tracking updates and refills."""
from __future__ import annotations

import calendar
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime

from apps.integrations.exceptions import IntegrationError, UnresolvedReference

from .models import CareEvent, Order, Shipment, ShipmentBatch
from .pharmacy import get_pharmacy_adapter

logger = logging.getLogger(__name__)

HANDLED = "handled"
IGNORED = "ignored"

BATCH_MONTHS = 3
DAYS_PER_MONTH = 30
CHECKIN_INTERVAL_MONTHS = 3
CHECKIN_VISIT_KINDS = ("titration", "renewal")
REFILL_COOLDOWN_HOURS = 24  # mirrors REFILL_REQUEST_COOLDOWN_HOURS in src/lib/refill-cooldown.ts
RELEASABLE_TREATMENT_STATES = ("active", "prescribed")
REFILLABLE_TREATMENT_STATES = ("active", "refill_due", "prescribed")
RELEASABLE_SUBSCRIPTION_STATES = ("active", "pending_cancel")
SETTLED_BATCH_STATES = ("released", "shipped", "skipped", "refunded")
OPEN_ORDER_STATES = ("pending", "submitted", "in_fulfillment")

ORDER_RANK = {"failed": 0, "canceled": 0, "pending": 0, "submitted": 1, "in_fulfillment": 2, "shipped": 3, "delivered": 4}
SHIPMENT_RANK = {"shipped": 0, "in_transit": 1, "out_for_delivery": 2, "delivery_failed": 3, "delivered": 4}

# Payload keys that may be stored in CareEvent.payload_redacted (allow list, never PHI).
SAFE_PAYLOAD_KEYS = {
    "from", "to", "reason", "event", "status", "carrier", "order_id", "batch_id", "sequence", "invoice_id",
    "visit_id", "rx_id", "treatment_id", "amount_cents", "outcome", "result",
}


class FulfillmentError(Exception):
    """Base class for fulfillment failures. Messages are PHI free."""

    code = "fulfillment_error"


class ReleaseBlocked(FulfillmentError):
    code = "release_blocked"

    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


class RefillNotAllowed(FulfillmentError):
    code = "refill_not_allowed"

    def __init__(self, reason: str):
        self.reason = reason
        super().__init__(reason)


class RefillCooldownActive(RefillNotAllowed):
    code = "refill_cooldown"

    def __init__(self, hours_remaining: float):
        self.hours_remaining = hours_remaining
        super().__init__("cooldown")


# ------------------------------------------------------------------ care events

def redact_payload(payload: dict[str, Any] | None) -> dict[str, Any]:
    """Keep only allow listed scalar keys. Everything else (names, content, addresses) is dropped."""
    clean: dict[str, Any] = {}
    for key, value in (payload or {}).items():
        if key in SAFE_PAYLOAD_KEYS and (value is None or isinstance(value, (str, int, float, bool))):
            clean[key] = value
    return clean


def record_event(
    *,
    event: str,
    source: str = "system",
    treatment: Any = None,
    patient: Any = None,
    payload: dict[str, Any] | None = None,
    occurred_at: datetime | None = None,
) -> CareEvent:
    """Append one CareEvent. The payload is reduced to an allow list of non-PHI keys."""
    if patient is None and treatment is not None:
        patient = treatment.patient
    return CareEvent.objects.create(
        treatment=treatment,
        patient=patient,
        source=source,
        event=event[:100],
        payload_redacted=redact_payload(payload),
        occurred_at=occurred_at or timezone.now(),
    )


# ------------------------------------------------------------------ batches

def _add_months(start: date, months: int) -> date:
    index = start.month - 1 + months
    year, month = start.year + index // 12, index % 12 + 1
    return date(year, month, min(start.day, calendar.monthrange(year, month)[1]))


def months_per_batch(subscription: Any) -> int:
    """3 for prepaid 3, 6 and 12 month terms; 1 for monthly renewals and 1 month terms."""
    return min(BATCH_MONTHS, max(int(subscription.term_months or 1), 1))


def batches_per_period(subscription: Any) -> int:
    """Batches that one paid period (a prepaid term or one monthly renewal) covers."""
    return -(-int(subscription.term_months or 1) // months_per_batch(subscription))


@transaction.atomic
def create_batches(subscription: Any) -> list[ShipmentBatch]:
    """Create missing batches up to ``subscription.batches_total`` (default: one paid period).

    Prepaid 3, 6 and 12 month plans ship in 3 month batches; monthly plans get one per renewal.
    Safe to call repeatedly: existing sequences are kept. New batches are due relative to the
    current term start, so a renewal's batches start when the renewal period does.
    """
    mpb = months_per_batch(subscription)
    per_period = batches_per_period(subscription)
    target = int(subscription.batches_total or 0) or per_period
    existing = set(ShipmentBatch.objects.filter(subscription=subscription).values_list("sequence", flat=True))
    created: list[ShipmentBatch] = []
    for sequence in range(1, target + 1):
        if sequence in existing:
            continue
        position = (sequence - 1) % per_period
        created.append(
            ShipmentBatch.objects.create(
                subscription=subscription,
                sequence=sequence,
                month_offset=(sequence - 1) * mpb,
                due_on=_add_months(subscription.term_starts_on, position * mpb),
                supply_days=DAYS_PER_MONTH * mpb,
            )
        )
    return created


def _checkins_completed(treatment: Any) -> int:
    from apps.clinical.models import Visit

    return Visit.objects.filter(
        treatment=treatment, kind__in=CHECKIN_VISIT_KINDS, concluded_at__isnull=False, outcome="prescribed"
    ).count()


def release_blocker(batch: ShipmentBatch, today: date | None = None) -> str:
    """Why a batch cannot be released, or an empty string when it can.

    Rules: batch still scheduled and due; subscription active; treatment active or prescribed;
    the previous batch already released or settled; and for weight loss (GLP-1) one concluded
    check-in per full 3 months of treatment before the batch (batch 2 needs the month 3 check-in).
    """
    subscription = batch.subscription
    treatment = subscription.treatment
    if batch.status != ShipmentBatch.Status.SCHEDULED:
        return "not_scheduled"
    if today is not None and batch.due_on > today:
        return "not_due"
    if subscription.status not in RELEASABLE_SUBSCRIPTION_STATES:
        return "subscription_inactive"
    if treatment is None or treatment.status not in RELEASABLE_TREATMENT_STATES:
        return "treatment_not_active"
    if batch.sequence > 1:
        previous = ShipmentBatch.objects.filter(subscription=subscription, sequence=batch.sequence - 1).first()
        if previous is not None and previous.status not in SETTLED_BATCH_STATES:
            return "previous_batch_pending"
    required = batch.month_offset // CHECKIN_INTERVAL_MONTHS
    if treatment.product.category == "weight_loss" and required and _checkins_completed(treatment) < required:
        return "checkin_required"
    return ""


def can_release(batch: ShipmentBatch, today: date | None = None) -> bool:
    return not release_blocker(batch, today)


@transaction.atomic
def release_batch(batch: ShipmentBatch, *, today: date | None = None, actor: Any = None) -> ShipmentBatch:
    """Release a batch for fulfillment or raise ``ReleaseBlocked``.

    For Beema routed products with the routing flag on, an Order is created and submitted to the
    pharmacy. Network routed products are fulfilled by the network, so release only records state.
    """
    batch = ShipmentBatch.objects.select_for_update().select_related(
        "subscription", "subscription__treatment", "subscription__treatment__product"
    ).get(pk=batch.pk)
    reason = release_blocker(batch, today)
    if reason:
        raise ReleaseBlocked(reason)
    batch.status = ShipmentBatch.Status.RELEASED
    batch.released_at = timezone.now()
    batch.save(update_fields=["status", "released_at", "updated_at"])
    treatment = batch.subscription.treatment
    record_event(
        treatment=treatment,
        source="staff" if actor is not None else "system",
        event="batch.released",
        payload={"batch_id": str(batch.pk), "sequence": batch.sequence},
    )
    if _beema_routed(treatment):
        prescription = treatment.prescriptions.order_by("-created_at").first()
        if prescription is not None:
            order = create_order(
                treatment, prescription=prescription, batch=batch, subscription=batch.subscription, fill_type="renewal" if batch.sequence > 1 else "initial"
            )
            _submit_quietly(order)
    return batch


def release_due_batches(today: date | None = None) -> dict[str, int]:
    """Release every due batch that passes the rules. Blocked batches are counted by reason."""
    today = today or timezone.localdate()
    stats: dict[str, int] = {"released": 0}
    due = ShipmentBatch.objects.filter(status="scheduled", due_on__lte=today).select_related("subscription")
    for batch in due.order_by("subscription_id", "sequence"):
        try:
            release_batch(batch, today=today)
            stats["released"] += 1
        except ReleaseBlocked as exc:
            stats[exc.reason] = stats.get(exc.reason, 0) + 1
    return stats


# ------------------------------------------------------------------ orders

def _beema_routed(treatment: Any) -> bool:
    return (
        treatment is not None
        and treatment.product.routing_mode == "beema_routes"
        and bool(getattr(settings, "BEEMA_PHARMACY_ROUTING_ENABLED", False))
    )


def _pharmacy_for(treatment: Any) -> Any:
    return treatment.pharmacy or treatment.network


def create_order(
    treatment: Any,
    *,
    prescription: Any = None,
    batch: ShipmentBatch | None = None,
    subscription: Any = None,
    pharmacy: Any = None,
    fill_type: str = "initial",
) -> Order:
    """Create a pending Order. The pharmacy defaults to the one routing chose for the treatment."""
    pharmacy = pharmacy or _pharmacy_for(treatment)
    if pharmacy is None:
        raise UnresolvedReference("No pharmacy chosen for treatment")
    order = Order.objects.create(
        treatment=treatment,
        prescription=prescription,
        subscription=subscription or (batch.subscription if batch else None),
        batch=batch,
        pharmacy=pharmacy,
        fill_type=fill_type,
    )
    if batch is not None:
        batch.order = order
        batch.save(update_fields=["order", "updated_at"])
    record_event(treatment=treatment, event="order.created", payload={"order_id": str(order.pk), "status": order.status})
    return order


def create_order_for_prescription(prescription: Any) -> Order | None:
    """Beema routed products only (flag on): one Order per prescription, idempotent."""
    treatment = prescription.treatment
    if not _beema_routed(treatment):
        return None
    existing = Order.objects.filter(prescription=prescription).first()
    if existing is not None:
        return existing
    subscription = treatment.subscriptions.order_by("-created_at").first()
    batch = (
        ShipmentBatch.objects.filter(subscription=subscription, order__isnull=True, status__in=["scheduled", "released"])
        .order_by("sequence")
        .first()
        if subscription is not None
        else None
    )
    order = create_order(treatment, prescription=prescription, batch=batch, subscription=subscription)
    if batch is not None and batch.status == ShipmentBatch.Status.SCHEDULED:
        batch.status = ShipmentBatch.Status.RELEASED
        batch.released_at = timezone.now()
        batch.save(update_fields=["status", "released_at", "updated_at"])
    _submit_quietly(order)
    return order


def submit_order(order: Order) -> Order:
    """Send an order to its pharmacy. Failures set ``failed`` with a code; nothing is raised for vendor errors."""
    if order.status not in ("pending", "failed"):
        return order
    adapter = get_pharmacy_adapter(order.pharmacy)
    result = adapter.submit_order(order)
    if result.ok:
        order.status = Order.Status.SUBMITTED
        order.external_order_id = result.external_order_id or order.external_order_id
        order.submitted_at = timezone.now()
        order.last_error = ""
    else:
        order.status = Order.Status.FAILED
        order.last_error = result.error[:500]
    order.save()
    record_event(
        treatment=order.treatment,
        source=adapter.vendor if adapter.vendor in ("lifefile",) else "system",
        event="order.submitted" if result.ok else "order.submit_failed",
        payload={"order_id": str(order.pk), "status": order.status},
    )
    return order


def _submit_quietly(order: Order) -> None:
    """Submit but keep the order pending for a staff retry if the adapter is unavailable."""
    try:
        submit_order(order)
    except IntegrationError as exc:
        order.last_error = f"{type(exc).__name__}: {exc}"[:500]
        order.save(update_fields=["last_error", "updated_at"])
        logger.warning("order submit deferred order=%s reason=%s", order.pk, type(exc).__name__)


# ------------------------------------------------------------------ vendor events

def _notify(patient: Any, template_key: str) -> None:
    from apps.integrations.dispatch import notify_patient

    notify_patient(patient, template_key)


def _parse_delivered_on(value: Any) -> date | None:
    text = str(value or "").strip()
    if not text:
        return None
    parsed_dt = parse_datetime(text)
    if parsed_dt is not None:
        return parsed_dt.date()
    return parse_date(text[:10])


def _attach_next_batch(order: Order, treatment: Any) -> None:
    """Link a network created order to the next open batch so shipping it counts against the term."""
    subscription = treatment.subscriptions.order_by("-created_at").first()
    batch = (
        ShipmentBatch.objects.filter(subscription=subscription, order__isnull=True, status__in=["scheduled", "released"])
        .order_by("sequence")
        .first()
        if subscription is not None
        else None
    )
    if batch is None:
        return
    order.batch, order.subscription = batch, subscription
    order.save(update_fields=["batch", "subscription", "updated_at"])
    batch.order = order
    batch.save(update_fields=["order", "updated_at"])


def _find_order(treatment: Any, order_ref: str, *, create: bool) -> Order:
    """Resolve the Order a vendor event refers to. Raises ``UnresolvedReference`` when unknown."""
    orders = Order.objects.filter(treatment=treatment)
    if order_ref:
        order = orders.filter(external_order_id=order_ref).first()
        if order is not None:
            return order
        unassigned = orders.filter(external_order_id="", status__in=OPEN_ORDER_STATES).order_by("created_at").first()
        if unassigned is not None:
            unassigned.external_order_id = order_ref
            unassigned.save(update_fields=["external_order_id", "updated_at"])
            return unassigned
        if create:
            pharmacy = _pharmacy_for(treatment)
            if pharmacy is None:
                raise UnresolvedReference("No pharmacy for treatment")
            order = Order.objects.create(
                treatment=treatment,
                pharmacy=pharmacy,
                external_order_id=order_ref,
                status=Order.Status.SUBMITTED,
                submitted_at=timezone.now(),
                fill_type="refill" if orders.exists() else "initial",
            )
            _attach_next_batch(order, treatment)
            return order
        raise UnresolvedReference("Unknown order")
    latest = orders.order_by("-created_at").first()
    if latest is None:
        raise UnresolvedReference("No order for treatment")
    return latest


def _advance_order(order: Order, status: str) -> bool:
    """Move forward only (events can arrive out of order). Returns True if the status changed."""
    if ORDER_RANK[status] <= ORDER_RANK[order.status]:
        return False
    order.status = status
    order.save(update_fields=["status", "updated_at"])
    return True


def _shipment_can_move(current: str, new: str) -> bool:
    if current == "delivered":
        return False
    if current == "delivery_failed":
        return new in ("in_transit", "out_for_delivery", "delivered")
    return SHIPMENT_RANK[new] >= SHIPMENT_RANK[current]


def _update_shipment(
    order: Order, status: str, *, carrier: str, tracking: str, tracking_url: str, delivered_on: date | None, occurred_at: datetime
) -> Shipment | None:
    shipments = order.shipments.order_by("-created_at")
    shipment = (shipments.filter(tracking_number=tracking).first() if tracking else None) or shipments.first()
    if shipment is None:
        if status in ("delivery_failed",) and not tracking:
            return None
        shipment = Shipment(order=order, status=status, shipped_at=occurred_at)
    elif not _shipment_can_move(shipment.status, status):
        return shipment
    shipment.status = status
    shipment.carrier = carrier or shipment.carrier
    shipment.tracking_number = tracking or shipment.tracking_number
    shipment.tracking_url = tracking_url or shipment.tracking_url
    shipment.shipped_at = shipment.shipped_at or occurred_at
    if status == "delivered":
        shipment.delivered_on = delivered_on or occurred_at.date()
    shipment.save()
    return shipment


EVENT_EFFECTS: dict[str, tuple[str, str]] = {
    # event -> (order status, shipment status or "")
    "PHARMACY_ORDER_IN_FULFILLMENT": ("in_fulfillment", ""),
    "PHARMACY_ORDER_SHIPPED": ("shipped", "shipped"),
    "PHARMACY_ORDER_DELIVERED": ("delivered", "delivered"),
    "PACKAGE_IN_TRANSIT": ("shipped", "in_transit"),
    "PACKAGE_OUT_FOR_DELIVERY": ("shipped", "out_for_delivery"),
    "PACKAGE_DELIVERED": ("delivered", "delivered"),
    "PACKAGE_DELIVERY_FAILED": ("", "delivery_failed"),
}


@transaction.atomic
def apply_network_event(
    *, treatment: Any, event: str, order_ref: str = "", info: dict[str, Any] | None = None, occurred_at: datetime | None = None
) -> str:
    """Apply a Beluga pharmacy, package or lab event. Raises ``UnresolvedReference`` when out of order.

    Orders and shipments only move forward, so a late ``PACKAGE_IN_TRANSIT`` after a delivery is
    recorded in the timeline but changes nothing.
    """
    info = info or {}
    occurred_at = occurred_at or timezone.now()
    if event.startswith("LAB_ORDER_"):
        record_event(treatment=treatment, source="beluga", event=event.lower(), payload={"event": event}, occurred_at=occurred_at)
        return HANDLED
    if event not in EVENT_EFFECTS:
        return IGNORED
    order_status, shipment_status = EVENT_EFFECTS[event]
    order = _find_order(treatment, order_ref, create=event.startswith("PHARMACY_ORDER_"))
    carrier = str(info.get("carrier") or "")
    tracking = str(info.get("tracking") or info.get("trackerId") or "")
    changed = _advance_order(order, order_status) if order_status else False
    if shipment_status:
        _update_shipment(
            order,
            shipment_status,
            carrier=carrier,
            tracking=tracking,
            tracking_url=str(info.get("trackingUrl") or ""),
            delivered_on=_parse_delivered_on(info.get("deliveredDate")),
            occurred_at=occurred_at,
        )
    record_event(
        treatment=treatment,
        source="beluga",
        event=event.lower(),
        payload={"event": event, "order_id": str(order.pk), "carrier": carrier},
        occurred_at=occurred_at,
    )
    _after_order_change(order, treatment, event, changed)
    return HANDLED


def _after_order_change(order: Order, treatment: Any, event: str, changed: bool) -> None:
    """Side effects that must fire once: batch and subscription counters, activation, notifications."""
    if event == "PACKAGE_DELIVERY_FAILED":
        _notify(treatment.patient, "action_required")
        return
    if not changed:
        return
    if order.status == "shipped":
        _mark_batch_shipped(order)
        _activate_treatment(treatment)
        _notify(treatment.patient, "shipped")
    elif order.status == "delivered":
        _mark_batch_shipped(order)
        _notify(treatment.patient, "delivered")


def _mark_batch_shipped(order: Order) -> None:
    batch = order.batch
    if batch is None or batch.status == ShipmentBatch.Status.SHIPPED:
        return
    batch.status = ShipmentBatch.Status.SHIPPED
    batch.save(update_fields=["status", "updated_at"])
    from apps.billing.models import Subscription

    Subscription.objects.filter(pk=batch.subscription_id).update(batches_shipped=F("batches_shipped") + 1)


def _activate_treatment(treatment: Any) -> None:
    """First shipment moves a prescribed treatment to active (best effort)."""
    if treatment.status != "prescribed":
        return
    try:
        from apps.clinical import services as clinical

        clinical.transition(treatment, "active", reason="first_shipment")
    except Exception:  # noqa: BLE001 - an invalid transition must not undo shipment tracking
        logger.info("activation skipped treatment=%s", treatment.pk)


@transaction.atomic
def apply_pharmacy_webhook(vendor: str, payload: dict[str, Any], received_at: datetime | None = None) -> str:
    """Apply a direct pharmacy (LifeFile) webhook to an Order and its Shipment."""
    from apps.fulfillment.pharmacy import FakePharmacyAdapter, LifeFileAdapter

    adapter = LifeFileAdapter() if vendor == "lifefile" else FakePharmacyAdapter()
    parsed = adapter.handle_webhook(payload)
    order = None
    if parsed.external_order_id:
        order = Order.objects.filter(external_order_id=parsed.external_order_id).select_related("treatment").first()
    if order is None and parsed.reference_id:
        order = Order.objects.filter(pk=_safe_uuid(parsed.reference_id)).select_related("treatment").first()
    if order is None:
        raise UnresolvedReference("Unknown pharmacy order")
    if parsed.external_order_id and not order.external_order_id:
        order.external_order_id = parsed.external_order_id
        order.save(update_fields=["external_order_id", "updated_at"])
    status_map = {
        "received": ("submitted", ""), "processing": ("in_fulfillment", ""), "in_fulfillment": ("in_fulfillment", ""),
        "shipped": ("shipped", "shipped"), "delivered": ("delivered", "delivered"),
        "cancelled": ("canceled", ""), "canceled": ("canceled", ""), "error": ("failed", ""), "on_hold": ("", ""),
    }
    if parsed.status not in status_map:
        record_event(treatment=order.treatment, source="lifefile", event=f"pharmacy.{parsed.status or 'unknown'}", payload={"order_id": str(order.pk)})
        return IGNORED
    order_status, shipment_status = status_map[parsed.status]
    occurred_at = received_at or timezone.now()
    changed = False
    if order_status in ("canceled", "failed"):
        if order.status not in ("shipped", "delivered") and order.status != order_status:
            order.status = order_status
            order.save(update_fields=["status", "updated_at"])
    elif order_status:
        changed = _advance_order(order, order_status)
    if shipment_status:
        _update_shipment(
            order, shipment_status, carrier=parsed.carrier, tracking=parsed.tracking_number, tracking_url="",
            delivered_on=None, occurred_at=occurred_at,
        )
    record_event(
        treatment=order.treatment, source="lifefile", event=f"pharmacy.{parsed.status}",
        payload={"order_id": str(order.pk), "status": parsed.status, "carrier": parsed.carrier}, occurred_at=occurred_at,
    )
    _after_order_change(order, order.treatment, "", changed)
    return HANDLED


def _safe_uuid(value: str) -> Any:
    import uuid

    try:
        return uuid.UUID(str(value))
    except ValueError:
        return uuid.UUID(int=0)


# ------------------------------------------------------------------ refills

@dataclass
class NextShipment:
    batch: ShipmentBatch
    blocker: str


def next_shipment(patient: Any) -> NextShipment | None:
    """The patient's soonest unshipped batch with the reason it is not yet released, if any."""
    batch = (
        ShipmentBatch.objects.filter(
            subscription__patient=patient, status__in=["scheduled", "released"], subscription__status__in=["active", "pending_cancel"]
        )
        .select_related("subscription", "subscription__treatment", "subscription__treatment__product")
        .order_by("due_on", "sequence")
        .first()
    )
    if batch is None:
        return None
    return NextShipment(batch=batch, blocker="" if batch.status == "released" else release_blocker(batch))


@transaction.atomic
def request_refill(patient: Any, treatment: Any, *, now: datetime | None = None) -> Order:
    """Patient asks for a refill. One request per 24 hours (see ``src/lib/refill-cooldown.ts``)."""
    now = now or timezone.now()
    if treatment.patient_id != patient.pk:
        raise RefillNotAllowed("not_found")
    if treatment.status not in REFILLABLE_TREATMENT_STATES:
        raise RefillNotAllowed("treatment_not_active")
    last = CareEvent.objects.filter(treatment=treatment, event="refill.requested").order_by("-occurred_at").first()
    if last is not None and now - last.occurred_at < timedelta(hours=REFILL_COOLDOWN_HOURS):
        remaining = timedelta(hours=REFILL_COOLDOWN_HOURS) - (now - last.occurred_at)
        raise RefillCooldownActive(round(remaining.total_seconds() / 3600, 1))
    if Order.objects.filter(treatment=treatment, fill_type="refill", status__in=OPEN_ORDER_STATES).exists():
        raise RefillNotAllowed("refill_in_progress")
    pharmacy = _pharmacy_for(treatment)
    if pharmacy is None:
        raise RefillNotAllowed("no_pharmacy")
    order = create_order(
        treatment, prescription=treatment.prescriptions.order_by("-created_at").first(), pharmacy=pharmacy, fill_type="refill"
    )
    record_event(treatment=treatment, source="system", event="refill.requested", payload={"order_id": str(order.pk)}, occurred_at=now)
    if _beema_routed(treatment):
        _submit_quietly(order)
    return order


# ------------------------------------------------------------------ export

def export_for_patient(patient: Any) -> dict[str, Any]:
    """Patient data export section (registered with ``patients.export``)."""
    from apps.patients.export import serialize_instance

    orders = Order.objects.filter(treatment__patient=patient)
    return {
        "fulfillment": {
            "orders": [serialize_instance(o) for o in orders],
            "shipments": [serialize_instance(s) for s in Shipment.objects.filter(order__in=orders)],
            "care_events": [serialize_instance(e) for e in CareEvent.objects.filter(patient=patient)],
        }
    }

