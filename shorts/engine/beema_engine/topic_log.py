"""The topic log: every topic Beema has made a video about, so the nightly job never repeats one.

File: shorts/engine/topics/topic_log.json (the record) and topic_log.md (generated, for people). Entries come from
  * nightly runs (source "nightly"),
  * the registry of videos made by hand (source "registry"),
  * the reviewed library's hooks, which count as ALREADY COVERED topics (source "library_hook"): the nightly job must write
    something new, never reuse them.
Repeat detection is textual: topic-question overlap for the same product, and word-shingle overlap of the hook and every
narration sentence against everything in the log and the whole library.
"""
from __future__ import annotations
import re, datetime as dt
from .common import ROOT, jload, jsave, products
from . import library, registry

LOG = ROOT / "topics" / "topic_log.json"
MD = ROOT / "topics" / "topic_log.md"
STOP = set("a an the and or of to in on is are does do how why what can i you it for with at by be this that your my as from not vs about into so then than but if".split())

def _toks(s):
    return [w for w in re.findall(r"[a-z0-9']+", s.lower()) if w not in STOP and len(w) > 2]

def _shingles(s, n=3):
    w = re.findall(r"[a-z0-9']+", s.lower())
    return {" ".join(w[i:i + n]) for i in range(max(0, len(w) - n + 1))} or {" ".join(w)}

def _qtoks(q, product):
    """Question tokens minus the product's own name, crudely stemmed ('works' = 'work'), so 'how does sildenafil work' and 'How sildenafil works, simply' match."""
    skip = set(re.findall(r"[a-z0-9']+", products()[product]["label"].lower())) | {"bpc", "157", "viagra", "cialis", "ozempic", "wegovy", "zepbound", "mounjaro", "citrate", "generic", "compounded"}
    out = set()
    for w in _toks(q):
        if w in skip: continue
        out.add(w[:-1] if len(w) > 4 and w.endswith("s") and not w.endswith("ss") else w)
    return out

def same_question(a, b, product, limit=0.5):
    """True when two questions about one product ask the same thing: the smaller one is mostly contained in the other."""
    x, y = _qtoks(a, product), _qtoks(b, product)
    if not x or not y: return x == y
    return len(x & y) / min(len(x), len(y)) >= limit

def jaccard(a, b):
    a, b = set(a), set(b)
    return len(a & b) / len(a | b) if a and b else 0.0

def load():
    return jload(LOG, {"version": 1, "entries": []})

def save(log):
    jsave(LOG, log); MD.write_text(render_md(log))

def add(entry):
    """Record a topic. `entry` needs product, question; the rest is optional. Returns the stored entry."""
    log = load()
    e = {"date": entry.get("date"), "product": entry["product"], "category": entry.get("category"), "facet": entry.get("facet"), "question": entry["question"],
         "summary": entry.get("summary", ""), "hook": entry.get("hook", ""), "narration": entry.get("narration", ""), "package_id": entry.get("package_id"), "source": entry.get("source", "nightly"),
         "status": entry.get("status", "built"), "slack": entry.get("slack"), "style": entry.get("style"), "added": dt.datetime.now().isoformat(timespec="seconds")}
    log["entries"] = [x for x in log["entries"] if not (x.get("package_id") and x.get("package_id") == e["package_id"])] + [e]
    save(log); return e

def unused_phrases(product, phrases, limit=10):
    """Search phrases whose question has not been covered for this product (the writer is shown only these, never the log)."""
    done = [e["question"] for e in load()["entries"] if e["product"] == product]
    out = []
    for p in phrases:
        if p not in out and not any(same_question(p, q, product) for q in done): out.append(p)
    return out[:limit]

def mark_delivered(package_id, slack_info):
    log = load()
    for e in log["entries"]:
        if e.get("package_id") == package_id: e["status"] = "delivered"; e["slack"] = slack_info
    save(log)

def seed():
    """Backfill the log from the registry (videos made by hand and earlier nightly runs) and from every library hook. Idempotent."""
    log = load(); have = {(e["source"], e.get("package_id") or e["question"]) for e in log["entries"]}; added = 0
    P = products()
    for v in registry.load()["videos"].values():
        if v.get("format") != "organic": continue
        try: hook = library.find(v["hook_id"])["text"]
        except Exception: continue
        key = ("registry", v["id"])
        if key in have: continue
        log["entries"].append({"date": v.get("date"), "product": v["product"], "category": None, "facet": None, "question": hook, "summary": "", "hook": hook, "package_id": v["id"],
                               "source": "registry", "status": v.get("status", "built"), "slack": None, "added": dt.datetime.now().isoformat(timespec="seconds")}); have.add(key); added += 1
    for prod in P:
        try: lib = library.load(prod)
        except Exception: continue
        for h in lib["hooks"]:
            key = ("library_hook", h["text"])
            if key in have: continue
            log["entries"].append({"date": None, "product": prod, "category": None, "facet": h["angle"], "question": h["text"], "summary": "", "hook": h["text"], "package_id": None,
                                   "source": "library_hook", "status": "covered", "slack": None, "added": dt.datetime.now().isoformat(timespec="seconds")}); have.add(key); added += 1
        for m in lib["meats"]:                                         # every reviewed video's title is a covered question too
            key = ("library_meat", m["title"])
            if key in have: continue
            log["entries"].append({"date": None, "product": prod, "category": None, "facet": None, "question": m["title"], "summary": "", "hook": "", "package_id": None,
                                   "source": "library_meat", "status": "covered", "slack": None, "added": dt.datetime.now().isoformat(timespec="seconds")}); have.add(key); added += 1
    save(log); return added

def corpus(product=None):
    """All reviewed text a new script must not copy: every hook, meat sentence and CTA in the library (all products), plus logged hooks."""
    out = []
    for prod in products():
        try: lib = library.load(prod)
        except Exception: continue
        out += [h["text"] for h in lib["hooks"]] + [c["text"] for c in lib["ctas"]]
        for m in lib["meats"]:
            out += [b["text"] for b in m["beats"]]
    out += [e["hook"] for e in load()["entries"] if e.get("hook")]
    return out

def check_unique(product, question, hook, sentences, cfg=None):
    """-> list of problems (empty = unique). Same-product topic overlap, hook overlap, and sentence overlap against everything."""
    cfg = cfg or {"topic": 0.4, "hook": 0.45, "sentence": 0.5}
    E = []
    for e in load()["entries"]:
        if e["product"] != product: continue
        if same_question(question, e["question"], product):
            E.append(f"topic too close to one already done ({e['source']}, {e.get('date') or 'library'}): \"{e['question'][:90]}\"; choose a different question"); break
    corp = [(c, _shingles(c)) for c in corpus(product)]
    hs = _shingles(hook)
    for c, sh in corp:
        s = jaccard(hs, sh)
        if s >= cfg["hook"]: E.append(f"hook is too close to existing text \"{c[:80]}\" (overlap {s:.2f}); write a new hook"); break
    for sent in sentences:
        ss = _shingles(sent)
        for c, sh in corp:
            s = jaccard(ss, sh)
            if s >= cfg["sentence"]: E.append(f"narration sentence \"{sent[:70]}\" copies existing text \"{c[:70]}\" (overlap {s:.2f}); say it in new words"); break
    return E

STORY_LIMIT = 0.4

def _content(text, product):
    stop = set(re.findall(r"[a-z0-9']+", products()[product]["label"].lower())) | {"bpc", "157"}
    return {w for w in _toks(text) if w not in stop}

def stories(product):
    """Stories already told for a product: every reviewed-library meat (title + narration) and every previous nightly video's narration."""
    out = []
    try:
        for m in library.load(product)["meats"]:
            out.append((f"library video {m['id']} \"{m['title']}\"", " ".join(b["text"] for b in m["beats"]), [b["text"] for b in m["beats"]]))
    except Exception:
        pass
    for e in load()["entries"]:
        if e["product"] == product and e.get("narration"): out.append((f"nightly video of {e.get('date')} \"{e['question']}\"", e["narration"], [e["narration"]]))
    return out

def check_story(product, narration, limit=STORY_LIMIT):
    """A new video must tell a NEW story. Containment = share of the new narration's content words that an existing story already uses.
    Retelling the same idea in new words still shares its content words, which is exactly what this catches."""
    new = _content(narration, product); E = []
    if not new: return E
    for name, text, _ in stories(product):
        c = len(new & _content(text, product)) / len(new)
        if c >= limit: E.append(f"this retells an existing story: {name} (shares {c:.0%} of your content words: {', '.join(sorted(new & _content(text, product))[:8])}). Tell a DIFFERENT story: assume the viewer already knows that one and spend every beat on a new angle")
    return E

def done_topics(product, limit=70):
    """Questions already covered for a product (most recent first, then library), for the writer's prompt."""
    es = [e for e in load()["entries"] if e["product"] == product]
    es.sort(key=lambda e: (e.get("date") or "0000", e.get("added", "")), reverse=True)
    seen, out = set(), []
    for e in es:
        q = e["question"].strip()
        if q.lower() not in seen: seen.add(q.lower()); out.append(q)
    return out[:limit]

def render_md(log):
    rows = sorted(log["entries"], key=lambda e: (e.get("date") or "", e.get("added", "")), reverse=True)
    made = [e for e in rows if e["source"] in ("nightly", "registry")]; cov = [e for e in rows if e["source"] in ("library_hook", "library_meat")]
    L = ["# Topic log", "", "Every topic Beema Health has made a video about. The nightly job reads this and never repeats one. Generated by `shorts/engine/beema_engine/topic_log.py`; do not edit by hand.", "",
         f"## Videos made ({len(made)})", "", "| Date | Product | Facet | Topic / hook | Source | Status |", "|---|---|---|---|---|---|"]
    for e in made: L.append(f"| {e.get('date') or ''} | {e['product']} | {e.get('facet') or ''} | {e['question'].replace('|', '/')} | {e['source']} | {e['status']} |")
    L += ["", f"## Reviewed-library hooks (already covered, never reuse) ({len(cov)})", ""]
    by = {}
    for e in cov: by.setdefault(e["product"], []).append(e["question"])
    for p, qs in by.items(): L += [f"### {p}", ""] + [f"- {q}" for q in qs] + [""]
    return "\n".join(L) + "\n"
