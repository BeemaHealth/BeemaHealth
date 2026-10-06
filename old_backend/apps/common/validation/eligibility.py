"""Validate eligibility scalar fields on POST/PATCH."""

from __future__ import annotations

from decimal import Decimal

from apps.common.validation.form import validate_goal_weight_lbs, validate_height_ft, validate_height_in, validate_weight_lbs


def validate_eligibility_fields(attrs: dict, instance=None) -> dict[str, str]:
    errors: dict[str, str] = {}

    def current(field: str):
        if field in attrs:
            return attrs[field]
        if instance is not None:
            return getattr(instance, field, None)
        return None

    height_ft = current("height_ft")
    if height_ft is not None:
        err = validate_height_ft(str(height_ft))
        if err:
            errors["height_ft"] = err

    height_in = current("height_in")
    if height_in is not None:
        err = validate_height_in(str(height_in or 0))
        if err:
            errors["height_in"] = err

    weight_lbs = current("weight_lbs")
    if weight_lbs is not None:
        err = validate_weight_lbs(str(weight_lbs), "Current weight")
        if err:
            errors["weight_lbs"] = err

    goal_weight_lbs = current("goal_weight_lbs")
    if weight_lbs is not None and goal_weight_lbs is not None:
        err = validate_goal_weight_lbs(str(weight_lbs), str(goal_weight_lbs))
        if err:
            errors["goal_weight_lbs"] = err

    return errors
