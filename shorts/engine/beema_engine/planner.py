"""Pick today's combination. Phase 1 tests hooks against a fixed control meat+CTA; no repeats; diversify angle/product."""
from __future__ import annotations
import random, datetime as dt
from collections import Counter
from .common import config, jload, ROOT, sha
from . import library, registry

def _history():
    reg = registry.load()
    vids = [v for v in reg["videos"].values() if v["format"] == "organic" and v["status"] in ("rendered", "delivered", "posted", "ready")]
    return sorted(vids, key=lambda v: (v["date"], v["id"]))

def plan(date=None, fmt="organic", product=None, force_hook=None):
    cfg = config(); d = cfg["daily"]; date = date or dt.date.today().isoformat()
    hist = _history(); reasons = []
    rot = d["product_rotation"]
    if product is None:
        idx = dt.date.fromisoformat(date).toordinal() % len(rot)
        recent = [v["product"] for v in hist[-d["min_days_between_same_product"]:]]
        for k in range(len(rot)):
            cand = rot[(idx + k) % len(rot)]
            if cand not in recent: product = cand; break
        else: product = rot[idx]
        reasons.append(f"product '{product}' from rotation, not used in the last {d['min_days_between_same_product']} videos")
    lib = library.load(product)
    used_hooks = {v["hook_id"] for v in hist}
    last = hist[-1] if hist else None
    phase = cfg["phase"]; ctl = cfg["control"]
    meat_id, cta_id = f"{lib['prefix']}-{ctl['meat']}", f"{lib['prefix']}-{ctl['cta']}"
    rep = jload(ROOT / "compliance" / ("library_report_ad.json" if fmt == "ad" else "library_report.json"), {"rows": []})
    status = {r["id"]: r["status"] for r in rep["rows"]}
    if phase != 1:
        txt, ranks = registry.recommend()
        if not ranks: reasons.append(f"phase {phase} requested but no metrics yet, falling back to phase 1 hook testing"); phase = 1
    if phase == 1:
        pool = [h for h in lib["hooks"] if h["id"] not in used_hooks and status.get(h["id"]) != "BLOCKED"]
        clean = [h for h in pool if not h.get("review") and not h["price_dependent"] and status.get(h["id"]) == "AUTO_CHECKS_PASSED"]
        pool = clean or pool
        if not pool: raise RuntimeError(f"no unused hooks left for {product}")
        angle_use = Counter(v["hook_angle"] for v in hist if v["product"] == product)
        avoid = last["hook_angle"] if last and d["no_repeat_hook_angle_back_to_back"] else None
        angles = sorted({h["angle"] for h in pool}, key=lambda a: (angle_use[a], a))
        angles = [a for a in angles if a != avoid] or angles
        rnd = random.Random(sha(date, product)); angle = angles[0]
        cand = [h for h in pool if h["angle"] == angle]; hook = rnd.choice(cand)
        reasons.append(f"phase 1 hook test: angle '{angle}' (least used for this product), hook unused, control meat {meat_id} and CTA {cta_id}")
        hook_id = hook["id"]
    else:
        # phases 2/3 use measured scores. Winners are hypotheses: we re-pair them, never conclude.
        scores = {}
        for v in registry.load()["videos"].values():
            if v["product"] != product or v["format"] != "organic": continue
            for p in v["posts"]:
                _, sc = registry._score(p["metrics"])
                if sc is not None: scores.setdefault((v["hook_id"], v["meat_id"], v["cta_id"]), []).append(sc)
        if not any(k[0].startswith(lib["prefix"]) for k in scores):
            reasons.append(f"phase {phase} but no scored posts for {product}: falling back to phase 1 hook test"); phase = 1
            return plan(date, fmt, product)
        import statistics as _st
        ranked = sorted(scores.items(), key=lambda kv: -_st.mean(kv[1]))
        top_hook, top_meat, top_cta = ranked[0][0]
        tried_meats = {k[1] for k in scores if k[0] == top_hook}
        all_meats = [m["id"] for m in lib["meats"]]
        if phase == 2:
            todo = [m for m in all_meats if m not in tried_meats]
            if not todo: reasons.append("all meats tried with the top hook; advance config.phase to 3"); todo = [top_meat]
            hook_id, meat_id, cta_id = top_hook, todo[0], ctl and f"{lib['prefix']}-{ctl['cta']}"
            reasons.append(f"phase 2 meat test: top-scoring hook {top_hook} (n={len(ranked[0][1])}) with untested meat {meat_id}")
        else:
            tried_ctas = {k[2] for k in scores if (k[0], k[1]) == (top_hook, top_meat)}
            todo = [c["id"] for c in lib["ctas"] if c["id"] not in tried_ctas] or [top_cta]
            hook_id, meat_id, cta_id = top_hook, top_meat, todo[0]
            reasons.append(f"phase 3 CTA test: best pair {top_hook}+{top_meat} with untested CTA {cta_id}")
    if force_hook: hook_id = force_hook
    if last and d["no_repeat_meat_back_to_back"] and last["meat_id"] == meat_id and last["product"] == product and phase != 1:
        reasons.append("meat repeated back to back")
    return {"date": date, "product": product, "hook_id": hook_id, "meat_id": meat_id, "cta_id": cta_id, "phase": phase, "format": fmt, "reasons": reasons}
