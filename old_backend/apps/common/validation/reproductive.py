"""When pregnancy / reproductive intake questions apply."""

from __future__ import annotations

REPRODUCTIVE_SAFETY_KEYS = frozenset({"pregnant", "breastfeeding", "trying_to_conceive"})


def _is_conservative(value: str | None) -> bool:
    v = (value or "").strip()
    return not v or v in ("unknown", "intersex")


def _is_female(value: str | None) -> bool:
    return (value or "").strip() == "female"


def needs_reproductive_questions(
    sex_at_birth: str | None,
    gender_identity: str | None,
) -> bool:
    birth = (sex_at_birth or "").strip()
    identity = (gender_identity or "").strip() or birth

    if _is_conservative(birth) or _is_conservative(identity):
        return True
    if _is_female(birth) or _is_female(identity):
        return True
    if birth == "male" and identity == "male":
        return False
    return True
