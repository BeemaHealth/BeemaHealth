from __future__ import annotations

from typing import Any

from django.db import transaction
from django.utils import timezone

from apps.common.utils import sha256_hex

from .export import build_export  # noqa: F401 - public service entry point
from .models import ConsentRecord, DataRequest, PatientProfile


class DuplicateDataRequest(Exception):
    """An open request of this kind already exists."""


def record_consent(patient: PatientProfile, kind: str, version: str, *, ip: str | None = None, user_agent: str = "") -> ConsentRecord:
    """Create an immutable consent record."""
    return ConsentRecord.objects.create(
        patient=patient,
        kind=kind,
        version=version,
        ip=ip,
        user_agent_hash=sha256_hex(user_agent) if user_agent else "",
    )


def open_data_request(patient: PatientProfile, kind: str) -> DataRequest:
    """Create a data request unless one of the same kind is still open."""
    open_states = [DataRequest.Status.REQUESTED, DataRequest.Status.IN_REVIEW]
    with transaction.atomic():
        if DataRequest.objects.select_for_update().filter(patient=patient, kind=kind, status__in=open_states).exists():
            raise DuplicateDataRequest(kind)
        return DataRequest.objects.create(patient=patient, kind=kind)


def mark_completed(data_request: DataRequest, reviewer: Any = None, notes: str = "") -> DataRequest:
    data_request.status = DataRequest.Status.COMPLETED
    data_request.completed_at = timezone.now()
    data_request.reviewed_by = reviewer
    if notes:
        data_request.notes = notes
    data_request.save()
    return data_request
