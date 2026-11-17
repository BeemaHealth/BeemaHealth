"""Write a NEW video for a topic: script + storyboard, by headless Claude, validated before anything is synthesized.

The writer never sees a library script to adapt: it is given the product facts, the verified claims it may rely on, the topics
already done (to avoid), the search phrases people use, and the stage catalog. Output is JSON validated by storyboard.validate_beat
(narration <-> animation match), topic_log.check_unique (never a repeat or a rewrite) and the word budget. Failures go back to the
writer with specific errors, up to `attempts` times.
"""
from __future__ import annotations
import json, re, subprocess, tempfile
from .common import ROOT, config, products, claims, jload, jsave
from . import storyboard as sb, topic_log, styles

VERIFIED = ("verified", "verified_by_matt", "verified_basic_pharmacology", "general_education")
WORDS_MIN, WORDS_MAX = 58, 92          # spoken words in hook + beats + CTA (the disclosure adds about 9 s; real duration is checked after synthesis)

CAT_CLAIM_HINTS = {
    "ed": ("pde5", "nitrate", "priapism", "vision", "stimulation", "mints", "ed_", "generic", "process", "compounded", "mechanism"),
    "glp1": ("glp1", "tirz", "gut_", "semag", "hunger", "compounded", "process", "metaphor", "mechanism"),
    "peptide": ("bpc",),
}

def relevant_claims(product):
    P = products()[product]; cl = claims(); hints = CAT_CLAIM_HINTS.get(P["category"], ())
    pick = {k: v for k, v in cl.items() if any(h in k.lower() for h in hints)}
    return pick or cl

def build_prompt(product, cand, phrases, date, slot, style, feedback=None, prior_bad=None):
    """The writer is BLIND to every existing video, script, example and topic list. It gets: product facts, verified claims, a shortlist of
    questions people search (already filtered by code against the topic log), the stage catalog, and a random creative brief."""
    P = products()[product]; cfg = config(); slug = P["landing_path"].lstrip("/")
    cl = relevant_claims(product)
    claim_lines = "\n".join(f"  - {k}: {v['text']}  [{v['status']}]" for k, v in cl.items())
    search = "\n".join(f"  - {x}" for x in phrases[:10])
    peptide = P["category"] == "peptide"
    price = styles.price_for(product) if style.get("price") else None
    if peptide:
        cta_rule = ("EDUCATION ONLY. cta.text is a neutral closing line in your own words with NO link, no brand, no price, no offer, no provider/prescribing words, no call to act. cta.screen is a 2-4 word pill such as 'For education only'.")
    elif price:
        line = (f"Our starter pack is ${price['amount']} a month" if product == "tirzepatide" else f"Plans start at ${price['amount']} a month")
        cta_rule = (f"PRICE VIDEO. cta.text is two short sentences in your own words. It must state the price exactly as '${price['amount']} a month' (for example: '{line}.'), invite the viewer to see more plans, and end with: 'beemahealth dot com slash {slug}' (say it exactly like that). Say 'Beema Health' once, here only. No discounts, no savings, no 'cheaper', no comparison, no promise of a result. cta.screen is a 2-4 word pill that is NOT the URL.")
    else:
        cta_rule = (f"EDUCATION VIDEO: no price, no offer. cta.text is one or two short sentences in your own words, saying 'Beema Health' once, ending with: 'beemahealth dot com slash {slug}' (say it exactly like that). cta.screen is a 2-4 word pill that is NOT the URL.")
    rules = f"""You write one short-form video for Beema Health, a telehealth company (15-45 seconds, 9:16, voice-over plus 3D animation). Product: {P['label']}.
Product facts: category {P['category']}; {'compounded and NOT FDA-approved' if P['compounded'] else 'FDA-approved generic'}. Mechanism note: {P['mechanism']}
{'Required disclosure (the system adds it, do NOT write it): ' + P['disclosure_required'] if P.get('disclosure_required') else ''}

YOU HAVE SEEN NO OTHER VIDEO. Do not try to imitate anything. Invent. The video must feel like it came from a different creative team than any other: its own idea, its own images, its own rhythm.

CREATIVE BRIEF FOR THIS VIDEO (follow it; it was drawn at random so every video is different):
  - HOOK STYLE: {style['hook_style']}
  - STRUCTURE: {style['format']}
  - VISUAL WORLD to borrow images from: {style['world']} (use it as the metaphor for the whole video when the structure says analogy, and as a flavour of imagery otherwise)
  - PURPOSE: {'a PRICE video: the education is short and the last line states the price' if price else 'EDUCATION: teach one interesting thing well. This is not an ad.'}

TOPIC: pick ONE of these real search questions (the one you can make most interesting from the claims below), and answer it:
{search}
If none can be answered from the claims, write the closest question you can answer.

CLAIMS YOU MAY RELY ON (put the ids in each beat's "claims"):
{claim_lines}
If a beat needs another fact, add it under "new_claims": [{{"text": "...", "source": "where it comes from"}}]. Basic, well-established facts only. Never invent numbers.

NARRATION: written for the ear, conversational, vivid, with a point of view. Hook of at most 14 words, then 3 beats (1-2 sentences, 12-26 words each), then the closing line. Total spoken words {WORDS_MIN}-{WORDS_MAX}. The words "Beema" and "Beema Health" appear ONLY in the closing line, nowhere before it. No em dashes. Never name a brand-name drug (Ozempic, Wegovy, Zepbound, Mounjaro, Viagra, Cialis ...). Mechanism wording only; NEVER promise or imply a result, speed, strength, or performance; no weight numbers, no before/after, no testimonials, no dosing, no timing; no "studies show"; never imply FDA approval for a compounded product; say what is unknown when it is unknown.
CLOSING LINE: {cta_rule}

ANIMATION (the most important part; the video is judged on how much 3D animation is locked to the words). The picture must never sit still: in every beat something shows, changes or moves on nearly every phrase, and every actor takes part in at least two actions (a show plus a change such as glow, shake, widen, fill, set, count, cross, tick, travel, connect, burst, stamp, spin). Every beat has a storyboard that ACTS OUT WHAT THE NARRATION SAYS, word by word, as a visual metaphor you invent. Do not show literal nouns when a better picture exists: think like a motion designer with a big budget. Every spoken idea gets its own distinct picture: something visibly appears, changes, moves, breaks, connects, fills or wins on the exact word. The camera never needs to move; the objects do. Make it surprising. Rules the validator enforces:
  1. every actor lists "mentions": the words it illustrates, and is introduced by a "show" action on one of them;
  2. every action's "at" is a word or short phrase really in that beat's text ("word#2" for its second occurrence);
  3. every SENTENCE has at least TWO actions fired inside it, and the first sentence of a beat shows at least two different actors (never an empty or single-object screen while the voice is talking);
  4. if the narration says brain, stomach, gut, blood vessel(s), meal, chain/peptide/amino acids, receptor, lock, key, enzyme, pill/tablet, vial, flask, clock, dial, balance/scale, FDA, provider/doctor, radio, checklist, there must be an actor of that kind in the beat;
  5. 2 to {sb.MAX_ACTORS} actors and {sb.MIN_ACTIONS} to {sb.MAX_ACTIONS} actions per beat, at most ONE wide actor (vessel, building, scale, meter, radio); never set positions, actors are laid out automatically (first listed = left / top-left); labels and text at most 28 characters;
  6. fire actions about 0.5 s or more apart.
Use "orb", "shape", "card", "counter" and "bubble" actors with your own "text" to stand for anything the catalog has no object for (a mail truck, a conductor, a ticket gate): label it with 1-3 words.
BACKDROP: give each beat a "bg3d" that suits the scene and differs from the previous beat: {', '.join(sb.BG3D)}.
{sb.catalog_doc()}

HOOK PICTURE: the hook gets one big actor on screen from the first frame: "hook_visual": {{"kind": <actor kind>, "text": <1-3 words, optional>, "do": one of glow|shake|burst|cross|tick|widen, "at": <a word really in your hook>}}.

OUTPUT: reply with ONLY one JSON object, no prose, no code fences:
{{"topic": {{"question": "<the question you answer>", "summary": "<one line>"}},
 "hook": "<hook text>", "hook_visual": {{"kind": "...", "text": "...", "do": "...", "at": "..."}},
 "beats": [ {{"text": "<narration>", "bg3d": "<backdrop>", "actors": [{{"id": "...", "kind": "...", "mentions": ["..."]}}], "script": [{{"at": "<word>", "do": "<verb>", "who": "<actor id>"}}], "stages": [{{"t": "<short on-screen label>", "at": "<word>"}}], "claims": ["<claim id>"], "new_claims": []}}, <beat 2>, <beat 3> ],
 "cta": {{"text": "<closing line>", "screen": "<2-4 word pill>"}},
 "caption_body": "<one plain sentence for the social caption, at most 180 characters, no hashtags>"}}
Date: {date}, video {slot} of tonight."""
    if feedback:
        rules += "\n\nYOUR PREVIOUS ANSWER WAS REJECTED. Fix every problem below and return the complete corrected JSON:\n" + "\n".join(f"  - {e}" for e in feedback[:14])
        if prior_bad: rules += "\n\nYour previous JSON, for reference:\n" + prior_bad[:6000]
    return rules

def call_llm(prompt, timeout=900):
    """Headless Claude. Run from a temp dir so no repo instructions are loaded; the writer needs no tools."""
    r = subprocess.run(["claude", "-p", "--output-format", "text"], input=prompt, capture_output=True, text=True, timeout=timeout, cwd=tempfile.gettempdir())
    if r.returncode != 0: raise RuntimeError(f"claude -p failed ({r.returncode}): {(r.stderr or r.stdout)[-300:]}")
    return r.stdout

def parse_json(text):
    a, b = text.find("{"), text.rfind("}")
    if a < 0 or b <= a: raise ValueError("no JSON object in the reply")
    return json.loads(text[a:b + 1])

def spoken_words(spec):
    return len((spec.get("hook", "") + " " + " ".join(b.get("text", "") for b in spec.get("beats", [])) + " " + spec.get("cta", {}).get("text", "")).split())

def _blind(errors):
    """Uniqueness failures are reported WITHOUT quoting or naming the existing video: the writer must never see old work."""
    out = []
    for e in errors:
        if e.startswith("topic too close"): out.append("that question has already been covered; answer a different question from the list")
        elif e.startswith("hook is too close"): out.append("the hook is too close to an existing one; write a completely different hook, in a different style")
        elif e.startswith("narration sentence"): out.append("a narration sentence is too close to existing wording: " + e.split('"')[1] + ". Say it in completely new words with a different image")
        else: out.append("this tells a story that has already been told; invent a completely different story, structure, imagery and vocabulary for this topic")
    return list(dict.fromkeys(out))

def validate_spec(product, spec, cfg=None, style=None):
    """-> list of error strings."""
    E = []; P = products()[product]; cl = claims()
    if not isinstance(spec, dict): return ["the reply must be one JSON object"]
    q = ((spec.get("topic") or {}).get("question") or "").strip()
    hook = (spec.get("hook") or "").strip()
    beats = spec.get("beats") or []; cta = spec.get("cta") or {}
    if not q: E.append("topic.question is missing")
    if not hook or len(hook.split()) > 14: E.append("hook is missing or longer than 14 words")
    if not (3 <= len(beats) <= 4): E.append(f"use 3 beats (got {len(beats)})")
    for i, b in enumerate(beats, 1):
        E += sb.validate_beat(b, f"beat {i}")
        ids = [c for c in (b.get("claims") or [])]; nc = b.get("new_claims") or []
        if not ids and not nc: E.append(f"beat {i}: list the claim ids it relies on (or new_claims)")
        for c in ids:
            if c not in cl: E.append(f"beat {i}: unknown claim id '{c}' (use one from the list, or add it under new_claims)")
        for c in nc:
            if not (isinstance(c, dict) and isinstance(c.get("text"), str) and len(c["text"]) > 12): E.append(f"beat {i}: each new_claim needs text")
    if not cta.get("text") or not cta.get("screen"): E.append("cta.text and cta.screen are required")
    elif P["category"] == "peptide":
        pass                                                        # the peptide_ad_like gate rule is the authority; it BLOCKs links, prices, offers, provider words
    else:
        slug = P["landing_path"].lstrip("/")
        if f"beemahealth dot com slash {slug}".lower() not in cta["text"].lower(): E.append(f"cta.text must include exactly 'beemahealth dot com slash {slug}'")
        if "beemahealth" in cta["screen"].lower() or ".com" in cta["screen"].lower(): E.append("cta.screen must not be the URL")
    early = " ".join([hook] + [b.get("text", "") for b in beats]).lower()
    if "beema" in early: E.append("the brand name may appear ONLY in the closing line; remove it from the hook and the beats")
    hv = spec.get("hook_visual")
    if not isinstance(hv, dict) or hv.get("kind") not in sb.CATALOG or hv.get("do") not in ("glow", "shake", "burst", "cross", "tick", "widen") or not isinstance(hv.get("at"), str) or hv["at"].lower() not in hook.lower():
        E.append(f"hook_visual needs kind (one of the actor kinds), do (glow|shake|burst|cross|tick|widen) and at (a word that is really in the hook)")
    if style and style.get("price") and not P["category"] == "peptide":
        pr = styles.price_for(product)
        if pr and f"${pr['amount']}" not in cta.get("text", ""): E.append(f"this is a price video: the closing line must state ${pr['amount']} a month")
    elif not style or not style.get("price"):
        if "$" in cta.get("text", "") or "$" in (hook + early): E.append("this is an education video: no price anywhere")
    n = spoken_words(spec)
    if not (WORDS_MIN <= n <= WORDS_MAX): E.append(f"spoken words are {n}; the hook + beats + cta must total {WORDS_MIN}-{WORDS_MAX} words so the video lands in 15-45 s")
    cap = spec.get("caption_body", "")
    if not isinstance(cap, str) or not (20 <= len(cap) <= 180): E.append("caption_body must be one sentence of 20-180 characters")
    if any(chr(0x2014) in s for s in [hook, cap, cta.get("text", "")] + [b.get("text", "") for b in beats]): E.append("no em dashes anywhere; use a comma or a plain hyphen")
    if not E and q and hook:
        sents = [s for b in beats for s in re.split(r"(?<=[.!?])\s+", b["text"].strip()) if s]
        E += _blind(topic_log.check_unique(product, q, hook, sents) + topic_log.check_story(product, hook + " " + " ".join(b["text"] for b in beats)))
    return E

def generate(product, cand, phrases, date, slot, style, attempts=3, _llm=None, feedback=None, prior=None):
    """-> (spec, log) where log lists each attempt's errors. Raises RuntimeError if no attempt validates."""
    llm = _llm or call_llm; log = []
    for k in range(1, attempts + 1):
        raw = llm(build_prompt(product, cand, phrases, date, slot, style, feedback, prior))
        try:
            spec = parse_json(raw)
        except Exception as e:
            feedback = [f"the reply was not valid JSON ({e}); reply with ONLY the JSON object"]; prior = raw[:3000]; log.append({"attempt": k, "errors": feedback}); continue
        errs = validate_spec(product, spec, style=style)
        log.append({"attempt": k, "errors": errs})
        if not errs: return spec, log
        feedback = errs; prior = json.dumps(spec)[:6000]
    raise RuntimeError("the writer could not produce a valid script: " + "; ".join(log[-1]["errors"][:4]))

def _price(product, style):
    pr = styles.price_for(product) if style and style.get("price") else None
    return {k: pr[k] for k in ("label", "amount", "per", "fine")} if pr else None

def _price_claim(product, style):
    return styles.price_for(product)["claim"]

def _hook_visual(spec, style):
    hv = spec["hook_visual"]
    actor = {"id": "h", "kind": hv["kind"], "at": [0, 0.5], "size": 1.25, "visible": True, **({"text": hv["text"]} if hv.get("text") else {})}
    return {"type": "stage3d", "bg": "ink", "bg3d": (style or {}).get("hook_bg", "orbits"), "hold_s": 0.2, "actors": [actor], "script": [{"at": hv["at"], "do": hv["do"], "who": "h"}], "stages": [], "texts": [hv["text"]] if hv.get("text") else []}

def spec_to_parts(product, spec, date, slot, style=None):
    """Convert a validated spec to the (hook, meat, cta) dicts compose.build_package expects, and record proposed claims."""
    from .common import PREFIX
    P = products()[product]; pre = PREFIX[product]; tag = f"G{date.replace('-', '')}{slot}"
    proposed = jload(ROOT / "claims_proposed.json", {}) or {}; beats = []; claim_ids = []
    for i, b in enumerate(spec["beats"], 1):
        ids = list(b.get("claims") or [])
        for j, nc in enumerate(b.get("new_claims") or [], 1):
            cid = f"gen_{date.replace('-', '')}_{slot}_{i}{j}"
            proposed[cid] = {"text": nc["text"].strip(), "source": "AI-proposed by the nightly script writer: " + str(nc.get("source") or "no source given") + ". Needs a human check before it is trusted.", "status": "ai_proposed_unverified"}
            ids.append(cid)
        claim_ids += ids
        beats.append({"text": b["text"].strip(), "visual": sb.to_visual(b), "screen": None, "emph": []})
    jsave(ROOT / "claims_proposed.json", proposed)
    hook = {"id": f"{pre}-{tag}H", "product": product, "angle": "generated", "kind": "question" if spec["hook"].rstrip().endswith("?") else "statement", "text": spec["hook"].strip(), "review": None, "price_dependent": False, "est_seconds": 4,
            "visual": _hook_visual(spec, style)}
    meat = {"id": f"{pre}-{tag}M", "product": product, "title": spec["topic"]["question"], "style": "generated", "beats": beats, "claims": list(dict.fromkeys(claim_ids)),
            "review_flags": ["ai_written_script_review: the wording and the animation plan were written automatically; read both before posting"], "caption_bodies": [spec["caption_body"].strip()],
            "price_dependent": bool(style and style.get("price")), "notes": spec["topic"].get("summary", ""), "est_seconds": 30}
    cta = {"id": f"{pre}-{tag}C", "product": product, "title": "generated", "goal": "generated", "text": spec["cta"]["text"].strip(), "screen": spec["cta"]["screen"].strip(), "price": _price(product, style), "claims": [_price_claim(product, style)] if _price(product, style) else [], "no_url": bool(P.get("no_links")), "est_seconds": 6}
    return hook, meat, cta
