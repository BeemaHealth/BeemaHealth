from __future__ import annotations

from django.utils import timezone

from apps.accounts.models import User
from apps.patients.models import PatientCareEvent

# Canonical milestone slugs shown on the patient case timeline (after prescription-sent).
FULFILLMENT_MILESTONES = (
    "pharmacy-in-fulfillment",
    "pharmacy-shipped",
    "pharmacy-delivered",
    "package-in-transit",
    "package-out-for-delivery",
    "package-delivered",
    "package-delivery-failed",
)

BELUGA_EVENT_TO_MILESTONE: dict[str, str] = {
    "PHARMACY_ORDER_IN_FULFILLMENT": "pharmacy-in-fulfillment",
    "PHARMACY_ORDER_SHIPPED": "pharmacy-shipped",
    "PHARMACY_ORDER_DELIVERED": "pharmacy-delivered",
    "PACKAGE_IN_TRANSIT": "package-in-transit",
    "PACKAGE_OUT_FOR_DELIVERY": "package-out-for-delivery",
    "PACKAGE_DELIVERED": "package-delivered",
    "PACKAGE_DELIVERY_FAILED": "package-delivery-failed",
}

MILESTONE_TITLES: dict[str, str] = {
    "pharmacy-in-fulfillment": "Order in fulfillment",
    "pharmacy-shipped": "Order shipped",
    "pharmacy-delivered": "Order delivered",
    "package-in-transit": "Package in transit",
    "package-out-for-delivery": "Out for delivery",
    "package-delivered": "Package delivered",
    "package-delivery-failed": "Delivery issue",
}

MILESTONE_DESCRIPTIONS: dict[str, str] = {
    "pharmacy-in-fulfillment": "The pharmacy is preparing your order.",
    "pharmacy-shipped": "Your order has shipped.",
    "pharmacy-delivered": "Your order has been delivered.",
    "package-in-transit": "Your package is on its way.",
    "package-out-for-delivery": "Your package is out for delivery.",
    "package-delivered": "Your package has been delivered.",
    "package-delivery-failed": (
        "We couldn't deliver your package. Please check your shipping details."
    ),
}

PHARMACY_STATUS_TO_MILESTONE: dict[str, str] = {
    "processing": "pharmacy-in-fulfillment",
    "received": "pharmacy-in-fulfillment",
    "shipped": "pharmacy-shipped",
    "delivered": "pharmacy-delivered",
}


def _append_tracking(description: str, *, carrier: str = "", tracking: str = "") -> str:
    tracking = (tracking or "").strip()
    if not tracking:
        return description
    carrier = (carrier or "").strip()
    if carrier:
        return f"{description} {carrier} tracking: {tracking}"
    return f"{description} Tracking: {tracking}"


def milestone_copy(
    milestone: str,
    *,
    carrier: str = "",
    tracking: str = "",
) -> tuple[str, str]:
    title = MILESTONE_TITLES.get(milestone, "Order update")
    description = MILESTONE_DESCRIPTIONS.get(milestone, "There's an update on your order.")
    if milestone in ("pharmacy-shipped", "package-in-transit", "package-out-for-delivery"):
        description = _append_tracking(description, carrier=carrier, tracking=tracking)
    return title, description


def record_care_event(
    user: User,
    *,
    milestone: str,
    source: str,
    source_event: str = "",
    title: str | None = None,
    description: str | None = None,
    occurred_at=None,
    metadata: dict | None = None,
    idempotency_key: str | None = None,
) -> PatientCareEvent | None:
    """Insert a care timeline event, skipping duplicates via idempotency_key."""
    if title is None or description is None:
        info = metadata or {}
        auto_title, auto_description = milestone_copy(
            milestone,
            carrier=str(info.get("carrier") or ""),
            tracking=str(info.get("tracking") or info.get("trackerId") or ""),
        )
        title = title or auto_title
        description = description or auto_description

    defaults = {
        "milestone": milestone,
        "source": source,
        "source_event": source_event,
        "title": title,
        "description": description,
        "occurred_at": occurred_at or timezone.now(),
        "metadata": metadata or {},
    }

    if idempotency_key:
        event, created = PatientCareEvent.objects.get_or_create(
            idempotency_key=idempotency_key,
            defaults={"user": user, **defaults},
        )
        return event if created else None

    return PatientCareEvent.objects.create(user=user, **defaults)


def record_beluga_fulfillment_event(
    user: User,
    *,
    event_type: str,
    master_id: str,
    order_id: str | None = None,
    info: dict | None = None,
) -> PatientCareEvent | None:
    milestone = BELUGA_EVENT_TO_MILESTONE.get(event_type)
    if milestone is None:
        return None

    metadata = dict(info or {})
    if order_id:
        metadata["order_id"] = order_id

    idempotency_key = f"beluga:{event_type}:{master_id}:{order_id or ''}"
    return record_care_event(
        user,
        milestone=milestone,
        source="beluga_webhook",
        source_event=event_type,
        metadata=metadata,
        idempotency_key=idempotency_key,
    )


def record_pharmacy_fulfillment_event(
    user: User,
    *,
    status: str,
    external_order_id: str = "",
    event_type: str = "",
    carrier: str = "",
    tracking_number: str = "",
    idempotency_key: str = "",
) -> PatientCareEvent | None:
    milestone = PHARMACY_STATUS_TO_MILESTONE.get(status.lower())
    if milestone is None:
        return None

    metadata: dict[str, str] = {}
    if external_order_id:
        metadata["order_id"] = external_order_id
    if carrier:
        metadata["carrier"] = carrier
    if tracking_number:
        metadata["tracking"] = tracking_number

    key = idempotency_key or f"pharmacy:{milestone}:{external_order_id}:{event_type}:{status}"
    return record_care_event(
        user,
        milestone=milestone,
        source="pharmacy_webhook",
        source_event=event_type or status,
        metadata=metadata,
        idempotency_key=key,
    )


def get_user_care_events(user: User) -> list[PatientCareEvent]:
    """All persisted fulfillment events for the user, sorted chronologically.

    Returns every event — not deduplicated per milestone — so the frontend can
    group them by order_id and render a directory-style timeline (initial
    consultation + one section per refill cycle). Idempotency keys at the
    record level still prevent exact-duplicate webhook events from being stored.
    """
    return list(
        PatientCareEvent.objects.filter(
            user=user, milestone__in=FULFILLMENT_MILESTONES
        ).order_by("occurred_at", "created_at")
    )
