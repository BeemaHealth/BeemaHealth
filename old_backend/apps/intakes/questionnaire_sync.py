"""Sync canonical user/profile fields from dynamic questionnaire responses."""

from __future__ import annotations

from datetime import date, datetime

from apps.patients.models import PatientProfile
from apps.questionnaires.models import QuestionnaireField
from apps.questionnaires.services import get_version_by_id

US_STATE_ABBREV_TO_NAME = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming",
}

US_STATE_NAME_LOOKUP = {
    name.lower(): name for name in US_STATE_ABBREV_TO_NAME.values()
}


def format_us_state_name(value: str | None) -> str:
    if not value or not str(value).strip():
        return ""
    text = str(value).strip()
    if len(text) == 2:
        return US_STATE_ABBREV_TO_NAME.get(text.upper(), text)
    return US_STATE_NAME_LOOKUP.get(text.lower(), text)


def _parse_iso_date(raw) -> date | None:
    if raw is None or raw == "":
        return None
    text = str(raw).strip()
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def _parse_address_group(raw) -> dict[str, str]:
    if not isinstance(raw, dict):
        return {}
    return {
        "state": str(raw.get("state") or "").strip(),
        "address": str(raw.get("address") or "").strip(),
        "city": str(raw.get("city") or "").strip(),
        "zip": str(raw.get("zip") or "").strip(),
    }


def _normalize_sex(raw) -> str:
    if raw is None or raw == "":
        return ""
    text = str(raw).strip().lower()
    if text in ("female", "f"):
        return "female"
    if text in ("male", "m"):
        return "male"
    if text in ("intersex", "other"):
        return "intersex"
    return ""


def _sex_from_field(field: QuestionnaireField, raw) -> str:
    direct = _normalize_sex(raw)
    if direct:
        return direct
    if field.field_type not in (
        QuestionnaireField.FieldType.SINGLE_CHOICE,
        QuestionnaireField.FieldType.YES_NO,
    ):
        return ""
    selected = str(raw)
    for opt in field.options or []:
        if not isinstance(opt, dict):
            continue
        if str(opt.get("value")) != selected:
            continue
        label = str(opt.get("label") or "")
        from_label = _normalize_sex(label)
        if from_label:
            return from_label
    return ""


def _state_from_intake_sections(intake) -> str:
    identity = intake.identity or {}
    prefs = intake.medication_preferences or {}
    for key in ("state",):
        if identity.get(key):
            return format_us_state_name(str(identity[key]))
    if prefs.get("shipping_state"):
        return format_us_state_name(str(prefs["shipping_state"]))
    return ""


def sync_canonical_fields_from_questionnaire(intake) -> None:
    """Write DOB, state, and sex from questionnaire answers to users / patient_profiles."""
    user = intake.user
    profile, _ = PatientProfile.objects.get_or_create(user=user)
    responses = dict(intake.questionnaire_responses or {})
    user_updates: list[str] = []
    profile_updates: list[str] = []

    version = (
        get_version_by_id(intake.questionnaire_version_id)
        if intake.questionnaire_version_id
        else None
    )
    if version and responses:
        for step in version.steps.prefetch_related("fields").all():
            for field in step.fields.all():
                raw = responses.get(field.field_key)
                if raw in (None, ""):
                    continue

                mapping = (field.maps_to_section or "").strip()
                field_type = field.field_type

                if field_type == QuestionnaireField.FieldType.DOB or mapping == "beluga:dob":
                    parsed = _parse_iso_date(raw)
                    if parsed and not user.dob:
                        user.dob = parsed
                        user_updates.append("dob")

                if mapping == "beluga:sex" or field.field_key in ("sex", "sex_assigned_at_birth"):
                    sex = _sex_from_field(field, raw)
                    if sex and not profile.sex_assigned_at_birth:
                        profile.sex_assigned_at_birth = sex
                        profile_updates.append("sex_assigned_at_birth")

                if field_type == QuestionnaireField.FieldType.ADDRESS_GROUP:
                    parsed = _parse_address_group(raw)
                    state = format_us_state_name(parsed.get("state"))
                    if state and not user.state:
                        user.state = state
                        user_updates.append("state")

    if not user.state:
        section_state = _state_from_intake_sections(intake)
        if section_state:
            user.state = section_state
            user_updates.append("state")

    if user_updates:
        user_updates.append("updated_at")
        user.save(update_fields=list(dict.fromkeys(user_updates)))
    if profile_updates:
        profile_updates.append("updated_at")
        profile.save(update_fields=list(dict.fromkeys(profile_updates)))
