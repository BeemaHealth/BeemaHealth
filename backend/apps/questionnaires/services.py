"""Questionnaire orchestration: start, answer, back, claim, checkout completion, visit payload.

All validation and routing decisions come from ``engine``; this layer persists them. Logs carry
ids only, never answers.
"""
from __future__ import annotations

import copy
import hmac
import logging
import uuid
from datetime import date
from typing import Any

from django.db import transaction
from django.utils import timezone

from . import engine, storage
from .models import (
    Layout,
    Questionnaire,
    QuestionnaireVersion,
    Submission,
    SubmissionFile,
    hash_token,
    new_token,
)

logger = logging.getLogger(__name__)

FILE_KINDS = {"id_photo": SubmissionFile.Kind.ID_PHOTO, "glp1_proof": SubmissionFile.Kind.GLP1_PROOF}


class ServiceError(Exception):
    """A request cannot be honoured. ``code`` is machine readable, ``message`` is patient safe."""

    def __init__(self, code: str, message: str, status: int = 400) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status


# --------------------------------------------------------------------------- routing bridge


def availability_via_routing(state: str, drug: str) -> bool:
    """Whether any active variant of ``drug`` can be routed in ``state``. Imports lazily.

    A missing routing app counts as available so the flow still works before routing ships.
    """
    try:
        from apps.catalog.models import ProductVariant
        from apps.routing.engine import is_available
    except ImportError:
        logger.warning("routing engine unavailable; treating all states as available")
        return True
    return any(is_available(state, variant) for variant in ProductVariant.objects.filter(drug=drug, is_active=True))


# --------------------------------------------------------------------------- helpers


def _definition(sub: Submission) -> engine.Definition:
    return sub.version.definition


def _node(sub: Submission) -> engine.Node:
    return engine.get_node(_definition(sub), sub.current_node)


def _refresh_outcome(sub: Submission, availability: engine.Availability | None) -> None:
    outcome = engine.evaluate(_definition(sub), sub.answers, availability=availability or availability_via_routing)
    sub.outcome = outcome.to_dict()


def _land_on(sub: Submission, result: engine.StepResult) -> None:
    """Record auto node results and move to the next interactive node, closing terminal ones."""
    sub.answers.update(result.auto)
    sub.path = [*sub.path, *result.visited]
    sub.current_node = result.node["id"]
    if result.node["type"] == "no_proceed":
        sub.status = Submission.Status.DISQUALIFIED
    elif result.node["type"] == "thank_you":
        sub.status = Submission.Status.SUBMITTED
        sub.submitted_at = timezone.now()


def _merge(base: dict[str, Any], override: dict[str, Any]) -> dict[str, Any]:
    merged = copy.deepcopy(base)
    for key, value in override.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key] = _merge(merged[key], value)
        else:
            merged[key] = value
    return merged


def layout_config(version: QuestionnaireVersion) -> dict[str, Any]:
    """The version's layout merged with the definition's own ``layout_overrides``."""
    base = version.layout.config if version.layout_id else {}
    return _merge(base, version.definition.get("layout_overrides", {}))


# --------------------------------------------------------------------------- start


def start(questionnaire_slug: str, *, utm: dict[str, Any] | None = None) -> tuple[Submission, str]:
    """Begin an anonymous submission on the latest published version. Returns it and the raw cookie token."""
    questionnaire = Questionnaire.objects.filter(slug=questionnaire_slug, is_active=True).first()
    version = questionnaire.latest_published() if questionnaire else None
    if version is None:
        raise ServiceError("not_found", "This questionnaire is not available.", 404)
    token = new_token()
    sub = Submission.objects.create(
        version=version,
        anonymous_token=hash_token(token),
        current_node=engine.entry_node(version.definition).node["id"],
        utm=_clean_utm(utm),
    )
    return sub, token


def _clean_utm(utm: dict[str, Any] | None) -> dict[str, str]:
    """Keep only short string values for known marketing keys (never PHI)."""
    allowed = ("utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "cta_id")
    return {k: str(v)[:100] for k, v in (utm or {}).items() if k in allowed and isinstance(v, (str, int))}


# --------------------------------------------------------------------------- answer


def _file_kind(node: engine.Node) -> str:
    """The SubmissionFile kind a file node expects (``id_photo`` nodes default to ``id_photo``)."""
    return node.get("file_kind") or ("id_photo" if node["type"] == "id_photo" else "")


def _check_files(sub: Submission, node: engine.Node, value: dict[str, Any]) -> None:
    """Every referenced file must belong to this submission, match the node kind and exist in storage."""
    kind = FILE_KINDS.get(_file_kind(node))
    ids = value["file_ids"]
    files = {str(f.id): f for f in sub.files.filter(id__in=ids)}
    if set(files) != set(ids):
        raise engine.AnswerError("invalid_file", "That upload could not be found. Please try again.")
    for file in files.values():
        if (kind and file.kind != kind) or file.status == SubmissionFile.Status.REJECTED:
            raise engine.AnswerError("invalid_file", "That upload could not be used. Please try again.")
        try:
            size = storage.object_size(file.s3_key)
        except storage.StorageNotConfigured as exc:
            raise ServiceError("storage_unavailable", "Uploads are unavailable right now.", 503) from exc
        if not size:
            raise engine.AnswerError("upload_missing", "We have not received that upload yet.")
        file.status, file.size_bytes = SubmissionFile.Status.UPLOADED, size
        file.save(update_fields=["status", "size_bytes", "updated_at"])


def _lookup_plan(slug: str) -> Any:
    from apps.catalog.models import Plan

    plan = Plan.objects.filter(slug=slug, is_active=True).first()
    if plan is None:
        raise ServiceError("plan_unavailable", "That plan is not available right now.", 409)
    return plan


def _sync_profile(sub: Submission, node: engine.Node, value: Any) -> None:
    """Copy demographics into the patient profile once the account exists."""
    profile = sub.patient
    if profile is None:
        return
    if node["type"] == "basics":
        profile.date_of_birth = date.fromisoformat(value["dob"])
        profile.sex_at_birth = value["sex_at_birth"]
        profile.gender_identity = value.get("gender_identity", "")
        profile.save(update_fields=["date_of_birth", "sex_at_birth", "gender_identity", "updated_at"])
        user = profile.user
        user.phone = value["phone"]
        fields = ["phone"]
        for key in ("first_name", "last_name"):
            if value.get(key):
                setattr(user, key, value[key])
                fields.append(key)
        user.save(update_fields=fields)
        if value.get("address_line1"):
            _save_shipping_address(profile, value)
    elif node["type"] == "bmi":
        profile.height_inches = value["height_in"]
        profile.starting_weight_lbs = value["weight_lbs"]
        profile.save(update_fields=["height_inches", "starting_weight_lbs", "updated_at"])


def _save_shipping_address(profile: Any, value: dict[str, Any]) -> None:
    """Upsert the patient's default shipping address from the basics answer."""
    from apps.patients.models import Address

    address = Address.objects.filter(patient=profile, kind=Address.Kind.SHIPPING, is_default=True).first() or Address(
        patient=profile, kind=Address.Kind.SHIPPING, is_default=True
    )
    address.line1, address.line2 = value["address_line1"], value.get("address_line2", "")
    address.city, address.state, address.zip_code = value["city"], value["state"], value["zip"]
    address.save()


def _record_consent(sub: Submission, node: engine.Node, meta: dict[str, Any] | None) -> None:
    from apps.patients.models import ConsentRecord

    if sub.patient is None:
        return
    meta = meta or {}
    agent = meta.get("user_agent") or ""
    for kind in node.get("consent_kinds") or [node.get("consent_kind", "")]:
        if kind in ConsentRecord.Kind.values:
            ConsentRecord.objects.create(
                patient=sub.patient,
                kind=kind,
                version=sub.version.version_label[:32],
                ip=meta.get("ip"),
                user_agent_hash=hash_token(agent) if agent else "",
            )


@transaction.atomic
def answer(
    submission: Submission,
    node_id: str,
    value: Any,
    *,
    availability: engine.Availability | None = None,
    today: date | None = None,
    meta: dict[str, Any] | None = None,
) -> Submission:
    """Validate ``value`` for the current node and advance. The client cannot pick the node."""
    sub = Submission.objects.select_for_update(of=("self",)).select_related("version", "patient__user").get(pk=submission.pk)
    node = _node(sub)
    avail = availability or availability_via_routing
    if node["type"] == "no_proceed" and node.get("collect_email") and node_id == sub.current_node:
        sub.answers[node_id] = engine.validate_answer(node, value, answers=sub.answers, today=today)
        sub.last_activity_at = timezone.now()
        sub.save()
        return sub
    if sub.status != Submission.Status.IN_PROGRESS:
        raise ServiceError("submission_closed", "This questionnaire is already finished.", 409)
    if node_id != sub.current_node:
        raise ServiceError("node_mismatch", "That step is no longer current.", 409)
    if node["type"] == "auth":
        raise ServiceError("account_required", "Create your account to continue.", 403)
    was_open = sub.status == Submission.Status.IN_PROGRESS
    normalized = engine.validate_answer(node, value, answers=sub.answers, today=today)
    if node["type"] in ("file_input", "id_photo") and normalized["file_ids"]:
        _check_files(sub, node, normalized)
    sub.answers[node_id] = normalized
    if node["type"] == "checkout":
        sub.selected_plan = _lookup_plan(normalized["plan_slug"])
    else:
        if node["type"] == "safety_consent":
            _record_consent(sub, node, meta)
        _sync_profile(sub, node, normalized)
        sub.path = [*sub.path, node_id]
        _land_on(sub, engine.step(_definition(sub), sub.answers, node_id, availability=avail))
    _refresh_outcome(sub, avail)
    if node["type"] == "checkout":
        _disqualify_if_drug_ineligible(sub, normalized)
    sub.last_activity_at = timezone.now()
    sub.save()
    _track_checkout(sub)
    if was_open and sub.status != Submission.Status.IN_PROGRESS:
        _on_closed(sub)
    return sub


def _track_checkout(sub: Submission) -> None:
    """Start the abandoned checkout drip once an account holder is on (or past picking a plan at) checkout."""
    if sub.patient_id is None or sub.status != Submission.Status.IN_PROGRESS:
        return
    if _definition(sub)["nodes"].get(sub.current_node, {}).get("type") != "checkout":
        return
    try:
        from apps.messaging.services import track_checkout_reached
    except ImportError:
        logger.warning("messaging app not available for checkout tracking")
        return
    track_checkout_reached(sub)


# --------------------------------------------------------------------------- closing hooks


def _treatment_for(sub: Submission) -> Any | None:
    from django.apps import apps

    try:
        return apps.get_model("clinical", "Treatment").objects.filter(submission=sub).first()
    except LookupError:
        return None


def _on_closed(sub: Submission) -> None:
    """A flow ended. Disqualified after paying: refund. Finished: submit the visit once committed."""
    treatment = _treatment_for(sub)
    if treatment is None:
        return
    if sub.status == Submission.Status.DISQUALIFIED:
        _refund_if_paid(treatment)
    elif sub.status == Submission.Status.SUBMITTED:
        transaction.on_commit(lambda: submit_visit_for_submission(sub.pk))


def _refund_if_paid(treatment: Any) -> None:
    try:
        from apps.billing.services import handle_post_payment_disqualification
    except ImportError:
        logger.warning("billing unavailable; disqualified treatment %s not refunded", treatment.pk)
        return
    try:
        with transaction.atomic():
            handle_post_payment_disqualification(treatment)
    except Exception:  # noqa: BLE001 - never block the patient's answer; staff can refund from admin
        logger.exception("disqualification refund failed treatment=%s", treatment.pk)


def submit_visit_for_submission(submission_id: Any) -> bool:
    """Route and submit the visit once the medical questionnaire is finished. Idempotent.

    Returns True when the visit has been submitted. Failures are logged (ids only); a flagged
    route leaves the treatment in routing_review for staff.
    """
    try:
        from apps.integrations.services import submit_visit_for_treatment
        from apps.routing.engine import route

        treatment = _treatment_for(Submission.objects.get(pk=submission_id))
        if treatment is None or treatment.status != "awaiting_visit_completion":
            return bool(treatment and treatment.submitted_to_network_at)
        if treatment.network_id is None and route(treatment).result != "routed":
            return False
        submit_visit_for_treatment(treatment)
        return True
    except Exception:  # noqa: BLE001 - retried by staff or the reconcile job; never raised to the patient
        logger.exception("visit submission failed submission=%s", submission_id)
        return False


def _passed_checkout(sub: Submission) -> bool:
    nodes = _definition(sub)["nodes"]
    return any(nodes.get(node_id, {}).get("type") == "checkout" for node_id in sub.path)


@transaction.atomic
def complete_checkout(submission: Submission, *, availability: engine.Availability | None = None) -> Submission:
    """Advance past checkout once payment has succeeded (called by billing, never by the client)."""
    sub = Submission.objects.select_for_update(of=("self",)).select_related("version", "patient__user").get(pk=submission.pk)
    node = _node(sub)
    if node["type"] != "checkout" and _passed_checkout(sub):
        return sub  # payment events can replay; the flow has already moved on
    if node["type"] != "checkout" or node["id"] not in sub.answers or sub.selected_plan_id is None:
        raise ServiceError("checkout_not_ready", "No plan has been chosen.", 409)
    sub.path = [*sub.path, node["id"]]
    avail = availability or availability_via_routing
    _land_on(sub, engine.step(_definition(sub), sub.answers, node["id"], availability=avail))
    _refresh_outcome(sub, avail)
    sub.last_activity_at = timezone.now()
    sub.save()
    return sub


# --------------------------------------------------------------------------- back


@transaction.atomic
def back(submission: Submission, *, availability: engine.Availability | None = None) -> Submission:
    """Step back one interactive node. Not allowed across the account gate or checkout."""
    sub = Submission.objects.select_for_update(of=("self",)).select_related("version", "patient__user").get(pk=submission.pk)
    nodes = _definition(sub)["nodes"]
    if sub.status not in (Submission.Status.IN_PROGRESS, Submission.Status.DISQUALIFIED):
        raise ServiceError("submission_closed", "This questionnaire is already finished.", 409)
    types = [nodes[n]["type"] for n in sub.path]
    if sub.status == Submission.Status.DISQUALIFIED and "checkout" in types:
        raise ServiceError("cannot_go_back", "You cannot go back from here.", 409)
    interactive = [i for i, n in enumerate(sub.path) if nodes[n]["type"] not in engine.AUTO_TYPES]
    if not interactive:
        raise ServiceError("cannot_go_back", "You are at the first step.", 409)
    target_index = interactive[-1]
    target = sub.path[target_index]
    gates = [i for i, t in enumerate(types) if t == "checkout" or (t == "auth" and sub.patient_id)]
    if nodes[target]["type"] == "auth" or any(target_index <= g for g in gates):
        raise ServiceError("cannot_go_back", "You cannot go back from here.", 409)
    for removed in [*sub.path[target_index:], sub.current_node]:
        sub.answers.pop(removed, None)
    sub.path = sub.path[:target_index]
    sub.current_node = target
    sub.status = Submission.Status.IN_PROGRESS
    sub.selected_plan = None
    _refresh_outcome(sub, availability or availability_via_routing)
    sub.last_activity_at = timezone.now()
    sub.save()
    return sub


# --------------------------------------------------------------------------- claim


@transaction.atomic
def claim(submission: Submission, patient: Any, raw_token: str | None) -> Submission:
    """Attach an anonymous submission to ``patient`` after account creation. One time only.

    The caller must hold the anonymous token that started the submission.
    """
    sub = Submission.objects.select_for_update(of=("self",)).select_related("version").get(pk=submission.pk)
    if sub.patient_id is not None or not sub.anonymous_token:
        raise ServiceError("already_claimed", "This questionnaire is already linked to an account.", 409)
    if not raw_token or not hmac.compare_digest(sub.anonymous_token, hash_token(raw_token)):
        raise ServiceError("invalid_token", "This questionnaire could not be found.", 404)
    sub.patient = patient
    sub.anonymous_token = ""
    sub.account_created_at = timezone.now()
    if sub.status == Submission.Status.IN_PROGRESS and _definition(sub)["nodes"].get(sub.current_node, {}).get("type") == "auth":
        node_id = sub.current_node
        sub.answers[node_id] = True
        sub.path = [*sub.path, node_id]
        _land_on(sub, engine.step(_definition(sub), sub.answers, node_id, availability=availability_via_routing))
        _refresh_outcome(sub, None)
    _disqualify_if_previously_ineligible(sub, patient)
    sub.last_activity_at = timezone.now()
    sub.save()
    return sub


PREVIOUSLY_INELIGIBLE_NODE = {
    "id": "no_proceed_previously_ineligible",
    "type": "no_proceed",
    "reason": "previously_ineligible",
    "title": "We cannot continue",
    "body": (
        "Your care team reviewed an earlier request and we are not able to start this program for you. "
        "Please contact support if you have questions."
    ),
}


def _disqualify_if_drug_ineligible(sub: Submission, checkout_answer: dict[str, Any]) -> None:
    """The chosen plan's drug is known at checkout: stop a patient not prescribed it before."""
    if sub.patient_id is None or sub.selected_plan is None:
        return
    try:
        from apps.clinical.services import is_ineligible
    except ImportError:
        return
    plan = sub.selected_plan
    drug = str(checkout_answer.get("variant_key", "")).split(".")[0]
    target = drug or plan.variant or plan.product
    if is_ineligible(sub.patient, target) is None:
        return
    sub.status = Submission.Status.DISQUALIFIED
    sub.selected_plan = None
    sub.outcome = {**(sub.outcome or {}), "eligible": False, "disqualified": True, "disqualify_reason": "previously_ineligible"}


def _disqualify_if_previously_ineligible(sub: Submission, patient: Any) -> None:
    """A patient with an active drug ineligibility for this product cannot start over."""
    try:
        from apps.catalog.models import Product
        from apps.clinical.services import is_ineligible
    except ImportError:
        return
    product = Product.objects.filter(slug=sub.version.questionnaire.product_slug).first()
    if product is None or is_ineligible(patient, product) is None:
        return
    sub.status = Submission.Status.DISQUALIFIED
    sub.outcome = {**(sub.outcome or {}), "eligible": False, "disqualified": True, "disqualify_reason": "previously_ineligible"}


# --------------------------------------------------------------------------- reads


def resolve_by_token(raw_token: str | None) -> Submission | None:
    """The unclaimed submission started with this token, or ``None``."""
    if not raw_token:
        return None
    return Submission.objects.select_related("version__layout").filter(anonymous_token=hash_token(raw_token), patient__isnull=True).first()


def get_submission_for_patient(
    patient: Any, submission_id: uuid.UUID | str | None = None, *, open_only: bool = False
) -> Submission | None:
    """A patient's submission by id (``DoesNotExist`` if it is not theirs), else their latest.

    ``open_only`` skips submitted and abandoned ones (what the runner resumes).
    """
    qs = Submission.objects.select_related("version__layout").filter(patient=patient)
    if submission_id is not None:
        return qs.get(pk=submission_id)
    if open_only:
        qs = qs.filter(status__in=[Submission.Status.IN_PROGRESS, Submission.Status.DISQUALIFIED])
    return qs.order_by("-last_activity_at").first()


def describe(submission: Submission) -> dict[str, Any]:
    """What the client may see: current node, visited ids, progress, layout and its own previous answer."""
    definition = _definition(submission)
    node = engine.get_node(definition, submission.current_node)
    if (submission.outcome or {}).get("disqualify_reason") == "previously_ineligible":
        node = PREVIOUSLY_INELIGIBLE_NODE
    data: dict[str, Any] = {
        "submission_id": str(submission.id),
        "status": submission.status,
        "node": engine.public_node(node, submission.answers),
        "path": list(submission.path),
        "progress": engine.progress(definition, submission.path, submission.current_node),
        "layout": layout_config(submission.version),
        "claimed": submission.patient_id is not None,
        "previous_answer": submission.answers.get(node["id"]),
    }
    if node["type"] == "no_proceed":
        data["disqualify_reason"] = node["reason"]
    return data


# --------------------------------------------------------------------------- uploads


def create_upload(submission: Submission, kind: str, content_type: str, size_bytes: int) -> tuple[SubmissionFile, dict[str, Any]]:
    """Create a pending file row and a presigned POST for it."""
    if kind not in SubmissionFile.Kind.values:
        raise ServiceError("invalid_kind", "Unsupported upload type.")
    if content_type not in storage.ALLOWED_CONTENT_TYPES:
        raise ServiceError("invalid_content_type", "Upload a JPG, PNG, WebP, HEIC or PDF file.")
    if not isinstance(size_bytes, int) or isinstance(size_bytes, bool) or not 0 < size_bytes <= storage.MAX_UPLOAD_BYTES:
        raise ServiceError("invalid_size", "That file is too large (10 MB maximum).")
    if submission.status != Submission.Status.IN_PROGRESS:
        raise ServiceError("submission_closed", "This questionnaire is already finished.", 409)
    if submission.files.count() >= 10:
        raise ServiceError("too_many_files", "Too many uploads for this questionnaire.", 429)
    file_id = uuid.uuid4()
    file = SubmissionFile.objects.create(
        id=file_id,
        submission=submission,
        kind=kind,
        s3_key=f"submissions/{submission.id}/{file_id}",
        content_type=content_type,
    )
    try:
        presigned = storage.presign_upload(file.s3_key, content_type)
    except storage.StorageNotConfigured as exc:
        file.delete()
        raise ServiceError("storage_unavailable", "Uploads are unavailable right now.", 503) from exc
    return file, presigned


# --------------------------------------------------------------------------- visit payload


def _set_path(target: dict[str, Any], dotted: str, value: Any) -> None:
    *parents, leaf = dotted.split(".")
    for key in parents:
        target = target.setdefault(key, {})
    target[leaf] = value


def _labels(node: engine.Node, value: Any) -> str:
    labels = {o["key"]: o.get("label", o["key"]) for o in node.get("options", [])}
    if isinstance(value, list):
        return ", ".join(labels.get(v, v) for v in value)
    return labels.get(value, str(value))


def _compact(data: Any) -> Any:
    """Drop None and empty strings (recursively) so downstream mappers never send blanks."""
    if isinstance(data, dict):
        return {k: _compact(v) for k, v in data.items() if v is not None and v != ""}
    if isinstance(data, list):
        return [_compact(v) for v in data]
    return data


def build_visit_payload(submission: Submission) -> dict[str, Any]:
    """Neutral, vendor independent medical visit data. Integrations map this to the network form."""
    if submission.status != Submission.Status.SUBMITTED:
        raise ServiceError("not_submitted", "The questionnaire is not complete.", 409)
    definition = _definition(submission)
    answers = submission.answers
    payload: dict[str, Any] = {
        "submission_id": str(submission.id),
        "questionnaire": submission.version.questionnaire.slug,
        "version": submission.version.version_label,
        "patient": {}, "location": {}, "body": {}, "treatment": {}, "consents": [], "files": {},
        "intake": {}, "questions": [], "flags": list(submission.outcome.get("flags", [])),
    }
    profile = submission.patient
    if profile is not None:
        user = profile.user
        payload["patient"].update(first_name=user.first_name, last_name=user.last_name, email=user.email)
    for node_id in submission.path:
        node = definition["nodes"].get(node_id, {})
        value = answers.get(node_id)
        kind = node.get("type")
        if kind == "basics":
            payload["patient"].update(
                phone=value["phone"], dob=value["dob"], sex_at_birth=value["sex_at_birth"],
                gender_identity=value.get("gender_identity", ""),
            )
            payload["patient"].update({k: value[k] for k in ("first_name", "last_name") if value.get(k)})
            payload["location"].update(state=value["state"], zip=value["zip"])
            if value.get("address_line1"):
                payload["patient"].update(
                    address=" ".join(p for p in (value["address_line1"], value.get("address_line2", "")) if p), city=value["city"]
                )
                payload["location"].update(
                    address_line1=value["address_line1"], address_line2=value.get("address_line2", ""), city=value["city"]
                )
        elif kind == "bmi":
            payload["body"] = {k: value[k] for k in ("height_in", "weight_lbs", "bmi")}
        elif kind == "checkout":
            drug, additive, phase = value["variant_key"].split(".")
            payload["treatment"] = {
                "drug": drug, "additive": additive, "phase": phase,
                "variant_key": value["variant_key"], "plan_slug": value["plan_slug"],
            }
        elif kind == "safety_consent" and value.get("accepted"):
            payload["consents"].extend(value.get("consent_kinds") or [value.get("consent_kind") or node_id])
        elif kind in ("file_input", "id_photo"):
            keys = list(submission.files.filter(id__in=value["file_ids"]).values_list("s3_key", flat=True))
            if keys:
                payload["files"][_file_kind(node) or node_id] = keys
        elif node.get("maps_to") and kind not in ("empty_page", "auth"):
            _set_path(payload["intake"], node["maps_to"], value)
        if kind in ("radio", "multi_select", "text", "textarea", "number", "date") and value not in ("", []):
            payload["questions"].append({"node": node_id, "question": node.get("title", ""), "answer": _labels(node, value)})
    return _compact(payload)


# --------------------------------------------------------------------------- staff tools


def duplicate_version(version: QuestionnaireVersion, label: str | None = None) -> QuestionnaireVersion:
    """Copy any version into a new editable draft with the next free ``vN`` label."""
    existing = set(version.questionnaire.versions.values_list("version_label", flat=True))
    if label is None:
        n = 2
        while f"v{n}" in existing:
            n += 1
        label = f"v{n}"
    return QuestionnaireVersion.objects.create(
        questionnaire=version.questionnaire,
        version_label=label,
        definition=copy.deepcopy(version.definition),
        layout=version.layout,
    )
