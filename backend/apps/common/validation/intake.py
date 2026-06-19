"""Validate intake JSON sections on POST/PATCH."""

from __future__ import annotations

from typing import Any

from apps.common.validation.address import (
    is_identity_address_complete,
    is_valid_city,
    is_valid_county,
    is_valid_street_address,
    is_valid_us_zip,
)
from apps.common.validation.form import (
    is_filled,
    is_valid_phone,
    is_valid_preferred_first_name,
    validate_adult_weight_history,
    validate_allergy_row,
    validate_medication_row,
    validate_optional_blood_pressure,
    validate_optional_numeric_lab,
)

LAB_FIELDS = (
    ("bp", "blood pressure"),
    ("a1c", "A1C"),
    ("glucose", "glucose"),
    ("cholesterol", "cholesterol"),
)


def _section_error(section: str, message: str) -> dict[str, str]:
    return {section: message}


def validate_identity_section(identity: dict[str, Any]) -> dict[str, str]:
    if not isinstance(identity, dict):
        return _section_error("identity", "Identity must be an object.")

    address = str(identity.get("address", ""))
    if "address" in identity and address.strip() and not is_valid_street_address(address):
        return _section_error("identity", "Enter a valid home address.")

    city = str(identity.get("city", ""))
    if "city" in identity and city.strip() and not is_valid_city(city):
        return _section_error("identity", "Enter a valid city name.")

    zip_code = str(identity.get("zip", ""))
    if "zip" in identity and zip_code.strip() and not is_valid_us_zip(zip_code):
        return _section_error("identity", "Enter a valid 5-digit US ZIP code.")

    county = str(identity.get("county", ""))
    if "county" in identity and county.strip() and not is_valid_county(county):
        return _section_error("identity", "Enter a valid county name.")

    emergency_phone = identity.get("emergency_phone")
    if emergency_phone is not None and str(emergency_phone).strip() and not is_valid_phone(str(emergency_phone)):
        return _section_error("identity", "Enter a valid emergency contact phone number.")

    preferred = identity.get("preferred") or identity.get("preferred_name")
    if preferred is not None and str(preferred).strip() and not is_valid_preferred_first_name(str(preferred)):
        return _section_error("identity", "Preferred first name may only contain letters.")

    if identity.get("address_verified") == "true" and not is_identity_address_complete({k: str(v) for k, v in identity.items()}):
        return _section_error("identity", "Enter and verify your home address before continuing.")

    return {}


def validate_body_metrics_section(body_metrics: dict[str, Any], current_weight: str | None = None) -> dict[str, str]:
    if not isinstance(body_metrics, dict):
        return _section_error("body_metrics", "Body metrics must be an object.")

    highest = body_metrics.get("highest_weight")
    lowest = body_metrics.get("lowest_weight")
    if highest is not None or lowest is not None:
        err = validate_adult_weight_history(
            str(highest or ""),
            str(lowest or ""),
            current_weight,
        )
        if err:
            return _section_error("body_metrics", err)

    return {}


def validate_medications_section(medications: dict[str, Any]) -> dict[str, str]:
    if not isinstance(medications, dict):
        return _section_error("medications", "Medications must be an object.")

    answers = medications.get("answers") or {}
    med_list = medications.get("list") or []
    needs_list = any(
        answers.get(key) is True for key in ("taking_prescription", "taking_otc", "supplements")
    )
    if needs_list and isinstance(med_list, list):
        for row in med_list:
            if not isinstance(row, dict):
                continue
            err = validate_medication_row(row)
            if err:
                return _section_error("medications", err)

    return {}


def validate_allergies_section(allergies: dict[str, Any]) -> dict[str, str]:
    if not isinstance(allergies, dict):
        return _section_error("allergies", "Allergies must be an object.")

    answers = allergies.get("answers") or {}
    allergy_list = allergies.get("list") or []
    needs_list = answers.get("has_med") is True or answers.get("has_food") is True
    if needs_list and isinstance(allergy_list, list):
        for row in allergy_list:
            if not isinstance(row, dict):
                continue
            err = validate_allergy_row(row)
            if err:
                return _section_error("allergies", err)

    return {}


def validate_labs_section(labs: dict[str, Any]) -> dict[str, str]:
    if not isinstance(labs, dict):
        return _section_error("labs", "Labs must be an object.")

    for key, label in LAB_FIELDS:
        if key in labs:
            raw = str(labs.get(key, ""))
            if key == "bp":
                err = validate_optional_blood_pressure(raw)
            else:
                err = validate_optional_numeric_lab(raw, label)
            if err:
                return _section_error("labs", err)

    return {}


def validate_medication_preferences_section(prefs: dict[str, Any]) -> dict[str, str]:
    if not isinstance(prefs, dict):
        return _section_error("medication_preferences", "Medication preferences must be an object.")

    pharmacy_phone = prefs.get("pharmacy_phone")
    if pharmacy_phone is not None and is_filled(pharmacy_phone) and not is_valid_phone(str(pharmacy_phone)):
        return _section_error("medication_preferences", "Enter a valid pharmacy phone number.")

    return {}


def validate_intake_payload(
    attrs: dict[str, Any],
    *,
    current_weight: str | None = None,
) -> dict[str, str]:
    """Validate only sections present in attrs (partial PATCH safe)."""
    errors: dict[str, str] = {}

    if "identity" in attrs:
        errors.update(validate_identity_section(attrs["identity"]))
    if "body_metrics" in attrs:
        errors.update(validate_body_metrics_section(attrs["body_metrics"], current_weight))
    if "medications" in attrs:
        errors.update(validate_medications_section(attrs["medications"]))
    if "allergies" in attrs:
        errors.update(validate_allergies_section(attrs["allergies"]))
    if "labs" in attrs:
        errors.update(validate_labs_section(attrs["labs"]))
    if "medication_preferences" in attrs:
        errors.update(validate_medication_preferences_section(attrs["medication_preferences"]))

    return errors
