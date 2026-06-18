"""
Strip intake JSON fields that belong on other tables.

Canonical ownership:
- users: email, first_name, last_name, phone, dob, state
- patient_profiles: sex_assigned_at_birth, address, city, zip_code, emergency contacts
- eligibility_responses: height/weight/bmi, safety_screen, treatment_interest, pre_signup_consents
"""

from apps.eligibility.models import EligibilityResponse

# Intake identity keys that duplicate users / patient_profiles.
IDENTITY_DUPLICATE_KEYS = frozenset(
    {
        "legal_first",
        "legal_last",
        "first_name",
        "last_name",
        "email",
        "phone",
        "dob",
        "state",
    }
)

# Height/weight collected during eligibility screening.
BODY_METRICS_DUPLICATE_KEYS = frozenset(
    {
        "current_weight",
        "height_ft",
        "height_in",
        "goal_weight",
        "height",
        "weight",
    }
)

# Reproductive status captured in eligibility.safety_screen.
PREGNANCY_DUPLICATE_KEYS = frozenset({"pregnant", "trying", "breastfeeding"})

# Medical conditions covered by eligibility.safety_screen.
SAFETY_SCREEN_CONDITION_KEYS = frozenset(
    {
        "thyroid_cancer",
        "men2",
        "pancreatitis",
        "gallbladder",
        "kidney",
        "kidney_severe",
        "liver",
        "gastroparesis",
        "diabetic_retinopathy",
    }
)

# Allergy answers covered by eligibility.safety_screen.glp1_reaction.
ALLERGY_DUPLICATE_ANSWER_KEYS = frozenset({"glp1"})


def _strip_dict(data: dict | None, keys: frozenset[str]) -> dict:
    if not data:
        return {}
    return {k: v for k, v in data.items() if k not in keys}


def _strip_note_keys(data: dict, base_keys: frozenset[str]) -> dict:
    note_keys = {f"{k}_note" for k in base_keys}
    return {k: v for k, v in data.items() if k not in base_keys and k not in note_keys}


def dedupe_intake_sections(
    *,
    identity: dict | None = None,
    body_metrics: dict | None = None,
    pregnancy: dict | None = None,
    medical_conditions: dict | None = None,
    allergies: dict | None = None,
    medication_preferences: dict | None = None,
    eligibility: EligibilityResponse | None = None,
) -> dict:
    """Return cleaned section dicts with duplicate keys removed."""
    cleaned_identity = _strip_dict(identity, IDENTITY_DUPLICATE_KEYS)

    cleaned_body = dict(body_metrics or {})
    for key in BODY_METRICS_DUPLICATE_KEYS:
        cleaned_body.pop(key, None)

    cleaned_pregnancy = _strip_dict(pregnancy, PREGNANCY_DUPLICATE_KEYS)

    cleaned_conditions = _strip_note_keys(dict(medical_conditions or {}), SAFETY_SCREEN_CONDITION_KEYS)

    cleaned_allergies = dict(allergies or {})
    answers = dict(cleaned_allergies.get("answers") or {})
    for key in ALLERGY_DUPLICATE_ANSWER_KEYS:
        answers.pop(key, None)
    cleaned_allergies["answers"] = answers

    cleaned_prefs = dict(medication_preferences or {})
    if eligibility and eligibility.treatment_interest:
        cleaned_prefs.pop("treatment", None)

    return {
        "identity": cleaned_identity,
        "body_metrics": cleaned_body,
        "pregnancy": cleaned_pregnancy,
        "medical_conditions": cleaned_conditions,
        "allergies": cleaned_allergies,
        "medication_preferences": cleaned_prefs,
    }


def dedupe_intake_payload(data: dict, user, eligibility: EligibilityResponse | None = None) -> dict:
    """Apply deduplication to a medical intake create/update payload."""
    if eligibility is None and user:
        eligibility = EligibilityResponse.objects.filter(user=user).first()

    sections = dedupe_intake_sections(
        identity=data.get("identity"),
        body_metrics=data.get("body_metrics"),
        pregnancy=data.get("pregnancy"),
        medical_conditions=data.get("medical_conditions"),
        allergies=data.get("allergies"),
        medication_preferences=data.get("medication_preferences"),
        eligibility=eligibility,
    )

    result = dict(data)
    for section, value in sections.items():
        if section in result:
            result[section] = value
    return result
