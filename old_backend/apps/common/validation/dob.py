from __future__ import annotations

import re
from datetime import date, datetime

ISO_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def _is_adult(iso_date: str) -> bool:
    birth = datetime.strptime(iso_date, "%Y-%m-%d").date()
    today = date.today()
    age = today.year - birth.year
    if (today.month, today.day) < (birth.month, birth.day):
        age -= 1
    return age >= 18


def validate_iso_date_of_birth(value: str, *, label: str = "Date of birth") -> str | None:
    if not value or not str(value).strip():
        return f"{label} is required."
    iso = str(value).strip()
    if not ISO_DATE_RE.match(iso):
        return f"Enter a valid {label.lower()} (MM/DD/YYYY)."
    try:
        parsed = datetime.strptime(iso, "%Y-%m-%d").date()
    except ValueError:
        return f"Enter a valid {label.lower()} (MM/DD/YYYY)."
    if parsed.year < 1900 or parsed.year > date.today().year:
        return f"Enter a valid {label.lower()} (MM/DD/YYYY)."
    if not _is_adult(iso):
        return "You must be 18 or older to continue."
    return None
