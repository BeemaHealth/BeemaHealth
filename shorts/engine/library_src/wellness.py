"""Wellness overview short (trial, 2026-11-19): hair loss care, compounded NAD+ and compounded sermorelin, and how online care works.

ONE video only. Not registered in library.PRODUCT_MODULE and not in product_rotation (see products.json -> wellness.trial_only).
Built with tools/well_wellness_build.py, which composes these parts with compose.build_package(parts=...) and renders them
with the standalone Remotion entry shorts/pde5-explainer/src/wellness/ (WellWorld: one continuous 3D room, camera on the words).

Rules this script follows: no benefit, outcome, anti-aging, longevity, muscle or hormone claim for NAD+ or sermorelin; compounded
products are said to be not FDA-approved; no prices; brand and URL only at the end.
"""

PRODUCT = "wellness"
W = {"type": "world3d", "world": "wellness", "bg": "ink"}

HOOK = {
    "id": "WEL-H01", "product": PRODUCT, "angle": "beyond_weight_loss", "price_dependent": False, "review": None,
    "text": "Your health goals go beyond weight loss.",
    "visual": dict(W),
}

MEAT = {
    "id": "WEL-M1", "product": PRODUCT, "style": "world3d_room", "price_dependent": False,
    "title": "Hair loss care, compounded NAD+ and sermorelin, and how online care works",
    "beats": [
        {"text": "Beema Health also offers hair-loss care: oral finasteride and minoxidil, and a compounded topical spray.",
         "visual": {**W, "texts": ["Oral finasteride", "Oral minoxidil", "Compounded topical spray"]},
         "screen": "Hair loss care", "emph": ["finasteride", "minoxidil", "topical"]},
        {"text": "Plus compounded NAD+ and sermorelin. Compounded medications aren't FDA-approved, and each needs an individual clinical assessment.",
         "visual": {**W, "texts": ["NAD+", "Sermorelin", "Compounded. Not FDA-approved.", "Individual clinical assessment required."]},
         "screen": "Individual clinical assessment required.", "emph": ["NAD+", "sermorelin", "FDA-approved"]},
        {"text": "It starts online: a health history intake, a licensed provider review, and pharmacy fulfillment if prescribed.",
         "visual": {**W, "texts": ["Health history intake", "Licensed provider review", "Pharmacy fulfillment, if prescribed"]},
         "screen": "How it works online", "emph": ["intake", "provider", "pharmacy"]},
    ],
    "claims": ["well_hairloss_lineup", "well_minoxidil_off_label", "well_spray_not_fda_approved", "well_nad_sermorelin_offered",
               "well_compounded_not_fda_approved", "well_individual_assessment", "well_nad_sermorelin_compounding_eligibility",
               "well_illustration_bottles", "process"],
    "review_flags": [
        "peptide_compounding_eligibility: sermorelin is a peptide (GHRH analog) and NAD+ is compounded. Confirm with counsel that both may lawfully be compounded and prescribed in every state served (LegitScript Standard 2) and that Meta/TikTok/YouTube policy allows this content",
        "gate_category_choice: this video is linted as category 'wellness', not 'peptide'. Under the peptide gate it is BLOCKED (brand, URL, provider, pharmacy, prescribing words). See compliance_peptide_strict.json",
        "label_crops: live-site NAD+ and sermorelin vial labels say 'Longevity Medication' (NAD+ also '1000 mg/mL' plus a needle); the spray label says 'Supports Healthier Hair'. The video shows only cropped label areas without them",
        "minoxidil_off_label: oral minoxidil is approved for blood pressure; the video lists it under hair-loss care without saying off-label",
        "brand_name_audio: the recognizer hears 'Bima Health'; Matt must listen to 'Beema Health' and the URL",
    ],
    "caption_bodies": [
        "Hair loss care, plus compounded NAD+ and sermorelin. Every option starts with a health history intake and a licensed provider review. Compounded medications aren't FDA-approved, and each needs an individual clinical assessment.",
    ],
}

CTA = {
    "id": "WEL-C1", "product": PRODUCT, "screen": "Explore more personalized care", "claims": [],
    "text": "Explore more personalized care at beemahealth.com.",
}

# Spoken closing disclosure (replaces the generic compounded line, which mentions nitrates).
DISCLOSURE = "A prescription is required, and prescribing is never guaranteed."
ENDCARD_DISCLOSURES = ["Hair loss spray, NAD+ and sermorelin: compounded. Not FDA-approved.", "Prescription required", "Prescribing is never guaranteed"]

# Brief asks for about 30 s: a touch faster than the 1.06 default, still natural.
VOICE_SPEED = 1.1

# Pronunciation for this video only (tested in context 2026-11-19 with Whisper; see the build script docstring).
PHONEMES = {"NAD+": "ˌɛnˌeɪdˈiplʌs", "sermorelin": "sˌɜɹmˈɔɹʌlˌɪn", "minoxidil": "mˌɪnˈɑksədɪl"}
