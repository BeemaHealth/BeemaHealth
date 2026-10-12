"""Pure questionnaire engine: answer validation, routing and outcome evaluation.

Nothing here touches the database, the network or the clock (``today`` is injectable).
A definition is a JSON graph ``{"start": id, "nodes": {id: node}}``. The engine, never the
client, decides the next node. Error messages never echo submitted values (PHI safety).
"""
from __future__ import annotations

import heapq
import math
import re
from dataclasses import asdict, dataclass, field
from datetime import date
from typing import Any, Callable, Iterable

Definition = dict[str, Any]
Node = dict[str, Any]
Availability = Callable[[str, str], bool]

TERMINAL_TYPES = frozenset({"no_proceed", "thank_you"})
AUTO_TYPES = frozenset({"zip_router", "answer_router"})
NODE_TYPES = frozenset(
    {
        "radio", "multi_select", "text", "textarea", "number", "date", "empty_page", "auth", "basics",
        "bmi", "safety_consent", "zip_router", "answer_router", "allergies", "add_medication",
        "med_conditions", "file_input", "id_photo", "checkout",
    }
) | TERMINAL_TYPES

MAX_ROUTE_HOPS = 50
US_STATES = frozenset(
    "AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY "
    "NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC".split()
)

_ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_ZIP = re.compile(r"^\d{5}(-\d{4})?$")
_EMAIL = re.compile(r"^[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9.\-]{1,190}\.[A-Za-z]{2,24}$")
_NAME = re.compile(r"^\w[\w .,'()/%+&\-]*$", re.UNICODE)
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_PERSON_NAME = re.compile(r"^[^\W\d_]+(?:[ .'\-]+[^\W\d_]+)*\.?$", re.UNICODE)
_STREET = re.compile(r"^\w[\w .,#'/\-]*$", re.UNICODE)
_UUID = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")


class EngineError(Exception):
    """The definition or the submission state cannot be advanced (a programming or data error)."""


class NodeNotAnswered(EngineError):
    """``next_node`` was asked to advance past a node that has no stored answer."""


class AnswerError(ValueError):
    """A submitted answer is invalid. ``code`` is machine readable, ``message`` is patient safe."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


@dataclass
class Outcome:
    """Result of replaying a submission's answers through the definition."""

    eligible: bool = True
    disqualified: bool = False
    disqualify_reason: str = ""
    flags: list[str] = field(default_factory=list)
    selected_variant_key: str = ""
    candidate_plan_slugs: list[str] = field(default_factory=list)
    completed: bool = False
    terminal_node: str = ""
    pending_node: str = ""

    def to_dict(self) -> dict[str, Any]:
        """JSON safe form stored on ``Submission.outcome``."""
        return asdict(self)


@dataclass
class StepResult:
    """The next interactive node plus the answers of auto nodes passed on the way."""

    node: Node
    auto: dict[str, Any]
    visited: list[str]


# --------------------------------------------------------------------------- definition access


def get_node(definition: Definition, node_id: str) -> Node:
    """Return a node by id or raise ``EngineError``."""
    try:
        return definition["nodes"][node_id]
    except (KeyError, TypeError) as exc:
        raise EngineError("Unknown node.") from exc


def node_edges(node: Node) -> list[str]:
    """Every node id this node can lead to (used for validation and progress)."""
    edges: list[str] = []
    for key in ("next", "unavailable_goto", "below_min_goto"):
        if node.get(key):
            edges.append(node[key])
    edges.extend(route["goto"] for route in node.get("routes", []))
    return edges


# --------------------------------------------------------------------------- conditions


def lookup(answers: dict[str, Any], ref: str) -> Any:
    """Resolve ``node`` or ``node.field`` against stored answers. Missing values are ``None``."""
    node_id, _, key = ref.partition(".")
    value = answers.get(node_id)
    if key:
        return value.get(key) if isinstance(value, dict) else None
    return value


def check(cond: dict[str, Any] | None, answers: dict[str, Any]) -> bool:
    """Evaluate a condition tree. ``None`` or ``{}`` is always true."""
    if not cond:
        return True
    if "all" in cond:
        return all(check(c, answers) for c in cond["all"])
    if "any" in cond:
        return any(check(c, answers) for c in cond["any"])
    if "not" in cond:
        return not check(cond["not"], answers)
    value = lookup(answers, cond["ref"])
    if "exists" in cond:
        return (value is not None) == bool(cond["exists"])
    if "equals" in cond:
        return value == cond["equals"]
    if "not_equals" in cond:
        return value is not None and value != cond["not_equals"]
    if "in" in cond:
        return value in cond["in"]
    if "not_in" in cond:
        return value is not None and value not in cond["not_in"]
    if "contains" in cond:
        return isinstance(value, list) and cond["contains"] in value
    if "contains_any" in cond:
        return isinstance(value, list) and any(item in value for item in cond["contains_any"])
    for op, fn in (("lt", lambda a, b: a < b), ("lte", lambda a, b: a <= b),
                   ("gt", lambda a, b: a > b), ("gte", lambda a, b: a >= b)):
        if op in cond:
            return isinstance(value, (int, float)) and not isinstance(value, bool) and fn(value, cond[op])
    raise EngineError("Unsupported condition.")


def condition_refs(cond: dict[str, Any] | None) -> Iterable[str]:
    """All node ids a condition reads (for definition validation)."""
    if not cond:
        return
    for key in ("all", "any"):
        for child in cond.get(key, []):
            yield from condition_refs(child)
    if "not" in cond:
        yield from condition_refs(cond["not"])
    if "ref" in cond:
        yield cond["ref"].partition(".")[0]


def visible_options(node: Node, answers: dict[str, Any]) -> list[dict[str, Any]]:
    """Options of a radio or multi_select node after applying per-option ``when`` conditions."""
    return [o for o in node.get("options", []) if check(o.get("when"), answers)]


# --------------------------------------------------------------------------- validation helpers


def _fail(code: str, message: str) -> AnswerError:
    return AnswerError(code, message)


def _clean_text(value: Any, *, min_len: int, max_len: int, multiline: bool = False, label: str = "This answer") -> str:
    if not isinstance(value, str):
        raise _fail("invalid_type", f"{label} must be text.")
    text = value.replace("\r\n", "\n").strip()
    if not multiline and ("\n" in text or "\t" in text):
        raise _fail("invalid_characters", f"{label} contains unsupported characters.")
    if _CONTROL.search(text):
        raise _fail("invalid_characters", f"{label} contains unsupported characters.")
    if len(text) < min_len:
        raise _fail("required", f"{label} is required.")
    if len(text) > max_len:
        raise _fail("too_long", f"{label} is too long.")
    return text


def _strict_name(value: Any, *, max_len: int = 100, label: str = "This field") -> str:
    """Names of medications, allergies and conditions: letters, digits and simple punctuation only."""
    text = _clean_text(value, min_len=1, max_len=max_len, label=label)
    if not _NAME.match(text):
        raise _fail("invalid_characters", f"{label} contains unsupported characters.")
    return text


def _parse_date(value: Any, label: str = "Date") -> date:
    if not isinstance(value, str) or not _ISO_DATE.match(value.strip()):
        raise _fail("invalid_date", f"Enter a valid {label.lower()}.")
    try:
        parsed = date.fromisoformat(value.strip())
    except ValueError as exc:
        raise _fail("invalid_date", f"Enter a valid {label.lower()}.") from exc
    return parsed


def age_on(dob: date, today: date) -> int:
    """Whole years between ``dob`` and ``today``."""
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _number(value: Any, *, minimum: float | None, maximum: float | None, integer: bool, label: str) -> int | float:
    if isinstance(value, bool) or not isinstance(value, (int, float, str)):
        raise _fail("invalid_type", f"{label} must be a number.")
    if isinstance(value, str):
        try:
            value = float(value.strip())
        except ValueError as exc:
            raise _fail("invalid_number", f"{label} must be a number.") from exc
    if isinstance(value, float) and not math.isfinite(value):
        raise _fail("invalid_number", f"{label} must be a number.")
    if integer:
        if float(value) != int(value):
            raise _fail("not_integer", f"{label} must be a whole number.")
        value = int(value)
    if minimum is not None and value < minimum:
        raise _fail("too_small", f"{label} is too low.")
    if maximum is not None and value > maximum:
        raise _fail("too_large", f"{label} is too high.")
    return value


def _require_dict(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise _fail("invalid_type", "This answer is not in the expected format.")
    return value


def _reject_unknown(value: dict[str, Any], allowed: set[str]) -> None:
    if set(value) - allowed:
        raise _fail("unknown_field", "This answer is not in the expected format.")


# --------------------------------------------------------------------------- per type validators


def _v_radio(node: Node, value: Any, ctx: dict[str, Any]) -> Any:
    if not isinstance(value, str):
        raise _fail("invalid_type", "Choose one option.")
    if value not in {o["key"] for o in visible_options(node, ctx["answers"])}:
        raise _fail("invalid_option", "Choose one of the listed options.")
    return value


def _v_multi_select(node: Node, value: Any, ctx: dict[str, Any]) -> list[str]:
    if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
        raise _fail("invalid_type", "Choose from the listed options.")
    options = visible_options(node, ctx["answers"])
    keys = [o["key"] for o in options]
    if len(set(value)) != len(value):
        raise _fail("duplicate_option", "Choose each option only once.")
    if any(v not in keys for v in value):
        raise _fail("invalid_option", "Choose from the listed options.")
    minimum = 0 if node.get("optional") else int(node.get("min_select", 1))
    if len(value) < minimum:
        raise _fail("required", "Choose at least one option.")
    if len(value) > int(node.get("max_select", len(keys))):
        raise _fail("too_many", "You chose too many options.")
    exclusive = {o["key"] for o in options if o.get("exclusive")}
    if len(value) > 1 and exclusive & set(value):
        raise _fail("exclusive_option", "That option cannot be combined with others.")
    return [k for k in keys if k in value]


def _v_text(node: Node, value: Any, ctx: dict[str, Any]) -> str:
    fmt = node.get("format")
    max_len = int(node.get("max_length", 200))
    text = _clean_text(value, min_len=int(node.get("min_length", 0 if node.get("optional") else 1)), max_len=max_len)
    if fmt == "email":
        text = text.lower()
        if not _EMAIL.match(text):
            raise _fail("invalid_email", "Enter a valid email address.")
    elif fmt == "zip":
        text = _zip(text)
    return text


def _v_textarea(node: Node, value: Any, ctx: dict[str, Any]) -> str:
    return _clean_text(
        value,
        min_len=0 if node.get("optional") else int(node.get("min_length", 1)),
        max_len=int(node.get("max_length", 2000)),
        multiline=True,
    )


def _v_number(node: Node, value: Any, ctx: dict[str, Any]) -> int | float:
    return _number(value, minimum=node.get("min"), maximum=node.get("max"), integer=bool(node.get("integer")), label="This answer")


def _v_date(node: Node, value: Any, ctx: dict[str, Any]) -> str:
    parsed = _parse_date(value)
    today = ctx["today"]
    if parsed.year < 1900:
        raise _fail("invalid_date", "Enter a valid date.")
    if node.get("not_future") and parsed > today:
        raise _fail("future_date", "That date cannot be in the future.")
    if node.get("min_age") is not None and age_on(parsed, today) < int(node["min_age"]):
        raise _fail("too_young", "You must be old enough to continue.")
    return parsed.isoformat()


def _v_empty_page(node: Node, value: Any, ctx: dict[str, Any]) -> bool:
    if value is None or value is True or value == {} or value == {"acknowledged": True}:
        return True
    raise _fail("invalid_type", "Continue to the next page.")


def _v_auth(node: Node, value: Any, ctx: dict[str, Any]) -> bool:
    """Account creation is completed through the claim endpoint, never by an answer body."""
    return _v_empty_page(node, value, ctx)


def _zip(text: str) -> str:
    if not _ZIP.match(text):
        raise _fail("invalid_zip", "Enter a valid 5 digit ZIP code.")
    return text[:5]


def _phone(value: Any) -> str:
    text = _clean_text(value, min_len=1, max_len=25, label="Phone number")
    digits = re.sub(r"\D", "", text)
    if not re.fullmatch(r"[0-9()+\-. ]+", text):
        raise _fail("invalid_phone", "Enter a valid US phone number.")
    if len(digits) == 11 and digits.startswith("1"):
        digits = digits[1:]
    if len(digits) != 10 or digits[0] in "01" or digits[3] in "01":
        raise _fail("invalid_phone", "Enter a valid US phone number.")
    return "+1" + digits


def _v_basics(node: Node, value: Any, ctx: dict[str, Any]) -> dict[str, Any]:
    data = _require_dict(value)
    _reject_unknown(
        data,
        {"dob", "sex_at_birth", "gender_identity", "state", "zip", "phone",
         "first_name", "last_name", "address_line1", "address_line2", "city"},
    )
    dob = _parse_date(data.get("dob"), "date of birth")
    today = ctx["today"]
    age = age_on(dob, today)
    if dob.year < 1900 or dob > today or age > 120:
        raise _fail("invalid_date", "Enter a valid date of birth.")
    sex = data.get("sex_at_birth")
    if sex not in ("female", "male"):
        raise _fail("invalid_option", "Choose your sex at birth.")
    state = data.get("state")
    if not isinstance(state, str) or state.strip().upper() not in US_STATES:
        raise _fail("invalid_state", "Choose your state.")
    zip_code = _zip(_clean_text(data.get("zip"), min_len=1, max_len=10, label="ZIP code"))
    result = {
        "dob": dob.isoformat(),
        "age_years": age,
        "sex_at_birth": sex,
        "state": state.strip().upper(),
        "zip": zip_code,
        "phone": _phone(data.get("phone")),
    }
    if data.get("gender_identity") not in (None, ""):
        result["gender_identity"] = _clean_text(data["gender_identity"], min_len=1, max_len=60, label="Gender identity")
    result.update(_basics_name(node, data))
    result.update(_basics_address(node, data))
    return result


def _pattern_text(value: Any, pattern: re.Pattern[str], max_len: int, label: str) -> str:
    text = _clean_text(value, min_len=1, max_len=max_len, label=label)
    if not pattern.match(text):
        raise _fail("invalid_characters", f"{label} contains unsupported characters.")
    return text


def _basics_name(node: Node, data: dict[str, Any]) -> dict[str, str]:
    """First and last name, required when the node sets ``collect_name``."""
    out: dict[str, str] = {}
    for key, label in (("first_name", "First name"), ("last_name", "Last name")):
        if data.get(key) in (None, "") and not node.get("collect_name"):
            continue
        out[key] = _pattern_text(data.get(key), _PERSON_NAME, 60, label)
    return out


def _basics_address(node: Node, data: dict[str, Any]) -> dict[str, str]:
    """Street address (state and ZIP are the basics fields), required when ``collect_address`` is set."""
    out: dict[str, str] = {}
    for key, pattern, max_len, label, required in (
        ("address_line1", _STREET, 100, "Street address", True),
        ("address_line2", _STREET, 100, "Apartment or unit", False),
        ("city", _PERSON_NAME, 60, "City", True),
    ):
        if data.get(key) in (None, "") and not (required and node.get("collect_address")):
            continue
        out[key] = _pattern_text(data.get(key), pattern, max_len, label)
    return out


def compute_bmi(height_in: float, weight_lbs: float) -> float:
    """BMI from inches and pounds, one decimal."""
    return round(703 * weight_lbs / (height_in ** 2), 1)


def _v_bmi(node: Node, value: Any, ctx: dict[str, Any]) -> dict[str, Any]:
    data = _require_dict(value)
    _reject_unknown(data, {"height_feet", "height_inches", "weight_lbs"})
    feet = _number(data.get("height_feet"), minimum=3, maximum=8, integer=True, label="Height")
    inches = _number(data.get("height_inches"), minimum=0, maximum=11, integer=True, label="Height")
    weight = _number(data.get("weight_lbs"), minimum=70, maximum=700, integer=False, label="Weight")
    height_in = feet * 12 + inches
    if not 48 <= height_in <= 96:
        raise _fail("too_large", "Height is outside the supported range.")
    return {"height_in": height_in, "weight_lbs": round(float(weight), 1), "bmi": compute_bmi(height_in, float(weight))}


def _v_safety_consent(node: Node, value: Any, ctx: dict[str, Any]) -> dict[str, Any]:
    accepted = value is True or (isinstance(value, dict) and value.get("accepted") is True and set(value) <= {"accepted"})
    if not accepted:
        raise _fail("consent_required", "You must accept to continue.")
    result = {"accepted": True, "consent_kind": node.get("consent_kind", "")}
    if node.get("consent_kinds"):
        result["consent_kinds"] = list(node["consent_kinds"])
    return result


def _none_or_items(value: Any, item_validator: Callable[[Any], dict[str, Any]], max_items: int) -> dict[str, Any]:
    data = _require_dict(value)
    _reject_unknown(data, {"none", "items"})
    items = data.get("items") or []
    if data.get("none") is True:
        if items:
            raise _fail("conflict", "Choose none or list items, not both.")
        return {"none": True, "items": []}
    if not isinstance(items, list) or not items:
        raise _fail("required", "Add at least one item or choose none.")
    if len(items) > max_items:
        raise _fail("too_many", "You added too many items.")
    return {"none": False, "items": [item_validator(item) for item in items]}


def _opt_name(data: dict[str, Any], key: str, max_len: int, label: str) -> str:
    if data.get(key) in (None, ""):
        return ""
    return _strict_name(data[key], max_len=max_len, label=label)


def _v_allergies(node: Node, value: Any, ctx: dict[str, Any]) -> dict[str, Any]:
    def item(raw: Any) -> dict[str, Any]:
        data = _require_dict(raw)
        _reject_unknown(data, {"name", "reaction", "severity"})
        severity = data.get("severity", "")
        if severity not in ("", "mild", "moderate", "severe"):
            raise _fail("invalid_option", "Choose a listed severity.")
        return {
            "name": _strict_name(data.get("name"), label="Allergy"),
            "reaction": _opt_name(data, "reaction", 200, "Reaction"),
            "severity": severity,
        }

    return _none_or_items(value, item, 25)


def _v_add_medication(node: Node, value: Any, ctx: dict[str, Any]) -> dict[str, Any]:
    def item(raw: Any) -> dict[str, Any]:
        data = _require_dict(raw)
        _reject_unknown(data, {"name", "dose", "frequency"})
        return {
            "name": _strict_name(data.get("name"), label="Medication"),
            "dose": _opt_name(data, "dose", 60, "Dose"),
            "frequency": _opt_name(data, "frequency", 60, "Frequency"),
        }

    return _none_or_items(value, item, 40)


def _v_med_conditions(node: Node, value: Any, ctx: dict[str, Any]) -> dict[str, Any]:
    def item(raw: Any) -> dict[str, Any]:
        data = _require_dict(raw)
        _reject_unknown(data, {"name", "notes", "diagnosed_on"})
        result = {
            "name": _strict_name(data.get("name"), label="Condition"),
            "notes": "",
            "diagnosed_on": "",
        }
        if data.get("notes") not in (None, ""):
            result["notes"] = _clean_text(data["notes"], min_len=1, max_len=500, multiline=True, label="Notes")
        if data.get("diagnosed_on") not in (None, ""):
            diagnosed = _parse_date(data["diagnosed_on"])
            if diagnosed > ctx["today"] or diagnosed.year < 1900:
                raise _fail("invalid_date", "Enter a valid date.")
            result["diagnosed_on"] = diagnosed.isoformat()
        return result

    return _none_or_items(value, item, 40)


def file_required(node: Node, answers: dict[str, Any]) -> bool:
    """A file node is required unless its ``optional_when`` condition holds."""
    if node.get("optional"):
        return False
    return not (node.get("optional_when") and check(node["optional_when"], answers))


def _v_file_input(node: Node, value: Any, ctx: dict[str, Any]) -> dict[str, Any]:
    data = _require_dict(value)
    _reject_unknown(data, {"file_ids", "skipped"})
    if data.get("skipped") is True:
        if file_required(node, ctx["answers"]) or data.get("file_ids"):
            raise _fail("required", "Upload is required.")
        return {"file_ids": []}
    ids = data.get("file_ids")
    if not isinstance(ids, list) or not ids or not all(isinstance(i, str) and _UUID.match(i) for i in ids):
        raise _fail("required", "Upload is required.")
    if len(set(ids)) != len(ids) or len(ids) > int(node.get("max_files", 1)):
        raise _fail("too_many", "Too many files.")
    return {"file_ids": [i.lower() for i in ids]}


def _v_zip_router(node: Node, value: Any, ctx: dict[str, Any]) -> Any:
    raise _fail("not_answerable", "This step is decided automatically.")


def _v_terminal(node: Node, value: Any, ctx: dict[str, Any]) -> Any:
    """Only a no_proceed node with ``collect_email`` accepts a body (waitlist email)."""
    if node["type"] == "no_proceed" and node.get("collect_email"):
        data = _require_dict(value)
        _reject_unknown(data, {"email"})
        return {"email": _v_text({"format": "email", "max_length": 254}, data.get("email"), ctx)}
    raise _fail("terminal", "There is nothing to answer here.")


def checkout_variant_key(node: Node, answers: dict[str, Any]) -> str:
    """``drug.additive.phase`` for the choices made so far, or ``""`` if any is missing."""
    drug = lookup(answers, node["drug_ref"])
    additive = next((v for ref in node["additive_refs"] if (v := lookup(answers, ref))), None)
    phase = lookup(answers, node["phase_ref"])
    return f"{drug}.{additive}.{phase}" if drug and additive and phase else ""


def checkout_plan_slugs(node: Node, answers: dict[str, Any]) -> list[str]:
    """Plans offered for the chosen variant (starter pack style plans are new patients only)."""
    key = checkout_variant_key(node, answers)
    plans = list(node.get("variants", {}).get(key, {}).get("plan_slugs", []))
    if node.get("new_user_when") and not check(node["new_user_when"], answers):
        plans = [p for p in plans if p not in node.get("new_user_only_plans", [])]
    return plans


def _v_checkout(node: Node, value: Any, ctx: dict[str, Any]) -> dict[str, Any]:
    data = _require_dict(value)
    _reject_unknown(data, {"plan_slug"})
    slug = data.get("plan_slug")
    if not isinstance(slug, str) or slug not in checkout_plan_slugs(node, ctx["answers"]):
        raise _fail("invalid_plan", "Choose one of the listed plans.")
    return {"plan_slug": slug, "variant_key": checkout_variant_key(node, ctx["answers"])}


_VALIDATORS: dict[str, Callable[[Node, Any, dict[str, Any]], Any]] = {
    "radio": _v_radio,
    "multi_select": _v_multi_select,
    "text": _v_text,
    "textarea": _v_textarea,
    "number": _v_number,
    "date": _v_date,
    "empty_page": _v_empty_page,
    "auth": _v_auth,
    "basics": _v_basics,
    "bmi": _v_bmi,
    "safety_consent": _v_safety_consent,
    "zip_router": _v_zip_router,
    "answer_router": _v_zip_router,
    "allergies": _v_allergies,
    "add_medication": _v_add_medication,
    "med_conditions": _v_med_conditions,
    "file_input": _v_file_input,
    "id_photo": _v_file_input,
    "checkout": _v_checkout,
    "no_proceed": _v_terminal,
    "thank_you": _v_terminal,
}


def validate_answer(
    node: Node,
    value: Any,
    *,
    answers: dict[str, Any] | None = None,
    today: date | None = None,
) -> Any:
    """Validate and normalize ``value`` for ``node``. Raises ``AnswerError``; never echoes the value.

    ``answers`` supplies earlier answers for conditional options and checkout plans.
    """
    validator = _VALIDATORS.get(node.get("type", ""))
    if validator is None:
        raise EngineError("Unknown node type.")
    return validator(node, value, {"answers": answers or {}, "today": today or date.today()})


# --------------------------------------------------------------------------- routing


def _auto_result(node: Node, answers: dict[str, Any], availability: Availability | None) -> dict[str, Any]:
    if node["type"] == "zip_router":
        if availability is None:
            raise EngineError("zip_router needs an availability checker.")
        state = lookup(answers, node["state_ref"])
        drug = lookup(answers, node["drug_ref"])
        return {"available": bool(state and drug and availability(state, drug))}
    for rule in node.get("rules", []):
        if check(rule.get("when"), answers):
            return {"value": rule["value"]}
    return {"value": node.get("default")}


def _route(node: Node, answers: dict[str, Any]) -> str:
    """Pick the next node id from an already answered (or auto resolved) node."""
    answer = answers.get(node["id"])
    if node["type"] == "bmi" and isinstance(answer, dict) and node.get("min_bmi") is not None:
        if answer["bmi"] < node["min_bmi"]:
            return node["below_min_goto"]
    if node["type"] == "zip_router" and answer and answer.get("available") is False:
        return node["unavailable_goto"]
    for route in node.get("routes", []):
        if check(route.get("when"), answers):
            return route["goto"]
    if node.get("next"):
        return node["next"]
    raise EngineError("Node has no outgoing edge.")


def step(
    definition: Definition,
    answers: dict[str, Any],
    current_node: str,
    *,
    availability: Availability | None = None,
) -> StepResult:
    """Advance from ``current_node`` (which must be answered), resolving auto nodes on the way."""
    node = get_node(definition, current_node)
    if node["type"] in TERMINAL_TYPES:
        raise EngineError("Terminal nodes cannot be advanced.")
    if node["type"] not in AUTO_TYPES and current_node not in answers:
        raise NodeNotAnswered("The current node has no answer.")
    working = dict(answers)
    auto: dict[str, Any] = {}
    visited: list[str] = []
    target = _route(node, working)
    for _ in range(MAX_ROUTE_HOPS):
        nxt = get_node(definition, target)
        if nxt["type"] not in AUTO_TYPES:
            return StepResult(nxt, auto, visited)
        if target not in working:
            working[target] = auto[target] = _auto_result(nxt, working, availability)
        visited.append(target)
        target = _route(nxt, working)
    raise EngineError("Routing loop detected.")


def entry_node(definition: Definition) -> StepResult:
    """The first interactive node of a definition."""
    start = get_node(definition, definition["start"])
    if start["type"] in AUTO_TYPES:
        raise EngineError("A definition cannot start on an auto node.")
    return StepResult(start, {}, [])


def next_node(
    definition: Definition,
    answers: dict[str, Any],
    current_node: str,
    *,
    availability: Availability | None = None,
) -> Node:
    """The node the patient sees after answering ``current_node``."""
    return step(definition, answers, current_node, availability=availability).node


# --------------------------------------------------------------------------- evaluation


def evaluate(
    definition: Definition,
    answers: dict[str, Any],
    *,
    availability: Availability | None = None,
) -> Outcome:
    """Replay ``answers`` from the start and summarise eligibility, flags and the chosen variant."""
    outcome = Outcome()
    node = get_node(definition, definition["start"])
    checkout_node: Node | None = None
    seen = 0
    while True:
        seen += 1
        if seen > len(definition["nodes"]) + 1:
            raise EngineError("Routing loop detected.")
        if node["type"] == "checkout":
            checkout_node = node
        if node["type"] in TERMINAL_TYPES:
            outcome.terminal_node = node["id"]
            if node["type"] == "no_proceed":
                outcome.eligible = False
                outcome.disqualified = True
                outcome.disqualify_reason = node.get("reason", "not_eligible")
            else:
                outcome.completed = True
            break
        if node["id"] not in answers:
            outcome.pending_node = node["id"]
            break
        for rule in node.get("flags", []):
            if check(rule.get("when"), answers) and rule["flag"] not in outcome.flags:
                outcome.flags.append(rule["flag"])
        node = step(definition, answers, node["id"], availability=availability).node
    if checkout_node is not None:
        outcome.selected_variant_key = checkout_variant_key(checkout_node, answers)
        outcome.candidate_plan_slugs = checkout_plan_slugs(checkout_node, answers)
    return outcome


# --------------------------------------------------------------------------- progress


def progress(definition: Definition, path: list[str], current_node: str) -> float:
    """Rough 0..1 completion: answered steps over answered plus shortest remaining route."""
    nodes = definition["nodes"]
    done = sum(1 for n in path if nodes.get(n, {}).get("type") not in AUTO_TYPES)
    remaining = _shortest_to_end(definition, current_node)
    total = done + remaining
    return round(done / total, 3) if total else 1.0


def _shortest_to_end(definition: Definition, start: str) -> int:
    """Fewest interactive nodes from ``start`` (inclusive) to a thank_you, ignoring conditions."""
    nodes = definition["nodes"]
    best = {start: 1}
    heap = [(1, start)]
    while heap:
        dist, node_id = heapq.heappop(heap)
        if dist > best.get(node_id, dist):
            continue
        node = nodes[node_id]
        if node["type"] == "thank_you":
            return dist
        for edge in node_edges(node):
            if nodes[edge]["type"] == "no_proceed":
                continue
            cost = dist + (0 if nodes[edge]["type"] in AUTO_TYPES else 1)
            if cost < best.get(edge, cost + 1):
                best[edge] = cost
                heapq.heappush(heap, (cost, edge))
    return 1


# --------------------------------------------------------------------------- public node shape


_PRIVATE_KEYS = frozenset(
    {"routes", "flags", "next", "rules", "default", "unavailable_goto", "below_min_goto", "variants",
     "drug_ref", "additive_refs", "phase_ref", "state_ref", "new_user_when",
     "new_user_only_plans", "optional_when", "reason"}
)


def public_node(node: Node, answers: dict[str, Any]) -> dict[str, Any]:
    """The part of a node the client may see. Routing rules and internals are removed."""
    shown = {k: v for k, v in node.items() if k not in _PRIVATE_KEYS}
    if "options" in node:
        shown["options"] = [{k: v for k, v in o.items() if k != "when"} for o in visible_options(node, answers)]
    if node["type"] == "checkout":
        shown["plan_slugs"] = checkout_plan_slugs(node, answers)
    if node["type"] in ("file_input", "id_photo"):
        shown["required"] = file_required(node, answers)
    return shown
