"""Audit logging. Fails closed: if an event cannot be written the caller sees the error."""
from __future__ import annotations

import uuid
from typing import Any

from django.http import HttpRequest

from apps.common.utils import client_ip

from .models import AuditEvent

# Metadata keys that must never carry values (PHI guard). Matching is by substring.
_REDACT_KEYS = ("email", "name", "phone", "dob", "birth", "address", "answer", "body", "note", "password", "token", "secret")


def _redact(metadata: dict[str, Any] | None) -> dict[str, Any]:
    clean: dict[str, Any] = {}
    for key, value in (metadata or {}).items():
        if any(part in str(key).lower() for part in _REDACT_KEYS):
            clean[key] = "[redacted]"
        else:
            clean[key] = value
    return clean


def _patient_id_for(obj: Any) -> uuid.UUID | None:
    if obj is None:
        return None
    if obj._meta.label_lower == "patients.patientprofile":
        return obj.pk
    value = getattr(obj, "patient_id", None)
    return value if isinstance(value, uuid.UUID) else None


def log(
    request_or_none: HttpRequest | None,
    action: str,
    obj: Any = None,
    *,
    actor: Any = None,
    reason: str = "",
    metadata: dict[str, Any] | None = None,
    patient_id: uuid.UUID | None = None,
) -> AuditEvent:
    """Write one append only audit event. Identify objects by type and id, never by content."""
    request = request_or_none
    user = actor
    if user is None and request is not None:
        candidate = getattr(request, "user", None)
        if candidate is not None and getattr(candidate, "is_authenticated", False):
            user = candidate
    if user is not None and getattr(user, "pk", None) is not None:
        label = f"user:{user.pk}"
    else:
        user = None
        label = "system" if request is None else "anonymous"
    return AuditEvent.objects.create(
        actor=user,
        actor_label=label,
        action=action,
        object_type=obj._meta.label_lower if obj is not None else "",
        object_id=str(obj.pk) if obj is not None and obj.pk is not None else "",
        patient_id=patient_id or _patient_id_for(obj),
        reason=reason[:500],
        ip=client_ip(request),
        metadata=_redact(metadata),
    )
