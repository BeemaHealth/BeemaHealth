"""Build/load the shared creative library (hooks, meats, CTAs) with stable IDs + metadata."""
from __future__ import annotations
import sys, importlib, re, datetime as dt
from .common import ROOT, LIB, PREFIX, jload, jsave

SRC = ROOT / "library_src"
PRODUCT_MODULE = {"tadalafil": "tadalafil", "sildenafil": "sildenafil", "ed-mints": "ed_mints", "tirzepatide": "tirzepatide", "semaglutide": "semaglutide", "bpc-157": "bpc157"}

def _wc(t): return len(re.findall(r"[A-Za-z0-9$'-]+", t))

def build(write=True):
    sys.path.insert(0, str(SRC))
    summary = {}
    for product, modname in PRODUCT_MODULE.items():
        mod = importlib.import_module(modname); importlib.reload(mod)
        pre = PREFIX[product]
        path = LIB / f"{product}.json"
        old = jload(path, {"hooks": [], "meats": [], "ctas": []})
        old_by = {x["id"]: x for k in ("hooks", "meats", "ctas") for x in old[k]}
        now = dt.date.today().isoformat()
        def stamp(item, new, text_key):
            prev = old_by.get(new["id"])
            if prev:
                new["created"] = prev.get("created", now)
                new["version"] = prev.get("version", 1)
                new["history"] = prev.get("history", [])
                if prev.get(text_key) != new[text_key]:
                    new["history"].append({"version": prev.get("version", 1), "text": prev.get(text_key), "until": now})
                    new["version"] += 1
                new["status"] = prev.get("status", "draft")
            else:
                new.update({"created": now, "version": 1, "history": [], "status": "draft"})
            return new
        hooks = []
        for i, h in enumerate(mod.HOOKS, 1):
            kind = "question" if h["text"].rstrip().endswith("?") else "statement"
            hid = f"{pre}-H{i:02d}"
            hooks.append(stamp(h, {"id": hid, "product": product, "angle": h["angle"], "kind": kind, "text": h["text"],
                "words": _wc(h["text"]), "est_seconds": round(_wc(h["text"]) / 2.6, 1),
                "price_dependent": bool(h.get("price_dependent")) or bool(re.search(r"\$|dollars?", h["text"], re.I)),
                "review": h.get("review")}, "text"))
        meats = []
        for m in mod.MEATS:
            spoken = " ".join(b["text"] for b in m["beats"])
            mid = f"{pre}-{m['id']}"
            meats.append(stamp(m, {"id": mid, "product": product, "title": m["title"], "style": m["style"],
                "beats": m["beats"], "words": _wc(spoken), "est_seconds": round(_wc(spoken) / 2.6 + 0.35 * len(m["beats"]), 1),
                "caption_bodies": m["caption_bodies"], "claims": m["claims"], "review_flags": m["review_flags"],
                "price_dependent": bool(re.search(r"\$|dollars?", spoken, re.I)), "notes": m.get("notes", "")}, "beats"))
        ctas = []
        for c in mod.CTAS:
            ctas.append(stamp(c, {"id": f"{pre}-{c['id']}", "product": product, "title": c["title"], "goal": c["goal"],
                "text": c["text"], "screen": c["screen"], "price": c.get("price"), "claims": c.get("claims", []), "no_url": bool(c.get("no_url")), "words": _wc(c["text"]), "est_seconds": round(_wc(c["text"]) / 2.6, 1)}, "text"))
        data = {"product": product, "prefix": pre, "hooks": hooks, "meats": meats, "ctas": ctas,
                "combinations": len(hooks) * len(meats) * len(ctas)}
        if write: jsave(path, data)
        summary[product] = (len(hooks), len(meats), len(ctas), data["combinations"])
    return summary

def load(product):
    return jload(LIB / f"{product}.json")

def find(component_id):
    from .common import product_of
    lib = load(product_of(component_id))
    for k in ("hooks", "meats", "ctas"):
        for x in lib[k]:
            if x["id"] == component_id: return x
    raise KeyError(component_id)

def all_components():
    for p in PRODUCT_MODULE:
        lib = load(p)
        for k in ("hooks", "meats", "ctas"):
            for x in lib[k]: yield k, x
