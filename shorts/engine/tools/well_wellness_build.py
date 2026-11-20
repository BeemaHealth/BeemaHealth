"""Build the wellness overview short (hair loss care, compounded NAD+ and sermorelin, online care) as a PREVIEW.

    shorts/pde5-explainer/.venv/bin/python shorts/engine/tools/well_wellness_build.py [--version N] [--stills t1,t2,...] [--no-preview] [--no-voice]

Composes library_src/wellness.py with compose.build_package(parts=...), runs the compliance gate twice (as 'wellness', and as
'peptide' for the strict comparison), synthesizes the voice with this video's phonemes, renders frame 0 (refuses a blank one),
stills at t=0 and every cue moment, and a 40% preview, all with the standalone Remotion entry src/wellness/index.ts.
Never renders the full-quality video, never touches the registry, never delivers anywhere.

Pronunciation tests (2026-11-19, Whisper base.en, in the b2 sentence): Kokoro's default says "nad plus" for NAD+, so NAD+ uses
phonemes ɛneɪdiplʌs (heard "NAD+" / "NAD plus"); sermorelin sˌɜɹmˈɔɹʌlˌɪn heard "Sermoralin" (sɜɹmˈɔɹəlɪn heard "Sir Moreland",
the config respelling heard "serve more a LIN"); minoxidil mˌɪnˈɑksədɪl heard "Minoxidil" (default heard "Monoxidil").
"""
from __future__ import annotations
import argparse, copy, json, subprocess, sys, time, warnings
from pathlib import Path
warnings.filterwarnings("ignore")
ENGINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE)); sys.path.insert(0, str(ENGINE / "library_src"))
from beema_engine import compose, lint, firstframe, common, captions as cap   # noqa: E402
from beema_engine.common import OUT, REMOTION, config, jsave, today             # noqa: E402
import wellness as S                                                             # noqa: E402

ENTRY, COMP = "src/wellness/index.ts", "WellClip9x16"
CUE_WORDS = {"hook": ["your", "beyond", "weight"], "b1": ["hair-loss", "oral", "finasteride", "minoxidil", "topical", "spray"],
             "b2": ["nad+", "sermorelin", "fda-approved", "individual", "assessment"],
             "b3": ["online", "intake", "provider", "review", "pharmacy", "prescribed"], "cta": ["explore", "beemahealth.com"]}

def build(version):
    pkg = compose.build_package(S.PRODUCT, S.HOOK["id"], S.MEAT["id"], S.CTA["id"], date=today(), version=version, parts=(S.HOOK, S.MEAT, S.CTA))
    pkg["id"] = f"{pkg['date']}_well-wellness-overview_v{version}"
    for s in pkg["segments"]:
        if s["id"] == "disc": s["text"] = S.DISCLOSURE
    pkg["spoken_display"] = " ".join(s["text"] for s in pkg["segments"])
    old = pkg["endcard"]["disclosures"]; pkg["endcard"]["disclosures"] = list(S.ENDCARD_DISCLOSURES)
    pkg["onscreen_text"] = [t for t in pkg["onscreen_text"] if t not in old] + pkg["endcard"]["disclosures"]
    pkg["captions"] = cap.build_captions(pkg, S.HOOK, S.MEAT)
    # caption disclosure: say WHICH products are compounded (the tablets are FDA-approved generics)
    fix = lambda t: t.replace("Compounded, not FDA-approved.", "Compounded options (hair loss spray, NAD+, sermorelin) are not FDA-approved.")
    c = pkg["captions"]
    for k in ("instagram_facebook_threads", "x", "tiktok"): c[k] = fix(c[k])
    c["youtube"]["description"] = fix(c["youtube"]["description"])
    if len(c["x"]) > 280: c["x"] = f"{S.HOOK['text']} Compounded options are not FDA-approved. Rx only. beemahealth.com"
    c["_lengths"] = {"instagram_facebook_threads": len(c["instagram_facebook_threads"]), "x": len(c["x"]), "tiktok": len(c["tiktok"]), "youtube_title": len(c["youtube"]["title"])}
    pkg["compliance"] = lint.lint_package(pkg)
    pkg["compliance_peptide_strict"] = strict_peptide(pkg)
    return pkg

def strict_peptide(pkg):
    """The same package linted as if the product were category 'peptide' (sermorelin is one). Shared rules are not changed."""
    real = common.products
    def fake():
        P = copy.deepcopy(real()); P[S.PRODUCT]["category"] = "peptide"; return P
    common.products = fake; lint.products = fake
    try: return lint.lint_package(pkg)
    finally: common.products = real; lint.products = real

def voice_cfg():
    cfg = copy.deepcopy(config()); cfg["phonemes"].update(S.PHONEMES); cfg["voice"]["speed"] = S.VOICE_SPEED; return cfg

def cue_times(pkg):
    out = {}
    for seg, keys in CUE_WORDS.items():
        ws = [w for w in pkg["words"] if w["seg"] == seg]; j = 0
        for k in keys:
            for i in range(j, len(ws)):
                if k in ws[i]["w"].lower().strip(".,:;"):
                    out[f"{seg}:{k}"] = ws[i]["t0"]; j = i + 1; break
    return out

def remotion(args):
    r = subprocess.run(["npx", "remotion", *args, "--log=error", "--overwrite"], cwd=REMOTION, capture_output=True, text=True)
    if r.returncode: raise RuntimeError((r.stderr or r.stdout)[-2000:])

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--version", type=int, default=1); ap.add_argument("--stills", default="")
    ap.add_argument("--no-preview", action="store_true"); ap.add_argument("--no-voice", action="store_true")
    a = ap.parse_args()
    pkg = build(a.version); d = OUT / pkg["id"]; d.mkdir(parents=True, exist_ok=True)
    for name, res in (("wellness", pkg["compliance"]), ("peptide-strict", pkg["compliance_peptide_strict"])):
        print(f"gate as {name}: {res['status']} {res['counts']}")
        for f in res["findings"]: print(f"   [{f['level']}] {f['rule']}: {f['snippet'][:70]!r}")
    if pkg["compliance"]["status"] == "BLOCKED": print("BLOCKED as wellness: fix the copy."); return 2
    if a.no_voice: return 0
    pkg = compose.synthesize(pkg, outdir=d, cfg=voice_cfg()); print(f"voice {pkg['duration']} s")
    pkg["cues"] = cue_times(pkg)
    props = compose.to_props(pkg); pj = d / "props.json"; jsave(pj, props)
    f0 = d / "first_frame.png"; remotion(["still", ENTRY, COMP, str(f0), f"--props={pj}", "--frame=0"])
    blank, frac = firstframe.is_blank(f0); pkg.setdefault("checks", {})["first_frame_content"] = round(frac, 3)
    if blank: raise SystemExit(f"first frame is blank ({frac:.3f}): {f0}")
    times = sorted({0.0, *[round(v, 2) for v in pkg["cues"].values()], *[float(x) for x in a.stills.split(",") if x]})
    (d / "stills").mkdir(exist_ok=True)
    for t in times:
        remotion(["still", ENTRY, COMP, str(d / "stills" / f"t{t:05.2f}.png"), f"--props={pj}", f"--frame={int(round(t * 30))}"])
    print(f"{len(times)} stills in {d / 'stills'}")
    if not a.no_preview:
        t0 = time.time(); remotion(["render", ENTRY, COMP, str(d / "preview.mp4"), f"--props={pj}", "--codec=h264", "--crf=30", "--scale=0.4"])
        pkg["render"] = {"file": str(d / "preview.mp4"), "preview": True, "seconds": round(time.time() - t0, 1)}
    jsave(d / "package.json", pkg)
    (d / "compliance.json").write_text(json.dumps(pkg["compliance"], indent=2))
    (d / "compliance_peptide_strict.json").write_text(json.dumps(pkg["compliance_peptide_strict"], indent=2))
    sys.path.insert(0, str(ENGINE)); from beema import captions_md
    (d / "captions.md").write_text(captions_md(pkg))
    print(d); return 0

if __name__ == "__main__":
    sys.exit(main())
