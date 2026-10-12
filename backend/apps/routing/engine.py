"""Routing engine: pick the network and pharmacy for a treatment, or flag it for staff.

Rule precedence among rules that match every filter:

1. State filter specificity: ``only`` beats ``except`` beats ``all``.
2. Lower ``priority`` number.
3. Extra specificity: a product, a fill type, and a term list each add a point.
4. Oldest rule.

No match, a dose outside every matching rule's range, a missing dose or state, or every
matching rule being at its daily cap flags the decision and moves the treatment to
``routing_review`` (when its current status allows it).
"""
from __future__ import annotations

import logging
from decimal import Decimal
from typing import Any

from django.apps import apps
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.utils import timezone

from apps.clinical import hooks
from apps.clinical.models import Treatment
from apps.clinical.services import can_transition, transition

from .models import ReplacementRule, RoutingDecision, RoutingRule

logger = logging.getLogger(__name__)

FILL_INITIAL = "initial"
FILL_REFILL = "refill"
_STATE_SCORE = {RoutingRule.StatesMode.ONLY: 2, RoutingRule.StatesMode.EXCEPT: 1, RoutingRule.StatesMode.ALL: 0}


def patient_state(patient: Any) -> str:
    """Two letter state from the patient's shipping address (default first), else home."""
    Address = apps.get_model("patients", "Address")
    addresses = list(Address.objects.filter(patient=patient).exclude(kind="billing"))
    addresses.sort(key=lambda a: (a.kind != "shipping", not a.is_default, -a.created_at.timestamp()))
    return addresses[0].state.upper() if addresses else ""


def _state_matches(rule: RoutingRule, state: str) -> bool:
    if rule.states_mode == RoutingRule.StatesMode.ONLY:
        return state in rule.states
    if rule.states_mode == RoutingRule.StatesMode.EXCEPT:
        return state not in rule.states
    return True


def _filters_match(
    rule: RoutingRule, *, state: str, product_id: Any, fill_type: str, term: int | None, after_error: bool
) -> bool:
    if rule.product_id is not None and rule.product_id != product_id:
        return False
    if not _state_matches(rule, state):
        return False
    if rule.fill_type != RoutingRule.FillType.ANY and rule.fill_type != fill_type:
        return False
    if rule.refill_only and fill_type != FILL_REFILL:
        return False
    if rule.route_errors_only and not after_error:
        return False
    if rule.term_months and term not in rule.term_months:
        return False
    return True


def _dose_in_range(rule: RoutingRule, dose: Decimal | None) -> bool:
    if rule.dose_min_mg is None and rule.dose_max_mg is None:
        return True
    if dose is None:
        return False
    if rule.dose_min_mg is not None and dose < rule.dose_min_mg:
        return False
    if rule.dose_max_mg is not None and dose > rule.dose_max_mg:
        return False
    return True


def _routed_today(treatment_id: Any, **lookup: Any) -> int:
    """Distinct treatments routed today by the given rule, excluding this treatment."""
    start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        RoutingDecision.objects.filter(result=RoutingDecision.Result.ROUTED, created_at__gte=start, **lookup)
        .exclude(treatment_id=treatment_id)
        .values("treatment_id")
        .distinct()
        .count()
    )


def _at_capacity(rule: RoutingRule, treatment_id: Any) -> bool:
    cap = rule.orders_per_day_threshold
    return cap is not None and _routed_today(treatment_id, rule=rule) >= cap


def _specificity(rule: RoutingRule) -> tuple:
    extra = (
        (rule.product_id is not None)
        + (rule.fill_type != RoutingRule.FillType.ANY)
        + bool(rule.term_months)
    )
    return (-_STATE_SCORE[rule.states_mode], rule.priority, -extra, rule.created_at)


def _treatment_dose(treatment: Treatment, fill_type: str) -> Decimal | None:
    if fill_type == FILL_REFILL and treatment.prescribed_strength_mg is not None:
        return treatment.prescribed_strength_mg
    if treatment.requested_strength_mg is not None:
        return treatment.requested_strength_mg
    return getattr(treatment.variant, "strength_mg", None)


def _find_replacement(treatment: Treatment, rule: RoutingRule, fill_type: str, after_error: bool) -> ReplacementRule | None:
    if treatment.variant_id is None or rule.pharmacy_id is None:
        return None
    candidates = ReplacementRule.objects.filter(
        is_active=True, source_variant_id=treatment.variant_id, source_pharmacy_id=rule.pharmacy_id
    ).order_by("created_at")
    for candidate in candidates:
        if candidate.refill_only and fill_type != FILL_REFILL:
            continue
        if candidate.route_errors_only and not after_error:
            continue
        cap = candidate.orders_per_day_threshold
        if cap is not None and _routed_today(treatment.pk, replacement_rule=candidate) >= cap:
            continue
        return candidate
    return None


def _flag(treatment: Treatment, inputs: dict[str, Any], reason: str) -> RoutingDecision:
    decision = RoutingDecision.objects.create(
        treatment=treatment, result=RoutingDecision.Result.FLAGGED, inputs=inputs, flag_reason=reason
    )
    if can_transition(treatment.status, Treatment.Status.ROUTING_REVIEW):
        transition(treatment, Treatment.Status.ROUTING_REVIEW, reason=f"routing_{reason}")
    return decision


@transaction.atomic
def route(treatment: Treatment, fill_type: str = FILL_INITIAL, *, after_error: bool = False) -> RoutingDecision:
    """Choose the network and pharmacy for ``treatment`` and record a RoutingDecision.

    On success the treatment's ``network`` and ``pharmacy`` are set. On failure the decision is
    flagged and the treatment moves to ``routing_review``. ``after_error`` enables rules marked
    ``route_errors_only`` (fallback after the primary route failed).
    """
    state = patient_state(treatment.patient)
    plan = treatment.plan
    term = getattr(plan, "term_months", None)
    dose = _treatment_dose(treatment, fill_type)
    inputs = {
        "state": state,
        "product": treatment.product.slug,
        "strength_mg": str(dose) if dose is not None else None,
        "fill_type": fill_type,
        "term_months": term,
    }
    if not state:
        return _flag(treatment, inputs, "missing_state")

    rules = list(RoutingRule.objects.filter(is_active=True).select_related("network", "pharmacy"))
    candidates = [
        r for r in rules
        if _filters_match(r, state=state, product_id=treatment.product_id, fill_type=fill_type, term=term, after_error=after_error)
    ]
    if not candidates:
        return _flag(treatment, inputs, "no_matching_rule")

    in_range = [r for r in candidates if _dose_in_range(r, dose)]
    if not in_range:
        return _flag(treatment, inputs, "missing_dose" if dose is None else "dose_out_of_range")

    available = [r for r in in_range if not _at_capacity(r, treatment.pk)]
    if not available:
        return _flag(treatment, inputs, "daily_capacity_reached")

    rule = min(available, key=_specificity)
    replacement = _find_replacement(treatment, rule, fill_type, after_error)
    treatment.network = rule.network
    treatment.pharmacy = replacement.target_pharmacy if replacement else rule.pharmacy
    update_fields = ["network", "pharmacy", "updated_at"]
    if replacement:
        treatment.variant = replacement.target_variant
        update_fields.append("variant")
        inputs["replacement_rule_id"] = str(replacement.pk)
    treatment.save(update_fields=update_fields)
    return RoutingDecision.objects.create(
        treatment=treatment,
        rule=rule,
        replacement_rule=replacement,
        result=RoutingDecision.Result.ROUTED,
        inputs=inputs,
    )


def is_available(state: str, variant: Any) -> bool:
    """True when an initial order for ``variant`` shipping to ``state`` has a route.

    Used by the questionnaire zip router so a patient never reaches checkout without a route.
    """
    state = (state or "").strip().upper()
    if not state or variant is None:
        return False
    dose = getattr(variant, "strength_mg", None)
    rules = RoutingRule.objects.filter(is_active=True, refill_only=False, route_errors_only=False).exclude(
        fill_type=RoutingRule.FillType.REFILL
    )
    return any(
        (r.product_id is None or r.product_id == variant.product_id)
        and _state_matches(r, state)
        and (dose is None or _dose_in_range(r, dose))
        for r in rules
    )


def _request_submission(treatment: Treatment) -> None:
    """Hand a routed treatment to integrations if it has not reached the network yet."""
    if treatment.submitted_to_network_at is None and treatment.status in (
        Treatment.Status.ROUTING_REVIEW,
        Treatment.Status.AWAITING_VISIT_COMPLETION,
    ):
        hooks.submit_visit(treatment)


@transaction.atomic
def resolve_flag(decision: RoutingDecision, user: Any, rule: RoutingRule) -> RoutingDecision:
    """Staff resolve a flagged decision by choosing a rule. Sets the treatment destination."""
    if not (getattr(user, "is_staff", False) or getattr(user, "is_superuser", False)):
        raise PermissionDenied("Only staff can resolve routing flags.")
    if decision.result != RoutingDecision.Result.FLAGGED or decision.resolved_at is not None:
        raise ValueError(f"Routing decision {decision.pk} is not an open flag")
    treatment = decision.treatment
    decision.rule = rule
    decision.result = RoutingDecision.Result.ROUTED
    decision.resolved_by = user
    decision.resolved_at = timezone.now()
    decision.save(update_fields=["rule", "result", "resolved_by", "resolved_at", "updated_at"])
    treatment.network = rule.network
    treatment.pharmacy = rule.pharmacy
    treatment.save(update_fields=["network", "pharmacy", "updated_at"])
    transaction.on_commit(lambda: _request_submission(treatment))
    return decision


@transaction.atomic
def rerun(decision: RoutingDecision, user: Any = None) -> RoutingDecision:
    """Re-run routing for a flagged decision. The old flag is closed and the new decision returned."""
    if decision.result != RoutingDecision.Result.FLAGGED or decision.resolved_at is not None:
        raise ValueError(f"Routing decision {decision.pk} is not an open flag")
    treatment = decision.treatment
    fill_type = (decision.inputs or {}).get("fill_type", FILL_INITIAL)
    decision.resolved_by = user
    decision.resolved_at = timezone.now()
    decision.save(update_fields=["resolved_by", "resolved_at", "updated_at"])
    new = route(treatment, fill_type)
    if new.result == RoutingDecision.Result.ROUTED:
        transaction.on_commit(lambda: _request_submission(treatment))
    return new
