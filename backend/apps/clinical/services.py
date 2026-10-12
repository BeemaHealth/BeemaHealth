"""Clinical services: treatment state machine, visit outcomes, prescriptions and dose schedules.

Cancellation policy (owner): a patient may cancel and be refunded only until the visit is POSTed
to the doctor network (``submitted_to_network_at``). Not prescribed (referred or canceled by the
doctor) means a full refund and a drug ineligibility. Reasons passed to ``transition`` are short
codes, never free text, because they are copied to the care event timeline.
"""
from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

from django.apps import apps
from django.db import transaction
from django.utils import timezone

from apps.common.exceptions import InvalidStateTransition

from . import hooks
from .models import ActionItem, DoseLog, DrugIneligibility, Prescription, Treatment, Visit

logger = logging.getLogger(__name__)

S = Treatment.Status


class InvalidTransition(InvalidStateTransition):
    """The requested treatment status change is not allowed from the current status."""


class IneligibleError(Exception):
    """The patient was not prescribed this drug before and may not start it again. Patient-safe text."""

    code = "previously_ineligible"

    def __init__(self, message: str = "") -> None:
        super().__init__(message or INELIGIBLE_MESSAGE)


INELIGIBLE_MESSAGE = (
    "We are not able to start this program for you. Your care team reviewed your earlier request. "
    "Please contact support if you have questions."
)


ALLOWED_TRANSITIONS: dict[str, frozenset[str]] = {
    S.QUESTIONNAIRE_IN_PROGRESS: frozenset({S.NOT_ELIGIBLE, S.AWAITING_PAYMENT, S.CANCELED}),
    S.NOT_ELIGIBLE: frozenset(),
    S.AWAITING_PAYMENT: frozenset(
        {S.AWAITING_VISIT_COMPLETION, S.ROUTING_REVIEW, S.PENDING_VISIT, S.CANCELED}
    ),
    S.AWAITING_VISIT_COMPLETION: frozenset({S.ROUTING_REVIEW, S.PENDING_VISIT, S.NOT_ELIGIBLE, S.CANCELED}),
    S.ROUTING_REVIEW: frozenset({S.PENDING_VISIT, S.CANCELED}),
    S.PENDING_VISIT: frozenset({S.NEEDS_PATIENT_ACTION, S.CANCELED, S.PRESCRIBED, S.REFERRED}),
    S.NEEDS_PATIENT_ACTION: frozenset({S.PENDING_VISIT, S.CANCELED, S.PRESCRIBED, S.REFERRED}),
    S.CANCELED: frozenset(),
    S.PRESCRIBED: frozenset({S.ACTIVE, S.ENDED}),
    S.REFERRED: frozenset(),
    S.ACTIVE: frozenset({S.REFILL_DUE, S.PAUSED, S.ENDED}),
    S.REFILL_DUE: frozenset({S.PENDING_VISIT, S.ROUTING_REVIEW, S.ACTIVE, S.PAUSED, S.ENDED}),
    S.PAUSED: frozenset({S.ACTIVE, S.ENDED}),
    S.ENDED: frozenset(),
}

TERMINAL_STATES = frozenset({S.NOT_ELIGIBLE, S.CANCELED, S.REFERRED, S.ENDED})
# Statuses with no payment taken yet, so a cancel needs no refund.
UNPAID_STATES = frozenset({S.QUESTIONNAIRE_IN_PROGRESS, S.AWAITING_PAYMENT})
# Statuses where an Rx may be attached without moving the treatment.
RX_ATTACH_STATES = frozenset({S.PRESCRIBED, S.ACTIVE, S.REFILL_DUE, S.PAUSED})
RX_TRANSITION_STATES = frozenset({S.PENDING_VISIT, S.NEEDS_PATIENT_ACTION})

# State entered -> (action kind, title, body). Bodies are content free.
STATE_ACTIONS: dict[str, tuple[str, str, str]] = {
    S.AWAITING_VISIT_COMPLETION: (
        ActionItem.Kind.COMPLETE_VISIT,
        "Finish your medical questionnaire",
        "Complete your medical questionnaire to the end so your provider can review it.",
    ),
    S.NEEDS_PATIENT_ACTION: (
        ActionItem.Kind.ANSWER_FOLLOWUP,
        "Your provider needs more information",
        "Open your messages to see what your provider needs from you.",
    ),
}


def can_transition(old: str, new: str) -> bool:
    """True when ``old`` may move to ``new``."""
    return new in ALLOWED_TRANSITIONS.get(old, frozenset())


def _open_action_item(treatment: Treatment, kind: str, title: str, body: str, state: str) -> ActionItem:
    existing = ActionItem.objects.filter(treatment=treatment, kind=kind, is_open=True).first()
    if existing:
        return existing
    return ActionItem.objects.create(
        treatment=treatment, patient=treatment.patient, kind=kind, title=title, body=body, opened_by_state=state
    )


def _resolve_state_action_items(treatment: Treatment, state: str) -> None:
    ActionItem.objects.filter(treatment=treatment, is_open=True, opened_by_state=state).update(
        is_open=False, resolved_at=timezone.now()
    )


@transaction.atomic
def transition(
    treatment: Treatment,
    new_status: str,
    *,
    actor: Any = None,
    reason: str = "",
    action_kind: str | None = None,
) -> Treatment:
    """Move ``treatment`` to ``new_status`` or raise ``InvalidTransition``.

    Writes a CareEvent, closes action items opened by the state being left, and opens one when
    the new state needs the patient (``action_kind`` overrides the default kind).
    """
    locked = Treatment.objects.select_for_update().only("status").get(pk=treatment.pk)
    old = locked.status
    if not can_transition(old, new_status):
        raise InvalidTransition(f"Treatment {treatment.pk}: {old} -> {new_status} is not allowed")

    now = timezone.now()
    treatment.status = new_status
    fields = ["status", "updated_at"]
    if new_status in TERMINAL_STATES:
        treatment.ended_at = treatment.ended_at or now
        if reason:
            treatment.end_reason = reason[:100]
        fields += ["ended_at", "end_reason"]
    if new_status == S.ACTIVE and treatment.started_at is None:
        treatment.started_at = now
        fields.append("started_at")
    treatment.save(update_fields=fields)

    _resolve_state_action_items(treatment, old)
    if new_status in STATE_ACTIONS:
        default_kind, title, body = STATE_ACTIONS[new_status]
        _open_action_item(treatment, action_kind or default_kind, title, body, new_status)

    hooks.record_event(
        treatment=treatment,
        source="staff" if actor is not None else "system",
        event=f"treatment.{new_status}",
        payload={"from": old, "to": new_status, "reason": reason[:100]},
    )
    return treatment


def can_cancel(treatment: Treatment) -> bool:
    """False once the visit has been submitted to the network, or when the status cannot cancel."""
    if treatment.submitted_to_network_at is not None:
        return False
    return can_transition(treatment.status, S.CANCELED)


@transaction.atomic
def cancel_treatment(treatment: Treatment, *, actor: Any = None) -> Treatment:
    """Patient cancel before submission: transition to canceled and refund in full."""
    if not can_cancel(treatment):
        raise InvalidTransition(f"Treatment {treatment.pk} can no longer be canceled")
    previous = treatment.status
    transition(treatment, S.CANCELED, actor=actor, reason="canceled_before_submission")
    if previous not in UNPAID_STATES:
        hooks.refund_canceled_before_submission(treatment)
    return treatment


def is_ineligible(patient: Any, target: Any) -> DrugIneligibility | None:
    """The active (not lifted) ineligibility blocking ``patient`` from ``target``, else None.

    ``target`` is a drug name, a ProductVariant or a Product. A drug or variant matches the
    drug across products. A Product matches rows recorded for that product, or, when the product
    has variants, only when every drug it sells is blocked (so one blocked drug never blocks
    its sibling).
    """
    rows = DrugIneligibility.objects.filter(patient=patient, lifted_at__isnull=True)
    if isinstance(target, str):
        return rows.filter(drug__iexact=target.strip()).first()
    drug = getattr(target, "drug", None)
    if drug is not None:
        return rows.filter(drug__iexact=drug).first()
    own = rows.filter(product=target).first()
    if own is not None:
        return own
    drugs = {d.lower() for d in target.variants.values_list("drug", flat=True)}
    if not drugs:
        return None
    blocked = {r.drug.lower(): r for r in rows if r.drug.lower() in drugs}
    return next(iter(blocked.values())) if blocked.keys() == drugs else None


def _product_for_submission(submission: Any, plan: Any) -> Any:
    if plan is not None:
        return plan.product
    slug = getattr(getattr(getattr(submission, "version", None), "questionnaire", None), "product_slug", "")
    Product = apps.get_model("catalog", "Product")
    product = Product.objects.filter(slug=slug).first() if slug else None
    if product is None:
        raise ValueError(f"Cannot determine product for submission {submission.pk}")
    return product


def _variant_for_submission(submission: Any, plan: Any) -> Any:
    """Resolve the chosen variant from the outcome key, falling back to the plan's variant."""
    ProductVariant = apps.get_model("catalog", "ProductVariant")
    key = ((getattr(submission, "outcome", None) or {}).get("selected_variant_key") or "").strip()
    if key:
        variant = ProductVariant.objects.filter(slug=key).first()
        if variant is None:
            parts = [p for p in re.split(r"[:|/,.]", key) if p]
            if len(parts) == 3:
                variant = ProductVariant.objects.filter(
                    drug=parts[0], additive=parts[1], phase=parts[2], is_active=True
                ).first()
        if variant is not None:
            return variant
    return getattr(plan, "variant", None)


@transaction.atomic
def start_treatment_from_submission(submission: Any) -> Treatment:
    """Create the Treatment for a Submission (idempotent) and place it by the clinical outcome."""
    if submission.patient_id is None:
        raise ValueError(f"Submission {submission.pk} has no patient yet")
    existing = Treatment.objects.filter(submission=submission).first()
    if existing is not None:
        return existing

    plan = submission.selected_plan
    outcome = submission.outcome or {}
    variant = _variant_for_submission(submission, plan)
    product = _product_for_submission(submission, plan)
    if is_ineligible(submission.patient, variant if variant is not None else product) is not None:
        raise IneligibleError()
    strength = getattr(variant, "strength_mg", None)
    treatment = Treatment.objects.create(
        patient_id=submission.patient_id,
        product=product,
        plan=plan,
        variant=variant,
        submission=submission,
        requested_strength_mg=strength,
        requested_dose_label=f"{strength.normalize():f} mg" if strength is not None else "",
    )
    disqualified = submission.status == "disqualified" or outcome.get("disqualified") is True
    if disqualified:
        transition(treatment, S.NOT_ELIGIBLE, reason="disqualified")
    elif plan is not None and outcome.get("eligible") is True:
        transition(treatment, S.AWAITING_PAYMENT)
    return treatment


def mark_payment_received(treatment: Treatment, *, actor: Any = None) -> Treatment:
    """Payment succeeded: the patient now finishes the medical questionnaire."""
    return transition(treatment, S.AWAITING_VISIT_COMPLETION, actor=actor, reason="payment_received")


@transaction.atomic
def mark_submitted_to_network(treatment: Treatment, visit: Visit) -> Treatment:
    """Record that ``visit`` was POSTed to the network. After this the patient can no longer cancel."""
    if visit.treatment_id != treatment.pk:
        raise ValueError("Visit does not belong to treatment")
    if visit.submitted_at is not None:
        return treatment
    now = timezone.now()
    visit.submitted_at = now
    visit.save(update_fields=["submitted_at", "updated_at"])
    treatment.submitted_to_network_at = now
    treatment.save(update_fields=["submitted_to_network_at", "updated_at"])
    if treatment.status != S.PENDING_VISIT:
        transition(treatment, S.PENDING_VISIT, reason="submitted_to_network")
    return treatment


def _treatment_drug(treatment: Treatment) -> str:
    variant = treatment.variant
    return variant.drug if variant is not None else treatment.product.slug


@transaction.atomic
def apply_visit_outcome(visit: Visit, outcome: str, *, actor: Any = None) -> Treatment:
    """Apply a network visit outcome. Safe to replay: a repeated outcome is a no-op.

    ``referred`` and ``canceled`` (by the doctor) mean not prescribed: the patient is marked
    ineligible for the drug and refunded in full through billing. Beema keeps the vendor cost.
    """
    if outcome not in Visit.Outcome.values:
        raise ValueError(f"Unknown visit outcome: {outcome}")
    treatment = Treatment.objects.select_for_update().select_related("product", "variant").get(pk=visit.treatment_id)
    now = timezone.now()
    visit.outcome = outcome
    if outcome != Visit.Outcome.NONE:
        visit.status = Visit.Status.CANCELED if outcome == Visit.Outcome.CANCELED else Visit.Status.CONCLUDED
        visit.concluded_at = visit.concluded_at or now
    visit.save(update_fields=["outcome", "status", "concluded_at", "updated_at"])

    if outcome == Visit.Outcome.PRESCRIBED:
        if treatment.status in RX_TRANSITION_STATES:
            transition(treatment, S.PRESCRIBED, actor=actor, reason="visit_prescribed")
        return treatment

    if outcome in (Visit.Outcome.REFERRED, Visit.Outcome.CANCELED):
        target = S.REFERRED if outcome == Visit.Outcome.REFERRED else S.CANCELED
        if treatment.status == target:
            return treatment
        transition(treatment, target, actor=actor, reason="not_prescribed")
        DrugIneligibility.objects.get_or_create(
            patient_id=treatment.patient_id,
            product=treatment.product,
            drug=_treatment_drug(treatment),
            lifted_at=None,
            defaults={"reason": "not_prescribed", "source_treatment": treatment},
        )
        hooks.refund_not_prescribed(treatment)
        hooks.notify_patient(treatment.patient, "action_required")
    return treatment


_STRENGTH_RE = re.compile(r"(\d+(?:\.\d+)?)\s*mg", re.IGNORECASE)


def _parse_strength_mg(rx_data: dict[str, Any]) -> Decimal | None:
    raw = rx_data.get("strength_mg")
    if raw in (None, ""):
        match = _STRENGTH_RE.search(str(rx_data.get("strength") or ""))
        raw = match.group(1) if match else None
    if raw is None:
        return None
    try:
        value = Decimal(str(raw))
    except InvalidOperation:
        return None
    return value if value > 0 else None


@transaction.atomic
def apply_prescription(visit: Visit, rx_data: dict[str, Any]) -> Prescription:
    """Store a written prescription and move the treatment to ``prescribed``.

    Idempotent by ``external_rx_id``. When the prescribed strength differs from the requested
    one the treatment is flagged ``dose_changed_by_doctor`` and the patient is notified.
    """
    treatment = Treatment.objects.select_for_update().select_related("patient").get(pk=visit.treatment_id)
    rx_id = str(rx_data.get("external_rx_id") or "")
    if rx_id:
        existing = Prescription.objects.filter(treatment=treatment, external_rx_id=rx_id).first()
        if existing is not None:
            return existing
    if treatment.status not in RX_ATTACH_STATES | RX_TRANSITION_STATES:
        raise InvalidTransition(f"Treatment {treatment.pk} cannot take a prescription while {treatment.status}")

    rx = Prescription.objects.create(
        treatment=treatment,
        visit=visit,
        external_rx_id=rx_id,
        external_med_id=str(rx_data.get("external_med_id") or ""),
        drug=str(rx_data.get("drug") or ""),
        strength=str(rx_data.get("strength") or ""),
        quantity=rx_data.get("quantity"),
        refills=rx_data.get("refills") or 0,
        prescriber_name=str(rx_data.get("prescriber_name") or visit.doctor_name or ""),
        prescriber_npi=rx_data.get("prescriber_npi") or None,
        pharmacy_notes=str(rx_data.get("pharmacy_notes") or ""),
        written_at=rx_data.get("written_at") or timezone.now(),
        expires_at=rx_data.get("expires_at"),
    )

    prescribed = _parse_strength_mg(rx_data)
    if prescribed is not None:
        treatment.prescribed_strength_mg = prescribed
        requested = treatment.requested_strength_mg
        if requested is not None and prescribed != requested:
            treatment.dose_changed_by_doctor = True
        treatment.save(update_fields=["prescribed_strength_mg", "dose_changed_by_doctor", "updated_at"])
    if treatment.status in RX_TRANSITION_STATES:
        transition(treatment, S.PRESCRIBED, reason="rx_written")

    hooks.notify_patient(treatment.patient, "rx_written")
    generate_dose_schedule(treatment)
    return rx


def _phase_schedule(treatment: Treatment) -> list[tuple[int, Decimal | None, int]]:
    """Plan phases as (start_month, strength_mg, interval_days), ordered by sequence."""
    plan = treatment.plan
    if plan is None:
        return []
    return [
        (p.start_month, getattr(p.variant, "strength_mg", None), p.dose_interval_days)
        for p in plan.phases.select_related("variant").order_by("sequence")
    ]


@transaction.atomic
def generate_dose_schedule(
    treatment: Treatment, *, start_on: datetime | None = None, horizon_days: int | None = None
) -> list[DoseLog]:
    """Create future ``scheduled`` DoseLogs (weekly by default) from the plan and prescription.

    Plan phases set the strength and interval per month of the plan. Without phases the
    prescribed strength (else requested) repeats every 7 days across one shipment of supply.
    Regenerating replaces untouched future generated doses and keeps numbering continuous.
    """
    start = start_on or timezone.now()
    now = timezone.now()
    DoseLog.objects.filter(
        treatment=treatment, auto_generated=True, status=DoseLog.Status.SCHEDULED, scheduled_at__gt=now
    ).delete()

    phases = _phase_schedule(treatment)
    plan = treatment.plan
    if horizon_days is None:
        if phases and plan is not None and plan.term_months:
            horizon_days = plan.term_months * 30
        else:
            horizon_days = (getattr(plan, "supply_days_per_shipment", None) or 28)
    base_strength = treatment.prescribed_strength_mg or treatment.requested_strength_mg
    last_number = (
        DoseLog.objects.filter(treatment=treatment, dose_number__isnull=False)
        .order_by("-dose_number")
        .values_list("dose_number", flat=True)
        .first()
        or 0
    )

    logs: list[DoseLog] = []
    elapsed = 0
    while elapsed < horizon_days:
        month = elapsed // 30
        interval, strength = 7, base_strength
        for start_month, phase_strength, phase_interval in phases:
            if month >= start_month:
                interval = phase_interval or 7
                strength = phase_strength or base_strength
        last_number += 1
        logs.append(
            DoseLog(
                treatment=treatment,
                scheduled_at=start + timedelta(days=elapsed),
                strength_mg=strength,
                dose_number=last_number,
                auto_generated=True,
            )
        )
        elapsed += interval
    return DoseLog.objects.bulk_create(logs)
