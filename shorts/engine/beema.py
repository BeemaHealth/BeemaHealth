#!/usr/bin/env python3
"""Beema Health video engine CLI. Run with shorts/pde5-explainer/.venv/bin/python."""
from __future__ import annotations
import argparse, json, sys, time, warnings
warnings.filterwarnings("ignore")
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from beema_engine import common, library, libcheck, lint, compose, render, registry, planner, slack, daily, tts, nightly, topic_log
from beema_engine.common import OUT, ROOT, jsave, jload, config, products

def cmd_library(a):
    if a.action == "build":
        for p, s in library.build().items(): print(f"{p:12s} hooks={s[0]} meats={s[1]} ctas={s[2]} combinations={s[3]}")
    elif a.action == "lint":
        for fmt in ("organic", "ad"):
            rows, summ = libcheck.check_library(fmt)
            (ROOT / "compliance").mkdir(exist_ok=True)
            jsave(ROOT / "compliance" / ("library_report.json" if fmt == "organic" else "library_report_ad.json"), {"format_checked": fmt, "rows": rows})
            tot = {}
            for r in rows: tot[r["status"]] = tot.get(r["status"], 0) + 1
            print(fmt, tot)
            for r in rows:
                if r["status"] != "AUTO_CHECKS_PASSED":
                    for f in r["findings"]: print(f"  {r['id']:10s} {f['level']:6s} {f['rule']:22s} {f['snippet'][:60]!r}")
    elif a.action == "stats":
        for p in library.PRODUCT_MODULE:
            L = library.load(p); print(p, len(L["hooks"]), len(L["meats"]), len(L["ctas"]), L["combinations"])

def cmd_compose(a):
    lib = library.load(a.product)
    pre = lib["prefix"]
    hook = a.hook or planner.plan(product=a.product, fmt=a.format)["hook_id"]
    meat = a.meat or f"{pre}-{config()['control']['meat']}"; cta = a.cta or f"{pre}-{config()['control']['cta']}"
    pkg = compose.build_package(a.product, hook, meat, cta, fmt=a.format, aspect=a.aspect, extra_ed_mints_mention=a.mints, version=a.version)
    print(f"{pkg['id']}\n  compliance: {pkg['compliance']['status']} {pkg['compliance']['counts']}")
    for f in pkg["compliance"]["findings"]: print(f"   [{f['level']}] {f['rule']}: {f['msg']}")
    if pkg["compliance"]["status"] == "BLOCKED" and not a.force:
        print("BLOCKED. Fix the copy (or pass --force to render a review draft only)."); return 2
    pkg = compose.synthesize(pkg); print(f"  voice: {pkg['duration']}s, tts {pkg['cost']['tts_seconds']}s ({pkg['cost']['tts_cache_hits']}/{pkg['cost']['tts_sentences']} sentences cached)")
    if a.stills:
        for o in render.stills(pkg, [float(x) for x in a.stills.split(",")]): print("  still", o)
    if not a.no_render:
        out = render.render(pkg, preview=a.preview); print(f"  video: {out} ({pkg['render']['bytes']/1e6:.1f} MB, {pkg['render']['seconds']}s)")
    d = OUT / pkg["id"]; jsave(d / "package.json", pkg)
    (d / "captions.md").write_text(captions_md(pkg))
    (d / "compliance.json").write_text(json.dumps(pkg["compliance"], indent=2))
    if not a.preview and not a.no_render: registry.add_video(pkg)
    return 0

def captions_md(pkg):
    c = pkg["captions"]
    return (f"# {pkg['id']}\n\n## Instagram / Facebook / Threads ({c['_lengths']['instagram_facebook_threads']} chars)\n\n{c['instagram_facebook_threads']}\n\n"
            f"## X ({c['_lengths']['x']} chars)\n\n{c['x']}\n\n## TikTok ({c['_lengths']['tiktok']} chars)\n\n{c['tiktok']}\n\n"
            f"## YouTube Shorts\n\nTitle: {c['youtube']['title']}\n\n{c['youtube']['description']}\n\nTags: {', '.join(c['youtube']['tags'])}\n")

def cmd_plan(a): print(json.dumps(planner.plan(a.date, product=a.product), indent=2))

def cmd_daily(a):
    if a.action == "confirm": print(json.dumps(daily.confirm(a.date, a.outcome), indent=2)); return
    res = daily.run(a.date, dry_run=a.dry_run, deliver_now=not a.no_deliver, transport=a.transport, product=a.product)
    print(json.dumps({k: v for k, v in res.items() if k not in ("trace",)}, indent=2, default=str))

def cmd_nightly(a):
    if a.action == "confirm":
        print(json.dumps(nightly.confirm(a.date, a.index, a.outcome), indent=2, default=str)); return
    res = nightly.run(a.date, dry_run=a.dry_run, script_only=a.script_only, deliver_now=not a.no_deliver, count=a.count, transport=a.transport)
    print(json.dumps({k: v for k, v in res.items() if k not in ("trace",)}, indent=2, default=str))

def cmd_topics(a):
    if a.action == "seed": print(f"added {topic_log.seed()} entries")
    else:
        log = topic_log.load()["entries"]; made = [e for e in log if e["source"] in ("nightly", "registry")]
        print(f"{len(made)} videos made, {len(log) - len(made)} library hooks counted as covered. Full log: {topic_log.MD}")
        for e in sorted(made, key=lambda e: e.get("date") or "", reverse=True)[:25]: print(f"  {e.get('date') or '          '}  {e['product']:12s} {e['question'][:90]}")

def cmd_registry(a):
    if a.action == "list":
        reg = registry.load()
        for v in reg["videos"].values(): print(f"{v['id']}  {v['status']:9s} {v['compliance']['status']:20s} signoff={'yes' if v['compliance']['human_signoff'] else 'NO'} label={v.get('label')}")
    elif a.action == "signoff": registry.signoff(a.id, a.by, a.note or ""); print("signed off", a.id)
    elif a.action == "mark": registry.mark(a.id, a.label); print("ok")
    elif a.action == "import-metrics": n, sk = registry.import_metrics(a.file); print(f"imported {n} rows; skipped unknown ids: {sk}")
    elif a.action == "recommend": print(registry.recommend()[0])

def cmd_times(a): print(json.dumps(registry.posting_times(), indent=2))

def cmd_voices(a):
    import numpy as np, wave
    text = a.text or "It doesn't flip a switch. Here's what it really does. Honestly, it's simpler than most people think."
    out = ROOT / "voices"; out.mkdir(exist_ok=True)
    cfg = config()
    for v in cfg["voice"]["candidates"]:
        cfg["voice"]["voice"] = v
        audio, words, _, _ = tts.synth_segment(text, "voicetest", cfg)
        with wave.open(str(out / f"{v}.wav"), "wb") as f:
            f.setnchannels(1); f.setsampwidth(2); f.setframerate(tts.SR); f.writeframes((audio / max(1e-6, abs(audio).max()) * 0.85 * 32767).astype("<i2").tobytes())
        print("wrote", out / f"{v}.wav")
    print("Listen and set config.json voice.voice. (Not auditioned by the engine: a human has to choose.)")

def cmd_check_prices(a):
    import re
    src = (ROOT.parent.parent / "src/lib/simple-treatment-pricing.ts").read_text()
    ours = products()
    print("Engine prices (products.json) vs numbers present in src/lib/simple-treatment-pricing.ts:")
    bad = 0
    for k in ("tadalafil", "sildenafil", "ed-mints"):
        P = ours[k]["prices"]; vals = {P["1mo_start"], P["3mo_total_start"]}
        for pl in P.get("plans", []): vals |= {pl["1mo"], pl["3mo"]}
        missing = [v for v in vals if not re.search(rf"\b{v}\b", src)]
        print(f"  {k:10s} amounts {sorted(vals)} missing in lib: {missing or 'none'}"); bad += bool(missing)
    print("OK (still confirm with Matt's current sheet)" if not bad else "MISMATCH: update products.json or the lib")
    return 1 if bad else 0

def cmd_deliver(a):
    pkg = jload(OUT / a.id / "package.json"); msg = slack.build_message(pkg, registry.posting_times())
    f = pkg["render"]["file"]
    if a.dry_run: print(msg); print("FILE", f); return
    print(json.dumps(slack.deliver(msg, f, transport=a.transport), indent=2))

def main():
    ap = argparse.ArgumentParser(prog="beema.py"); sp = ap.add_subparsers(dest="cmd", required=True)
    s = sp.add_parser("library"); s.add_argument("action", choices=["build", "lint", "stats"]); s.set_defaults(f=cmd_library)
    s = sp.add_parser("compose"); s.add_argument("--product", required=True, choices=list(common.PREFIX)); s.add_argument("--hook"); s.add_argument("--meat"); s.add_argument("--cta")
    s.add_argument("--format", default="organic", choices=["organic", "ad"]); s.add_argument("--aspect", default="9x16", choices=["9x16", "4x5", "1x1"])
    s.add_argument("--mints", action="store_true", help="add the ED Mints mention beat (ED tablet videos)"); s.add_argument("--preview", action="store_true")
    s.add_argument("--no-render", action="store_true"); s.add_argument("--stills"); s.add_argument("--version", type=int, default=1); s.add_argument("--force", action="store_true"); s.set_defaults(f=cmd_compose)
    s = sp.add_parser("plan"); s.add_argument("--date"); s.add_argument("--product"); s.set_defaults(f=cmd_plan)
    s = sp.add_parser("daily"); s.add_argument("action", nargs="?", default="run", choices=["run", "confirm"]); s.add_argument("--date"); s.add_argument("--dry-run", action="store_true")
    s.add_argument("--no-deliver", action="store_true"); s.add_argument("--transport", choices=["bot", "claude-cli", "manual"]); s.add_argument("--product"); s.add_argument("outcome", nargs="?", choices=["delivered", "failed"]); s.set_defaults(f=cmd_daily)
    s = sp.add_parser("nightly", help="04:00 job: find highly searched topics, make 2 videos (15-45 s), deliver to Slack for review"); s.add_argument("action", nargs="?", default="run", choices=["run", "confirm"])
    s.add_argument("--date"); s.add_argument("--dry-run", action="store_true", help="discover + choose topics only: no writer, no TTS, no render, no Slack"); s.add_argument("--script-only", action="store_true", help="write and validate the scripts and storyboards (uses the writer) but do not synthesize, render or send"); s.add_argument("--no-deliver", action="store_true"); s.add_argument("--count", type=int)
    s.add_argument("--transport", choices=["bot", "claude-cli", "manual"]); s.add_argument("--index", type=int, default=1); s.add_argument("outcome", nargs="?", choices=["delivered", "failed"]); s.set_defaults(f=cmd_nightly)
    s = sp.add_parser("topics", help="the topic log: what has been made, so nightly never repeats"); s.add_argument("action", nargs="?", default="log", choices=["log", "seed"]); s.set_defaults(f=cmd_topics)
    s = sp.add_parser("registry"); s.add_argument("action", choices=["list", "signoff", "mark", "import-metrics", "recommend"]); s.add_argument("id", nargs="?"); s.add_argument("--by"); s.add_argument("--note"); s.add_argument("--label"); s.add_argument("--file"); s.set_defaults(f=cmd_registry)
    s = sp.add_parser("times"); s.set_defaults(f=cmd_times)
    s = sp.add_parser("voices"); s.add_argument("--text"); s.set_defaults(f=cmd_voices)
    s = sp.add_parser("check-prices"); s.set_defaults(f=cmd_check_prices)
    s = sp.add_parser("deliver"); s.add_argument("id"); s.add_argument("--dry-run", action="store_true"); s.add_argument("--transport", choices=["bot", "claude-cli", "manual"]); s.set_defaults(f=cmd_deliver)
    a = ap.parse_args(); sys.exit(a.f(a) or 0)

if __name__ == "__main__": main()
