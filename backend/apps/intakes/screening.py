"""Account + eligibility screening fields owned by the medical intake."""

from __future__ import annotations

from apps.eligibility.models import EligibilityResponse
from apps.intakes.models import MedicalIntake
from apps.intakes.services import compute_bmi


def _iso(value) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def build_account_screening(user, eligibility: EligibilityResponse | None = None) -> dict:
    """Build the intake-owned screening payload from user + eligibility tables."""
    if eligibility is None:
        eligibility = EligibilityResponse.objects.filter(user=user).first()

    bmi = eligibility.bmi if eligibility else None
    if bmi is None and eligibility and eligibility.height_ft and eligibility.weight_lbs:
        bmi = compute_bmi(
            str(eligibility.height_ft),
            str(eligibility.height_in or 0),
            str(eligibility.weight_lbs),
        )

    screening = {
        "first_name": user.first_name or "",
        "last_name": user.last_name or "",
        "email": user.email or "",
        "phone": user.phone or "",
        "dob": _iso(user.dob),
        "state": user.state or "",
        "height_ft": eligibility.height_ft if eligibility else None,
        "height_in": eligibility.height_in if eligibility else None,
        "weight_lbs": (
            str(eligibility.weight_lbs) if eligibility and eligibility.weight_lbs is not None else None
        ),
        "goal_weight_lbs": (
            str(eligibility.goal_weight_lbs)
            if eligibility and eligibility.goal_weight_lbs is not None
            else None
        ),
        "bmi": float(bmi) if bmi is not None else None,
    }
    return screening


def account_summary_from_screening(screening: dict) -> dict:
    """Denormalized display shape used in submission snapshots and the intake UI."""
    first = screening.get("first_name") or ""
    last = screening.get("last_name") or ""
    return {
        "first_name": first,
        "last_name": last,
        "full_name": f"{first} {last}".strip(),
        "email": screening.get("email") or "",
        "phone": screening.get("phone") or "",
        "dob": screening.get("dob") or "",
        "state": screening.get("state") or "",
        "height_ft": screening.get("height_ft"),
        "height_in": screening.get("height_in"),
        "weight_lbs": screening.get("weight_lbs"),
        "goal_weight_lbs": screening.get("goal_weight_lbs"),
        "bmi": screening.get("bmi"),
    }


def ensure_account_screening(intake: MedicalIntake) -> dict:
    """Populate intake.account_screening from sources when empty."""
    if intake.account_screening:
        return intake.account_screening
    screening = build_account_screening(intake.user)
    intake.account_screening = screening
    intake.save(update_fields=["account_screening", "updated_at"])
    return screening


def refresh_account_screening(intake: MedicalIntake) -> dict:
    """Rebuild intake.account_screening from current user + eligibility."""
    screening = build_account_screening(intake.user)
    intake.account_screening = screening
    intake.save(update_fields=["account_screening", "updated_at"])
    return screening
