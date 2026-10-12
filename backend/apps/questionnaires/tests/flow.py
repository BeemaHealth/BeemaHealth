"""Shared helpers: the shipped weight loss definition and sample answers to walk it."""
from __future__ import annotations

import copy
import json
import uuid
from datetime import date
from pathlib import Path
from typing import Any

from django.conf import settings

from apps.questionnaires import engine

TODAY = date(2026, 10, 6)
FILE_ID = str(uuid.uuid4())
DEFINITION_PATH = Path(settings.DEFINITIONS_DIR) / "questionnaires" / "weight_loss.v2.json"
META_KEYS = ("slug", "title", "product_slug", "version_label", "layout")


def load_definition() -> dict[str, Any]:
    """The shipped weight_loss.v2.json without its metadata keys."""
    data = json.loads(DEFINITION_PATH.read_text(encoding="utf-8"))
    return {k: v for k, v in data.items() if k not in META_KEYS}


def everywhere(state: str, drug: str) -> bool:
    return True


BASICS = {
    "dob": "1985-04-12", "sex_at_birth": "male", "state": "TX", "zip": "77002", "phone": "(713) 555-0123",
    "first_name": "Pat", "last_name": "Tester", "address_line1": "1 Main St", "address_line2": "Apt 4", "city": "Houston",
}
BMI_OK_NEW = {"height_feet": 5, "height_inches": 6, "weight_lbs": 220}
BMI_OK_CURRENT = {"height_feet": 5, "height_inches": 6, "weight_lbs": 150}

BASE: dict[str, Any] = {
    "motivation": "health", "weight_goal": "lose_20_40", "goal_closer": None, "prior_programs": "none",
    "family_history": "no", "genetics": None, "sleep": "7_to_8h", "sleep_note": None, "login_nudge": None,
    "auth": None, "basics": BASICS, "glp1_history": "never", "bmi_new": BMI_OK_NEW, "bmi_consent": True,
    "drug_choice": "semaglutide", "additive_semaglutide": "b12", "additive_tirzepatide": "glycine",
    "checkout": {"plan_slug": "semaglutide-monthly"}, "medical_intro": None, "conditions": ["none"],
    "gallbladder_consent": True, "conditions_detail": "", "gastric_bypass": "no", "allergy_confirm": ["none"],
    "medications": ["none"], "pregnancy": "no", "pregnancy_consent": True, "add_medication": {"none": True},
    "allergies": {"none": True}, "med_conditions": {"none": True}, "id_verification": {"file_ids": [FILE_ID]},
    "glp1_proof": {"file_ids": [FILE_ID]}, "extra_notes": "", "glp1_consent": True, "truthfulness_consent": True,
    "weight_loss_consent": True, "terms_consent": True, "telehealth_consent": True,
    # current or past user branch
    "current_med": "semaglutide", "current_dose": "sema_1_0mg", "dose_preference": "same",
    "dose_down_detail": "I want to start lower.", "last_injection": "within_week", "glp1_photo": "yes",
    "side_effects": "no", "side_effects_detail": "Mild nausea.", "bmi_current": BMI_OK_CURRENT,
}


def current_user(**overrides: Any) -> dict[str, Any]:
    """Answers for a current GLP-1 user."""
    return {"glp1_history": "current", **overrides}


def walk(
    definition: dict[str, Any],
    overrides: dict[str, Any] | None = None,
    *,
    availability: engine.Availability = everywhere,
    stop_at: str | None = None,
) -> tuple[dict[str, Any], dict[str, Any], list[str]]:
    """Walk the flow with BASE answers plus overrides. Returns (final node, stored answers, node ids seen)."""
    answers_in = {**copy.deepcopy(BASE), **(overrides or {})}
    store: dict[str, Any] = {}
    node = engine.entry_node(definition).node
    seen: list[str] = []
    for _ in range(200):
        seen.append(node["id"])
        if node["type"] in engine.TERMINAL_TYPES or node["id"] == stop_at:
            return node, store, seen
        store[node["id"]] = engine.validate_answer(node, answers_in[node["id"]], answers=store, today=TODAY)
        result = engine.step(definition, store, node["id"], availability=availability)
        store.update(result.auto)
        node = result.node
    raise AssertionError("walk did not terminate")
