"""Turn search signals into a ranked list of (product, facet) topics and, for each, the vetted library combinations
(hook + meat + CTA) that answer it. Only components that already passed the compliance gate are eligible.
Nothing here writes new claims: videos are assembled from the reviewed library."""
from __future__ import annotations
import re
from .common import ROOT, config, jload, sha, products
from . import registry, demand

STOP = set("a an the and or of to in on is are does do how why what can i you it for with at by be this that your my as from not vs".split())

def tokens(s):
    return [w for w in re.findall(r"[a-z0-9']+", s.lower()) if w not in STOP and len(w) > 2]

def category_of(product):
    for cat, ps in config()["nightly"]["categories"].items():
        if product in ps: return cat
    return None

def used_hooks(extra=()):
    used = set(extra)
    for v in registry.load()["videos"].values():
        if v.get("format") == "organic": used.add(v["hook_id"])
    return used

def recent_facets(nightly_jobs, date, days):
    """(product, facet) pairs used in the last `days` nightly runs."""
    import datetime as dt
    out = {}
    d0 = dt.date.fromisoformat(date)
    for dstr, job in (nightly_jobs or {}).items():
        try: age = (d0 - dt.date.fromisoformat(dstr)).days
        except ValueError: continue
        if 0 < age <= days:
            for v in job.get("videos", []):
                if v.get("product") and v.get("facet"): out[(v["product"], v["facet"])] = age
    return out

def peptide_night(date):
    """Peptides (education only) get a night every `peptide_at_least_every_nights` nights, deterministic from the date; on that night
    one peptide topic takes the SECOND slot. Every other night is weight loss + men's sexual health only."""
    import datetime as dt
    n = config()["nightly"]["peptide_at_least_every_nights"]
    return dt.date.fromisoformat(date).toordinal() % n == 0

def ranked_candidates(date, sig, nightly_jobs=None):
    """All (product, facet) topics with a score, best first. Each has `evidence` (the searches that justify it)."""
    cfg = config()["nightly"]; T = demand.topics(); out = []
    recent = recent_facets(nightly_jobs, date, cfg["recent_facet_penalty_days"])
    pep_night = peptide_night(date)
    offline = sig.get("source") == "offline"
    for product in T["search_terms"]:
        P = sig["products"].get(product, {"popularity": 0, "facets": {}})
        for fname, f in T["facets"].items():
            if f.get("products") and product not in f["products"]: continue
            if product == "bpc-157" and not fname.startswith("peptide_"): continue
            if product != "bpc-157" and fname.startswith("peptide_"): continue
            hit = P["facets"].get(fname)
            score = hit["score"] if hit else 0.0
            if offline: score = 1.0                                  # flat baseline: rotation + novelty decide
            elif not hit: score = 0.05                               # present in our library, not seen in search: low but possible
            if product == "bpc-157": score = max(score, 0.3) if not offline else score   # peptides: few autocomplete hits, keep eligible
            if not offline: score /= max(1, len(T["search_terms"][product]))             # per search term, so a product with more terms does not win by volume of phrasing
            if category_of(product) == "peptides":
                if not pep_night: continue                                   # not a peptide night
                score *= cfg["peptide_score_multiplier"]
            if (product, fname) in recent: score *= 0.4
            out.append({"product": product, "category": category_of(product), "facet": fname, "score": round(score, 4),
                        "evidence": (hit or {}).get("top", []), "source": sig.get("source")})
    out.sort(key=lambda c: (-c["score"], sha(date, c["product"], c["facet"])))
    return out

def pick_order(ranked, accepted):
    """Candidates to try for the next slot: different product than anything accepted, at most one peptide topic, and a
    different CATEGORY first (so a night is e.g. one weight-loss and one men's-health video), then relax."""
    have_p = {a["product"] for a in accepted}; have_c = [a["category"] for a in accepted]
    ok = [c for c in ranked if c["product"] not in have_p and not (c["category"] == "peptides" and ("peptides" in have_c or not accepted))]   # a peptide topic is never the lead
    fresh = [c for c in ok if c["category"] not in have_c]
    if "peptides" not in have_c:                                              # on a peptide night the peptide takes the second slot
        pep = [c for c in fresh if c["category"] == "peptides"]
        if accepted and pep: return pep + [c for c in fresh if c not in pep] + [c for c in ok if c not in fresh]
    return fresh + [c for c in ok if c not in fresh]
