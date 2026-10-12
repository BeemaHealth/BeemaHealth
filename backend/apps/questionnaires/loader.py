"""Load layouts and questionnaire definitions from ``backend/definitions`` (idempotent)."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from django.conf import settings
from django.db import transaction

from .definition import DefinitionError, definition_hash, validate_definition
from .models import Layout, Questionnaire, QuestionnaireVersion

logger = logging.getLogger(__name__)

META_KEYS = ("slug", "title", "product_slug", "version_label", "layout")


class DefinitionChangedError(Exception):
    """A published version's file changed. Bump ``version_label`` instead of editing it."""


def _read(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_layouts(directory: Path) -> list[Layout]:
    """Upsert every ``layouts/*.json`` (layouts are mutable shells)."""
    layouts = []
    for path in sorted((directory / "layouts").glob("*.json")):
        data = _read(path)
        layout, _ = Layout.objects.update_or_create(
            slug=data["slug"], defaults={"name": data.get("name", data["slug"]), "config": data.get("config", {})}
        )
        layouts.append(layout)
    return layouts


def _load_one(path: Path) -> QuestionnaireVersion:
    data = _read(path)
    meta = {key: data[key] for key in META_KEYS if key in data}
    definition = {k: v for k, v in data.items() if k not in META_KEYS}
    try:
        validate_definition(definition)
    except DefinitionError as exc:
        raise DefinitionError([f"{path.name}: {error}" for error in exc.errors]) from exc
    layout = Layout.objects.filter(slug=meta["layout"]).first() if meta.get("layout") else None
    if meta.get("layout") and layout is None:
        raise DefinitionError([f"{path.name}: layout {meta['layout']} not found."])
    questionnaire, _ = Questionnaire.objects.update_or_create(
        slug=meta["slug"], defaults={"title": meta["title"], "product_slug": meta.get("product_slug", "")}
    )
    version = QuestionnaireVersion.objects.filter(questionnaire=questionnaire, version_label=meta["version_label"]).first()
    if version is None:
        version = QuestionnaireVersion(
            questionnaire=questionnaire, version_label=meta["version_label"], definition=definition, layout=layout
        )
    elif version.status != QuestionnaireVersion.Status.DRAFT:
        if version.definition_hash != definition_hash(definition):
            raise DefinitionChangedError(f"{path.name}: published version changed; bump version_label.")
        return version
    else:
        version.definition, version.layout = definition, layout
    version.save()
    version.publish()
    logger.debug("published questionnaire version %s", version.pk)
    return version


@transaction.atomic
def load_questionnaire_definitions(directory: Path | None = None) -> list[QuestionnaireVersion]:
    """Load layouts, then publish each questionnaire file. Safe to run repeatedly."""
    base = Path(directory) if directory else Path(settings.DEFINITIONS_DIR)
    load_layouts(base)
    return [_load_one(path) for path in sorted((base / "questionnaires").glob("*.json"))]
