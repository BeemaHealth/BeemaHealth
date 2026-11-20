"""Build the 30 s "ED care, privately" organic short (men's health brief, video 2 of 4) as a PREVIEW.

    shorts/pde5-explainer/.venv/bin/python shorts/engine/tools/ed_care_30s.py [--version N] [--no-video] [--stills auto|t1,t2,...]

One video covers three products (sildenafil and tadalafil = FDA-approved generics, ED Mints = compounded, not FDA-approved),
so it is built from hand-written parts with compose.build_package(parts=...) under the STRICTEST product rules (ed-mints:
compounded gate, compounded sign-off) and then:
  * the end-card URL is beemahealth.com/ed (the brief's URL; ed-mints' own landing path is /ed-mints),
  * the spoken and on-screen disclosure names WHICH product is compounded, so the generics are never labelled "not FDA-approved",
  * captions are written here (the generic caption builder would call the whole video "Compounded, not FDA-approved"),
then the whole package is re-linted. The 3D world is shorts/pde5-explainer/src/edcare/EdCareWorld.tsx, rendered through its own
Remotion entry (src/edcare/index.ts) so the shared engine composition is untouched. Never publishes, never posts to Slack.
"""
from __future__ import annotations
import argparse, json, re, subprocess, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from beema_engine import compose, lint, firstframe                      # noqa: E402
from beema_engine.common import OUT, REMOTION, jsave                     # noqa: E402

PRODUCT = "ed-mints"
ENTRY, COMP = "src/edcare/index.ts", "EdCare9x16"
URL = "beemahealth.com/ed"
W3 = {"type": "world3d", "bg": "ink", "note": "Illustration"}

HOOK = {"id": "EDC-H1", "product": PRODUCT, "angle": "privacy", "kind": "statement",
        "text": "ED treatment doesn't have to mean an awkward waiting room.", "visual": W3, "price_dependent": False, "review": None}
BEATS = [
    {"text": "Sildenafil and tadalafil are FDA-approved generic tablets. ED Mints are compounded, not FDA-approved.",
     "visual": W3, "screen": None, "emph": ["FDA-approved", "not"]},
    {"text": "First, an online intake. A licensed provider reviews your history, because these aren't right for everyone.",
     "visual": W3, "screen": None, "emph": ["licensed"]},
    {"text": "If you're prescribed, it ships right to your door. Private, online, and provider-reviewed.",
     "visual": {**W3, "hold_s": 0.5}, "screen": None, "emph": []},
]
TEXTS_3D = ["Sildenafil", "Tadalafil", "FDA-approved generic tablets", "ED Mints", "Compounded", "Not FDA-approved", "Health history",
            "Online intake", "Licensed provider review", "Not right for everyone", "Private.", "Online.", "Provider-reviewed.", "Illustration"]
BEATS[0]["visual"] = {**W3, "texts": TEXTS_3D}            # every string drawn inside the 3D world, so the gate lints it
CAPTION_BODY = ("Three options, one online process. Sildenafil and tadalafil tablets are FDA-approved generics. ED Mints are compounded "
                "and not FDA-approved. A licensed provider reviews your history and decides if any of them is appropriate for you.")
MEAT = {"id": "EDC-M1", "product": PRODUCT, "title": "ED care without the waiting room", "style": "world3d_story", "beats": BEATS,
        "caption_bodies": [CAPTION_BODY], "claims": ["generic_fda_approved", "mints_503b", "process", "ed_private_discreet_delivery"],
        "review_flags": [
            "multi_product_video: sildenafil + tadalafil (FDA-approved generics) and compounded ED Mints in one video; confirm the generic vs compounded differentiation reads clearly in voice, chips and end card",
            "private_delivery_unverified: 'Private' overlay and the doorstep box imply discreet shipping; no Beema page says packaging is plain or unbranded; confirm with Bask/pharmacy before posting",
            "illustrative_product_visuals: bottles are 3D illustrations modelled on the site's product imagery (white round tablets for the generics, blue square RDT for ED Mints) with blank labels; real dispensed tablets and bottles vary by pharmacy/manufacturer",
            "landing_page_mismatch: beemahealth.com/ed is the generic-tablet page; ED Mints have their own page (/ed-mints). Confirm /ed is the right destination for a video that also names ED Mints",
            "brief_text_interpreted: brief Scene 2 said 'Aniete an online intake'; read as 'Complete an online intake'",
        ],
        "price_dependent": False}
CTA = {"id": "EDC-C1", "product": PRODUCT, "title": "Explore men's health care", "text": f"Explore men's health care at {URL}.",
       "screen": "Explore men's health care", "goal": "landing_visit", "price": None, "claims": [], "no_url": False}
DISC_SPOKEN = ("ED Mints are compounded, not FDA-approved. Prescription required. Not for use with nitrates. "
               "Prescribing is never guaranteed, and you won't be charged if you aren't prescribed.")
DISC_LINES = ["ED Mints: compounded, not FDA-approved.", "Sildenafil and tadalafil tablets: FDA-approved generics.",
              "Prescription required. Not for use with nitrates.", "Prescribing is never guaranteed", "You won't be charged if you aren't prescribed"]
TAGS = ["#EDTreatment", "#MensHealth", "#Telehealth"]


def captions(hook_text):
    disc = f"Rx only. Not for use with nitrates. Prescribing is never guaranteed. You won't be charged if you aren't prescribed. Safety info: {URL}"
    ig = "\n\n".join([hook_text, CAPTION_BODY, disc, " ".join(TAGS)])
    x = f"{hook_text} Sildenafil and tadalafil tablets are FDA-approved generics; ED Mints are compounded, not FDA-approved. Rx only. {URL}"
    tt = "\n".join([hook_text, CAPTION_BODY, "Rx only. Prescribing is never guaranteed.", " ".join(TAGS + ["#BeemaHealth"])])
    yt_title = "ED care without the waiting room | Beema Health"
    return {"instagram_facebook_threads": ig, "x": x, "tiktok": tt,
            "youtube": {"title": yt_title, "description": f"{CAPTION_BODY}\n\n{disc}\n\n{' '.join(TAGS)}", "tags": ["edtreatment", "menshealth", "telehealth", "beemahealth"]},
            "_lengths": {"instagram_facebook_threads": len(ig), "x": len(x.replace(URL, "x" * 23)), "tiktok": len(tt), "youtube_title": len(yt_title)}}


def build(version):
    pkg = compose.build_package(PRODUCT, HOOK["id"], MEAT["id"], CTA["id"], parts=(HOOK, MEAT, CTA), version=version)
    for s in pkg["segments"]:
        if s["id"] == "disc": s["text"] = DISC_SPOKEN
    ec = pkg["endcard"]
    ec["lines"] = [CTA["screen"], URL]
    ec["disclosures"] = DISC_LINES
    pkg["spoken_display"] = " ".join(s["text"] for s in pkg["segments"])
    on = [t for t in pkg["onscreen_text"] if t not in ("beemahealth.com/ed-mints",) and not t.startswith("Compounded. Not FDA") and t not in ("Prescription required", "Prescribing is never guaranteed", "You won't be charged if you aren't prescribed")]
    pkg["onscreen_text"] = on + [URL] + DISC_LINES
    pkg["captions"] = captions(HOOK["text"])
    pkg["landing_url"] = URL
    pkg["compliance"] = lint.lint_package(pkg)
    return pkg


def _norm(w): return re.sub(r"[^a-z0-9'-]", "", w.lower())

def cue_time(words, key):
    phrase, _, nth = key.partition("#"); n = int(nth or 1); parts = phrase.split(); c = 0
    ws = [(_norm(w["w"]), w["t0"]) for w in words]
    for i in range(len(ws)):
        if all(i + j < len(ws) and ws[i + j][0] == p for j, p in enumerate(parts)):
            c += 1
            if c == n: return ws[i][1]
    return None

CUES = ["awkward", "waiting", "sildenafil", "tadalafil", "fda-approved", "mints", "compounded", "not", "online", "intake", "licensed",
        "reviews", "everyone", "prescribed", "ships", "door", "private", "online#2", "provider-reviewed"]


def run(cmd, cwd=REMOTION):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0: raise RuntimeError((r.stderr or r.stdout)[-2000:])
    return r


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--version", type=int, default=1); ap.add_argument("--no-video", action="store_true")
    ap.add_argument("--stills", default="auto"); a = ap.parse_args()
    pkg = build(a.version)
    print(pkg["id"]); print("  compliance:", pkg["compliance"]["status"], pkg["compliance"]["counts"])
    for f in pkg["compliance"]["findings"]: print(f"   [{f['level']}] {f['rule']}: {f['msg'][:150]}")
    if pkg["compliance"]["status"] == "BLOCKED": print("BLOCKED: fix the copy."); return 2
    pkg = compose.synthesize(pkg); print(f"  voice: {pkg['duration']}s")
    d = OUT / pkg["id"]; d.mkdir(parents=True, exist_ok=True)
    props = compose.to_props(pkg); pj = d / "props.json"; jsave(pj, props)
    cues = {k: cue_time(pkg["words"], k) for k in CUES}
    pkg["cue_times"] = cues
    bundle = d / ".bundle"; t0 = time.time()
    run(["npx", "remotion", "bundle", ENTRY, f"--out-dir={bundle}", "--log=error"]); print(f"  bundled in {time.time() - t0:.0f}s")
    f0 = d / "first_frame.png"
    run(["npx", "remotion", "still", str(bundle), COMP, str(f0), f"--props={pj}", "--frame=0", "--log=error", "--overwrite"])
    blank, frac = firstframe.is_blank(f0); pkg.setdefault("checks", {})["first_frame_content"] = round(frac, 3)
    if blank: raise RuntimeError(f"first frame is blank ({frac:.3f})")
    print(f"  first frame content {frac:.3f}")
    if a.stills == "auto":
        segs = {s["id"]: s for s in pkg["segments"]}
        times = [0.0] + [round(t + 0.55, 2) for t in cues.values() if t is not None] + [round(cues["sildenafil"] - 0.5, 2), round(cues["ships"] + 0.7, 2),
                 round(segs["cta"]["t0"] + 1.0, 2), round(segs["disc"]["t0"] + 3.0, 2)]
    else:
        times = [float(x) for x in a.stills.split(",") if x]
    sd = d / "stills"; sd.mkdir(exist_ok=True)
    for t in sorted(set(times)):
        o = sd / f"t{t:05.2f}.png"
        run(["npx", "remotion", "still", str(bundle), COMP, str(o), f"--props={pj}", f"--frame={int(t * 30)}", "--log=error", "--overwrite"])
        print("  still", o)
    if not a.no_video:
        out = d / "preview.mp4"; t0 = time.time()
        run(["npx", "remotion", "render", str(bundle), COMP, str(out), f"--props={pj}", "--codec=h264", "--crf=30", "--scale=0.4", "--log=error", "--overwrite"])
        pkg["render"] = {"file": str(out), "preview": True, "seconds": round(time.time() - t0, 1), "bytes": out.stat().st_size}
        print(f"  preview: {out} ({pkg['render']['bytes'] / 1e6:.1f} MB)")
    jsave(d / "package.json", pkg)
    (d / "compliance.json").write_text(json.dumps(pkg["compliance"], indent=2))
    c = pkg["captions"]
    (d / "captions.md").write_text(f"# {pkg['id']}\n\n## Instagram / Facebook / Threads ({c['_lengths']['instagram_facebook_threads']} chars)\n\n{c['instagram_facebook_threads']}\n\n"
                                   f"## X ({c['_lengths']['x']} chars)\n\n{c['x']}\n\n## TikTok ({c['_lengths']['tiktok']} chars)\n\n{c['tiktok']}\n\n"
                                   f"## YouTube Shorts\n\nTitle: {c['youtube']['title']}\n\n{c['youtube']['description']}\n\nTags: {', '.join(c['youtube']['tags'])}\n")
    print("  out:", d)
    return 0


if __name__ == "__main__":
    sys.exit(main())
