def compute_bmi(height_ft: str, height_in: str, weight: str) -> float | None:
    try:
        ft = float(height_ft)
        inch = float(height_in or 0)
        w = float(weight)
        total_in = ft * 12 + inch
        if not total_in or not w:
            return None
        return round((w / (total_in * total_in)) * 703, 1)
    except (TypeError, ValueError):
        return None


def compute_age(dob) -> int | None:
    if not dob:
        return None
    from datetime import date

    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


SAFETY_FLAG_DEFINITIONS = [
    ("bmi_low", "medium", lambda ctx: ctx.get("bmi") is not None and ctx["bmi"] < 27, lambda ctx: f"BMI {ctx['bmi']} is under 27"),
    ("under_18", "high", lambda ctx: ctx.get("age") is not None and ctx["age"] < 18, lambda ctx: "Patient is under 18"),
    ("not_colorado", "high", lambda ctx: ctx.get("state") != "Colorado", lambda ctx: "State of residence is not Colorado"),
    ("not_in_colorado", "high", lambda ctx: ctx.get("located_in_colorado") is False, lambda ctx: "Patient not located in Colorado at intake"),
    ("pregnant", "high", lambda ctx: ctx.get("safety", {}).get("pregnant"), lambda ctx: "Currently pregnant"),
    ("trying_pregnant", "high", lambda ctx: ctx.get("safety", {}).get("trying_pregnant"), lambda ctx: "Trying to become pregnant"),
    ("breastfeeding", "high", lambda ctx: ctx.get("safety", {}).get("breastfeeding"), lambda ctx: "Currently breastfeeding"),
    ("thyroid_cancer", "high", lambda ctx: ctx.get("safety", {}).get("thyroid_cancer"), lambda ctx: "Thyroid cancer history"),
    ("men2", "high", lambda ctx: ctx.get("safety", {}).get("men2"), lambda ctx: "MEN2 history"),
    ("pancreatitis", "high", lambda ctx: ctx.get("safety", {}).get("pancreatitis"), lambda ctx: "Pancreatitis history"),
    ("glp1_reaction", "high", lambda ctx: ctx.get("safety", {}).get("glp1_reaction"), lambda ctx: "Prior severe GLP-1 reaction"),
    ("gallbladder", "medium", lambda ctx: ctx.get("conditions", {}).get("gallbladder"), lambda ctx: "Gallbladder disease reported"),
    ("kidney_severe", "high", lambda ctx: ctx.get("conditions", {}).get("kidney_severe"), lambda ctx: "Severe kidney disease reported"),
    ("gastroparesis", "high", lambda ctx: ctx.get("conditions", {}).get("gastroparesis"), lambda ctx: "Gastroparesis reported"),
    ("eating_disorder", "high", lambda ctx: ctx.get("conditions", {}).get("eating_disorder"), lambda ctx: "Eating disorder history"),
    ("suicidal", "high", lambda ctx: ctx.get("conditions", {}).get("suicidal"), lambda ctx: "Suicidal thoughts or self-harm history"),
    ("upcoming_surgery", "medium", lambda ctx: ctx.get("conditions", {}).get("upcoming_surgery"), lambda ctx: "Upcoming surgery or anesthesia"),
    ("insulin", "high", lambda ctx: ctx.get("med_answers", {}).get("insulin"), lambda ctx: "Current insulin use"),
    ("sulfonylurea", "high", lambda ctx: ctx.get("med_answers", {}).get("sulfonylurea"), lambda ctx: "Current sulfonylurea use"),
    ("missing_consent", "high", lambda ctx: not ctx.get("consent_complete"), lambda ctx: "Missing required consent"),
]


def build_safety_context(user, eligibility, intake, consent_complete: bool) -> dict:
    safety = (eligibility.safety_screen if eligibility else {}) or {}
    conditions = (intake.medical_conditions if intake else {}) or {}
    med_answers = ((intake.medications or {}).get("answers", {}) if intake else {}) or {}
    bmi = eligibility.bmi if eligibility else None
    if bmi is None and eligibility:
        bmi = compute_bmi(eligibility.height_ft, eligibility.height_in, eligibility.weight)
    return {
        "bmi": bmi,
        "age": compute_age(user.dob),
        "state": user.state,
        "located_in_colorado": eligibility.located_in_colorado if eligibility else None,
        "lives_in_colorado": eligibility.lives_in_colorado if eligibility else None,
        "safety": safety,
        "conditions": conditions,
        "med_answers": med_answers,
        "consent_complete": consent_complete,
    }


def compute_safety_flags(user, eligibility, intake, consent_complete: bool):
    ctx = build_safety_context(user, eligibility, intake, consent_complete)
    flags = []
    for flag_type, severity, check, describe in SAFETY_FLAG_DEFINITIONS:
        if check(ctx):
            flags.append(
                {
                    "flag_type": flag_type,
                    "severity": severity,
                    "description": describe(ctx),
                }
            )
    return flags
