"""Compliance gate. Pure functions, deterministic, no network.

Statuses (never 'approved' - a human always signs off):
  BLOCKED               at least one hard violation. Must not be rendered for delivery or shipped.
  NEEDS_HUMAN_REVIEW    no hard violations, but uncertain/restricted claims need a person's decision.
  AUTO_CHECKS_PASSED    pattern checks clean. Human sign-off is STILL required before posting.
"""
from __future__ import annotations
import re
from .common import ROOT, jload, products, claims, words_to_int

_RULES = None
def rules():
    global _RULES
    if _RULES is None:
        _RULES = jload(ROOT / "compliance" / "rules.json")
    return _RULES

def _find(rule, text):
    m = re.search(rule["re"], text, re.I)
    return m.group(0) if m else None

def _sentences(text):
    return [s for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

def allowed_amounts(product):
    p = products()[product]["prices"]
    amts = set()
    for k in ("1mo_start", "3mo_total_start", "monthly_equiv_3mo"):
        if k in p: amts.add(float(p[k]))
    for pl in p.get("plans", []):
        for k in ("1mo", "3mo"):
            amts.add(float(pl[k]))
        amts.add(round(pl["3mo"] / 3, 2)); amts.add(round(pl["3mo"] / 3))
    if "3mo_total_start" in p: amts.add(round(p["3mo_total_start"] / 3)); amts.add(round(p["3mo_total_start"] / 3, 2))
    nc = products()[product].get("no_charge") or {}
    if nc.get("verified") and nc.get("use", True): amts.add(0.0)      # "you won't be charged" is a verified claim, so "$0" is allowed
    return amts

def price_findings(text, product):
    """Check $N and spoken 'N dollars' / 'under N' amounts against products.json."""
    out = []
    pr = products()[product]["prices"]
    if "1mo_start" not in pr:
        if re.search(r"\$\s?\d|\bdollars?\b", text, re.I):
            out.append(("BLOCK", "price_not_allowed", "Prices are intentionally not used for this product.", "$"))
        return out
    allowed = allowed_amounts(product)
    found = []
    for m in re.finditer(r"\$\s?(\d+(?:\.\d+)?)", text):
        found.append((float(m.group(1)), m.group(0)))
    for m in re.finditer(r"\b([a-z]+(?:[- ](?:and )?[a-z]+){0,3}) dollars?\b", text, re.I):
        v = words_to_int(m.group(1))
        if v is not None: found.append((float(v), m.group(0)))
    # 'under fifty' style: must exceed an actual monthly-equivalent
    for m in re.finditer(r"\bunder ([a-z-]+|\$?\d+)\b", text, re.I):
        raw = m.group(1).lstrip("$")
        v = float(raw) if raw.isdigit() else words_to_int(raw)
        if v is not None and (v == 18 or v == 18.0): continue
        if v is not None and v >= 20:
            mins = [a for a in allowed if a < v and a >= v - 15]
            if not mins:
                out.append(("BLOCK", "price_mismatch", f"'{m.group(0)}' is not supported by a plan monthly equivalent.", m.group(0)))
    for v, raw in found:
        if v not in allowed:
            out.append(("BLOCK", "price_mismatch", f"{raw} does not match products.json for {product}.", raw))
    if found:
        out.append(("REVIEW", "price_reverify", "Contains prices. Re-verify against Matt's current sheet before publishing.", ""))
    return out

def lint_text(text, product, fmt="organic", field="text", extra_ctx=None):
    """Lint one piece of text. Returns list of findings dicts."""
    R = rules(); P = products()[product]
    F = []
    def add(level, rid, msg, snip): F.append({"level": level, "rule": rid, "field": field, "msg": msg, "snippet": snip})
    for r in R["global_block"]:
        s = _find(r, text)
        if s: add("BLOCK", r["id"], r["msg"], s)
    if P["compounded"]:
        for r in R["compounded_block"]:
            for sent in _sentences(text) or [text]:
                s = _find(r, sent)
                if not s: continue
                if r["id"] == "equivalence" and re.search(r"\btablets?\b", sent, re.I) and product == "ed-mints":
                    add("REVIEW", "comparison_framing", "Tablet-vs-compounded comparison sentence. Confirm it makes no equivalence claim.", sent[:80]); continue
                add("BLOCK", r["id"], r["msg"], s)
    if P["category"] == "peptide":
        for r in R["peptide_block"]:
            s = _find(r, text)
            if s: add("BLOCK", r["id"], r["msg"], s)
    if P["compounded"]:
        # 'FDA-approved' / 'generic' only allowed in negation or explicit tablet comparison
        for sent in _sentences(text):
            if re.search(r"\bfda[- ]approved\b", sent, re.I):
                if re.search(r"\bnot\b|n't\b|\bnor\b|\bno\b", sent, re.I): continue
                if product == "ed-mints" and re.search(r"\btablets?\b|generics?", sent, re.I):
                    add("REVIEW", "comparison_framing", "FDA-approved reference in a tablet comparison. Make sure it is clearly about tablets, not Mints.", sent[:80]); continue
                add("BLOCK", "compounded_fda_approved", "Compounded product sentence says 'FDA-approved' without negation.", sent[:80])
            if re.search(r"\bgenerics?\b", sent, re.I):
                if product == "ed-mints" and re.search(r"\btablets?\b", sent, re.I): continue
                add("BLOCK", "compounded_generic", "'Generic' near a compounded product.", sent[:80])
        if re.search(r"\bfda[- ]registered\b", text, re.I) and not re.search(r"not fda[- ]approved", text, re.I):
            add("REVIEW", "registered_without_disclosure", "'FDA-registered' appears without 'not FDA-approved' in the same text.", "FDA-registered")
    else:
        # uncompounded ED generics: 'FDA-approved' is fine only for the drug itself, never the service
        pass
    for r in R["review"]:
        s = _find(r, text)
        if not s: continue
        if r["id"] == "personal_attribute" and fmt == "ad": continue   # handled as BLOCK below
        if r["id"] == "legitscript_mention" and fmt == "ad":
            add("BLOCK", "legitscript_in_ad", "LegitScript seal/certification is not allowed in ad creative.", s); continue
        add("REVIEW", r["id"], r["msg"], s)
    if fmt == "ad":
        for r in R["ad_block"]:
            s = _find(r, text)
            if s: add("BLOCK", r["id"], r["msg"], s)
    for lvl, rid, msg, snip in price_findings(text, product):
        add(lvl, rid, msg, snip)
    return F

AD_LIKE = [
    (r"beemahealth|beema health|https?:|www\.|\.com\b|dot com|\bslash\b", "link or brand mention"),
    (r"\$\s?\d|\bprice|\bcost|\bcheap|\bdiscount|\bsave\b|\bplans?\b|\bstarter", "price or plan language"),
    (r"prescri|\bprovider|licensed|pharmacy|telehealth|intake|questionnaire|\bpatient", "service, prescribing or provider language"),
    (r"\bbuy\b|\border\b|\bshop\b|get started|start (your|the|today)|sign ?up|\bjoin\b|we offer|our (service|program|clinic)|learn more|read more", "call to action or offer"),
]

def status_of(findings):
    if any(f["level"] == "BLOCK" for f in findings): return "BLOCKED"
    if any(f["level"] == "REVIEW" for f in findings): return "NEEDS_HUMAN_REVIEW"
    return "AUTO_CHECKS_PASSED"

def dedupe(findings):
    seen, out = set(), []
    for f in findings:
        k = (f["level"], f["rule"], f["snippet"])
        if k in seen: continue
        seen.add(k); out.append(f)
    return out

def _caps(pkg):
    return [(k, v) for k, v in (pkg.get("captions") or {}).items() if not k.startswith("_")]

def lint_package(pkg):
    """Full gate for a composed package: script, on-screen text, captions, required disclosures, claims."""
    P = products()[pkg["product"]]
    fmt = pkg["format"]
    F = []
    F += lint_text(pkg["spoken_display"], pkg["product"], fmt, "voiceover")
    F += lint_text(" ".join(pkg["onscreen_text"]), pkg["product"], fmt, "on_screen")
    # the mandatory safety text may legitimately say "4 hours"; lint it for hard violations only
    F += [f for f in lint_text(P["safety_on_screen"], pkg["product"], fmt, "safety")
          if f["level"] == "BLOCK" or f["rule"] not in ("duration_claim", "timing_claim")]
    for plat, cap in _caps(pkg):
        txt = cap if isinstance(cap, str) else " ".join(str(v) for v in cap.values() if isinstance(v, str))
        F += lint_text(txt, pkg["product"], fmt, f"caption:{plat}")
    if P["category"] == "peptide":
        # Peptide videos are education ONLY: nothing that reads as an ad, a link, a price, a service or a call to act.
        blob = " ".join([pkg["spoken_display"], " ".join(pkg["onscreen_text"]), " ".join(pkg["endcard"]["lines"]), P["safety_on_screen"]] + [t if isinstance(t, str) else " ".join(str(v) for v in t.values() if isinstance(v, str)) for k, t in _caps(pkg)])
        for pat, why in AD_LIKE:
            m = re.search(pat, blob, re.I)
            if m: F.append({"level": "BLOCK", "rule": "peptide_ad_like", "field": "all", "msg": f"Peptide videos must be education only, never ad-like: {why}.", "snippet": m.group(0)})
        if pkg["endcard"].get("price"): F.append({"level": "BLOCK", "rule": "peptide_ad_like", "field": "endcard", "msg": "Peptide videos must not show a price.", "snippet": "price badge"})
    R = rules()["required"]
    end = " ".join(pkg["endcard"]["lines"] + pkg["endcard"]["disclosures"])
    need = []
    if P["category"] == "ed": need.append(R["ed"])
    if P["category"] == "glp1": need.append(R["glp1"])
    if P["compounded"]: need.append(R["compounded"])
    if fmt == "ad": need.append(R["ad"])
    for n in need:
        for s in n.get("endcard_contains", []):
            if s.lower() not in end.lower():
                F.append({"level": "BLOCK", "rule": "missing_disclosure", "field": "endcard", "msg": f"End card must contain '{s}'.", "snippet": s})
        for s in n.get("caption_contains", []):
            for plat, cap in _caps(pkg):
                txt = cap if isinstance(cap, str) else " ".join(str(v) for v in cap.values() if isinstance(v, str))
                if s.lower() not in txt.lower():
                    F.append({"level": "BLOCK", "rule": "missing_caption_disclosure", "field": f"caption:{plat}", "msg": f"Caption must contain '{s}'.", "snippet": s})
        if n.get("safety_contains"):
            blob = (pkg.get("safety_text", "") + " " + end).lower()
            for s in n["safety_contains"]:
                if s.lower() not in blob:
                    F.append({"level": "BLOCK", "rule": "missing_safety", "field": "safety", "msg": f"Safety text must mention '{s}'.", "snippet": s})
    # claims registry
    cl = claims()
    for cid in pkg.get("claims", []):
        st = cl.get(cid, {}).get("status", "unknown")
        if st not in ("verified", "verified_by_matt", "verified_basic_pharmacology", "general_education"):
            F.append({"level": "REVIEW", "rule": "claim_not_verified", "field": "claims", "msg": f"Claim '{cid}' status is '{st}'.", "snippet": cid})
    for flag in pkg.get("review_flags", []):
        F.append({"level": "REVIEW", "rule": "component_flag", "field": "library", "msg": f"Component flagged for review: {flag}", "snippet": flag})
    if P["compounded"]:
        F.append({"level": "REVIEW", "rule": "compounded_signoff", "field": "policy", "msg": "Compounded product: human compliance sign-off required (FDA F1.1/F1.2, platform policy).", "snippet": P["label"]})
    if fmt == "ad":
        F.append({"level": "REVIEW", "rule": "platform_authorization", "field": "policy", "msg": "Paid ad: confirm active LegitScript + Meta Rx authorization / Google healthcare pre-approval / TikTok Rx policy for THIS product before upload.", "snippet": ""})
        F.append({"level": "REVIEW", "rule": "isi_adequate_provision", "field": "policy", "msg": "Safety information is on screen and voiced; confirm counsel is comfortable with the adequate-provision approach.", "snippet": ""})
        if P["compounded"] and P["category"] == "glp1":
            F.append({"level": "REVIEW", "rule": "compounded_glp1_ads", "field": "policy", "msg": "Compounded GLP-1 ads face the strictest platform and FDA scrutiny. Do not launch without explicit written clearance.", "snippet": ""})
    if "no_charge_if_not_prescribed" in pkg.get("claims", []) and not (P.get("no_charge") or {}).get("verified"):
        F.append({"level": "REVIEW", "rule": "no_charge_unverified", "field": "policy", "msg": "'You won't be charged if you aren't prescribed' is not verified for this product. " + (P.get("no_charge") or {}).get("source", ""), "snippet": "won't be charged"})
    if P["category"] == "peptide":
        F.append({"level": "REVIEW", "rule": "peptide_compounding_eligibility", "field": "policy", "msg": "Peptide with no FDA approval: confirm with counsel that it may lawfully be compounded and prescribed in every state served (also LegitScript Standard 2), and that platform policy allows peptide content.", "snippet": P["label"]})
    if pkg["product"] == "ed-mints":
        F.append({"level": "REVIEW", "rule": "mints_directions_unverified", "field": "policy", "msg": "ED Mints directions/timing come from the live page, not verified pharmacy documentation.", "snippet": ""})
    F = dedupe(F)
    return {"status": status_of(F), "findings": F,
            "counts": {"BLOCK": sum(f["level"] == "BLOCK" for f in F), "REVIEW": sum(f["level"] == "REVIEW" for f in F)},
            "human_signoff": None,
            "note": "Automated pattern checks only. Not legal advice. A human must sign off before posting."}
