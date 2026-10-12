"""Stripe event handlers. The integrations app verifies the signature, then calls `dispatch`.

Each handler takes the event's `data.object` dict and is idempotent. Handlers raise
BillingError subclasses on bad data; integrations marks the event failed and never raises to Stripe.
"""
from __future__ import annotations

import logging
from typing import Any, Callable

from . import services

logger = logging.getLogger(__name__)


def _charge_intent_id(obj: dict[str, Any]) -> str:
    """The PaymentIntent id on a charge or dispute (a string unless expanded)."""
    value = obj.get("payment_intent") or ""
    return value if isinstance(value, str) else str(value.get("id", ""))


def handle_payment_intent_succeeded(obj: dict[str, Any]) -> bool:
    """`payment_intent.succeeded`. Returns False when the intent is not ours (yet)."""
    invoice = services.handle_payment_succeeded(
        obj.get("id", ""),
        amount_received_cents=obj.get("amount_received"),
        payment_method_id=obj.get("payment_method") or "",
    )
    return invoice is not None


def handle_payment_intent_failed(obj: dict[str, Any]) -> bool:
    """`payment_intent.payment_failed`."""
    error = obj.get("last_payment_error") or {}
    invoice = services.handle_payment_failed(
        obj.get("id", ""), failure_code=str(error.get("decline_code") or error.get("code") or "payment_failed")
    )
    return invoice is not None


def handle_charge_refunded(obj: dict[str, Any]) -> bool:
    """`charge.refunded`: sync refunds issued outside this system."""
    invoice = services.handle_charge_refunded(_charge_intent_id(obj), int(obj.get("amount_refunded") or 0))
    return invoice is not None


def handle_dispute_created(obj: dict[str, Any]) -> bool:
    """`charge.dispute.created`: flag for staff."""
    invoice = services.handle_dispute_created(_charge_intent_id(obj))
    return invoice is not None


HANDLERS: dict[str, Callable[[dict[str, Any]], bool]] = {
    "payment_intent.succeeded": handle_payment_intent_succeeded,
    "payment_intent.payment_failed": handle_payment_intent_failed,
    "charge.refunded": handle_charge_refunded,
    "charge.dispute.created": handle_dispute_created,
}


def dispatch(event_type: str, data_object: dict[str, Any]) -> bool | None:
    """Run the handler for an event type. None means the type is not handled here."""
    handler = HANDLERS.get(event_type)
    if handler is None:
        return None
    return handler(data_object)
