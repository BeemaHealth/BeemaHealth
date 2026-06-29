from __future__ import annotations

import re
from typing import Any

from apps.common.validation.dob import validate_iso_date_of_birth
from apps.common.validation.form import (
    is_valid_email,
    is_valid_person_name,
    is_valid_phone,
    validate_goal_weight_lbs,
    validate_height_ft,
    validate_height_in,
    validate_weight_lbs,
)
from apps.common.validation.address import (
    is_valid_city,
    is_valid_county,
    is_valid_street_address,
    is_valid_us_zip,
)

INJECTION_PATTERNS = [
    re.compile(r"(\bOR\b|\bAND\b)\s*['\"]?\d*['\"]?\s*=\s*['\"]?\d*", re.I),
    re.compile(r";\s*(DROP|DELETE|INSERT|UPDATE|ALTER)\s+", re.I),
    re.compile(r"<script\b", re.I),
    re.compile(r"on\w+\s*=", re.I),
    re.compile(r"\.\./"),
    re.compile(r"[`;|&]"),
]


def _looks_malicious(value: str) -> bool:
    return any(pattern.search(value) for pattern in INJECTION_PATTERNS)


def evaluate_visibility_rule(rule: dict | None, responses: dict[str, Any]) -> bool:
    if not rule:
        return True
    when = rule.get("when")
    if not isinstance(when, dict):
        return True
    field = str(when.get("field", ""))
    op = str(when.get("op", "eq"))
    expected = when.get("value")
    actual = responses.get(field)
    if op == "eq":
        return actual == expected
    if op == "neq":
        return actual != expected
    if op == "in":
        return actual in (expected if isinstance(expected, list) else [expected])
    if op == "truthy":
        return bool(actual)
    return True


def validate_field_value(
    *,
    field_type: str,
    value: Any,
    required: bool,
    validation_rules: list | None,
    label: str,
    all_responses: dict[str, Any] | None = None,
    options: list | None = None,
) -> str | None:
    rules = validation_rules or []
    # The review component only stores a confirmation flag; the patient-facing
    # checkbox gates advancing. Nothing to validate server-side.
    if field_type == "review":
        return None
    if field_type == "legal_consent":
        if required and value is not True:
            return (
                "You must agree to the Terms of Service, Privacy Policy, "
                "and Telehealth Consent to continue."
            )
        return None
    if value in (None, "", []) and not required:
        for rule in rules:
            if isinstance(rule, dict) and rule.get("type") == "required":
                required = True
                break
        if not required:
            return None

    if required and value in (None, "", []):
        return f"{label} is required."

    if isinstance(value, str) and _looks_malicious(value):
        return f"{label} contains invalid characters."

    if field_type == "email" and isinstance(value, str):
        if not is_valid_email(value):
            return "Enter a valid email address."
    elif field_type == "phone" and isinstance(value, str):
        if not is_valid_phone(value):
            return "Enter a valid phone number."
    elif field_type == "dob" and isinstance(value, str):
        dob_err = validate_iso_date_of_birth(value, label=label)
        if dob_err:
            return dob_err
    elif field_type in ("text", "textarea") and isinstance(value, str):
        if field_type == "text" and not is_valid_person_name(value) and "name" in label.lower():
            if not value.strip():
                return f"{label} is required."
    elif field_type == "number" and value not in (None, ""):
        try:
            num = float(value)
        except (TypeError, ValueError):
            return f"{label} must be a number."
        for rule in rules:
            if not isinstance(rule, dict):
                continue
            rtype = rule.get("type")
            if rtype == "min" and num < float(rule.get("value", 0)):
                return rule.get("message") or f"{label} is too low."
            if rtype == "max" and num > float(rule.get("value", 0)):
                return rule.get("message") or f"{label} is too high."

    for rule in rules:
        if not isinstance(rule, dict):
            continue
        rtype = rule.get("type")
        if rtype == "enum":
            allowed = rule.get("values") or rule.get("value") or []
            if not isinstance(allowed, list):
                allowed = [allowed]
            if value not in allowed:
                return rule.get("message") or f"Select a valid option for {label}."
        if rtype == "pattern" and isinstance(value, str):
            pattern = rule.get("value")
            if pattern and not re.match(str(pattern), value):
                return rule.get("message") or f"{label} format is invalid."
        if rtype == "cross_field" and all_responses:
            other_key = rule.get("field")
            op = rule.get("op")
            other_val = all_responses.get(other_key)
            if op == "lt" and value not in (None, "") and other_val not in (None, ""):
                try:
                    if float(value) >= float(other_val):
                        return rule.get("message") or f"{label} must be less than {other_key}."
                except (TypeError, ValueError):
                    pass

    option_values = [
        str(o.get("value", ""))
        for o in (options or [])
        if isinstance(o, dict)
    ]

    if field_type == "single_choice" and isinstance(value, str):
        if option_values and value not in option_values:
            return f"Select a valid option for {label}."
    elif field_type == "multi_choice":
        selected = value if isinstance(value, list) else (
            [v.strip() for v in str(value).split(",") if v.strip()] if value else []
        )
        if option_values:
            for item in selected:
                if str(item) not in option_values:
                    return f"Select valid options for {label}."
    elif field_type == "yes_no" and value not in (None, "", True, False, "yes", "no"):
        return f"Select yes or no for {label}."
    elif field_type == "account":
        return None
    elif field_type == "address_group":
        if not isinstance(value, dict):
            return f"{label} is required." if required else None
        address = str(value.get("address", "")).strip()
        city = str(value.get("city", "")).strip()
        state = str(value.get("state", "")).strip()
        zip_code = str(value.get("zip", "")).strip()
        county = str(value.get("county", "")).strip()
        country = str(value.get("country", "")).strip()
        verified = value.get("verified") is True or str(
            value.get("verified", "")
        ).lower() == "true"
        for part in (address, city, state, zip_code, county, country):
            if part and _looks_malicious(part):
                return f"{label} contains invalid characters."
        if not verified:
            return "Select your address from the suggestions to verify it for delivery."
        if not (
            is_valid_street_address(address)
            and is_valid_city(city)
            and is_valid_us_zip(zip_code)
            and is_valid_county(county)
        ):
            return "Enter a complete verified street address."

    return None


def validate_step_fields(
    fields: list,
    responses: dict[str, Any],
    *,
    enforce_required: bool = True,
) -> dict[str, str]:
    errors: dict[str, str] = {}
    for field in fields:
        if not evaluate_visibility_rule(getattr(field, "visibility_rule", None), responses):
            continue
        value = responses.get(field.field_key)
        # Incremental saves only validate answers the patient has actually
        # provided — completeness is gated per-step on the client. Skip empty
        # fields so unanswered downstream steps don't fail a partial save.
        if not enforce_required and value in (None, "", []):
            continue
        error = validate_field_value(
            field_type=field.field_type,
            value=value,
            required=field.required and enforce_required,
            validation_rules=field.validation_rules,
            label=field.label,
            all_responses=responses,
            options=field.options,
        )
        if error:
            errors[field.field_key] = error
    return errors


def _answer_matches(actual: Any, expected: Any) -> bool:
    exp = str(expected if expected is not None else "")
    if isinstance(actual, (list, tuple)):
        return exp in [str(v) for v in actual]
    return str(actual if actual is not None else "") == exp


def _is_default_rule(rule: dict) -> bool:
    return rule.get("when_field") == "__default__" or (
        not rule.get("when_field") and not rule.get("when_value")
    )


def _visible_sorted_steps(steps: list, responses: dict[str, Any]) -> list:
    return [
        s
        for s in sorted(steps, key=lambda s: s.sort_order)
        if evaluate_visibility_rule(getattr(s, "visibility_rule", None), responses)
    ]


def _step_has_account_field(step) -> bool:
    for field in getattr(step, "fields").all():
        if field.field_type == "account":
            return True
        if field.field_type == "plugin" and field.plugin_id == "account_registration":
            return True
    return False


def resolve_next_step(step, responses: dict[str, Any], steps: list):
    """Next step given answers, honouring per-step ``routing_rules``.

    Mirrors the frontend ``resolveNextStep`` so server and client agree on the
    route a patient takes through a branching flow.
    """
    # The account/registration step is where qualify branches converge and the
    # flow ends (the patient then continues into the intake). Terminal even when
    # another step sorts after it.
    if _step_has_account_field(step):
        return None

    by_key = {s.step_key: s for s in steps}
    rules = getattr(step, "routing_rules", None) or []

    for rule in rules:
        if not isinstance(rule, dict):
            continue
        when_field = rule.get("when_field")
        if not when_field or when_field == "__default__":
            continue
        target = rule.get("next_step_key")
        if not target:
            continue
        if _answer_matches(responses.get(when_field), rule.get("when_value")):
            return by_key.get(target)

    default_rule = next(
        (r for r in rules if isinstance(r, dict) and _is_default_rule(r)), None
    )
    if default_rule is not None:
        target = default_rule.get("next_step_key")
        if not target:
            return None
        return by_key.get(target)

    # Implicit default — fall through to the natural next visible step. Steps that
    # branch on only some answers (e.g. step_1 "pills") reach the next step for
    # the unmatched answers this way, without an explicit default edge.
    visible = _visible_sorted_steps(steps, responses)
    keys = [s.step_key for s in visible]
    if step.step_key in keys:
        idx = keys.index(step.step_key)
        if idx + 1 < len(visible):
            return visible[idx + 1]
    return None


def reachable_step_keys(steps: list, responses: dict[str, Any]) -> set[str]:
    """Set of step keys on the route the current answers imply (cycle-safe)."""
    visible = _visible_sorted_steps(steps, responses)
    if not visible:
        return set()
    reachable: set[str] = set()
    current = visible[0]
    guard = 0
    while current is not None and guard < 200:
        if current.step_key in reachable:
            break
        reachable.add(current.step_key)
        current = resolve_next_step(current, responses, steps)
        guard += 1
    return reachable


def validate_responses_against_version(
    version_id,
    responses: dict[str, Any],
    *,
    enforce_required: bool = True,
) -> dict[str, str]:
    from apps.questionnaires.services import get_version_by_id

    version = get_version_by_id(version_id)
    if not version:
        return {"_questionnaire": "Invalid questionnaire version."}
    errors: dict[str, str] = {}
    steps = list(version.steps.prefetch_related("fields").all())
    # Only validate steps on the route the answers actually take. Fields on
    # branches the patient never reaches (e.g. an injection step when they chose
    # pills) must not be validated — otherwise a shared/duplicate field key on an
    # off-route step would reject a perfectly valid answer.
    reachable = reachable_step_keys(steps, responses)
    for step in steps:
        if step.step_key not in reachable:
            continue
        errors.update(
            validate_step_fields(
                list(step.fields.all()),
                responses,
                enforce_required=enforce_required,
            )
        )
    return errors
