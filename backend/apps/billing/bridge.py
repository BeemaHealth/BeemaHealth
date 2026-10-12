"""Guarded bridges to other apps, imported lazily so tests can patch them and a missing app is skipped."""
from __future__ import annotations

import importlib
import logging
from types import ModuleType
from typing import Any

logger = logging.getLogger(__name__)


def load(module_path: str) -> ModuleType | None:
    """Import a module, or return None when that module itself does not exist."""
    try:
        return importlib.import_module(module_path)
    except ModuleNotFoundError as exc:
        if exc.name and module_path.startswith(exc.name):
            logger.warning("optional_module_missing module=%s", module_path)
            return None
        raise


def audit(action: str, obj: Any, *, actor: Any = None, reason: str = "", metadata: dict | None = None) -> None:
    """Write an audit event for a money or subscription change. Ids only in metadata."""
    module = load("apps.audit.services")
    if module is not None:
        module.log(None, action, obj, actor=actor, reason=reason, metadata=metadata or {})


def record_care_event(treatment: Any, event: str, payload: dict | None = None) -> None:
    """Best effort CareEvent for staff visibility. Never blocks billing."""
    if treatment is None:
        return
    module = load("apps.fulfillment.services")
    if module is None:
        return
    try:
        module.record_event(
            treatment=treatment, patient=treatment.patient, source="stripe", event=event, payload=payload or {}
        )
    except Exception:  # noqa: BLE001 - the audit trail must not break a payment
        logger.exception("record_event_failed treatment=%s event=%s", treatment.pk, event)


def create_batches(subscription: Any) -> None:
    """Ask fulfillment to (re)create shipment batches up to subscription.batches_total."""
    module = load("apps.fulfillment.services")
    if module is None or not hasattr(module, "create_batches"):
        return
    module.create_batches(subscription)


def mark_payment_received(treatment: Any) -> None:
    """Move an awaiting_payment treatment forward. Other states are left alone."""
    if treatment is None or treatment.status != "awaiting_payment":
        return
    module = load("apps.clinical.services")
    if module is None:
        return
    try:
        module.mark_payment_received(treatment)
    except Exception:  # noqa: BLE001 - InvalidTransition and friends must not undo a captured payment
        logger.exception("mark_payment_received_failed treatment=%s", treatment.pk)


def cancel_treatment(treatment: Any, *, actor: Any = None) -> bool:
    """Cancel a treatment through clinical. Returns False when clinical refuses or is absent."""
    module = load("apps.clinical.services")
    if module is None:
        return False
    try:
        module.cancel_treatment(treatment, actor=actor)
    except Exception:  # noqa: BLE001 - e.g. InvalidTransition when already canceled
        logger.info("cancel_treatment_skipped treatment=%s", treatment.pk)
        return False
    return True


def open_payment_failed_item(patient: Any, treatment: Any) -> None:
    """Open the portal 'update your payment method' banner, once."""
    module = load("apps.clinical.models")
    if module is None:
        return
    item = module.ActionItem
    if item.objects.filter(patient=patient, kind="payment_failed", is_open=True).exists():
        return
    item.objects.create(
        patient=patient,
        treatment=treatment,
        kind="payment_failed",
        title="Update your payment method",
        body="We could not process your last payment. Please update your card to avoid an interruption.",
    )


def resolve_payment_failed_items(patient: Any) -> None:
    module = load("apps.clinical.models")
    if module is None:
        return
    from django.utils import timezone

    module.ActionItem.objects.filter(patient=patient, kind="payment_failed", is_open=True).update(
        is_open=False, resolved_at=timezone.now()
    )


def notify_patient(patient: Any, template_key: str) -> None:
    module = load("apps.messaging.services")
    if module is None or not hasattr(module, "notify_patient"):
        return
    try:
        module.notify_patient(patient, template_key)
    except Exception:  # noqa: BLE001 - notification is best effort
        logger.exception("notify_patient_failed patient=%s template=%s", patient.pk, template_key)


def shipment_batch_model() -> Any | None:
    """fulfillment.ShipmentBatch if the app is installed, else None."""
    from django.apps import apps

    try:
        return apps.get_model("fulfillment", "ShipmentBatch")
    except LookupError:
        return None


def find_submission(patient: Any, treatment: Any, plan: Any) -> Any | None:
    """The questionnaire submission behind a checkout: via the treatment, else the patient's open one for the plan."""
    if treatment is not None and treatment.submission_id:
        return treatment.submission
    if plan is None:
        return None
    from django.apps import apps

    try:
        model = apps.get_model("questionnaires", "Submission")
    except LookupError:
        return None
    return (
        model.objects.filter(patient=patient, status="in_progress", selected_plan=plan)
        .order_by("-last_activity_at", "-created_at").first()
    )


def start_treatment(submission: Any) -> Any | None:
    """Create (or fetch) the treatment for a submission through clinical."""
    module = load("apps.clinical.services")
    return module.start_treatment_from_submission(submission) if module is not None else None


def complete_checkout(submission: Any) -> None:
    """Move the questionnaire past its checkout node. Idempotent on the questionnaires side."""
    module = load("apps.questionnaires.services")
    if module is not None:
        module.complete_checkout(submission)


def end_treatment(treatment: Any, reason: str) -> None:
    """Close a treatment that will not go ahead: not_eligible when allowed, else canceled."""
    module = load("apps.clinical.services")
    if module is None or treatment.status in module.TERMINAL_STATES:
        return
    for target in ("not_eligible", "canceled"):
        if module.can_transition(treatment.status, target):
            module.transition(treatment, target, reason=reason)
            return
