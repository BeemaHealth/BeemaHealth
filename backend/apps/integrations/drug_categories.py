"""Maps medication names to drug categories for Beluga visit routing."""

_GLP1 = {
    "semaglutide",
    "tirzepatide",
    "ozempic",
    "wegovy",
    "mounjaro",
    "zepbound",
    "rybelsus",
    "liraglutide",
    "saxenda",
    "victoza",
}
_ED = {
    "sildenafil",
    "tadalafil",
    "vardenafil",
    "avanafil",
    "viagra",
    "cialis",
    "levitra",
    "stendra",
}


def infer_drug_category(medication_name: str) -> str:
    """Return 'glp1', 'ed', or 'other' based on the medication name."""
    name = medication_name.lower()
    for drug in _GLP1:
        if drug in name:
            return "glp1"
    for drug in _ED:
        if drug in name:
            return "ed"
    return "other"
