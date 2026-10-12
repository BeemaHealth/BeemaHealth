"""Map the neutral visit payload to Beluga's ``formObj`` request body.

Beluga rejects any empty, null, or undefined value, so this module validates before anything
leaves the process. Errors name field paths only, never values (PHI).
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

from apps.integrations.exceptions import PayloadInvalid

NONE_REPORTED = "None reported"
SEX_MAP = {"male": "Male", "m": "Male", "female": "Female", "f": "Female"}
# Dedicated formObj fields. They must never also appear in the Q/A section.
DEDICATED_KEYS = {"selfReportedMeds", "allergies", "medicalConditions", "self_reported_meds", "medical_conditions"}
REQUIRED_PATIENT_FIELDS = ["first_name", "last_name", "dob", "phone", "email", "address", "city", "state", "zip"]
MAX_NAME = 100


def find_empty(value: Any, path: str = "") -> list[str]:
    """Return paths of every empty, null, or blank string value anywhere in ``value``."""
    problems: list[str] = []
    if value is None:
        return [path or "<root>"]
    if isinstance(value, str):
        return [path or "<root>"] if not value.strip() else []
    if isinstance(value, dict):
        if not value:
            return [path or "<root>"]
        for key, item in value.items():
            problems.extend(find_empty(item, f"{path}.{key}" if path else str(key)))
        return problems
    if isinstance(value, (list, tuple)):
        if not value:
            return [path or "<root>"]
        for index, item in enumerate(value):
            problems.extend(find_empty(item, f"{path}[{index}]"))
    return problems


def assert_no_empty(body: dict[str, Any]) -> None:
    """Raise ``PayloadInvalid`` if the body holds any empty value."""
    problems = find_empty(body)
    if problems:
        raise PayloadInvalid(problems)


def _format_dob(value: Any) -> str:
    if isinstance(value, (date, datetime)):
        return value.strftime("%m/%d/%Y")
    text = str(value or "").strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return datetime.strptime(text, "%Y-%m-%d").strftime("%m/%d/%Y")
    return text


def _format_phone(value: Any) -> str:
    digits = re.sub(r"\D", "", str(value or ""))
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    return digits


def _list_text(value: Any) -> str:
    if isinstance(value, (list, tuple)):
        return "; ".join(str(v).strip() for v in value if str(v).strip())
    return str(value or "").strip()


def _text_or_none_reported(value: Any) -> str:
    return _list_text(value) or NONE_REPORTED


def _map_intake_results(results: list[dict[str, Any]]) -> dict[str, str]:
    """Convert ``[{question, answer, options?, key?}]`` to ``Q1``/``A1`` pairs."""
    pairs: dict[str, str] = {}
    index = 0
    for item in results or []:
        if item.get("key") in DEDICATED_KEYS:
            continue
        answer = _list_text(item.get("answer"))
        question = str(item.get("question") or "").strip()
        if not answer or not question:
            continue
        options = item.get("options")
        if options:
            question = f"{question} POSSIBLE ANSWERS: {_list_text(options)}"
        index += 1
        pairs[f"Q{index}"] = question
        pairs[f"A{index}"] = answer
    return pairs


def _map_preference(item: dict[str, Any]) -> dict[str, str]:
    mapping = {
        "name": item.get("name"),
        "strength": item.get("strength"),
        "quantity": item.get("quantity"),
        "refills": item.get("refills"),
        "daysSupply": item.get("days_supply", item.get("daysSupply")),
        "medId": item.get("med_id", item.get("medId")),
    }
    return {k: str(v) for k, v in mapping.items() if v is not None}


CONDITION_NODES = {"conditions", "conditions_detail"}
ALLERGY_NODES = {"allergy_confirm"}
MEDICATION_NODES = {"medications"}
DEDICATED_NODES = CONDITION_NODES | ALLERGY_NODES | MEDICATION_NODES


def _items_text(section: Any, *keys: str) -> list[str]:
    """Lines from a ``{"none": bool, "items": [...]}`` questionnaire answer."""
    if not isinstance(section, dict) or section.get("none"):
        return []
    lines = []
    for item in section.get("items") or []:
        parts = [str(item.get(k) or "").strip() for k in keys]
        line = " ".join(p for p in parts if p)
        if line:
            lines.append(line)
    return lines


def neutral_from_questionnaire(payload: dict[str, Any]) -> dict[str, Any]:
    """Convert ``questionnaires.services.build_visit_payload`` output to the mapper's neutral form.

    Medications, allergies and conditions go to their dedicated fields only. The "other"
    category answers (``questions`` entries for ``DEDICATED_NODES``) are folded in as text.
    """
    medical = (payload.get("intake") or {}).get("medical") or {}
    by_node = {q.get("node"): q for q in payload.get("questions") or []}

    def category_text(node_id: str, keys: Any) -> list[str]:
        if not keys or list(keys) == ["none"]:
            return []
        answer = str((by_node.get(node_id) or {}).get("answer") or "").strip()
        return [answer] if answer else []

    patient = dict(payload.get("patient") or {})
    patient["sex"] = patient.pop("sex_at_birth", None) or patient.pop("gender_identity", None)
    patient.update({k: v for k, v in (payload.get("location") or {}).items() if k in ("state", "zip")})
    results = [
        {"question": q.get("question"), "answer": q.get("answer"), "options": q.get("options")}
        for q in payload.get("questions") or []
        if q.get("node") not in DEDICATED_NODES
    ]
    body = payload.get("body") or {}
    for label, key in (("Height (inches)", "height_in"), ("Weight (lbs)", "weight_lbs"), ("BMI", "bmi")):
        if body.get(key) is not None:
            results.append({"question": label, "answer": str(body[key])})
    return {
        "patient": patient,
        "self_reported_meds": _items_text(medical.get("medications"), "name", "dose", "frequency")
        + category_text("medications", medical.get("medication_categories")),
        "allergies": _items_text(medical.get("allergies"), "name", "reaction")
        + category_text("allergy_confirm", medical.get("allergy_categories")),
        "medical_conditions": _items_text(medical.get("condition_details"), "name")
        + category_text("conditions", medical.get("conditions")),
        "intake_results": results,
    }


def build_form_obj(neutral: dict[str, Any]) -> dict[str, Any]:
    """Build ``formObj`` from the neutral payload. Raises ``PayloadInvalid`` on bad data."""
    patient = neutral.get("patient") or {}
    missing = [f"patient.{f}" for f in REQUIRED_PATIENT_FIELDS if not str(patient.get(f) or "").strip()]
    sex = SEX_MAP.get(str(patient.get("sex") or "").strip().lower())
    if str(patient.get("sex") or "").strip() and sex is None:
        sex = "Other"
    if sex is None:
        missing.append("patient.sex")
    if neutral.get("consents_signed") is not True:
        missing.append("consents_signed")
    if not neutral.get("patient_preference"):
        missing.append("patient_preference")
    if missing:
        raise PayloadInvalid(missing)

    first, last = str(patient["first_name"]).strip(), str(patient["last_name"]).strip()
    too_long = [f for f, v in (("patient.first_name", first), ("patient.last_name", last)) if len(v) > MAX_NAME]
    if too_long:
        raise PayloadInvalid(too_long)
    phone = _format_phone(patient["phone"])
    state = str(patient["state"]).strip().upper()
    zip_code = str(patient["zip"]).strip()[:5]
    bad_format = []
    if len(phone) != 10:
        bad_format.append("patient.phone")
    if not re.fullmatch(r"[A-Z]{2}", state):
        bad_format.append("patient.state")
    if not re.fullmatch(r"\d{5}", zip_code):
        bad_format.append("patient.zip")
    dob = _format_dob(patient["dob"])
    if not re.fullmatch(r"\d{2}/\d{2}/\d{4}", dob):
        bad_format.append("patient.dob")
    if bad_format:
        raise PayloadInvalid(bad_format)

    form_obj: dict[str, Any] = {
        "consentsSigned": True,
        "firstName": first,
        "lastName": last,
        "dob": dob,
        "phone": phone,
        "email": str(patient["email"]).strip(),
        "address": str(patient["address"]).strip(),
        "city": str(patient["city"]).strip(),
        "state": state,
        "zip": zip_code,
        "sex": sex,
        "selfReportedMeds": _text_or_none_reported(neutral.get("self_reported_meds")),
        "allergies": _text_or_none_reported(neutral.get("allergies")),
        "medicalConditions": _text_or_none_reported(neutral.get("medical_conditions")),
        "patientPreference": [_map_preference(p) for p in neutral["patient_preference"]],
    }
    form_obj.update(_map_intake_results(neutral.get("intake_results") or []))
    for key, field_name in (("titration", "titration"), ("bmi", "BMI"), ("titration_level", "titrationLevel")):
        if neutral.get(key) is not None:
            form_obj[field_name] = str(neutral[key])
    return form_obj


def build_visit_body(
    neutral: dict[str, Any], *, master_id: str, company: str, visit_type: str, pharmacy_id: str = ""
) -> dict[str, Any]:
    """Build the full visit creation body and verify it holds no empty values."""
    if not master_id or not company or not visit_type:
        raise PayloadInvalid([f for f, v in (("masterId", master_id), ("company", company), ("visitType", visit_type)) if not v])
    body: dict[str, Any] = {
        "formObj": build_form_obj(neutral),
        "masterId": master_id,
        "company": company,
        "visitType": visit_type,
    }
    if pharmacy_id:
        body["pharmacyId"] = pharmacy_id
    if neutral.get("verification_id"):
        body["patientVerified"] = True
        body["verificationId"] = str(neutral["verification_id"])
    assert_no_empty(body)
    return body


def summarize_visit_body(body: dict[str, Any]) -> dict[str, Any]:
    """Redacted summary for ``OutboundCall.request_summary``: ids and counts only."""
    form_obj = body.get("formObj") or {}
    return {
        "masterId": body.get("masterId"),
        "visitType": body.get("visitType"),
        "form_field_count": len(form_obj),
        "preference_count": len(form_obj.get("patientPreference") or []),
    }
