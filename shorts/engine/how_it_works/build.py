"""Build the Beema Health 'How It Works' Instagram Story video (generic, no product) with compose.build_package and own parts.

Self-contained on purpose: the generic product entry and its claims live in this folder and are merged IN MEMORY over the shared
products.json / claims.json (nothing shared is edited). The 3D world is a separate Remotion entry (src/howitworks/index.ts,
composition HowClip9x16) so the shared Clip/visuals code is untouched.

Run from the repo root:
  shorts/pde5-explainer/.venv/bin/python shorts/engine/how_it_works/build.py [--version N] [--synth-only] [--stills auto|t1,t2] [--preview]
Never renders the full-quality video unless --full is passed (only after Matt OKs the script). Never posts anything anywhere.
"""
from __future__ import annotations
import argparse, json, re, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

from beema_engine import common, compose, lint, captions, firstframe          # noqa: E402
from beema_engine.common import OUT, REMOTION, jload, jsave                     # noqa: E402

PRODUCT = "how-it-works"
ENTRY = "src/howitworks/index.ts"
COMP = "HowClip9x16"
DATE = "2026-11-19"

# ------------------------------------------------------------------ in-memory registry overlay (shared files untouched)
_base_products, _base_claims = common.products, common.claims
def products():
    p = _base_products(); p.update({k: v for k, v in jload(HERE / "product.json").items() if not k.startswith("_")}); return p
def claims():
    c = _base_claims(); c.update({k: v for k, v in jload(HERE / "claims.json").items() if not k.startswith("_")}); return c
for m in (compose, lint, captions):
    if hasattr(m, "products"): m.products = products
    if hasattr(m, "claims"): m.claims = claims

_orig_disc = compose._spoken_disclosure_base
def _disc_base(P, fmt):
    if P.get("category") == "service":
        if fmt == "ad": raise ValueError("The How It Works video is organic only.")
        return "Prescription required. Prescribing is never guaranteed."
    return _orig_disc(P, fmt)
compose._spoken_disclosure_base = _disc_base

_orig_long, _orig_short = captions._disc_long, captions._disc_short
def _cap_long(P, url):
    if P.get("category") == "service":
        return f"Prescription required. Prescribing is never guaranteed.{captions._nc(P)} Start your online visit: {url}"
    return _orig_long(P, url)
def _cap_short(P):
    return "Prescription required. Prescribing is never guaranteed." if P.get("category") == "service" else _orig_short(P)
captions._disc_long, captions._disc_short = _cap_long, _cap_short

# ------------------------------------------------------------------ the script (Matt's brief, verbatim voiceover)
TEXTS = [
    # phone: Get Started picker (verbatim from src/components/site/GetStartedModal.tsx)
    "What are you looking for?", "Choose a category to get started.", "Weight Loss", "Sexual Health", "Hair Loss", "Wellness",
    # phone: Bask questionnaire mockups (illustrative headings)
    "Create your account", "Continue with Google", "or", "Email address", "Continue", "Medical history",
    "Are you currently taking any medications?", "Do you have any allergies?", "Yes", "No",
    # world chips and labels
    "Illustrative mockup", "Illustration", "At your own pace", "Intake complete", "Independently licensed provider",
    "Under review", "Never guaranteed", "If prescribed", "Licensed pharmacy", "Being filled", "On the way",
    "Prescription", "Rx", "Medical intake",
    # walkthrough header (DOM overlay)
    "How it works", "Step 1 of 3", "Step 2 of 3", "Step 3 of 3", "Medical intake online", "Licensed provider review", "If prescribed: filled and shipped",
]
VIS = {"type": "howworld", "bg": "ink"}
HOOK = {"id": "HIW-H01", "product": PRODUCT, "angle": "process", "kind": "statement", "price_dependent": False, "review": None,
        "text": "Healthcare online. Here's how it works.", "visual": {**VIS, "texts": TEXTS}}
MEAT = {"id": "HIW-M1", "product": PRODUCT, "style": "software_walkthrough", "price_dependent": False,
        "claims": ["process", "hiw_account_and_intake", "hiw_independent_provider_review", "hiw_pharmacy_ships", "hiw_status_labels", "hiw_phone_mockup"],
        "review_flags": [
            "no_charge_generic_scope: the no-charge line is sitewide copy (homepage, About) but absent from the BPC-157 pages; confirm it holds for every product this generic video can lead to",
        ],
        "caption_bodies": ["Three steps, all online: complete your medical intake at your own pace, an independently licensed provider reviews it, and if you're prescribed, a licensed pharmacy prepares and ships your medication, with status updates along the way."],
        "beats": [
            {"text": "First, create an account and complete your medical intake online.", "visual": dict(VIS), "screen": None, "emph": []},
            {"text": "Next, an independently licensed provider reviews your medical history to determine whether treatment is appropriate.", "visual": dict(VIS), "screen": None, "emph": []},
            {"text": "If prescribed, a licensed pharmacy prepares and ships your medication.", "visual": {**VIS, "hold_s": 0.9}, "screen": None, "emph": []},
        ]}
CTA = {"id": "HIW-C1", "product": PRODUCT, "text": "Start your online visit at beemahealth dot com.", "screen": "Start your online visit", "price": None, "claims": [], "no_url": False}

EXTRA_REQUIRED = ["Prescription required", "never guaranteed"]     # same end-card wording the gate requires of ED videos


def gate_extra(pkg):
    """The shared gate has no 'service' category, so enforce the selling-video disclosure here too (never weaker than ED/GLP-1)."""
    end = " ".join(pkg["endcard"]["lines"] + pkg["endcard"]["disclosures"]).lower()
    F = pkg["compliance"]["findings"]
    for s in EXTRA_REQUIRED:
        if s.lower() not in end:
            F.append({"level": "BLOCK", "rule": "missing_disclosure", "field": "endcard", "msg": f"End card must contain '{s}'.", "snippet": s})
    if "won't be charged" not in pkg["spoken_display"].lower():
        F.append({"level": "BLOCK", "rule": "missing_no_charge", "field": "voiceover", "msg": "Selling video must speak the verified no-charge line.", "snippet": ""})
    if re.search(r"\b(today|tomorrow|same[- ]day|overnight|hours?|days?|minutes?|fast|quick(ly)?|instant(ly)?|approved)\b", pkg["spoken_display"] + " " + " ".join(pkg["onscreen_text"]), re.I):
        m = re.search(r"\b(today|tomorrow|same[- ]day|overnight|hours?|days?|minutes?|fast|quick(ly)?|instant(ly)?|approved)\b", pkg["spoken_display"] + " " + " ".join(pkg["onscreen_text"]), re.I)
        F.append({"level": "BLOCK", "rule": "hiw_timing_or_approval", "field": "all", "msg": "Brief: no speed/timing promise and no implication that everyone is approved.", "snippet": m.group(0)})
    pkg["compliance"] = {**pkg["compliance"], "findings": lint.dedupe(F), "status": lint.status_of(F),
                         "counts": {"BLOCK": sum(f["level"] == "BLOCK" for f in F), "REVIEW": sum(f["level"] == "REVIEW" for f in F)}}
    return pkg


def remotion(args):
    r = subprocess.run(["npx", "remotion", *args, "--log=error"], cwd=REMOTION, capture_output=True, text=True)
    if r.returncode != 0: raise RuntimeError((r.stderr or r.stdout)[-2000:])


def cue_times(pkg):
    """Spoken time of every word, by segment, for picking still times."""
    out = {}
    for w in pkg["words"]: out.setdefault(w["seg"], []).append((round(w["t0"], 2), w["w"]))
    return out


def auto_times(pkg):
    W = {(w["seg"], re.sub(r"[^a-z]", "", w["w"].lower())): w["t0"] for w in reversed(pkg["words"])}
    keys = [("hook", "healthcare"), ("hook", "how"), ("b1", "first"), ("b1", "account"), ("b1", "medical"), ("b1", "online"),
            ("b2", "next"), ("b2", "provider"), ("b2", "reviews"), ("b2", "history"), ("b2", "appropriate"),
            ("b3", "prescribed"), ("b3", "pharmacy"), ("b3", "prepares"), ("b3", "ships"), ("b3", "medication"), ("cta", "start"), ("disc", "prescription")]
    ts = [0.0]
    for k in keys:
        if k in W: ts += [round(W[k] + 0.35, 2)]
    for s in pkg["segments"]:
        if s["kind"] in ("beat",): ts.append(round(s["t0"] + 0.05, 2))       # each step transition
    ts.append(round(pkg["duration"] - 0.5, 2))
    return sorted(set(ts))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", type=int, default=1)
    ap.add_argument("--synth-only", action="store_true")
    ap.add_argument("--stills", default=None, help="'auto' or comma-separated seconds")
    ap.add_argument("--preview", action="store_true")
    ap.add_argument("--full", action="store_true", help="full-quality render: only after Matt OKs the script")
    a = ap.parse_args()

    pkg = compose.build_package(PRODUCT, HOOK["id"], MEAT["id"], CTA["id"], date=DATE, version=a.version, parts=(HOOK, MEAT, CTA))
    pkg = gate_extra(pkg)
    print(pkg["id"], pkg["compliance"]["status"], pkg["compliance"]["counts"])
    for f in pkg["compliance"]["findings"]: print(f"  [{f['level']}] {f['rule']}: {f['msg'][:160]}")
    if pkg["compliance"]["status"] == "BLOCKED":
        print("BLOCKED: fix the copy."); return 2
    pkg = compose.synthesize(pkg)
    d = OUT / pkg["id"]; d.mkdir(parents=True, exist_ok=True)
    print(f"voice {pkg['duration']} s")
    for s in pkg["segments"]: print(f"  {s['id']:5s} {s['t0']:6.2f}-{s['t1']:6.2f} (end {s['end']:6.2f})  {s['text']}")
    jsave(d / "props.json", compose.to_props(pkg))
    jsave(d / "package.json", pkg)
    (d / "compliance.json").write_text(json.dumps(pkg["compliance"], indent=2))
    sys.path.insert(0, str(HERE.parent)); import beema as cli                          # captions.md writer only
    (d / "captions.md").write_text(cli.captions_md(pkg))
    if a.synth_only: return 0

    bundle = d / "bundle"
    t0 = time.time(); remotion(["bundle", ENTRY, f"--out-dir={bundle}"]); print(f"bundle {time.time() - t0:.0f}s")
    pj = d / "props.json"
    f0 = d / "first_frame.png"
    remotion(["still", str(bundle), COMP, str(f0), f"--props={pj}", "--frame=0", "--overwrite"])
    blank, frac = firstframe.is_blank(f0)
    print(f"first frame content {frac:.3f} ({'BLANK' if blank else 'ok'})")
    if blank: return 3
    if a.stills:
        times = auto_times(pkg) if a.stills == "auto" else [float(x) for x in a.stills.split(",")]
        sd = d / "stills"; sd.mkdir(exist_ok=True)
        for t in times:
            o = sd / f"t{t:05.2f}.png"
            remotion(["still", str(bundle), COMP, str(o), f"--props={pj}", f"--frame={int(round(t * 30))}", "--overwrite"]); print("still", o)
    if a.preview or a.full:
        name = "preview.mp4" if not a.full else f"{pkg['id']}.mp4"
        cmd = ["render", str(bundle), COMP, str(d / name), f"--props={pj}", "--codec=h264", "--crf=" + ("18" if a.full else "30"), "--overwrite"]
        if not a.full: cmd += ["--scale=0.4"]
        t0 = time.time(); remotion(cmd); print(f"video {d / name} ({time.time() - t0:.0f}s render)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
