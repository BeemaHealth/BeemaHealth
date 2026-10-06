import re

from apps.common.validation.form import UNSAFE_FREE_TEXT_RE, is_filled

MEDICATION_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\s.\-/%()+®™]{0,127}$")
DOSAGE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\s.\-/]{0,63}$")
FREQUENCY_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9\s.\-,]{0,127}$")


def _validate_prescription_text(
    value: str, label: str, pattern: re.Pattern[str]
) -> str | None:
    if not is_filled(value):
        return f"{label} is required."
    trimmed = value.strip()
    if not pattern.match(trimmed):
        return f"Enter a valid {label.lower()}."
    return None


def validate_medication_name(value: str) -> str | None:
    return _validate_prescription_text(value, "Medication name", MEDICATION_NAME_RE)


def validate_dosage(value: str) -> str | None:
    return _validate_prescription_text(value, "Dosage", DOSAGE_RE)


def validate_frequency(value: str) -> str | None:
    return _validate_prescription_text(value, "Frequency", FREQUENCY_RE)


def validate_optional_prescription_text(
    value: str, label: str, max_length: int
) -> str | None:
    if not is_filled(value):
        return None
    trimmed = value.strip()
    if len(trimmed) > max_length:
        return f"{label} must be {max_length} characters or fewer."
    if UNSAFE_FREE_TEXT_RE.search(trimmed):
        return f"Enter a valid {label.lower()}."
    return None
