"""Storyboards for the generic narration-driven 3D stage (pde5-explainer/src/engine/stage3d.tsx).

A video beat is: spoken text + `actors` (what is on stage) + `script` (actions fired on SPOKEN WORDS). This module holds the
catalog (keep in sync with stage3d.tsx KINDS) and the validator that enforces the skill's rule *animation shows what the
narration says*, structurally, before anything is synthesized or rendered:

  * every actor is introduced (`show`) on a word the narration really says, and the actor lists the words it illustrates
  * every action fires on a word that exists in that beat's narration
  * every SENTENCE has at least one action fired inside it (nothing is said without a visual)
  * strong visual nouns the narration says (brain, stomach, blood vessel, key, lock, FDA ...) must have an actor of that kind
"""
from __future__ import annotations
import re

SLOTS = {"tl": (-3.3, 2.2), "t": (0, 2.4), "tr": (3.3, 2.2), "l": (-3.6, 0), "cl": (-1.8, 0), "c": (0, 0), "cr": (1.8, 0), "r": (3.6, 0), "bl": (-3.3, -2.3), "b": (0, -2.4), "br": (3.3, -2.3)}

# kind -> {doc, words: nouns that REQUIRE this kind when the narration says them, params}
CATALOG = {
    "brain":     {"doc": "a brain; glow lights it up", "words": ["brain"], "params": []},
    "stomach":   {"doc": "a stomach with fluid; fill 0..1 sets the fluid level", "words": ["stomach"], "params": []},
    "gut":       {"doc": "intestines (a tube); glow", "words": ["gut", "intestine", "intestines"], "params": []},
    "vessel":    {"doc": "a blood vessel with flowing cells; widen 0..1 makes it wider and the flow faster", "words": ["blood vessel", "blood vessels", "vessel", "vessels", "blood flow"], "params": []},
    "plate":     {"doc": "a plate of food (a meal)", "words": ["meal", "meals"], "params": []},
    "orb":       {"doc": "a glowing sphere used for a hormone, signal or molecule; text = short label on it", "words": [], "params": ["text", "color"]},
    "chain":     {"doc": "a helix chain of beads (peptide, protein, amino acids); n = number of beads, fill lights them", "words": ["chain", "amino acids", "peptide"], "params": ["n"]},
    "receptor":  {"doc": "a cup-shaped receptor on a cell; glow lights its rim", "words": ["receptor", "receptors"], "params": []},
    "lock":      {"doc": "a padlock; open 0..1 opens the shackle", "words": ["lock", "locks"], "params": []},
    "key":       {"doc": "a golden key", "words": ["key"], "params": []},
    "enzyme":    {"doc": "a blue chomping enzyme; open 0..1 opens its mouth", "words": ["enzyme", "enzymes"], "params": []},
    "pill":      {"doc": "a two-tone capsule", "words": ["pill", "pills", "tablet", "tablets", "capsule", "capsules"], "params": []},
    "vial":      {"doc": "a glass vial with a cap; fill 0..1; text = label on it", "words": ["vial"], "params": ["text"]},
    "flask":     {"doc": "a lab flask with liquid; fill 0..1", "words": ["flask"], "params": []},
    "clock":     {"doc": "a clock; set value (0..1 turns) or count (hours) to move the hands", "words": ["clock"], "params": []},
    "dial":      {"doc": "a gauge with a red needle; set value 0..1", "words": ["dial", "gauge"], "params": []},
    "scale":     {"doc": "a balance; set value -1..1 tilts it; left/right = short labels on the pans", "words": ["balance", "scale"], "params": ["left", "right"]},
    "building":  {"doc": "a generic columned agency building; text = lettering (default FDA); the stamp action slams a red stamp", "words": ["fda"], "params": ["text"]},
    "clipboard": {"doc": "a clipboard checklist; rows = up to 5 short row labels; count 0..n ticks the rows", "words": ["checklist", "questionnaire", "clipboard"], "params": ["rows"]},
    "person":    {"doc": "a friendly provider figure", "words": ["provider", "doctor", "pharmacist"], "params": []},
    "coin":      {"doc": "a coin; text = what is printed on it", "words": ["coin"], "params": ["text"]},
    "radio":     {"doc": "a radio; waves rise when value or glow is on", "words": ["radio", "static"], "params": []},
    "bubble":    {"doc": "a chat-bubble chip; text = a few characters", "words": [], "params": ["text"]},
    "card":      {"doc": "a document card; text = title, sub = a second line", "words": [], "params": ["text", "sub"]},
    "shield":    {"doc": "a shield; text = symbol such as a check", "words": ["shield"], "params": ["text"]},
    "magnifier": {"doc": "a magnifying glass", "words": ["magnifying"], "params": []},
    "arrow":     {"doc": "a 3D arrow; length, rotate (degrees)", "words": [], "params": ["length", "rotate"]},
    "meter":     {"doc": "a horizontal bar meter; set value 0..1; text = label", "words": [], "params": ["text"]},
    "counter":   {"doc": "a big counter disc; the count action makes the number count up or down; text = unit label", "words": [], "params": ["text"]},
    "shape":     {"doc": "a generic shape for your own metaphor; shape = sphere|box|cylinder|torus|cone", "words": [], "params": ["shape"]},
}
# which kinds an action can target (None = any)
ACTIONS = {
    "show": None, "hide": None, "move": None, "scale": None, "glow": None, "color": None, "label": None, "shake": None, "burst": None, "spin": {"pill", "coin", "chain", "shape"},
    "fill": {"stomach", "vial", "flask", "chain"}, "widen": {"vessel"}, "open": {"lock", "enzyme"}, "close": {"lock", "enzyme"},
    "set": {"dial", "scale", "meter", "clock", "radio"}, "count": {"clipboard", "clock", "counter"}, "stamp": {"building"}, "cross": None, "tick": None,
    "travel": None, "connect": None,
}
ACTION_DOC = {
    "show": '{"at":"word","do":"show","who":"id"}  introduces the actor on that spoken word (REQUIRED once per actor)',
    "hide": '{"do":"hide","who":"id"}', "move": '{"do":"move","who":"id","to":"slot|[x,y]"}',
    "scale": '{"do":"scale","who":"id","to":1.4}', "glow": '{"do":"glow","who":"id"} (add "keep":true to stay lit)',
    "color": '{"do":"color","who":"id","to":"#d9363e"}', "label": '{"do":"label","who":"id","text":"short caption"}',
    "shake": '{"do":"shake","who":"id"}', "burst": '{"do":"burst","who":"id"} a ring of light', "spin": '{"do":"spin","who":"id","speed":2}',
    "fill": '{"do":"fill","who":"id","to":0.8}', "widen": '{"do":"widen","who":"id","to":1}', "open": '{"do":"open","who":"id"} / "close"',
    "set": '{"do":"set","who":"id","to":0.7}', "count": '{"do":"count","who":"id","to":3}', "stamp": '{"do":"stamp","who":"id","text":"NOT FDA-APPROVED"}',
    "cross": '{"do":"cross","who":"id"} a big red X over the actor (a rejected / not-allowed thing)', "tick": '{"do":"tick","who":"id"} a green check badge (an approved / done thing)',
    "travel": '{"do":"travel","from":"id","to":"id","count":4,"icon":"bubble:!"} small icons fly from one actor to another', "connect": '{"do":"connect","from":"id","to":"id"} a line grows between two actors',
}
MAX_ACTORS, MAX_ACTIONS, MIN_ACTIONS = 3, 14, 6
BG3D = ["honeycomb", "tunnel", "orbits", "grid", "bubbles"]
WIDE = {"vessel", "building", "scale", "meter", "radio"}       # at most one per beat; they take the centre column
ACTOR_FIELDS = {"id", "kind", "at", "size", "label", "color", "visible", "mentions", "text", "sub", "n", "fill", "widen", "value", "left", "right", "rows", "length", "rotate", "shape"}

def norm(w):
    return re.sub(r"[^a-z0-9'-]", "", w.lower())

def words_of(text):
    return [norm(w) for w in text.split() if norm(w)]

def cue_index(words, key):
    """Index of the word where cue KEY is spoken (phrase, optional '#n'), or None. Mirrors cueAt in ui.ts."""
    phrase, _, nth = key.partition("#"); n = int(nth) if nth.isdigit() else 1
    parts = phrase.lower().split(); c = 0
    if not parts: return None
    for i in range(len(words)):
        if all(i + j < len(words) and (p in words[i + j] if j == 0 else (words[i + j] == p or p in words[i + j])) for j, p in enumerate(parts)):
            c += 1
            if c == n: return i
    return None

def whole_word(words, phrase):
    """Exact whole-word match of a word or phrase (so 'block' never matches 'lock')."""
    parts = phrase.lower().split()
    return any(words[i:i + len(parts)] == parts for i in range(len(words) - len(parts) + 1))

def sentence_ranges(text):
    """Token index ranges [(start, end_exclusive)] of each sentence, matching words_of tokenization."""
    out, i = [], 0
    for sent in re.split(r"(?<=[.!?])\s+", text.strip()):
        n = len(words_of(sent))
        if n: out.append((i, i + n)); i += n
    return out

def apply_layout(actors):
    """Assign non-overlapping positions (the writer never positions anything, so nothing can collide or run off the edge).
    Compact actors sit left/right (or top-left/top-right/bottom); a wide actor takes the centre column."""
    wide = [a for a in actors if a.get("kind") in WIDE]; comp = [a for a in actors if a.get("kind") not in WIDE]; out = []
    if wide:
        w = wide[0]
        if len(comp) == 2: slots = [(-2.8, 2.0), (2.8, 2.0)]; wpos = (0, -1.5)
        else: slots = [(0, 2.0)]; wpos = (0, -1.5)
        for a, p in zip(comp, slots): out.append({**a, "at": list(p), "size": a.get("size", 1) if a.get("size", 1) <= 1.2 else 1.2})
        out.append({**w, "at": list(wpos), "size": 1})
    else:
        slots = [(-2.9, 0.1), (2.9, 0.1)] if len(comp) == 2 else [(-2.8, 1.7), (2.8, 1.7), (0, -1.9)]
        for a, p in zip(comp, slots): out.append({**a, "at": list(p), "size": a.get("size", 1) if a.get("size", 1) <= 1.2 else 1.2})
    by = {a["id"]: a for a in out}
    return [by[a["id"]] for a in actors]

def _pos_ok(at):
    if at is None: return True
    if isinstance(at, str): return at in SLOTS
    return isinstance(at, (list, tuple)) and len(at) == 2 and all(isinstance(v, (int, float)) for v in at) and abs(at[0]) <= 4.6 and abs(at[1]) <= 3.2

def _xy(at):
    if isinstance(at, str): return SLOTS[at]
    return tuple(at) if at else SLOTS["c"]

def validate_beat(beat, label="beat"):
    """-> list of error strings (empty = valid)."""
    E = []; text = beat.get("text", "")
    if not isinstance(text, str) or len(text.split()) < 8: return [f"{label}: narration text is missing or too short"]
    words = words_of(text); actors = beat.get("actors") or []; script = beat.get("script") or []
    if not (2 <= len(actors) <= MAX_ACTORS): E.append(f"{label}: use 2 to {MAX_ACTORS} actors (got {len(actors)})")
    if not (MIN_ACTIONS <= len(script) <= MAX_ACTIONS): E.append(f"{label}: use {MIN_ACTIONS} to {MAX_ACTIONS} actions (got {len(script)}); the picture must keep moving with the words")
    if beat.get("bg3d", "honeycomb") not in BG3D: E.append(f"{label}: bg3d must be one of {BG3D}")
    ids = {}
    for a in actors:
        if not isinstance(a, dict) or "id" not in a or "kind" not in a: E.append(f"{label}: every actor needs id and kind"); continue
        if a["kind"] not in CATALOG: E.append(f"{label}: unknown actor kind '{a['kind']}' (allowed: {', '.join(CATALOG)})"); continue
        if a["id"] in ids: E.append(f"{label}: duplicate actor id '{a['id']}'")
        bad = set(a) - ACTOR_FIELDS
        if bad: E.append(f"{label}: actor '{a['id']}' has unknown fields {sorted(bad)}")
        if a['kind'] in WIDE and sum(1 for x in actors if isinstance(x, dict) and x.get('kind') in WIDE) > 1: E.append(f"{label}: use at most one wide actor (vessel, building, scale, meter, radio) per beat")
        if a.get("visible"): E.append(f"{label}: actor '{a['id']}' must be introduced with a show action, not visible:true")
        sz = a.get("size", 1)
        if not isinstance(sz, (int, float)) or not (0.6 <= sz <= 1.4): E.append(f"{label}: actor '{a['id']}' size must be 0.6 to 1.4")
        ids[a["id"]] = a
        for k in ("label", "text", "sub", "left", "right"):
            if k in a and (not isinstance(a[k], str) or len(a[k]) > 28): E.append(f"{label}: actor '{a['id']}' {k} must be text of at most 28 characters")
        if a["kind"] == "clipboard" and not (isinstance(a.get("rows"), list) and 1 <= len(a["rows"]) <= 5 and all(isinstance(r, str) and len(r) <= 24 for r in a["rows"])): E.append(f"{label}: clipboard '{a['id']}' needs rows: 1 to 5 short strings")
        ments = a.get("mentions")
        if not (isinstance(ments, list) and ments and all(isinstance(m, str) and cue_index(words, m) is not None for m in ments)):
            E.append(f"{label}: actor '{a['id']}' must list `mentions`: words/phrases the narration really says that this actor illustrates")
    shown = {}
    for k, s in enumerate(script):
        if not isinstance(s, dict) or "do" not in s or "at" not in s: E.append(f"{label}: action {k + 1} needs do and at"); continue
        d = s["do"]
        if d not in ACTIONS: E.append(f"{label}: action {k + 1} unknown verb '{d}' (allowed: {', '.join(ACTIONS)})"); continue
        if cue_index(words, str(s["at"])) is None: E.append(f"{label}: action {k + 1} fires on '{s['at']}', which the narration does not say (it must be a word or phrase in the text; use word#2 for the second time it is said)"); continue
        if d in ("travel", "connect"):
            for end in ("from", "to"):
                if s.get(end) not in ids: E.append(f"{label}: {d} action {k + 1} {end} must be an actor id")
            continue
        w = s.get("who")
        if w not in ids: E.append(f"{label}: action {k + 1} targets unknown actor '{w}'"); continue
        allowed = ACTIONS[d]
        if allowed is not None and ids[w]["kind"] not in allowed: E.append(f"{label}: '{d}' cannot target a {ids[w]['kind']} (it works on {sorted(allowed)})")
        if d in ("fill", "widen", "set", "count") and not isinstance(s.get("to"), (int, float)): E.append(f"{label}: action {k + 1} '{d}' needs a numeric `to`")
        if d == "move" and not _pos_ok(s.get("to")): E.append(f"{label}: move action {k + 1} needs `to` as a slot or [x, y]")
        if d in ("label", "stamp") and (not isinstance(s.get("text"), str) or not s["text"] or len(s["text"]) > 28): E.append(f"{label}: '{d}' action {k + 1} needs short text (at most 28 characters)")
        if d == "show":
            shown.setdefault(w, s)
            base = str(s["at"]).partition("#")[0].lower()
            ments = [m.lower() for m in (ids[w].get("mentions") or [])]
            if not any(base == m or base in m.split() or m in base for m in ments): E.append(f"{label}: actor '{w}' is introduced on '{base}', which is not one of its `mentions` {ments}: introduce an actor on the word that names it")
    for i in ids:
        if i not in shown: E.append(f"{label}: actor '{i}' is never introduced (add a show action on the word that names it)")
    # every sentence needs a visual beat
    for n, (a, b) in enumerate(sentence_ranges(text), 1):
        hits, shows = 0, 0
        for s in script:
            if isinstance(s, dict) and "at" in s:
                ix = cue_index(words, str(s["at"]))
                if ix is not None and a <= ix < b:
                    hits += 1; shows += s.get("do") == "show"
        has = hits >= 2
        if not has: E.append(f"{label}: sentence {n} ('{' '.join(text.split()[a:b])[:60]}...') has fewer than 2 animations fired inside it; every sentence needs at least two (something appears AND something changes)")
    # strong nouns in the narration need the right actor
    kinds = {a.get("kind") for a in ids.values()}
    for kind, meta in CATALOG.items():
        for w in meta["words"]:
            if whole_word(words, w) and kind not in kinds:
                E.append(f"{label}: the narration says '{w}' but there is no {kind} actor; show it (or rephrase the narration)"); break
    for st in beat.get("stages") or []:
        if not (isinstance(st, dict) and isinstance(st.get("t"), str) and len(st["t"]) <= 30 and cue_index(words, str(st.get("at", ""))) is not None): E.append(f"{label}: each stage needs a short `t` label and an `at` word the narration says")
    return E

def onscreen_texts(beat):
    """Every string drawn on screen by a beat (so the compliance gate lints it like voiceover)."""
    out = []
    for a in beat.get("actors") or []:
        for k in ("label", "text", "sub", "left", "right"):
            if isinstance(a.get(k), str): out.append(a[k])
        out += [r for r in (a.get("rows") or []) if isinstance(r, str)]
        if a.get("kind") == "building" and not a.get("text"): out.append("FDA")
    for s in beat.get("script") or []:
        for k in ("text", "label"):
            if isinstance(s.get(k), str): out.append(s[k])
        ic = s.get("icon")
        if isinstance(ic, str) and ic.startswith("bubble:"): out.append(ic[7:])
    out += [st["t"] for st in beat.get("stages") or [] if isinstance(st, dict) and isinstance(st.get("t"), str)]
    return [t for t in out if t]

def to_visual(beat, bg="ink", hold_s=0.7):
    actors = apply_layout(beat["actors"]); first = actors[0]["id"]
    actors[0] = {**actors[0], "visible": True}                      # the first actor is on screen from the start of the beat: never an empty frame
    script = [x for x in beat["script"] if not (x.get("do") == "show" and x.get("who") == first)]
    return {"type": "stage3d", "bg": bg, "bg3d": beat.get("bg3d", "honeycomb"), "hold_s": hold_s, "actors": actors, "script": script, "stages": beat.get("stages") or [], "texts": onscreen_texts(beat)}

def catalog_doc():
    kinds = "\n".join(f"  - {k}: {m['doc']}" + (f" [params: {', '.join(m['params'])}]" if m["params"] else "") for k, m in CATALOG.items())
    acts = "\n".join(f"  - {v}" for v in ACTION_DOC.values())
    return f"ACTOR KINDS:\n{kinds}\n\nACTIONS (each fires on a spoken word via \"at\"):\n{acts}\n\nPOSITIONS ARE AUTOMATIC: never set \"at\" on an actor. List actors in order (first = left / top-left). Wide actors (vessel, building, scale, meter, radio) go in the centre column."
