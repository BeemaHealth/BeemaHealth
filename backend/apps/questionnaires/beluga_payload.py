"""Resolve Beluga visit ``formObj`` fields from questionnaire versions + patient data."""

from __future__ import annotations

from typing import Any

from apps.questionnaires.models import QuestionnaireField, QuestionnaireVersion

BELUGA_PREFIX = "beluga:"

BELUGA_VISIT_REQUIRED_MAPPINGS = (
    "beluga:firstName",
    "beluga:lastName",
    "beluga:dob",
    "beluga:phone",
    "beluga:email",
    "beluga:address",
    "beluga:city",
    "beluga:state",
    "beluga:zip",
    "beluga:sex",
    "beluga:selfReportedMeds",
    "beluga:allergies",
    "beluga:medicalConditions",
)

BELUGA_LABELS = {
    "beluga:firstName": "First name",
    "beluga:lastName": "Last name",
    "beluga:dob": "Date of birth",
    "beluga:phone": "Phone",
    "beluga:email": "Email",
    "beluga:address": "Street address",
    "beluga:city": "City",
    "beluga:state": "State",
    "beluga:zip": "ZIP code",
    "beluga:sex": "Sex assigned at birth",
    "beluga:selfReportedMeds": "Current medications",
    "beluga:allergies": "Allergies",
    "beluga:medicalConditions": "Medical conditions",
}


def beluga_mapping_to_api_field_id(beluga: str) -> str:
    if not beluga or not beluga.startswith(BELUGA_PREFIX):
        return ""
    return beluga[len(BELUGA_PREFIX) :]


def _is_beluga_mapping(value: str | None) -> bool:
    return bool(value and str(value).strip().startswith(BELUGA_PREFIX))


def _format_sex(raw: str | None) -> str | None:
    if not raw or not str(raw).strip():
        return None
    lower = str(raw).strip().lower()
    if lower in ("female", "f"):
        return "Female"
    if lower in ("male", "m"):
        return "Male"
    if lower in ("intersex", "other"):
        return "Other"
    return str(raw).strip()


def _format_dob_for_beluga(raw: str | None) -> str | None:
    if not raw or not str(raw).strip():
        return None
    text = str(raw).strip()
    if "/" in text:
        return text
    parts = text.split("-")
    if len(parts) == 3:
        y, m, d = parts
        return f"{m}/{d}/{y}"
    return text


def _field_has_answer(raw: Any) -> bool:
    if raw is None or raw == "":
        return False
    if isinstance(raw, list) and len(raw) == 0:
        return False
    if isinstance(raw, dict):
        return bool(
            raw.get("verified")
            or raw.get("address")
            or raw.get("city")
            or raw.get("zip")
        )
    return True


def _parse_address_part(raw: Any, key: str) -> str | None:
    if not isinstance(raw, dict):
        return None
    part = str(raw.get(key) or "").strip()
    return part or None


def _option_label(field: QuestionnaireField, raw: Any) -> str:
    options = field.options or []
    option_map = {
        str(o.get("value", "")): str(o.get("label", o.get("value", "")))
        for o in options
        if isinstance(o, dict)
    }
    if field.field_type in (
        QuestionnaireField.FieldType.SINGLE_CHOICE,
        QuestionnaireField.FieldType.YES_NO,
    ):
        return option_map.get(str(raw), str(raw))
    if field.field_type == QuestionnaireField.FieldType.MULTI_CHOICE:
        parts = raw if isinstance(raw, list) else str(raw).split(",")
        return ", ".join(option_map.get(str(p), str(p)) for p in parts if str(p))
    return str(raw)


def _collect_bindings(version: QuestionnaireVersion, source_phase: str) -> list[dict]:
    bindings: list[dict] = []
    for step in version.steps.prefetch_related("fields").all():
        for field in step.fields.all():
            if field.field_type in (
                QuestionnaireField.FieldType.REVIEW,
                QuestionnaireField.FieldType.LEGAL_CONSENT,
            ):
                continue

            if _is_beluga_mapping(field.maps_to_section):
                bindings.append(
                    {
                        "beluga": field.maps_to_section,
                        "field_key": field.field_key,
                        "field": field,
                        "source_phase": source_phase,
                        "binding_type": "direct",
                    }
                )

            if field.field_type in (
                QuestionnaireField.FieldType.MULTI_CHOICE,
                QuestionnaireField.FieldType.YES_NO,
            ) or (
                field.field_type == QuestionnaireField.FieldType.SINGLE_CHOICE
                and not _is_beluga_mapping(field.maps_to_section)
            ):
                for opt in field.options or []:
                    if not isinstance(opt, dict):
                        continue
                    beluga = str(opt.get("beluga") or "").strip()
                    if not _is_beluga_mapping(beluga):
                        continue
                    bindings.append(
                        {
                            "beluga": beluga,
                            "field_key": field.field_key,
                            "field": field,
                            "source_phase": source_phase,
                            "binding_type": "choice_option",
                            "option_value": str(opt.get("value") or ""),
                        }
                    )

            if field.field_type == QuestionnaireField.FieldType.ACCOUNT:
                for opt in field.options or []:
                    if not isinstance(opt, dict):
                        continue
                    beluga = str(opt.get("beluga") or "").strip()
                    if not _is_beluga_mapping(beluga):
                        continue
                    bindings.append(
                        {
                            "beluga": beluga,
                            "field_key": field.field_key,
                            "field": field,
                            "source_phase": source_phase,
                            "binding_type": "account_sub",
                            "sub_key": str(opt.get("value") or ""),
                        }
                    )

            if field.field_type == QuestionnaireField.FieldType.ADDRESS_GROUP:
                for opt in field.options or []:
                    if not isinstance(opt, dict):
                        continue
                    beluga = str(opt.get("beluga") or "").strip()
                    if not _is_beluga_mapping(beluga):
                        continue
                    bindings.append(
                        {
                            "beluga": beluga,
                            "field_key": field.field_key,
                            "field": field,
                            "source_phase": source_phase,
                            "binding_type": "address_sub",
                            "sub_key": str(opt.get("value") or ""),
                        }
                    )
    return bindings


def _account_extras_from_snapshot(account: dict, identity_contact: dict | None = None) -> dict:
    identity_contact = identity_contact or {}
    return {
        "firstName": (account.get("first_name") or "").strip() or None,
        "lastName": (account.get("last_name") or "").strip() or None,
        "email": (account.get("email") or "").strip() or None,
        "phone": (account.get("phone") or "").strip() or None,
        "dob": (account.get("dob") or "").strip() or None,
        "state": (account.get("state") or identity_contact.get("state") or "").strip() or None,
        "address": (identity_contact.get("address") or "").strip() or None,
        "city": (identity_contact.get("city") or "").strip() or None,
        "zip": (identity_contact.get("zip") or "").strip() or None,
    }


def _extra_value_for_beluga(beluga: str, extras: dict) -> str | None:
    api_id = beluga_mapping_to_api_field_id(beluga)
    by_api = {
        "firstName": extras.get("firstName"),
        "lastName": extras.get("lastName"),
        "email": extras.get("email"),
        "phone": extras.get("phone"),
        "dob": extras.get("dob"),
        "state": extras.get("state"),
        "address": extras.get("address"),
        "city": extras.get("city"),
        "zip": extras.get("zip"),
        "sex": extras.get("sex"),
    }
    raw = by_api.get(api_id)
    if api_id == "sex":
        return _format_sex(raw)
    if api_id == "dob":
        return _format_dob_for_beluga(raw)
    if raw and str(raw).strip():
        return str(raw).strip()
    return None


def _resolve_binding(
    binding: dict,
    responses: dict,
    extras: dict,
) -> tuple[str | None, str | None, str | None]:
    field: QuestionnaireField = binding["field"]
    beluga = binding["beluga"]
    api_id = beluga_mapping_to_api_field_id(beluga)

    if binding["binding_type"] == "account_sub":
        sub = binding.get("sub_key") or ""
        account_map = {
            "first_name": extras.get("firstName"),
            "last_name": extras.get("lastName"),
            "phone": extras.get("phone"),
            "email": extras.get("email"),
        }
        value = account_map.get(sub)
        if value:
            return str(value).strip(), "account", "Account on file"
        extra = _extra_value_for_beluga(beluga, extras)
        if extra:
            return extra, "account", "Account on file"
        return None, None, None

    if binding["binding_type"] == "address_sub":
        raw = responses.get(binding["field_key"])
        sub = binding.get("sub_key") or ""
        part = _parse_address_part(raw, sub)
        if part:
            return part, binding["source_phase"], field.label or field.field_key
        extra = _extra_value_for_beluga(beluga, extras)
        if extra:
            return extra, "account", "Account on file"
        return None, None, None

    if binding["binding_type"] == "choice_option":
        option_value = binding.get("option_value") or ""
        raw = responses.get(binding["field_key"])
        selected = (
            [str(v) for v in raw]
            if isinstance(raw, list)
            else [str(raw)]
            if raw not in (None, "")
            else []
        )
        if option_value not in selected:
            return None, None, None
        for opt in field.options or []:
            if isinstance(opt, dict) and str(opt.get("value")) == option_value:
                label = str(opt.get("label") or option_value)
                return label, binding["source_phase"], field.label or field.field_key
        return option_value, binding["source_phase"], field.label or field.field_key

    raw = responses.get(binding["field_key"])
    if not _field_has_answer(raw):
        extra = _extra_value_for_beluga(beluga, extras)
        if extra:
            return extra, "account", "Account on file"
        return None, None, None

    if api_id == "sex":
        return (
            _format_sex(_option_label(field, raw)),
            binding["source_phase"],
            field.label or field.field_key,
        )
    if api_id == "dob":
        iso = str(raw)
        return (
            _format_dob_for_beluga(iso),
            binding["source_phase"],
            field.label or field.field_key,
        )
    return (
        _option_label(field, raw),
        binding["source_phase"],
        field.label or field.field_key,
    )


def build_beluga_visit_payload(
    *,
    intake_version: QuestionnaireVersion | None,
    intake_responses: dict,
    qualify_version: QuestionnaireVersion | None = None,
    qualify_responses: dict | None = None,
    account: dict | None = None,
    identity_contact: dict | None = None,
    sex: str | None = None,
) -> dict:
    """Build Beluga visit payload audit + ``form_obj`` preview for snapshots."""
    qualify_responses = qualify_responses or {}
    extras = _account_extras_from_snapshot(account or {}, identity_contact)
    if sex:
        extras["sex"] = _format_sex(sex)

    all_bindings: list[dict] = []
    if qualify_version:
        all_bindings.extend(_collect_bindings(qualify_version, "qualify"))
    if intake_version:
        all_bindings.extend(_collect_bindings(intake_version, "intake"))

    beluga_keys = {b["beluga"] for b in all_bindings}
    beluga_keys.update(BELUGA_VISIT_REQUIRED_MAPPINGS)

    fields_out: list[dict] = []
    form_obj: dict[str, str | None] = {}
    missing: list[str] = []

    for beluga in sorted(beluga_keys):
        if not beluga.startswith(BELUGA_PREFIX):
            continue
        api_id = beluga_mapping_to_api_field_id(beluga)
        label = BELUGA_LABELS.get(beluga, api_id)
        bindings = [b for b in all_bindings if b["beluga"] == beluga]

        value: str | None = None
        source: str | None = None
        source_label: str | None = None
        status = "unmapped"

        if bindings:
            ordered = sorted(
                bindings,
                key=lambda b: 0 if b["source_phase"] == "intake" else 1,
            )
            for binding in ordered:
                responses = (
                    intake_responses
                    if binding["source_phase"] == "intake"
                    else qualify_responses
                )
                resolved, src, src_label = _resolve_binding(binding, responses, extras)
                if resolved:
                    value = resolved
                    source = src
                    source_label = src_label
                    status = "filled"
                    break
            if not value:
                extra = _extra_value_for_beluga(beluga, extras)
                if extra:
                    value = extra
                    source = "account"
                    source_label = "Account on file"
                    status = "filled"
                elif bindings:
                    status = "missing_value"
        else:
            extra = _extra_value_for_beluga(beluga, extras)
            if extra:
                value = extra
                source = "account"
                source_label = "Account on file"
                status = "filled"
            elif beluga in BELUGA_VISIT_REQUIRED_MAPPINGS:
                status = "unmapped"

        if api_id:
            form_obj[api_id] = value

        row = {
            "beluga": beluga,
            "api_field_id": api_id,
            "label": label,
            "value": value,
            "status": status,
            "source": source,
            "source_label": source_label,
        }
        fields_out.append(row)

        if beluga in BELUGA_VISIT_REQUIRED_MAPPINGS and status != "filled":
            missing.append(api_id)

    required_count = len(BELUGA_VISIT_REQUIRED_MAPPINGS)
    ready_count = sum(
        1
        for f in fields_out
        if f["beluga"] in BELUGA_VISIT_REQUIRED_MAPPINGS and f["status"] == "filled"
    )

    return {
        "ready": len(missing) == 0,
        "ready_count": ready_count,
        "required_count": required_count,
        "missing": missing,
        "fields": fields_out,
        "form_obj": form_obj,
    }


def beluga_payload_is_ready(payload: dict | None) -> bool:
    return bool(payload and payload.get("ready"))
