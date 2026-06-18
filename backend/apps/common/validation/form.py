"""Shared input validation — mirrors src/lib/form-validation.ts."""

from __future__ import annotations

import re
from typing import Any

EMAIL_RE = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")
PERSON_NAME_RE = re.compile(r"^[a-zA-Z .'-]{1,60}$")


def is_filled(value: Any) -> bool:
    return bool(str(value or "").strip())


def parse_positive_number(value: str) -> float | None:
    trimmed = value.strip()
    if not trimmed:
        return None
    try:
        n = float(trimmed)
    except ValueError:
        return None
    if not (n > 0):
        return None
    return n


def parse_non_negative_int(value: str, max_value: int | None = None) -> int | None:
    trimmed = value.strip()
    if trimmed == "":
        return None
    try:
        n = int(trimmed)
    except ValueError:
        return None
    if n < 0:
        return None
    if max_value is not None and n > max_value:
        return None
    return n


def is_valid_email(email: str) -> bool:
    trimmed = email.strip()
    if not trimmed or ".." in trimmed or "%" in trimmed:
        return False
    return bool(EMAIL_RE.match(trimmed))


def normalize_phone_digits(phone: str) -> str:
    digits = re.sub(r"\D", "", phone)
    if len(digits) == 11 and digits.startswith("1"):
        return digits[1:]
    return digits


def is_valid_phone(phone: str) -> bool:
    return len(normalize_phone_digits(phone)) == 10


def is_valid_person_name(name: str) -> bool:
    return bool(PERSON_NAME_RE.match(name.strip()))


def validate_height_ft(value: str) -> str | None:
    ft = parse_non_negative_int(value)
    if ft is None:
        return "Enter your height in feet (3–8)."
    if ft < 3 or ft > 8:
        return "Height must be between 3 and 8 feet."
    return None


def validate_height_in(value: str) -> str | None:
    inches = parse_non_negative_int(value, 11)
    if inches is None:
        return "Enter inches (0–11)."
    return None


def validate_weight_lbs(value: str, label: str = "Weight") -> str | None:
    n = parse_positive_number(value)
    if n is None:
        return f"Enter a valid {label.lower()} in pounds."
    if n < 50 or n > 1000:
        return f"{label} must be between 50 and 1,000 lb."
    return None


def validate_goal_weight_lbs(current_weight: str, goal_weight: str) -> str | None:
    goal_err = validate_weight_lbs(goal_weight, "Goal weight")
    if goal_err:
        return goal_err
    current = parse_positive_number(current_weight)
    goal = parse_positive_number(goal_weight)
    if current is not None and goal is not None and goal >= current:
        return "Goal weight should be less than your current weight."
    return None


def validate_adult_weight_history(
    highest: str,
    lowest: str,
    current_weight: str | None = None,
) -> str | None:
    high_err = validate_weight_lbs(highest, "Highest weight")
    if high_err:
        return high_err
    low_err = validate_weight_lbs(lowest, "Lowest weight")
    if low_err:
        return low_err
    high = parse_positive_number(highest)
    low = parse_positive_number(lowest)
    if high is None or low is None:
        return "Enter valid weight values."
    if low > high:
        return "Lowest weight cannot be higher than highest weight."
    current = parse_positive_number(current_weight) if current_weight else None
    if current is not None and high < current:
        return "Highest weight should be at least your current weight."
    return None


def validate_medication_row(row: dict[str, Any]) -> str | None:
    if not is_filled(row.get("name")):
        return "Enter the medication name."
    if not is_filled(row.get("dose")):
        return "Enter the dose."
    if not is_filled(row.get("frequency")):
        return "Enter how often you take it."
    return None


def validate_allergy_row(row: dict[str, Any]) -> str | None:
    if not is_filled(row.get("allergy")):
        return "Enter the allergy."
    if not is_filled(row.get("reaction")):
        return "Describe your reaction."
    return None


def validate_optional_numeric_lab(value: str, label: str) -> str | None:
    if not is_filled(value):
        return None
    try:
        n = float(value.strip())
    except ValueError:
        return f"Enter a valid number for {label}."
    if n < 0:
        return f"Enter a valid number for {label}."
    return None
