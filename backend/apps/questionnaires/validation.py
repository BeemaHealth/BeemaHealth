from __future__ import annotations

import re
from typing import Any

from apps.common.validation.form import (
    is_valid_email,
    is_valid_person_name,
    is_valid_phone,
    validate_goal_weight_lbs,
    validate_height_ft,
    validate_height_in,
    validate_weight_lbs,
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
) -> str | None:
    rules = validation_rules or []
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
        if rtype == "enum" and value not in (rule.get("values") or []):
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

    if field_type == "single_choice" and isinstance(value, str):
        pass
    elif field_type == "yes_no" and value not in (None, "", True, False, "yes", "no"):
        return f"Select yes or no for {label}."

    return None


def validate_step_fields(
    fields: list,
    responses: dict[str, Any],
) -> dict[str, str]:
    errors: dict[str, str] = {}
    for field in fields:
        if not evaluate_visibility_rule(getattr(field, "visibility_rule", None), responses):
            continue
        error = validate_field_value(
            field_type=field.field_type,
            value=responses.get(field.field_key),
            required=field.required,
            validation_rules=field.validation_rules,
            label=field.label,
            all_responses=responses,
        )
        if error:
            errors[field.field_key] = error
    return errors
