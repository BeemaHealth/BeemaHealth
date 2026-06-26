from __future__ import annotations

import random
import re
import uuid
from copy import deepcopy

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.questionnaires.models import (
    Experiment,
    ExperimentVariant,
    Questionnaire,
    QuestionnaireField,
    QuestionnaireStep,
    QuestionnaireVersion,
)


def serialize_field(field: QuestionnaireField) -> dict:
    return {
        "id": str(field.id),
        "field_key": field.field_key,
        "field_type": field.field_type,
        "label": field.label,
        "help_text": field.help_text,
        "options": field.options,
        "validation_rules": field.validation_rules,
        "maps_to_section": field.maps_to_section,
        "plugin_id": field.plugin_id,
        "sort_order": field.sort_order,
        "required": field.required,
    }


def serialize_step(step: QuestionnaireStep) -> dict:
    fields = [serialize_field(f) for f in step.fields.all()]
    return {
        "id": str(step.id),
        "step_key": step.step_key,
        "sort_order": step.sort_order,
        "progress_level": step.progress_level,
        "title": step.title,
        "subtitle": step.subtitle,
        "visibility_rule": step.visibility_rule,
        "routing_rules": step.routing_rules,
        "position_x": step.position_x,
        "position_y": step.position_y,
        "fields": fields,
    }


def serialize_version(version: QuestionnaireVersion, *, include_ids: bool = True) -> dict:
    steps = [serialize_step(s) for s in version.steps.prefetch_related("fields").all()]
    payload = {
        "id": str(version.id),
        "questionnaire_slug": version.questionnaire.slug,
        "questionnaire_type": version.questionnaire.questionnaire_type,
        "medication_id": (
            str(version.questionnaire.medication_id)
            if version.questionnaire.medication_id
            else None
        ),
        "version_label": version.version_label,
        "status": version.status,
        "published_at": version.published_at.isoformat() if version.published_at else None,
        "intake_routing_rules": version.intake_routing_rules or [],
        "cta_ids": version.cta_ids or [],
        "is_default_entry": version.is_default_entry,
        "steps": steps,
    }
    if not include_ids:
        payload.pop("id", None)
        for step in payload["steps"]:
            step.pop("id", None)
            for field in step["fields"]:
                field.pop("id", None)
    return payload


QUESTIONNAIRE_EXPORT_SCHEMA_VERSION = 1


def export_questionnaire_version_bundle(version: QuestionnaireVersion) -> dict:
    """Portable, ID-free questionnaire version bundle for environment promotion."""
    payload = serialize_version(version, include_ids=False)
    payload["status"] = QuestionnaireVersion.Status.DRAFT
    payload["published_at"] = None
    return {
        "schema_version": QUESTIONNAIRE_EXPORT_SCHEMA_VERSION,
        "questionnaire": {
            "slug": version.questionnaire.slug,
            "title": version.questionnaire.title,
            "questionnaire_type": version.questionnaire.questionnaire_type,
            "medication_id": (
                str(version.questionnaire.medication_id)
                if version.questionnaire.medication_id
                else None
            ),
            "medication_slug": (
                version.questionnaire.medication.slug
                if version.questionnaire.medication_id
                else ""
            ),
        },
        "version": payload,
    }


def _bundle_version_payload(bundle: dict) -> dict:
    if not isinstance(bundle, dict):
        raise serializers.ValidationError("Import payload must be a JSON object.")
    schema_version = bundle.get("schema_version")
    if schema_version != QUESTIONNAIRE_EXPORT_SCHEMA_VERSION:
        raise serializers.ValidationError(
            {
                "schema_version": (
                    f"Unsupported schema_version {schema_version!r}. "
                    f"Expected {QUESTIONNAIRE_EXPORT_SCHEMA_VERSION}."
                )
            }
        )
    version_payload = bundle.get("version")
    if not isinstance(version_payload, dict):
        raise serializers.ValidationError({"version": "Missing version payload."})
    return version_payload


@transaction.atomic
def import_questionnaire_version_bundle(
    questionnaire: Questionnaire,
    bundle: dict,
    *,
    created_by,
    version_label: str | None = None,
) -> QuestionnaireVersion:
    """Import an exported version bundle as a new draft on ``questionnaire``."""
    from apps.questionnaires.serializers import (
        QuestionnaireFieldWriteSerializer,
        QuestionnaireStepWriteSerializer,
    )

    version_payload = _bundle_version_payload(bundle)
    questionnaire_payload = bundle.get("questionnaire") or {}
    bundle_type = str(questionnaire_payload.get("questionnaire_type") or "").strip()
    version_type = str(version_payload.get("questionnaire_type") or "").strip()
    for source_type in (bundle_type, version_type):
        if source_type and source_type != questionnaire.questionnaire_type:
            raise serializers.ValidationError(
                {
                    "questionnaire_type": (
                        f"Cannot import {source_type!r} into "
                        f"{questionnaire.questionnaire_type!r} questionnaire."
                    )
                }
            )
    label = str(version_label or version_payload.get("version_label") or "").strip()
    if not label:
        raise serializers.ValidationError({"version_label": "Version label is required."})
    label = label[:VERSION_LABEL_MAX]
    if QuestionnaireVersion.objects.filter(
        questionnaire=questionnaire,
        version_label=label,
    ).exists():
        label = _unique_version_label(questionnaire, label)

    intake_routing_rules = deepcopy(version_payload.get("intake_routing_rules") or [])
    if not isinstance(intake_routing_rules, list):
        raise serializers.ValidationError(
            {"intake_routing_rules": "Must be a list."}
        )
    cta_ids = [
        str(cta).strip()[:64]
        for cta in (version_payload.get("cta_ids") or [])
        if str(cta).strip()
    ]
    # Preserve order while de-duping CTA ids.
    cta_ids = list(dict.fromkeys(cta_ids))
    steps = version_payload.get("steps")
    if not isinstance(steps, list) or not steps:
        raise serializers.ValidationError({"steps": "Import must include at least one step."})

    imported = QuestionnaireVersion.objects.create(
        questionnaire=questionnaire,
        version_label=label,
        status=QuestionnaireVersion.Status.DRAFT,
        intake_routing_rules=intake_routing_rules,
        cta_ids=cta_ids,
        is_default_entry=bool(version_payload.get("is_default_entry", False)),
        created_by=created_by,
    )

    seen_steps: set[str] = set()
    for i, step_payload in enumerate(steps):
        if not isinstance(step_payload, dict):
            raise serializers.ValidationError({"steps": f"Step {i} must be an object."})
        step_data = {
            "step_key": step_payload.get("step_key"),
            "sort_order": step_payload.get("sort_order", i),
            "progress_level": step_payload.get("progress_level", 0),
            "title": step_payload.get("title", ""),
            "subtitle": step_payload.get("subtitle", ""),
            "visibility_rule": deepcopy(step_payload.get("visibility_rule")),
            "routing_rules": deepcopy(step_payload.get("routing_rules") or []),
            "position_x": step_payload.get("position_x"),
            "position_y": step_payload.get("position_y"),
        }
        step_serializer = QuestionnaireStepWriteSerializer(data=step_data)
        step_serializer.is_valid(raise_exception=True)
        clean_step = step_serializer.validated_data
        step_key = clean_step["step_key"]
        if step_key in seen_steps:
            raise serializers.ValidationError(
                {"steps": f"Duplicate step_key '{step_key}'."}
            )
        seen_steps.add(step_key)
        step = QuestionnaireStep.objects.create(version=imported, **clean_step)

        fields = step_payload.get("fields") or []
        if not isinstance(fields, list):
            raise serializers.ValidationError(
                {"steps": f"Step '{step_key}' fields must be a list."}
            )
        seen_fields: set[str] = set()
        for j, field_payload in enumerate(fields):
            if not isinstance(field_payload, dict):
                raise serializers.ValidationError(
                    {"fields": f"Field {j} on step '{step_key}' must be an object."}
                )
            field_data = {
                "field_key": field_payload.get("field_key"),
                "field_type": field_payload.get("field_type"),
                "label": field_payload.get("label", ""),
                "help_text": field_payload.get("help_text", ""),
                "options": deepcopy(field_payload.get("options") or []),
                "validation_rules": deepcopy(field_payload.get("validation_rules") or []),
                "maps_to_section": field_payload.get("maps_to_section", ""),
                "plugin_id": field_payload.get("plugin_id", ""),
                "sort_order": field_payload.get("sort_order", j),
                "required": bool(field_payload.get("required", False)),
            }
            field_serializer = QuestionnaireFieldWriteSerializer(data=field_data)
            field_serializer.is_valid(raise_exception=True)
            clean_field = field_serializer.validated_data
            field_key = clean_field["field_key"]
            if field_key in seen_fields:
                raise serializers.ValidationError(
                    {"fields": f"Duplicate field_key '{field_key}' on step '{step_key}'."}
                )
            seen_fields.add(field_key)
            QuestionnaireField.objects.create(step=step, **clean_field)

    return imported


def get_published_version(slug: str) -> QuestionnaireVersion | None:
    return (
        QuestionnaireVersion.objects.filter(
            questionnaire__slug=slug,
            status=QuestionnaireVersion.Status.PUBLISHED,
        )
        .prefetch_related("steps__fields")
        .order_by("-published_at")
        .first()
    )


def get_version_by_id(version_id: uuid.UUID) -> QuestionnaireVersion | None:
    return (
        QuestionnaireVersion.objects.filter(id=version_id)
        .prefetch_related("steps__fields", "questionnaire")
        .first()
    )


def get_published_qualify_cta_ownership() -> dict[str, dict]:
    """Map each CTA id to the published qualify version that currently owns it."""
    ownership: dict[str, dict] = {}
    versions = (
        QuestionnaireVersion.objects.filter(
            questionnaire__questionnaire_type=Questionnaire.QuestionnaireType.QUALIFY,
            status=QuestionnaireVersion.Status.PUBLISHED,
        )
        .select_related("questionnaire")
        .order_by("-published_at")
    )
    for version in versions:
        ctas = [str(c).strip() for c in (version.cta_ids or []) if str(c).strip()]
        for cta_id in ctas:
            ownership[cta_id] = {
                "cta_id": cta_id,
                "version_id": str(version.id),
                "questionnaire_slug": version.questionnaire.slug,
                "version_label": version.version_label,
                "is_default_entry": version.is_default_entry,
                "cta_ids": ctas,
                "will_archive_on_claim": len(ctas) == 1
                and not version.is_default_entry,
            }
    return ownership


@transaction.atomic
def release_ctas_from_published(
    cta_ids: list[str],
    *,
    exclude_version_id: uuid.UUID | None = None,
) -> list[str]:
    """Remove CTA ids from other published qualify versions.

    Archives any published version that loses its last CTA and is not the
    default entry. Returns ids of archived versions.
    """
    claimed = {str(c).strip() for c in cta_ids if str(c).strip()}
    if not claimed:
        return []

    others = QuestionnaireVersion.objects.filter(
        questionnaire__questionnaire_type=Questionnaire.QuestionnaireType.QUALIFY,
        status=QuestionnaireVersion.Status.PUBLISHED,
    )
    if exclude_version_id is not None:
        others = others.exclude(id=exclude_version_id)

    archived: list[str] = []
    for other in others:
        original = list(other.cta_ids or [])
        remaining = [c for c in original if str(c).strip() not in claimed]
        if remaining == original:
            continue
        other.cta_ids = remaining
        if not remaining and not other.is_default_entry:
            other.status = QuestionnaireVersion.Status.ARCHIVED
            other.save(update_fields=["cta_ids", "status", "updated_at"])
            archived.append(str(other.id))
        else:
            other.save(update_fields=["cta_ids", "updated_at"])
    return archived


@transaction.atomic
def publish_version(version: QuestionnaireVersion) -> QuestionnaireVersion:
    if version.status != QuestionnaireVersion.Status.DRAFT:
        raise ValueError("Only draft versions can be published.")
    if not version.steps.exists():
        raise ValueError("Cannot publish a version with no steps.")

    q_type = version.questionnaire.questionnaire_type
    if q_type == Questionnaire.QuestionnaireType.QUALIFY:
        # A qualify flow must route to at least one intake; otherwise patients
        # have nowhere to go after qualifying.
        if not (version.intake_routing_rules or []):
            raise ValueError(
                "Add at least one intake routing rule before publishing a "
                "qualify questionnaire."
            )
        # Multiple qualify versions stay published at once — each CTA id maps to
        # at most one live qualify entry. Publishing this version claims the CTA
        # ids it lists, taking them over from any other published qualify
        # version. A previously published version is only retired when it loses
        # its last CTA this way (i.e. it has been fully superseded); versions
        # that still own other CTAs, or the default entry, remain live.
        claimed = [str(c).strip() for c in (version.cta_ids or []) if str(c).strip()]
        release_ctas_from_published(claimed, exclude_version_id=version.id)
        # Within a single qualify questionnaire, the newest published version is
        # the live entry. Any other published version of THIS questionnaire that
        # no longer owns a CTA — including a prior default-entry seed — is
        # superseded by this publish and archived. Versions that still own a
        # distinct CTA stay live so one questionnaire can serve multiple CTAs.
        superseded = QuestionnaireVersion.objects.filter(
            questionnaire=version.questionnaire,
            status=QuestionnaireVersion.Status.PUBLISHED,
        ).exclude(id=version.id)
        for other in superseded:
            if not [c for c in (other.cta_ids or []) if str(c).strip()]:
                other.status = QuestionnaireVersion.Status.ARCHIVED
                other.save(update_fields=["status", "updated_at"])
        if version.is_default_entry:
            QuestionnaireVersion.objects.filter(
                questionnaire__questionnaire_type=Questionnaire.QuestionnaireType.QUALIFY,
                status=QuestionnaireVersion.Status.PUBLISHED,
                is_default_entry=True,
            ).exclude(id=version.id).update(is_default_entry=False)
    else:
        QuestionnaireVersion.objects.filter(
            questionnaire=version.questionnaire,
            status=QuestionnaireVersion.Status.PUBLISHED,
        ).update(status=QuestionnaireVersion.Status.ARCHIVED)

    version.status = QuestionnaireVersion.Status.PUBLISHED
    version.published_at = timezone.now()
    version.save(update_fields=["status", "published_at", "updated_at"])
    return version


VERSION_LABEL_MAX = 32


def _unique_version_label(questionnaire, base: str) -> str:
    """A unique ``version_label`` for the questionnaire, capped at 32 chars.

    Strips any existing ``-copy-N`` suffix off the base so repeated duplication
    doesn't compound (``1.0.0-copy-2-copy-3``) and overflow the column.
    """
    root = re.sub(r"(?:-copy-\d+)+$", "", base).strip() or "version"
    existing = set(
        questionnaire.versions.values_list("version_label", flat=True)
    )
    for n in range(1, 1000):
        suffix = f"-copy-{n}"
        trimmed_root = root[: VERSION_LABEL_MAX - len(suffix)]
        candidate = f"{trimmed_root}{suffix}"
        if candidate not in existing:
            return candidate
    # Extremely unlikely fallback: use a short unique token.
    token = uuid.uuid4().hex[:8]
    return f"copy-{token}"[:VERSION_LABEL_MAX]


QUESTIONNAIRE_SLUG_MAX = 64


def _unique_questionnaire_slug(base: str) -> str:
    """Unique questionnaire slug, capped at 64 chars."""
    root = re.sub(r"(?:-copy-\d+)+$", "", base).strip() or "questionnaire"
    existing = set(Questionnaire.objects.values_list("slug", flat=True))
    for n in range(1, 1000):
        suffix = f"-copy-{n}"
        trimmed_root = root[: QUESTIONNAIRE_SLUG_MAX - len(suffix)]
        candidate = f"{trimmed_root}{suffix}"
        if candidate not in existing:
            return candidate
    token = uuid.uuid4().hex[:8]
    return f"copy-{token}"[:QUESTIONNAIRE_SLUG_MAX]


def questionnaire_slug_is_referenced(slug: str) -> bool:
    """True when qualify routing rules or patient eligibility reference this slug."""
    from apps.eligibility.models import EligibilityResponse

    clean = str(slug).strip()
    if not clean:
        return False
    if EligibilityResponse.objects.filter(
        selected_intake_questionnaire_slug=clean
    ).exists():
        return True
    for version in QuestionnaireVersion.objects.iterator():
        for rule in version.intake_routing_rules or []:
            if str(rule.get("intake_questionnaire_slug", "")).strip() == clean:
                return True
    return False


def questionnaire_delete_blocked_reason(questionnaire: Questionnaire) -> str | None:
    """Human-readable reason when questionnaire deletion must be blocked."""
    if questionnaire.versions.filter(
        status=QuestionnaireVersion.Status.PUBLISHED
    ).exists():
        return "Archive all published versions before deleting this questionnaire."
    for version in questionnaire.versions.all():
        if questionnaire_version_is_in_use(version.id):
            return (
                "A version of this questionnaire was used by patients and cannot "
                "be deleted. Analytics and submission records reference it."
            )
    if questionnaire.experiments.exists():
        return "Remove experiments linked to this questionnaire before deleting it."
    if questionnaire_slug_is_referenced(questionnaire.slug):
        return (
            "This questionnaire slug is referenced by qualify intake routing "
            "rules or patient eligibility records."
        )
    return None


def questionnaire_slug_rename_blocked_reason(
    questionnaire: Questionnaire,
    *,
    new_slug: str | None = None,
) -> str | None:
    """Block slug rename when patient or routing data still points at the old slug."""
    if questionnaire_slug_is_referenced(questionnaire.slug):
        return (
            "This questionnaire slug is referenced by qualify intake routing "
            "rules or patient eligibility records. Create a duplicate instead."
        )
    if new_slug and Questionnaire.objects.filter(slug=new_slug).exclude(
        pk=questionnaire.pk
    ).exists():
        return f"A questionnaire with slug “{new_slug}” already exists."
    return None


@transaction.atomic
def duplicate_version(
    version: QuestionnaireVersion,
    *,
    created_by,
    target_questionnaire: Questionnaire | None = None,
) -> QuestionnaireVersion:
    questionnaire = target_questionnaire or version.questionnaire
    clone = QuestionnaireVersion.objects.create(
        questionnaire=questionnaire,
        version_label=_unique_version_label(
            questionnaire, version.version_label
        ),
        status=QuestionnaireVersion.Status.DRAFT,
        intake_routing_rules=deepcopy(version.intake_routing_rules or []),
        cta_ids=deepcopy(version.cta_ids or []),
        is_default_entry=version.is_default_entry,
        created_by=created_by,
    )
    for step in version.steps.prefetch_related("fields").all():
        new_step = QuestionnaireStep.objects.create(
            version=clone,
            step_key=step.step_key,
            sort_order=step.sort_order,
            progress_level=step.progress_level,
            title=step.title,
            subtitle=step.subtitle,
            visibility_rule=deepcopy(step.visibility_rule),
            routing_rules=deepcopy(step.routing_rules or []),
            position_x=step.position_x,
            position_y=step.position_y,
        )
        for field in step.fields.all():
            QuestionnaireField.objects.create(
                step=new_step,
                field_key=field.field_key,
                field_type=field.field_type,
                label=field.label,
                help_text=field.help_text,
                options=deepcopy(field.options),
                validation_rules=deepcopy(field.validation_rules),
                maps_to_section=field.maps_to_section,
                plugin_id=field.plugin_id,
                sort_order=field.sort_order,
                required=field.required,
            )
    return clone


@transaction.atomic
def duplicate_questionnaire(
    questionnaire: Questionnaire,
    *,
    created_by,
    slug: str | None = None,
    title: str | None = None,
) -> Questionnaire:
    new_slug = (str(slug).strip().lower() if slug else "") or _unique_questionnaire_slug(
        questionnaire.slug
    )
    if len(new_slug) > QUESTIONNAIRE_SLUG_MAX:
        raise ValueError("Slug is too long.")
    if Questionnaire.objects.filter(slug=new_slug).exists():
        raise ValueError(f"A questionnaire with slug “{new_slug}” already exists.")
    clone = Questionnaire.objects.create(
        slug=new_slug,
        questionnaire_type=questionnaire.questionnaire_type,
        title=(str(title).strip()[:128] if title else f"{questionnaire.title} (copy)"),
        medication=questionnaire.medication,
    )
    for version in questionnaire.versions.prefetch_related("steps__fields").order_by(
        "created_at"
    ):
        duplicate_version(
            version,
            created_by=created_by,
            target_questionnaire=clone,
        )
    return clone


def assign_experiment_variant(questionnaire_slug: str) -> tuple[uuid.UUID | None, str, uuid.UUID | None]:
    experiment = (
        Experiment.objects.filter(
            questionnaire__slug=questionnaire_slug,
            status=Experiment.Status.RUNNING,
        )
        .prefetch_related("variants")
        .first()
    )
    if not experiment:
        from apps.questionnaires.services import get_default_qualify_version

        published = get_default_qualify_version()
        return None, "", published.id if published else None

    variants = list(experiment.variants.all())
    if not variants:
        if questionnaire_slug == "qualify":
            published = get_default_qualify_version()
        else:
            published = get_published_version(questionnaire_slug)
        return None, "", published.id if published else None

    weights = [max(0, v.weight_percent) for v in variants]
    total = sum(weights) or len(variants)
    pick = random.randint(1, total)
    cumulative = 0
    chosen = variants[0]
    for variant, weight in zip(variants, weights):
        cumulative += weight or 1
        if pick <= cumulative:
            chosen = variant
            break
    return experiment.id, chosen.variant_key, chosen.questionnaire_version_id


def get_default_qualify_version() -> QuestionnaireVersion | None:
    """The published qualify version used when a CTA has no explicit mapping.

    Prefers the version flagged is_default_entry; falls back to the most
    recently published qualify version so the funnel always resolves.
    """
    base = QuestionnaireVersion.objects.filter(
        questionnaire__questionnaire_type=Questionnaire.QuestionnaireType.QUALIFY,
        status=QuestionnaireVersion.Status.PUBLISHED,
    ).prefetch_related("steps__fields", "questionnaire")
    default = base.filter(is_default_entry=True).order_by("-published_at").first()
    if default:
        return default
    return base.order_by("-published_at").first()


def get_qualify_version_for_cta(cta_id: str) -> QuestionnaireVersion | None:
    """Resolve the published qualify version that owns this CTA id.

    Falls back to the default qualify version when the CTA is unmapped.
    """
    cta_id = str(cta_id or "").strip()
    if cta_id:
        candidates = (
            QuestionnaireVersion.objects.filter(
                questionnaire__questionnaire_type=Questionnaire.QuestionnaireType.QUALIFY,
                status=QuestionnaireVersion.Status.PUBLISHED,
            )
            .prefetch_related("steps__fields", "questionnaire")
            .order_by("-published_at")
        )
        for version in candidates:
            if cta_id in [str(c).strip() for c in (version.cta_ids or [])]:
                return version
    return get_default_qualify_version()


# Backwards-compatible alias: "global" qualify is now the default-entry version.
def get_global_published_qualify_version() -> QuestionnaireVersion | None:
    return get_default_qualify_version()


def resolve_intake_questionnaire_slug(
    qualify_version: QuestionnaireVersion,
    responses: dict,
) -> str | None:
    """Pick intake questionnaire slug from qualify version rules + answers."""
    rules = qualify_version.intake_routing_rules or []
    for rule in rules:
        when_field = str(rule.get("when_field", "")).strip()
        when_value = rule.get("when_value")
        slug = str(rule.get("intake_questionnaire_slug", "")).strip()
        if not slug or when_field in ("", "__default__"):
            continue
        if responses.get(when_field) == when_value:
            return slug
    for rule in rules:
        when_field = str(rule.get("when_field", "")).strip()
        slug = str(rule.get("intake_questionnaire_slug", "")).strip()
        if slug and when_field in ("__default__", ""):
            return slug
    medication = qualify_version.questionnaire.medication
    if medication:
        intake_q = (
            Questionnaire.objects.filter(
                questionnaire_type=Questionnaire.QuestionnaireType.INTAKE,
                medication=medication,
            )
            .order_by("slug")
            .first()
        )
        if intake_q:
            return intake_q.slug
    fallback = Questionnaire.objects.filter(
        questionnaire_type=Questionnaire.QuestionnaireType.INTAKE,
        slug="intake",
    ).first()
    return fallback.slug if fallback else None


def _format_field_display_value(field: QuestionnaireField, raw) -> str:
    if raw is None or raw == "":
        return ""
    options = field.options or []
    option_map = {
        str(o.get("value", "")): str(o.get("label", o.get("value", "")))
        for o in options
        if isinstance(o, dict)
    }
    if field.field_type in ("single_choice", "yes_no"):
        return option_map.get(str(raw), str(raw))
    if field.field_type == "multi_choice":
        parts = raw if isinstance(raw, list) else str(raw).split(",")
        return ", ".join(option_map.get(str(p), str(p)) for p in parts if str(p))
    if field.field_type == "yes_no" and isinstance(raw, bool):
        return option_map.get("yes" if raw else "no", "Yes" if raw else "No")
    return str(raw)


def responses_accept_legal_consent(version_id, responses: dict) -> bool:
    """True if the dynamic questionnaire has a legal_consent field the patient accepted.

    In the dynamic flow, Terms/Privacy/Telehealth are accepted via a
    ``legal_consent`` field during the questionnaire rather than at eligibility.
    """
    if not version_id or not responses:
        return False
    version = get_version_by_id(version_id)
    if not version:
        return False
    for step in version.steps.prefetch_related("fields").all():
        for field in step.fields.all():
            if field.field_type == QuestionnaireField.FieldType.LEGAL_CONSENT:
                if responses.get(field.field_key) is True:
                    return True
    return False


def version_requires_beluga_submit_validation(version_id) -> bool:
    """True when the pinned intake version includes a review step (Beluga gate)."""
    if not version_id:
        return False
    version = get_version_by_id(version_id)
    if not version:
        return False
    for step in version.steps.prefetch_related("fields").all():
        for field in step.fields.all():
            if field.field_type == QuestionnaireField.FieldType.REVIEW:
                return True
            if (
                field.field_type == QuestionnaireField.FieldType.PLUGIN
                and field.plugin_id == "intake_review"
            ):
                return True
    return False


def build_dynamic_questionnaire_display(
    version_id,
    responses: dict,
) -> dict | None:
    """Build read-only display payload for portal/provider snapshots."""
    version = get_version_by_id(version_id)
    if not version:
        return None
    steps_out = []
    for step in version.steps.prefetch_related("fields").all():
        fields_out = []
        for field in step.fields.all():
            raw = responses.get(field.field_key)
            if raw is None or raw == "":
                continue
            fields_out.append(
                {
                    "field_key": field.field_key,
                    "label": field.label,
                    "field_type": field.field_type,
                    "display_value": _format_field_display_value(field, raw),
                    "raw_value": raw,
                }
            )
        if fields_out:
            steps_out.append(
                {
                    "step_key": step.step_key,
                    "title": step.title,
                    "fields": fields_out,
                }
            )
    return {
        "questionnaire_version_id": str(version.id),
        "questionnaire_slug": version.questionnaire.slug,
        "version_label": version.version_label,
        "steps": steps_out,
    }


def questionnaire_version_is_in_use(version_id) -> bool:
    """True when any funnel, patient, submission, or experiment references this version."""
    import uuid as _uuid

    from apps.analytics.models import FunnelEvent
    from apps.eligibility.models import EligibilityResponse, FunnelSession
    from apps.intakes.models import IntakeSubmission, MedicalIntake
    from apps.questionnaires.models import ExperimentVariant

    try:
        parsed = _uuid.UUID(str(version_id))
    except ValueError:
        return False

    if FunnelEvent.objects.filter(questionnaire_version_id=parsed).exists():
        return True
    if FunnelSession.objects.filter(qualify_questionnaire_version_id=parsed).exists():
        return True
    if EligibilityResponse.objects.filter(questionnaire_version_id=parsed).exists():
        return True
    if MedicalIntake.objects.filter(questionnaire_version_id=parsed).exists():
        return True
    if IntakeSubmission.objects.filter(questionnaire_version_id=parsed).exists():
        return True
    if ExperimentVariant.objects.filter(questionnaire_version_id=parsed).exists():
        return True
    return False

