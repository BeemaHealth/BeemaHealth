"""Compose a package: pick hook + meat + CTA, build segments, synthesize voice, time everything."""
from __future__ import annotations
import re, shutil, time, wave
import numpy as np
from .common import ROOT, OUT, REMOTION, config, products, brand, jsave, today, sha
from . import library, tts, lint, captions as cap

SR = tts.SR
ISI_SPOKEN = {
  "ed": "Important safety information. Do not take with nitrates or riociguat. Seek emergency care for an erection lasting more than four hours, or sudden vision or hearing loss. Common side effects include headache, flushing, and upset stomach. Tell your provider your full medical history.",
  "glp1": "Important safety information. Common side effects include nausea, vomiting, diarrhea, and constipation. Serious risks include pancreatitis, gallbladder problems, and thyroid tumor warnings. Not for people with a personal or family history of medullary thyroid cancer. Tell your provider your full medical history.",
}
ISI_SPOKEN_MINTS = "Important safety information. Compounded, not FDA-approved. Do not take with nitrates or riociguat. Seek emergency care for an erection lasting more than four hours, or sudden vision or hearing loss. Tell your provider your full medical history."

def _display_words(t): return t.split()

def _no_charge(P):
    nc = P.get("no_charge") or {}
    return nc.get("line") if nc.get("use", True) else None

def _spoken_disclosure(P, fmt):
    d = _spoken_disclosure_base(P, fmt); nc = _no_charge(P)
    if nc and fmt != "ad":
        d = d.replace("Prescribing is never guaranteed.", "Prescribing is never guaranteed, and " + nc[0].lower() + nc[1:])
    return d

def _spoken_disclosure_base(P, fmt):
    if fmt == "ad":
        if P["category"] not in ISI_SPOKEN and P["label"] != "ED Mints":
            raise ValueError(f"No important-safety-information script exists for category '{P['category']}'. Paid ads are not supported for it until one is written and approved.")
        return ISI_SPOKEN_MINTS if P["label"] == "ED Mints" else ISI_SPOKEN[P["category"]]
    if P["category"] == "peptide":
        return "This is general education, not medical advice. BPC-157 is not an FDA-approved drug."
    if P["category"] == "glp1":
        return "Compounded, not FDA-approved. Prescription required. Prescribing is never guaranteed."
    if P["compounded"]:
        return "Compounded, not FDA-approved. Prescription required. Not for use with nitrates. Prescribing is never guaranteed."
    return "Prescription required. Not for use with nitrates. Prescribing is never guaranteed."

def build_package(product, hook_id, meat_id, cta_id, fmt="organic", aspect="9x16", extra_ed_mints_mention=False, date=None, version=1, parts=None):
    """parts=(hook, meat, cta) dicts builds a video from a NEWLY WRITTEN script (nightly job) instead of library components."""
    P = products()[product]
    hook, meat, cta = parts if parts else (library.find(hook_id), library.find(meat_id), library.find(cta_id))
    assert {hook["product"], meat["product"], cta["product"]} == {product}, "components must belong to the product"
    segs = []
    segs.append({"id": "hook", "kind": "hook", "text": hook["text"], "visual": hook.get("visual") or {"type": "hook", "bg": "ink"}, "screen": None, "emph": []})
    for i, b in enumerate(meat["beats"], 1):
        segs.append({"id": f"b{i}", "kind": "beat", "text": b["text"], "visual": b["visual"], "screen": b.get("screen"), "emph": b.get("emph", [])})
    if extra_ed_mints_mention:
        segs.append({"id": "mints", "kind": "beat", "text": "Beema Health also offers ED Mints. They're compounded dissolving tablets with sildenafil and tadalafil, taken under the tongue. They are not FDA-approved, and your provider decides if they're appropriate.",
                     "visual": {"type": "product", "bg": "cream", "tags": ["ED Mints", "Compounded"], "photo": "engine/products/ed-mints-tadalafil-sildenafil-rdt.webp", "disclose": "Compounded. Not FDA-approved."},
                     "screen": "Also: ED Mints", "emph": ["ED Mints", "not FDA-approved"]})
    disc = _spoken_disclosure(P, fmt)
    if fmt == "ad":
        segs.append({"id": "isi", "kind": "isi", "text": disc, "visual": {"type": "isi", "bg": "ink"}, "screen": "Important Safety Information", "emph": []})
    segs.append({"id": "cta", "kind": "cta", "text": cta["text"].replace(" dot com slash ", ".com/").replace(" dot com", ".com").replace("beemahealth.com/ed mints", "beemahealth.com/ed-mints"),
                 "visual": {"type": "endcard", "bg": "ink"}, "screen": cta["screen"], "emph": []})
    if fmt != "ad":
        segs.append({"id": "disc", "kind": "disc", "text": disc, "visual": {"type": "endcard", "bg": "ink"}, "screen": None, "emph": []})
    claims = list(meat["claims"]) + list(cta.get("claims") or [])
    if _no_charge(P) and fmt != "ad": claims.append("no_charge_if_not_prescribed")
    if extra_ed_mints_mention: claims.append("mints_503b")
    flags = [f for f in meat["review_flags"] if f != "compounded_disclosure_required"] + ([hook["review"]] if hook.get("review") else []) + (["price_dependent"] if hook["price_dependent"] or meat["price_dependent"] else [])
    cfg = config()
    disc_lines = ["Prescription required", "Prescribing is never guaranteed"]
    if _no_charge(P) and fmt != "ad": disc_lines.append(_no_charge(P).rstrip("."))
    if P["compounded"]: disc_lines = ["Compounded. Not FDA-approved."] + disc_lines
    if P.get("educational"): disc_lines = ["Compounded. Not FDA-approved.", "For education only. Not medical advice."]
    if fmt == "ad": disc_lines.append("Adults 18+")
    pid = f"{today() if date is None else date}_{product}_{hook_id}_{meat_id}_{cta_id}_{fmt}{'_mints' if extra_ed_mints_mention else ''}_v{version}"
    pkg = {
        "id": pid, "date": date or today(), "product": product, "format": fmt, "aspect": aspect, "version": version,
        "hook_id": hook_id, "meat_id": meat_id, "cta_id": cta_id, "extra_ed_mints_mention": extra_ed_mints_mention,
        "creative_style": meat["style"], "hook_angle": hook["angle"], "segments": segs,
        "claims": claims, "review_flags": flags,
        "endcard": {"lines": [cta["screen"]] if (cta.get("no_url") or P.get("no_links")) else [cta["screen"], "beemahealth.com" + P["landing_path"]], "disclosures": disc_lines, "safety": P["safety_on_screen"],
                    "logo": brand()["logos"]["stacked"], "mark": brand()["logos"]["mark"],
                    "photo": P["photo"] or (P.get("photo_labeled") if cfg.get("use_labeled_photos") else None), "photo_labeled": bool(not P["photo"] and cfg.get("use_labeled_photos")), "hero": P.get("hook_hero"), "price": cta.get("price")},
        "safety_text": P["safety_on_screen"],
        "spoken_display": " ".join(s["text"] for s in segs),
        "onscreen_text": [], "captions": {},
    }
    on = []
    for s in segs:
        if s.get("screen"): on.append(s["screen"])
        v = s["visual"]
        for k in ("title", "myth", "fact", "foot", "disclose", "unit", "note"):
            if isinstance(v.get(k), str): on.append(v[k])
        if v.get("type") in ("chain3d", "story3d"): on.append(v.get("note") or ("Illustration, not the actual structure" if v.get("mode") in (None, "build", "origin") else "Illustration"))
        for k in ("tags", "items", "labels", "callouts", "stages", "texts"):
            for it in v.get(k, []) or []:
                on.append(it if isinstance(it, str) else it.get("t", ""))
        for r in v.get("rows", []) or []: on.append(f"{r['l']} {r['v']}")
    pr = pkg["endcard"].get("price")
    if pr: on += [pr["label"], f"${pr['amount']}/{pr['per']}"] + ([pr["fine"]] if pr.get("fine") else [])
    on += pkg["endcard"]["lines"] + pkg["endcard"]["disclosures"]
    pkg["onscreen_text"] = on
    pkg["captions"] = cap.build_captions(pkg, hook, meat)
    if pkg["endcard"]["photo_labeled"]:
        pkg["review_flags"].append("photo_brand_text: product bottle label shows a brand name (Generic Cialis/Viagra)")
    pkg["compliance"] = lint.lint_package(pkg)
    return pkg

def synthesize(pkg, outdir=None, cfg=None):
    cfg = cfg or config(); t0 = time.time()
    st = pkg.get("style")
    if st and st.get("voice"):                       # every nightly video has its own voice
        import copy; cfg = copy.deepcopy(cfg); cfg["voice"]["voice"] = st["voice"]; cfg["voice"]["speed"] = st.get("speed", cfg["voice"]["speed"])
    outdir = outdir or (OUT / pkg["id"]); outdir.mkdir(parents=True, exist_ok=True)
    pm = cfg["voice"]["pause_ms"]
    audio, t, words, hits, nsent, chars = [np.zeros(int(0.25 * SR), dtype=np.float32)], 0.25, [], 0, 0, 0      # 0.25 s lead-in: the first word is never cut off
    segs = pkg["segments"]
    for i, s in enumerate(segs):
        a, w, h, n = tts.synth_segment(s["text"], seed=pkg["id"] + s["id"], cfg=cfg)
        hits += h; nsent += n; chars += len(s["text"])
        s["t0"] = round(t, 3)
        for x in w: words.append({**x, "t0": round(t + x["t0"], 3), "t1": round(t + x["t1"], 3), "seg": s["id"]})
        audio.append(a); t += len(a) / SR
        s["t1"] = round(t, 3)
        nxt = segs[i + 1]["kind"] if i + 1 < len(segs) else None
        gap = {"hook": pm["hook_to_meat"], "beat": pm["beat"], "isi": pm["meat_to_cta"], "cta": 220}[s["kind"]] if s["kind"] in ("hook", "beat", "isi", "cta") else 0
        if s["kind"] == "beat" and nxt in ("cta", "isi", "disc"): gap = pm["meat_to_cta"]
        if nxt is None: gap = 0
        if nxt is not None: gap += float(s["visual"].get("hold_s", 0)) * 1000   # let a narration-driven animation finish
        audio.append(np.zeros(int(gap / 1000 * SR), dtype=np.float32)); t += gap / 1000
        s["end"] = round(t, 3)
    tail = 0.9
    audio.append(np.zeros(int(tail * SR), dtype=np.float32)); t += tail
    wav = np.concatenate(audio)
    wav = tts.humanize(wav)
    peak = float(np.max(np.abs(wav)) or 1.0)
    wav = wav * min(1.0, 0.89 / peak)
    p = outdir / "voice.wav"
    with wave.open(str(p), "wb") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR); f.writeframes((wav * 32767).astype("<i2").tobytes())
    pkg["words"] = words
    pkg["duration"] = round(t, 2)
    pkg["voice"] = {"provider": cfg["voice"]["provider"], "voice": cfg["voice"]["voice"], "file": str(p)}
    pkg["cost"] = {"tts_seconds": round(time.time() - t0, 2), "tts_chars": chars, "tts_sentences": nsent, "tts_cache_hits": hits,
                   "tts_usd": 0.0 if cfg["voice"]["provider"] == "kokoro" else None}
    return pkg

def to_props(pkg):
    """Props for the Remotion composition. Voice is copied into the Remotion public dir."""
    pub = REMOTION / "public" / "engine" / "tmp"; pub.mkdir(parents=True, exist_ok=True)
    dst = pub / f"{pkg['id']}.wav"; shutil.copyfile(pkg["voice"]["file"], dst)
    B = brand()
    return {"id": pkg["id"], "product": pkg["product"], "format": pkg["format"], "aspect": pkg["aspect"], "duration": pkg["duration"],
            "audio": f"engine/tmp/{pkg['id']}.wav", "segments": pkg["segments"], "words": pkg["words"], "endcard": pkg["endcard"],
            "brand": {"colors": B["colors"]}, "look": pkg.get("look"), "safeZones": B["safe_zones_9x16"], "seed": sha(pkg["id"])}
