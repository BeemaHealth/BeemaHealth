"""A different LOOK, VOICE, HOOK and STRUCTURE for every nightly video, chosen by code (never by the writer, never copied from a past video).

The writer is blind to every existing video. All it receives is this brief, the product facts and the verified claims. The brief is
drawn at random from the options below, avoiding what the last videos used (recorded in the topic log under `style`), so two videos
in a row can never share a voice, a palette, a hook style or a structure.
"""
from __future__ import annotations
import hashlib, random
from .common import config, products

# name -> accent colours. ink = background tone. The brand honey palette is used ONLY on the end card.
PALETTES = {
    "teal night":  {"honey": "#2DD4BF", "honeyLight": "#8FF0E2", "honeyDeep": "#14A394", "ink": "#0A1A1F", "onHoney": "#04201C", "cream": "#E6FBF7", "creamSoft": "#F1FDFB"},
    "coral dusk":  {"honey": "#FF6B5E", "honeyLight": "#FFA096", "honeyDeep": "#D9483C", "ink": "#1D1013", "onHoney": "#2A0B08", "cream": "#FFE9E5", "creamSoft": "#FFF3F1"},
    "violet hour": {"honey": "#A78BFA", "honeyLight": "#C9B9FD", "honeyDeep": "#7C5FD6", "ink": "#130F25", "onHoney": "#150B33", "cream": "#EEE9FF", "creamSoft": "#F6F3FF"},
    "lime lab":    {"honey": "#A3E635", "honeyLight": "#C9F57A", "honeyDeep": "#7DB81C", "ink": "#0D1709", "onHoney": "#14230A", "cream": "#EFFBD3", "creamSoft": "#F7FDE6"},
    "sky blue":    {"honey": "#38BDF8", "honeyLight": "#86D8FC", "honeyDeep": "#1E96CF", "ink": "#091524", "onHoney": "#041B2B", "cream": "#E0F4FE", "creamSoft": "#EEF9FF"},
    "magenta pop": {"honey": "#F472B6", "honeyLight": "#F9A8D4", "honeyDeep": "#D14A90", "ink": "#1E0F18", "onHoney": "#2E0A1D", "cream": "#FDE7F2", "creamSoft": "#FEF2F8"},
    "emerald":     {"honey": "#34D399", "honeyLight": "#86EFC4", "honeyDeep": "#1BA574", "ink": "#08170F", "onHoney": "#04231A", "cream": "#DDF9EC", "creamSoft": "#EDFCF5"},
    "orange ember": {"honey": "#FB923C", "honeyLight": "#FDBA82", "honeyDeep": "#D9701A", "ink": "#1B120A", "onHoney": "#2B1604", "cream": "#FFEBD9", "creamSoft": "#FFF5EB"},
}
CAPTION_STYLES = ["box", "bare"]       # box = dark rounded panel; bare = big outlined words straight on the picture

HOOK_STYLES = [
    "a bold statement that sounds wrong until the video explains it",
    "a myth stated as if everyone believes it (the video then tests it)",
    "a quick either/or question the viewer answers in their head",
    "a number-led hook (use only a number that is in your facts, such as 'two' or 'one')",
    "starts mid-thought, as if the viewer walked in on the explanation ('Okay, so here's the odd part...')",
    "a direct challenge: 'Try to guess what...' / 'Bet you didn't know...'",
    "a tiny mystery: something strange that has an answer",
    "an everyday comparison opener ('It's basically a ...')",
    "a one-word or two-word punch followed by a short clarifier",
    "a 'nobody explains this part' confession",
    "a 'what if' scenario",
    "a plain, calm, curious question with no drama at all",
]
FORMATS = [
    "ONE EXTENDED ANALOGY: explain the whole idea through a single everyday world and never leave it; every beat is another scene in that world",
    "MYTH, TWIST, TRUTH: beat 1 states the common belief, beat 2 flips it, beat 3 gives the plain truth",
    "FOLLOW THE JOURNEY: follow one thing (a molecule, a signal, a message) from where it starts to where it ends, beat by beat",
    "DOMINO CHAIN: each beat is one step that causes the next, so the picture is a visible chain reaction",
    "SIDE BY SIDE: two things contrasted in every beat, always on screen together",
    "COUNTDOWN: three, two, one - three short points, each introduced by its number on screen",
    "ZOOM IN: beat 1 is the big picture, beat 2 zooms into the middle layer, beat 3 zooms into the tiny detail",
    "MINI MYSTERY: beat 1 sets a puzzle, beat 2 gives the clue, beat 3 reveals the answer",
]
WORLDS = ["a busy kitchen", "a post office sorting mail", "a city's traffic and roads", "an orchestra", "an airport", "a theme park",
          "a library", "a stadium and a game", "a farm", "a heist movie", "a radio station", "a train network", "a hotel front desk",
          "a construction site", "a space station", "a restaurant rush", "a courtroom", "a garden", "a switchboard of phone calls", "a lighthouse"]
VOICES = ["am_michael", "am_adam", "am_liam", "am_eric", "am_onyx", "af_heart", "af_nicole", "af_sarah", "af_bella", "bm_george", "bf_emma"]
SPEEDS = (1.0, 1.1)

PRICE_PHRASES = {   # the ONLY prices a video may state, from products.json (Matt's pricing sheet). Education videos never state a price.
    "tirzepatide": ("Starter pack", "starter_pack_price"),
    "sildenafil": ("Plans from", "price_from_sildenafil"),
    "tadalafil": ("Plans from", "price_from_tadalafil"),
    "ed-mints": ("Plans from", "price_from_ed_mints"),
}

def price_for(product):
    """-> {"label","amount","per","fine","claim"} or None when no verified numeric price may be used."""
    P = products()[product]
    if P["category"] == "peptide" or product not in PRICE_PHRASES: return None
    pr = P.get("prices") or {}
    label, claim = PRICE_PHRASES[product]
    if product == "tirzepatide" and (pr.get("starter_pack") or {}).get("per_month"):
        return {"label": label, "amount": pr["starter_pack"]["per_month"], "per": "month", "fine": "For new GLP-1 patients. Terms and more plans on the site.", "claim": claim}
    if pr.get("1mo_start"):
        return {"label": label, "amount": pr["1mo_start"], "per": "month", "fine": pr.get("included") or "Cash-pay, no insurance.", "claim": claim}
    return None

def _recent(entries, key, n):
    seen = [((e.get("style") or {}).get(key)) for e in entries if (e.get("style") or {}).get(key) is not None]
    return seen[-n:]

def pick(date, slot, product, entries, price_share=0.34):
    """Choose this video's brief. `entries` = topic-log entries (oldest first). Deterministic for (date, slot, product) so a retry keeps its look."""
    rnd = random.Random(int(hashlib.sha256(f"{date}|{slot}|{product}".encode()).hexdigest()[:12], 16))
    nightly = [e for e in entries if e.get("source") == "nightly"]
    def choose(options, key, avoid_n):
        avoid = set(map(str, _recent(nightly, key, avoid_n)))
        pool = [o for o in options if str(o) not in avoid] or list(options)
        return rnd.choice(pool)
    voice = choose(VOICES, "voice", 5)
    palette = choose(list(PALETTES), "palette", 5)
    out = {"voice": voice, "speed": round(rnd.uniform(*SPEEDS), 2), "palette": palette, "caption": choose(CAPTION_STYLES, "caption", 1),
           "hook_style": choose(HOOK_STYLES, "hook_style", 8), "format": choose(FORMATS, "format", 5), "world": choose(WORLDS, "world", 12)}
    pr = price_for(product); recent_price = _recent(nightly, "price", 2)
    out["price"] = bool(pr) and not any(recent_price) and rnd.random() < price_share
    return out

def look(style):
    """The part of a style the renderer needs."""
    return {"colors": dict(PALETTES[style["palette"]]), "caption": style["caption"], "palette": style["palette"]}
