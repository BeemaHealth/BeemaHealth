"""Inbound webhook pipeline: authenticate, persist with a dedupe key, then process idempotently.

``ingest`` is cheap and never processes anything; ``process`` never raises. Vendors always get a
200 once the event is stored. No PHI is logged: only vendor, event type and row ids.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
from datetime import timedelta
from typing import Any, Mapping

from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.integrations.exceptions import (
    IntegrationError,
    WebhookAuthError,
    WebhookTooLarge,
    safe_location,
)
from apps.integrations.models import InboundEvent

logger = logging.getLogger(__name__)

DEFAULT_MAX_BODY_BYTES = 2 * 1024 * 1024
DEFAULT_MAX_ATTEMPTS = 8
MAX_BACKOFF = timedelta(hours=1)
ERROR_FIELD_LIMIT = 500


def max_body_bytes() -> int:
    return int(getattr(settings, "WEBHOOK_MAX_BODY_BYTES", DEFAULT_MAX_BODY_BYTES))


def max_attempts() -> int:
    return int(getattr(settings, "INTEGRATIONS_MAX_ATTEMPTS", DEFAULT_MAX_ATTEMPTS))


def _header(headers: Mapping[str, str], name: str) -> str:
    lowered = name.lower()
    for key, value in headers.items():
        if key.lower() == lowered:
            return value or ""
    return ""


def _secure_equal(supplied: str, expected: str) -> bool:
    """Constant time comparison that fails closed when the expected secret is empty."""
    if not expected:
        return False
    return hmac.compare_digest(supplied.encode("utf-8"), expected.encode("utf-8"))


def verify_beluga_auth(headers: Mapping[str, str]) -> bool:
    """Shared secret via ``Authorization: Bearer`` or ``X-Webhook-Secret``."""
    expected = getattr(settings, "BELUGA_WEBHOOK_SECRET", "")
    auth = _header(headers, "Authorization")
    supplied = auth[7:].strip() if auth.lower().startswith("bearer ") else _header(headers, "X-Webhook-Secret")
    return _secure_equal(supplied, expected)


def verify_lifefile_auth(headers: Mapping[str, str]) -> bool:
    """HTTP Basic credentials from ``LIFEFILE_WEBHOOK_USER`` / ``LIFEFILE_WEBHOOK_PASSWORD``."""
    user = getattr(settings, "LIFEFILE_WEBHOOK_USER", "")
    password = getattr(settings, "LIFEFILE_WEBHOOK_PASSWORD", "")
    auth = _header(headers, "Authorization")
    if not user or not password or not auth.lower().startswith("basic "):
        return False
    try:
        decoded = base64.b64decode(auth[6:].strip(), validate=True).decode("utf-8")
    except (ValueError, UnicodeDecodeError):
        return False
    return _secure_equal(decoded, f"{user}:{password}")


def canonical_json(payload: Any) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


def make_dedupe_key(vendor: str, ref: str, event: str, payload: Any) -> str:
    """sha256 over vendor, masterId or orderId, event name and the canonical payload."""
    material = "\x1f".join([vendor, ref, event, canonical_json(payload)])
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


def store_event(vendor: str, key: str, event_type: str, ref: str, payload: Any, **extra: Any) -> InboundEvent:
    """Insert-or-ignore on the dedupe key. Returns the existing row for duplicates."""
    try:
        with transaction.atomic():
            event, created = InboundEvent.objects.get_or_create(
                dedupe_key=key,
                defaults={"vendor": vendor, "event_type": event_type[:100], "external_ref": ref[:255], "raw_payload": payload, **extra},
            )
    except IntegrityError:
        event, created = InboundEvent.objects.get(dedupe_key=key), False
    logger.info("webhook stored vendor=%s type=%s id=%s duplicate=%s", vendor, event_type, event.id, not created)
    return event


def _store_malformed(vendor: str, raw_body: bytes) -> InboundEvent:
    """Persist a marker for an unparseable body (the body itself is not kept: it may hold PHI)."""
    key = hashlib.sha256(vendor.encode() + b"\x1f" + raw_body).hexdigest()
    return store_event(
        vendor,
        key,
        "malformed",
        "",
        {"_unparseable": True, "length": len(raw_body)},
        status="dead",
        last_error="malformed_json",
        attempts=max_attempts(),
    )


def ingest(vendor: str, headers: Mapping[str, str], raw_body: bytes) -> InboundEvent:
    """Authenticate and persist one webhook. Raises only ``WebhookAuthError`` / ``WebhookTooLarge``."""
    if len(raw_body) > max_body_bytes():
        raise WebhookTooLarge("Webhook body too large")
    if vendor == "beluga":
        authentic = verify_beluga_auth(headers)
    elif vendor == "lifefile":
        authentic = verify_lifefile_auth(headers)
    elif vendor == "stripe":
        return _ingest_stripe(headers, raw_body)
    else:
        raise WebhookAuthError("Unknown vendor")
    if not authentic:
        raise WebhookAuthError("Webhook authentication failed")

    try:
        payload = json.loads(raw_body)
    except (ValueError, UnicodeDecodeError):
        return _store_malformed(vendor, raw_body)
    if not isinstance(payload, dict):
        return _store_malformed(vendor, raw_body)

    if vendor == "beluga":
        event_type = str(payload.get("event") or "")
        ref = str(payload.get("masterId") or payload.get("orderId") or "")
        order_ref = str(payload.get("orderId") or "")
        key = make_dedupe_key(vendor, f"{ref}|{order_ref}", event_type, payload)
    else:
        event_type = str(payload.get("eventType") or payload.get("status") or "")
        ref = str(payload.get("orderId") or payload.get("referenceId") or "")
        key = make_dedupe_key(vendor, ref, event_type, payload)
    return store_event(vendor, key, event_type, ref, payload)


def _ingest_stripe(headers: Mapping[str, str], raw_body: bytes) -> InboundEvent:
    import stripe

    secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")
    signature = _header(headers, "Stripe-Signature")
    if not secret or not signature:
        raise WebhookAuthError("Webhook authentication failed")
    try:
        stripe.Webhook.construct_event(raw_body, signature, secret)
    except (ValueError, stripe.SignatureVerificationError) as exc:
        raise WebhookAuthError("Webhook authentication failed") from exc
    try:
        payload = json.loads(raw_body)
    except (ValueError, UnicodeDecodeError):
        return _store_malformed("stripe", raw_body)
    if not isinstance(payload, dict):
        return _store_malformed("stripe", raw_body)
    event_type = str(payload.get("type") or "")
    obj = (payload.get("data") or {}).get("object") or {}
    ref = str(obj.get("id") or "") if isinstance(obj, dict) else ""
    key = make_dedupe_key("stripe", str(payload.get("id") or ref), event_type, payload)
    return store_event("stripe", key, event_type, ref, payload)


def _safe_error(exc: Exception) -> str:
    """Error text for storage. Only our own exception types may contribute a message."""
    if isinstance(exc, IntegrationError):
        return f"{type(exc).__name__}: {exc}"[:ERROR_FIELD_LIMIT]
    return type(exc).__name__


def _backoff(attempts: int) -> timedelta:
    return min(timedelta(seconds=30 * 2 ** max(attempts - 1, 0)), MAX_BACKOFF)


def process(event: InboundEvent) -> InboundEvent:
    """Apply one event to domain state. Idempotent; never raises; dead letters after N attempts."""
    from apps.integrations import dispatch

    with transaction.atomic():
        locked = InboundEvent.objects.select_for_update().get(pk=event.pk)
        if locked.status in ("processed", "ignored", "dead"):
            return locked
        locked.attempts += 1
        try:
            with transaction.atomic():
                handler = dispatch.dispatch_event(locked)
            locked.status = "ignored" if handler == "ignored" else "processed"
            locked.processed_at = timezone.now()
            locked.last_error = ""
            locked.next_attempt_at = None
        except Exception as exc:  # noqa: BLE001 - nothing may escape to the vendor
            locked.last_error = _safe_error(exc)
            if isinstance(exc, IntegrationError):
                logger.warning("webhook failed id=%s type=%s reason=%s", locked.id, locked.event_type, type(exc).__name__)
            else:
                logger.error("webhook handler crashed id=%s type=%s error=%s", locked.id, locked.event_type, safe_location(exc))
            if locked.attempts >= max_attempts():
                locked.status = "dead"
                locked.next_attempt_at = None
            else:
                locked.status = "failed"
                locked.next_attempt_at = timezone.now() + _backoff(locked.attempts)
        locked.save()
    return locked


def process_pending(limit: int = 100, vendor: str | None = None, now=None) -> dict[str, int]:
    """Process received events and failed events whose backoff has elapsed."""
    from django.db.models import Q

    now = now or timezone.now()
    queryset = InboundEvent.objects.filter(status__in=["received", "failed"]).filter(
        Q(next_attempt_at__isnull=True) | Q(next_attempt_at__lte=now)
    )
    if vendor:
        queryset = queryset.filter(vendor=vendor)
    stats = {"processed": 0, "failed": 0, "dead": 0, "ignored": 0}
    for event in queryset.order_by("received_at")[:limit]:
        result = process(event)
        stats[{"processed": "processed", "ignored": "ignored", "dead": "dead"}.get(result.status, "failed")] += 1
    return stats

