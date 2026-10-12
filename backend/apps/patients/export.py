"""Patient data export. Other apps contribute sections through ``register``.

A contributor is ``fn(patient_profile) -> dict`` mapping section names to JSON-safe data.
Call ``register`` at import time (for example from the app's ``AppConfig.ready``).
"""
from __future__ import annotations

import datetime
import decimal
import logging
import uuid
from typing import Any, Callable

from django.db import models

logger = logging.getLogger(__name__)

Contributor = Callable[[Any], dict[str, Any]]
_registry: list[Contributor] = []


def register(fn: Contributor) -> Contributor:
    """Register an export contributor. Usable as a decorator; idempotent per function."""
    if fn not in _registry:
        _registry.append(fn)
    return fn


def registered() -> list[Contributor]:
    return list(_registry)


def _jsonable(value: Any) -> Any:
    if isinstance(value, (uuid.UUID, decimal.Decimal)):
        return str(value)
    if isinstance(value, (datetime.datetime, datetime.date)):
        return value.isoformat()
    return value


def serialize_instance(obj: models.Model, exclude: tuple[str, ...] = ()) -> dict[str, Any]:
    """Dict of a model's concrete fields (foreign keys as ids), safe for JSON."""
    out: dict[str, Any] = {}
    for field in obj._meta.concrete_fields:
        if field.name in exclude:
            continue
        out[field.attname] = _jsonable(getattr(obj, field.attname))
    return out


def _rows(qs: Any, exclude: tuple[str, ...] = ()) -> list[dict[str, Any]]:
    return [serialize_instance(o, exclude) for o in qs]


def build_export(patient: Any) -> dict[str, Any]:
    """Everything held about one patient. A failing contributor is named in ``export_errors``."""
    user = patient.user
    data: dict[str, Any] = {
        "generated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "account": {
            "id": str(user.pk),
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "phone": user.phone,
            "timezone": user.timezone,
            "language": user.language,
            "email_verified_at": _jsonable(user.email_verified_at),
            "terms_accepted_at": _jsonable(user.terms_accepted_at),
            "terms_version": user.terms_version,
        },
        "profile": serialize_instance(patient, exclude=("ineligible_notes",)),
        "addresses": _rows(patient.addresses.all()),
        "emergency_contacts": _rows(patient.emergency_contacts.all()),
        "allergies": _rows(patient.allergies.all()),
        "medications": _rows(patient.medications.all()),
        "conditions": _rows(patient.conditions.all()),
        "identity_documents": _rows(patient.identity_documents.all()),
        "consents": _rows(patient.consents.all()),
        "data_requests": _rows(patient.data_requests.all(), exclude=("notes",)),
    }
    errors: list[str] = []
    for fn in registered():
        try:
            for key, value in fn(patient).items():
                data[key] = value
        except Exception as exc:  # noqa: BLE001 - one broken section must not hide the rest
            logger.error("export contributor failed fn=%s patient=%s error=%s", fn.__qualname__, patient.pk, type(exc).__name__)
            errors.append(fn.__qualname__)
    if errors:
        data["export_errors"] = errors
    return data
