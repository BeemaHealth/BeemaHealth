#!/usr/bin/env python3
"""Hand-built organic short: "Weight-loss care. Without the waiting room." (compounded semaglutide + tirzepatide intro, ~35 s, 9:16).

Matt's brief (2026-11-19): premium 35 s vertical Instagram Story, hook / two-category comparison / three benefit cards /
phone intake + pharmacy packaging + "Transparent cash-pay pricing. No separate membership fee." / logo + CTA to beemahealth.com/glp-1,
legible notice "Compounded medications are not FDA-approved. Prescription and availability depend on clinical review and applicable law."

This video names TWO products, so it is not a single-product library combination: it is built from its own parts (the
PeptideWorld pattern) and rendered by its own Remotion entry (src/wl_intro35/index.ts, composition WlIntro35), so no shared
engine file is edited. The package is gated as BOTH tirzepatide and semaglutide and the findings are merged.

    shorts/pde5-explainer/.venv/bin/python shorts/engine/tools/wl_intro35_build.py [--stills] [--preview] [--times 0,1.2,...]

Never renders the full-quality video (preview only until Matt OKs the script). Never posts anything anywhere.
"""
from __future__ import annotations
import argparse, copy, json, subprocess, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from beema_engine import compose, lint, captions as cap, firstframe      # noqa: E402
from beema_engine.common import OUT, REMOTION, jsave, jload, brand, products   # noqa: E402

PID = "2026-11-19_wl-intro35_semaglutide-tirzepatide_organic_v1"
ENTRY = "src/wl_intro35/index.ts"
COMP = "WlIntro35"
URL = "beemahealth.com/glp-1"
NOTICE = ["Compounded medications are not FDA-approved.", "Prescription and availability depend on clinical review and applicable law."]
CLAIMS_FILE = Path(__file__).with_name("wl_intro35_claims.json")

W3 = {"type": "world3d", "world": "wl_intro35"}
SEGMENTS = [
    ("hook", "hook", "Weight-loss care. Without the waiting room.", None),
    ("b1", "beat", "Two options a provider may consider: compounded semaglutide, or compounded tirzepatide, only after a clinical evaluation.", "Two treatment categories"),
    ("b2", "beat", "Start with an online medical intake. A licensed provider reviews it, and if you're approved, it's delivered.", "How it works"),
    ("b3", "beat", "All from your phone. If it's prescribed, it ships to your door. Transparent cash-pay pricing, no separate membership fee.", "Transparent cash-pay pricing. No separate membership fee."),
    ("cta", "cta", "Compounded medications aren't FDA-approved, and prescribing is never guaranteed. Explore your options at beemahealth.com/glp-1.", "Explore your weight-loss options"),
]
HOLD = {"b1": 0.25, "b2": 0.25, "b3": 0.45}

# Every string drawn on screen (3D chips, tiles, phone UI, headlines, end card) so the gate lints all of it.
ONSCREEN = [
    "Weight-loss care.", "Without the waiting room.",
    "Two treatment categories", "Compounded semaglutide", "Compounded tirzepatide", "Illustration",
    "Considered for weight management only after a clinical evaluation",
    "How it works", "Online medical intake", "Licensed provider review", "Prescription delivery, if approved",
    "Medical intake", "Health history", "Current medications", "Goals", "Submit for review",
    "All from your phone", "Ships to your door, if prescribed",
    "Transparent cash-pay pricing.", "No separate membership fee.", "Cash-pay", "No membership fee",
    "Explore your weight-loss options", URL,
] + NOTICE

CAPTION_BODY = ("Two options a licensed provider may consider for weight management, compounded semaglutide or compounded tirzepatide, "
                "only after a clinical evaluation. Online intake, provider review, delivery if prescribed. Transparent cash-pay pricing, no separate membership fee.")


def build():
    hook = {"id": "WL35-H", "product": "tirzepatide", "angle": "convenience", "text": SEGMENTS[0][2], "price_dependent": False}
    meat = {"id": "WL35-M", "product": "tirzepatide", "style": "process", "beats": [], "caption_bodies": [CAPTION_BODY], "claims": [],
            "review_flags": [], "price_dependent": False}
    segs = []
    for sid, kind, text, screen in SEGMENTS:
        v = dict(W3) if kind != "cta" else {"type": "endcard", "bg": "ink"}
        if sid in HOLD: v["hold_s"] = HOLD[sid]
        segs.append({"id": sid, "kind": kind, "text": text, "visual": v, "screen": screen, "emph": []})
    disc_lines = NOTICE + ["Prescription required. Prescribing is never guaranteed.", "You won't be charged if you aren't prescribed."]
    B = brand()
    pkg = {
        "id": PID, "date": "2026-11-19", "product": "tirzepatide", "products": ["semaglutide", "tirzepatide"], "format": "organic", "aspect": "9x16", "version": 1,
        "hook_id": "WL35-H", "meat_id": "WL35-M", "cta_id": "WL35-C", "extra_ed_mints_mention": False,
        "creative_style": "process", "hook_angle": "convenience", "segments": segs,
        "claims": ["process", "compounded_not_approved", "no_charge_if_not_prescribed"],
        "review_flags": [],
        "endcard": {"lines": ["Explore your weight-loss options", URL], "disclosures": ["Compounded. Not FDA-approved."] + disc_lines,
                    "safety": products()["tirzepatide"]["safety_on_screen"], "logo": B["logos"]["stacked"], "mark": B["logos"]["mark"],
                    "photo": None, "photo_labeled": False, "hero": None, "price": None},
        "safety_text": products()["tirzepatide"]["safety_on_screen"],
        "spoken_display": " ".join(s[2] for s in SEGMENTS),
        "onscreen_text": ONSCREEN + disc_lines, "captions": {},
        "style": {"voice": "am_michael", "speed": 1.13},
        "brief": "Matt 2026-11-19, video 1 of 4 (weight loss, 30-40 s, top priority)",
    }
    c = cap.build_captions(pkg, hook, meat)
    pkg["captions"] = json.loads(json.dumps(c).replace("beemahealth.com/tirzepatide", URL))
    return pkg


def gate(pkg):
    """Lint as tirzepatide AND semaglutide (semaglutide forbids any price), merge, then add this video's own claim/review items."""
    F = []
    for p in pkg["products"]:
        q = copy.deepcopy(pkg); q["product"] = p
        F += lint.lint_package(q)["findings"]
    own = jload(CLAIMS_FILE)
    for cid, c in own["claims"].items():
        if c["status"] not in ("verified", "verified_by_matt", "verified_basic_pharmacology", "general_education"):
            F.append({"level": "REVIEW", "rule": "claim_not_verified", "field": "claims", "msg": f"Claim '{cid}' status is '{c['status']}': {c['text']} ({c['source']})", "snippet": cid})
    for flag, msg in own["review_flags"].items():
        F.append({"level": "REVIEW", "rule": "component_flag", "field": "video", "msg": f"{flag}: {msg}", "snippet": flag})
    F = lint.dedupe(F)
    pkg["review_flags"] = list(own["review_flags"])
    pkg["claims_own"] = own["claims"]
    pkg["compliance"] = {"status": lint.status_of(F), "findings": F,
                         "counts": {"BLOCK": sum(f["level"] == "BLOCK" for f in F), "REVIEW": sum(f["level"] == "REVIEW" for f in F)},
                         "human_signoff": None, "note": "Automated pattern checks only (gated as tirzepatide and semaglutide). Not legal advice. A human must sign off before posting."}
    return pkg


def _remotion(args):
    r = subprocess.run(["npx", "remotion", *args, "--log=error"], cwd=REMOTION, capture_output=True, text=True)
    if r.returncode != 0: raise RuntimeError((r.stderr or r.stdout)[-2500:])


def write_props(pkg):
    props = compose.to_props(pkg)
    props["notice"] = NOTICE; props["url"] = URL
    d = OUT / pkg["id"]; d.mkdir(parents=True, exist_ok=True); jsave(d / "props.json", props)
    return d / "props.json"


def stills(pkg, times):
    pj = write_props(pkg); d = OUT / pkg["id"] / "stills"; d.mkdir(parents=True, exist_ok=True); outs = []
    for t in times:
        o = d / f"t{t:05.2f}.png"
        _remotion(["still", ENTRY, COMP, str(o), f"--props={pj}", f"--frame={int(round(t * 30))}", "--overwrite"]); outs.append(o)
    return outs


def preview(pkg):
    pj = write_props(pkg); d = OUT / pkg["id"]
    f0 = d / "first_frame.png"
    _remotion(["still", ENTRY, COMP, str(f0), f"--props={pj}", "--frame=0", "--overwrite"])
    blank, frac = firstframe.is_blank(f0); pkg.setdefault("checks", {})["first_frame_content"] = round(frac, 3)
    if blank: raise RuntimeError(f"first frame is blank ({frac:.3f})")
    out = d / "preview.mp4"; t0 = time.time()
    _remotion(["render", ENTRY, COMP, str(out), f"--props={pj}", "--codec=h264", "--crf=30", "--scale=0.4", "--overwrite"])
    pkg["render"] = {"file": str(out), "preview": True, "seconds": round(time.time() - t0, 1), "bytes": out.stat().st_size}
    return out


def cue_times(pkg):
    """Spoken time of every animation cue word (what the stills are taken at)."""
    keys = ["weight-loss", "without", "two", "semaglutide", "tirzepatide", "evaluation", "intake", "provider#2", "delivered",
            "phone", "ships", "door", "transparent", "membership", "medications", "explore"]
    ws = [(w["t0"], "".join(ch for ch in w["w"].lower() if ch.isalnum() or ch in "'-")) for w in pkg["words"]]
    out = {}
    for k in keys:
        word, _, nth = k.partition("#"); n = int(nth or 1); c = 0
        for t, w in ws:
            if w == word:
                c += 1
                if c == n: out[k] = t; break
    return out


def captions_md(pkg):
    c = pkg["captions"]
    return (f"# {pkg['id']}\n\n## Instagram / Facebook / Threads ({c['_lengths']['instagram_facebook_threads']} chars)\n\n{c['instagram_facebook_threads']}\n\n"
            f"## X ({c['_lengths']['x']} chars)\n\n{c['x']}\n\n## TikTok ({c['_lengths']['tiktok']} chars)\n\n{c['tiktok']}\n\n"
            f"## YouTube Shorts\n\nTitle: {c['youtube']['title']}\n\n{c['youtube']['description']}\n\nTags: {', '.join(c['youtube']['tags'])}\n")


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--stills", action="store_true"); ap.add_argument("--preview", action="store_true")
    ap.add_argument("--times"); ap.add_argument("--reuse", action="store_true", help="reuse voice/words from an existing package.json")
    a = ap.parse_args()
    d = OUT / PID
    if a.reuse and (d / "package.json").exists():
        pkg = jload(d / "package.json")
    else:
        pkg = gate(build())
        print(PID, "\n  compliance:", pkg["compliance"]["status"], pkg["compliance"]["counts"])
        for f in pkg["compliance"]["findings"]: print(f"   [{f['level']}] {f['rule']}: {f['msg'][:160]}")
        if pkg["compliance"]["status"] == "BLOCKED": print("BLOCKED. Fix the copy."); return 2
        pkg = compose.synthesize(pkg)
        print(f"  voice: {pkg['duration']}s")
        for s in pkg["segments"]: print(f"   {s['id']:5s} {s['t0']:6.2f} -> {s['end']:6.2f}  {s['text']}")
        jsave(d / "package.json", pkg)
        (d / "captions.md").write_text(captions_md(pkg)); (d / "compliance.json").write_text(json.dumps(pkg["compliance"], indent=2))
    cues = cue_times(pkg); print("  cues:", json.dumps(cues))
    if a.stills or a.times:
        ts = [float(x) for x in a.times.split(",")] if a.times else sorted({0.0} | {round(t + 0.6, 2) for t in cues.values()} | {round(pkg["duration"] - 0.5, 2)})
        for o in stills(pkg, ts): print("  still", o)
    if a.preview:
        out = preview(pkg); print("  preview:", out, pkg["render"])
        jsave(d / "package.json", pkg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
