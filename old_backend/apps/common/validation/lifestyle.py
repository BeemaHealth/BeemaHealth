"""Validate structured lifestyle intake fields."""

from __future__ import annotations

from typing import Any

from apps.common.validation.form import is_filled, is_valid_optional_free_text

EXERCISE_DAYS = {str(days) for days in range(8)}
DIET = {
    "balanced",
    "high_protein",
    "low_carb",
    "plant_based",
    "mediterranean",
    "calorie_controlled",
    "intermittent_fasting",
    "high_carb",
    "convenience",
    "mixed",
}
SMOKE = {
    "no",
    "occasionally",
    "1_3_week",
    "4_6_week",
    "daily",
    "constant",
}
ALCOHOL = {
    "no",
    "occasionally",
    "1_3_week",
    "4_7_week",
    "8_14_week",
    "more_14_week",
}
DRUG_USE = {"no", "yes"}
SLEEP = {"less_5", "5_6", "7_8", "9_plus"}
BINGE = {"never", "rarely", "1_3_month", "weekly", "daily"}
NIGHT_EATING = {"no", "1_2_week", "3_4_week", "5_plus_week", "most_nights"}
STRUGGLE = {
    "none",
    "hunger",
    "cravings",
    "portions",
    "emotional",
    "hunger_cravings",
    "hunger_portions",
    "hunger_emotional",
    "cravings_portions",
    "cravings_emotional",
    "portions_emotional",
    "hunger_cravings_portions",
    "hunger_cravings_emotional",
    "hunger_portions_emotional",
    "cravings_portions_emotional",
    "all",
}

LIFESTYLE_ENUM_FIELDS: dict[str, set[str]] = {
    "exercise_days": EXERCISE_DAYS,
    "diet": DIET,
    "smoke": SMOKE,
    "alcohol": ALCOHOL,
    "drugs": DRUG_USE,
    "sleep": SLEEP,
    "binge": BINGE,
    "night_eating": NIGHT_EATING,
    "struggle": STRUGGLE,
}


def validate_lifestyle_section(lifestyle: dict[str, Any]) -> dict[str, str]:
    if not isinstance(lifestyle, dict):
        return {"lifestyle": "Lifestyle must be an object."}

    for field, allowed in LIFESTYLE_ENUM_FIELDS.items():
        if field not in lifestyle:
            continue
        value = str(lifestyle.get(field, "")).strip()
        if not value:
            continue
        if value not in allowed:
            return {"lifestyle": f"Select a valid option for {field.replace('_', ' ')}."}

    exercise_type = lifestyle.get("exercise_type")
    if exercise_type is not None and is_filled(exercise_type):
        if not is_valid_optional_free_text(str(exercise_type), max_length=120):
            return {"lifestyle": "Enter a valid exercise type."}

    drugs = str(lifestyle.get("drugs", "")).strip()
    drugs_detail = lifestyle.get("drugs_detail")
    if drugs == "yes":
        if drugs_detail is not None and is_filled(drugs_detail):
            if not is_valid_optional_free_text(str(drugs_detail), max_length=200):
                return {
                    "lifestyle": "Enter a valid description of recreational drug use.",
                }
    elif drugs_detail is not None and is_filled(drugs_detail):
        return {"lifestyle": "Recreational drug details are only allowed when drug use is yes."}

    return {}
