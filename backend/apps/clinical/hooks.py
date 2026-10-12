"""Guarded bridges to other apps.

Other apps are built concurrently, so their services are imported lazily here. A missing app is
skipped with a log line. Tests stub these functions with ``unittest.mock``. Log ids only, never PHI.
"""
from __future__ import annotations

import importlib
import logging
from types import ModuleType
from typing import Any

logger = logging.getLogger(__name__)


def _load(module_path: str) -> ModuleType | None:
    """Import ``module_path`` or return None when that module itself does not exist."""
    try:
        return importlib.import_module(module_path)
    except ModuleNotFoundError as exc:
        if exc.name and module_path.startswith(exc.name):
            logger.warning("Optional module %s is not installed", module_path)
            return None
        raise


def refund_not_prescribed(treatment: Any) -> Any:
    """Full refund when the patient is not prescribed. Errors propagate so the caller can retry."""
    module = _load("apps.billing.services")
    if module is None:
        return None
    return module.refund_not_prescribed(treatment)


def refund_canceled_before_submission(treatment: Any) -> Any:
    """Full refund when the patient cancels before the visit reaches the network."""
    module = _load("apps.billing.services")
    if module is None:
        return None
    return module.refund_canceled_before_submission(treatment)


def record_event(*, treatment: Any, source: str, event: str, payload: dict[str, Any] | None = None) -> None:
    """Write a fulfillment CareEvent. A failure is logged and never blocks a state change."""
    module = _load("apps.fulfillment.services")
    if module is None:
        return
    try:
        module.record_event(
            treatment=treatment,
            patient=treatment.patient,
            source=source,
            event=event,
            payload=payload or {},
        )
    except Exception:  # noqa: BLE001 - audit trail must not break clinical flow
        logger.exception("record_event failed for treatment %s event %s", treatment.pk, event)


def notify_patient(patient: Any, template_key: str) -> None:
    """Send a content-free notification (SMS and email). A failure is logged, never raised."""
    module = _load("apps.messaging.services")
    if module is None or not hasattr(module, "notify_patient"):
        return
    try:
        module.notify_patient(patient, template_key)
    except Exception:  # noqa: BLE001 - notification is best effort
        logger.exception("notify_patient failed for patient %s template %s", patient.pk, template_key)


def submit_visit(treatment: Any) -> None:
    """Ask integrations to POST the visit to the network. A failure is logged for staff to retry."""
    module = _load("apps.integrations.services")
    if module is None or not hasattr(module, "submit_visit_for_treatment"):
        return
    try:
        module.submit_visit_for_treatment(treatment)
    except Exception:  # noqa: BLE001 - treatment stays in routing_review for a retry
        logger.exception("submit_visit failed for treatment %s", treatment.pk)


def audit_log(
    request: Any, action: str, obj: Any = None, *, patient_id: Any = None, metadata: dict[str, Any] | None = None
) -> None:
    """Write an AuditEvent for a PHI read or write. Audit fails closed: errors propagate."""
    module = _load("apps.audit.services")
    if module is None:
        return
    module.log(request, action, obj, patient_id=patient_id, metadata=metadata or {})
