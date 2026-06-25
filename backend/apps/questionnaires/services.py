from __future__ import annotations

import random
import uuid
from copy import deepcopy

from django.db import transaction
from django.utils import timezone

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
        "version_label": version.version_label,
        "status": version.status,
        "published_at": version.published_at.isoformat() if version.published_at else None,
        "steps": steps,
    }
    if not include_ids:
        payload.pop("id", None)
        for step in payload["steps"]:
            step.pop("id", None)
            for field in step["fields"]:
                field.pop("id", None)
    return payload


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


@transaction.atomic
def publish_version(version: QuestionnaireVersion) -> QuestionnaireVersion:
    if version.status != QuestionnaireVersion.Status.DRAFT:
        raise ValueError("Only draft versions can be published.")
    if not version.steps.exists():
        raise ValueError("Cannot publish a version with no steps.")

    QuestionnaireVersion.objects.filter(
        questionnaire=version.questionnaire,
        status=QuestionnaireVersion.Status.PUBLISHED,
    ).update(status=QuestionnaireVersion.Status.ARCHIVED)

    version.status = QuestionnaireVersion.Status.PUBLISHED
    version.published_at = timezone.now()
    version.save(update_fields=["status", "published_at", "updated_at"])
    return version


@transaction.atomic
def duplicate_version(version: QuestionnaireVersion, *, created_by) -> QuestionnaireVersion:
    existing_count = version.questionnaire.versions.count()
    clone = QuestionnaireVersion.objects.create(
        questionnaire=version.questionnaire,
        version_label=f"{version.version_label}-copy-{existing_count + 1}",
        status=QuestionnaireVersion.Status.DRAFT,
        created_by=created_by,
    )
    for step in version.steps.prefetch_related("fields").all():
        new_step = QuestionnaireStep.objects.create(
            version=clone,
            step_key=step.step_key,
            sort_order=step.sort_order,
            title=step.title,
            subtitle=step.subtitle,
            visibility_rule=deepcopy(step.visibility_rule),
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
        published = get_published_version(questionnaire_slug)
        return None, "", published.id if published else None

    variants = list(experiment.variants.all())
    if not variants:
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
