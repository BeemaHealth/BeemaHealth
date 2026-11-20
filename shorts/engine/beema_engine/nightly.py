"""Nightly job (04:00): find highly searched topics -> WRITE 2 new videos (15-45 s) -> gate -> render -> Slack.

Every video is NEW: a fresh script and a fresh storyboard written for a specific searched question, animated on the stage engine
(pde5-explainer/src/engine/stage3d.tsx) so each visual shows what the narration is saying, on the word it is said. The job NEVER
assembles a video from the reviewed library's scripts. The topic log (topics/topic_log.json) records every topic done and the
writer must avoid them; a repeat or a rewrite of existing text is rejected before anything is rendered.

Order of work
  1. discover: Google autocomplete demand per product/facet (demand.py); choose products and categories (topics.py)
  2. write: headless Claude writes script + storyboard; storyboard.py / topic_log.py / the word budget validate it (retry with exact errors)
  3. gate: compliance gate (BLOCKED never ships; the writer is asked to fix it); synthesize voice; REAL duration must be 15-45 s (else the writer is asked to cut or add)
  4. render, log the topic, deliver each video to the Slack channel in config.daily.slack_channel_id

Safety (same model as daily.py): file lock; atomic state in state/nightly.json; idempotent per date and per video; delivery recorded
before and after sending and never blindly resent; NEVER publishes anywhere. Everything delivered is a DRAFT for human review.
"""
from __future__ import annotations
import fcntl, math, os, re, shutil, time, traceback, datetime as dt
from pathlib import Path
from .common import STATE, OUT, config, jload, jsave, today
from . import styles, demand, topics, topic_log, generate, compose, render, registry, slack

JOBS = STATE / "nightly.json"; LOCK = STATE / "nightly.lock"

def _save(jobs): jsave(JOBS, jobs)

def _render_with_retries(pkg, retries, sleep):
    last = None
    for attempt in range(1, retries + 1):
        try:
            render.render(pkg); break
        except Exception as e:
            last = e
            if attempt < retries: time.sleep(sleep * attempt)
    else:
        raise RuntimeError(f"render failed after retries: {str(last)[-300:]}")
    f = pkg["render"]["file"]
    if not os.path.exists(f) or os.path.getsize(f) < 200_000: raise RuntimeError("render output missing or implausibly small")

def _script_text(spec):
    return "\n".join([f"HOOK: {spec['hook']}"] + [f"{i}. {b['text']}" for i, b in enumerate(spec["beats"], 1)] + [f"CTA: {spec['cta']['text']}"])

def _channel():
    """Nightly videos go to their own channel (#daily-ai-videos-for-socials), not the daily-video channel."""
    return config()["nightly"].get("slack_channel_id")

def friendly_name(pkg):
    """A file name that says what the video is: date_product_question.mp4"""
    q = re.sub(r"[^a-z0-9]+", "-", (pkg.get("topic", {}).get("question") or pkg["hook_id"]).lower()).strip("-")[:70].strip("-")
    return f"{pkg['date']}_{pkg['product']}_{q}.mp4"

def build_candidate(cand, date, slot, completions, skipped, retry_sleep=20, no_render=False, script_only=False, _llm=None, _synth=None):
    """Write, gate, voice and (unless script_only) render one video for a topic. Returns a package or None."""
    cfg = config()["nightly"]; lo, hi = cfg["min_seconds"], cfg["max_seconds"]; product = cand["product"]
    feedback = prior = None
    entries = topic_log.load()["entries"]
    style = styles.pick(date, slot, product, entries)               # this video's own voice, palette, hook style, structure, world, price-or-education
    phrases = topic_log.unused_phrases(product, list(cand.get("evidence") or []) + [c for c in completions if c not in (cand.get("evidence") or [])])
    for attempt in range(1, cfg["candidate_attempts"] + 1):
        tag = f"{product}/{cand['facet']} try {attempt}"
        try:
            spec, glog = generate.generate(product, cand, phrases, date, slot, style, attempts=3, _llm=_llm, feedback=feedback, prior=prior)
        except Exception as e:
            skipped.append({"topic": tag, "reason": f"writer failed: {str(e)[:300]}"}); return None
        hook, meat, cta = generate.spec_to_parts(product, spec, date, slot, style)
        pkg = compose.build_package(product, hook["id"], meat["id"], cta["id"], date=date, parts=(hook, meat, cta))
        pkg["style"] = style; pkg["look"] = styles.look(style)
        pkg["topic"] = {**{k: cand[k] for k in ("category", "facet", "score", "evidence", "source")}, "question": spec["topic"]["question"], "summary": spec["topic"].get("summary", ""), "script": _script_text(spec), "writer_attempts": len(glog)}
        pkg["spec"] = spec
        blocks = [f for f in pkg["compliance"]["findings"] if f["level"] == "BLOCK"]
        if blocks:
            skipped.append({"topic": tag, "reason": "BLOCKED: " + ", ".join(sorted({f["rule"] for f in blocks}))})
            feedback = ["the compliance gate BLOCKED this video: " + f"{f['rule']}: {f['msg']} (\"{f['snippet'][:50]}\")" for f in blocks[:8]]
            prior = _script_text(spec); continue
        if script_only: return pkg
        pkg = (_synth or compose.synthesize)(pkg)
        pkg["topic"]["script"] = _script_text(spec)
        if not (lo <= pkg["duration"] <= hi):
            skipped.append({"topic": tag, "reason": f"duration {pkg['duration']}s outside {lo}-{hi}s"})
            n_words = generate.spoken_words(spec); per = max(0.2, (pkg["duration"] - 11.0) / max(1, n_words))
            delta = int(math.ceil((pkg["duration"] - (hi - 3)) / per)) if pkg["duration"] > hi else int(math.ceil(((lo + 8) - pkg["duration"]) / per))
            feedback = [f"the finished video was {pkg['duration']} s but must be {lo}-{hi} s. " + (f"Cut about {delta} spoken words (shorter beats)." if pkg["duration"] > hi else f"Add about {delta} spoken words.")]
            prior = _script_text(spec)
            shutil.rmtree(OUT / pkg["id"], ignore_errors=True); continue
        if not no_render:
            _render_with_retries(pkg, config()["daily"]["max_render_retries"], retry_sleep)
            named = Path(pkg["render"]["file"]).with_name(friendly_name(pkg)); shutil.copyfile(pkg["render"]["file"], named); pkg["render"]["file"] = str(named)      # the file Slack shows says what it is
        return pkg
    return None

def run(date=None, dry_run=False, script_only=False, deliver_now=True, count=None, transport=None, retry_sleep=20, _sender=None, _suggest=None, _synth=None, _llm=None, _no_render=False):
    date = date or today(); STATE.mkdir(parents=True, exist_ok=True); cfg = config()["nightly"]; count = count or cfg["count"]
    save = (lambda j: None) if (dry_run or script_only) else _save       # review modes never touch the real job state
    with open(LOCK, "w") as lf:
        try: fcntl.flock(lf, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: return {"status": "LOCKED", "detail": "another nightly run is active"}
        jobs = jload(JOBS, {}); job = jobs.get(date, {"date": date, "attempts": 0, "status": "new", "videos": [], "skipped": []})
        if any(v.get("delivery") == "sending" for v in job["videos"]):
            job["status"] = "NEEDS_HUMAN"; job["detail"] = "A previous send may have landed but was not confirmed. Check Slack, then run `beema.py nightly confirm --date DATE --index N delivered|failed`. Not resending."
            jobs[date] = job; save(jobs); return job
        if job.get("status") == "DONE": return {**job, "note": "already complete, nothing to do"}
        job["attempts"] += 1; job["started"] = dt.datetime.now().isoformat(timespec="seconds"); jobs[date] = job; save(jobs)
        try:
            topic_log.seed()                                                # library hooks + earlier videos count as topics already done
            sig = demand.signals(date, fetch=_suggest)                      # cached per query per day, so a rerun is cheap and consistent
            job["demand"] = {"source": sig["source"], "errors": sig["errors"], "requests": sig["requests"]}
            ranked = topics.ranked_candidates(date, sig, jobs)
            job["ranking"] = [{k: c[k] for k in ("product", "facet", "category", "score")} for c in ranked[:8]]
            comps = lambda p: sig["products"].get(p, {}).get("completions", [])
            if dry_run:
                accepted = []; plan = []
                while len(plan) < count:
                    nxt = topics.pick_order(ranked, accepted)
                    if not nxt: break
                    c = nxt[0]; accepted.append(c)
                    plan.append({"product": c["product"], "category": c["category"], "facet": c["facet"], "score": c["score"], "search_evidence": c["evidence"][:4], "already_done_for_product": len(topic_log.done_topics(c["product"]))})
                job["plan"] = plan; job["status"] = "DRY_RUN_OK"; return job
            accepted = [{"product": v["product"], "category": v["category"]} for v in job["videos"]]
            while len(job["videos"]) < count:
                built = None; tried = 0
                for cand in topics.pick_order(ranked, accepted):
                    if tried >= 3: break
                    tried += 1
                    built = build_candidate(cand, date, "abcdef"[len(job["videos"])], comps(cand["product"]), job["skipped"], retry_sleep, _no_render, script_only, _llm, _synth)
                    save(jobs)
                    if built: break
                if not built: break
                pkg = built
                if script_only:
                    job["videos"].append({"slot": len(job["videos"]) + 1, "product": pkg["product"], "category": pkg["topic"]["category"], "facet": pkg["topic"]["facet"], "question": pkg["topic"]["question"], "script": pkg["topic"]["script"], "compliance": pkg["compliance"]["status"], "review": [f["rule"] for f in pkg["compliance"]["findings"]]})
                    accepted.append({"product": pkg["product"], "category": pkg["topic"]["category"]}); continue
                jsave(OUT / pkg["id"] / "package.json", pkg)
                (OUT / pkg["id"] / "captions.md").write_text(_captions_md(pkg))
                jsave(OUT / pkg["id"] / "script.json", pkg["spec"])
                registry.add_video(pkg, "ready")
                topic_log.add({"date": date, "product": pkg["product"], "category": pkg["topic"]["category"], "facet": pkg["topic"]["facet"], "question": pkg["topic"]["question"], "summary": pkg["topic"]["summary"], "hook": pkg["segments"][0]["text"], "narration": " ".join(b["text"] for b in pkg["spec"]["beats"]), "package_id": pkg["id"], "source": "nightly", "status": "built", "style": pkg.get("style")})
                v = {"slot": len(job["videos"]) + 1, "product": pkg["product"], "category": pkg["topic"]["category"], "facet": pkg["topic"]["facet"], "question": pkg["topic"]["question"], "hook_id": pkg["hook_id"], "package_id": pkg["id"],
                     "package": str(OUT / pkg["id"] / "package.json"), "video": pkg["render"]["file"] if "render" in pkg else None, "duration": pkg["duration"], "compliance": pkg["compliance"]["status"], "delivery": None}
                job["videos"].append(v); accepted.append({"product": v["product"], "category": v["category"]}); save(jobs)
            if script_only: job["status"] = "SCRIPTS_ONLY"; save(jobs); return job
            if not job["videos"]:
                job["status"] = "FAILED"; job["error"] = "no video passed the writer, the gate and the duration window"
                job["notify"] = slack.notify_failure(f"{date}: nightly videos failed. No video could be made. " + "; ".join(f"{s.get('topic') or s.get('combo')}: {s['reason']}" for s in job["skipped"][:6]), transport, channel_id=_channel()); save(jobs); return job
            if not deliver_now or _no_render:
                job["status"] = "BUILT_NOT_DELIVERED"; save(jobs); return job
            for v in job["videos"]:
                if v.get("delivery") == "delivered": continue
                pkg = jload(v["package"]); msg = slack.build_message(pkg, registry.posting_times(), heading=f"Nightly Beema video {v['slot']} of {len(job['videos'])}")
                (OUT / pkg["id"] / "slack_message.md").write_text(msg)
                if not _channel() and _sender is None:
                    v["delivery_note"] = "no slack_channel_id configured; message saved for manual delivery"; continue
                v["delivery"] = "sending"; v["delivery_started"] = dt.datetime.now().isoformat(timespec="seconds"); save(jobs)
                try:
                    res = _sender(msg, v["video"]) if _sender is not None else slack.deliver(msg, v["video"], transport=transport, channel_id=_channel())
                except Exception:
                    v["status_detail"] = "Delivery errored mid-send. Check Slack before retrying."; job["status"] = "NEEDS_HUMAN"; save(jobs); raise
                if res.get("transport") == "manual":
                    v["delivery"] = None; v["delivery_note"] = res.get("reason")
                else:
                    v["delivery"] = "delivered"; v["slack"] = res; registry.set_status(pkg["id"], "delivered"); topic_log.mark_delivered(pkg["id"], res)
                save(jobs)
            ok = all(v.get("delivery") == "delivered" for v in job["videos"])
            job["status"] = "DONE" if ok and len(job["videos"]) == count else ("PARTIAL" if ok else "READY_FOR_MANUAL_DELIVERY")
            if len(job["videos"]) < count:
                job["notify"] = slack.notify_failure(f"{date}: only {len(job['videos'])} of {count} nightly videos could be made. " + "; ".join(f"{s.get('topic') or s.get('combo')}: {s['reason']}" for s in job["skipped"][:6]), transport, channel_id=_channel())
            save(jobs); return job
        except Exception as e:
            if not any(v.get("delivery") == "sending" for v in job["videos"]):
                job["status"] = "FAILED"; job["error"] = str(e)[-500:]
                job["notify"] = slack.notify_failure(f"{date}: nightly videos failed: {str(e)[:300]}. Nothing more was delivered.", transport, channel_id=_channel())
            job["trace"] = traceback.format_exc()[-800:]; jobs[date] = job; save(jobs); return job

def _captions_md(pkg):
    c = pkg["captions"]
    return (f"# {pkg['id']}\n\n## Instagram / Facebook / Threads ({c['_lengths']['instagram_facebook_threads']} chars)\n\n{c['instagram_facebook_threads']}\n\n"
            f"## X ({c['_lengths']['x']} chars)\n\n{c['x']}\n\n## TikTok ({c['_lengths']['tiktok']} chars)\n\n{c['tiktok']}\n\n"
            f"## YouTube Shorts\n\nTitle: {c['youtube']['title']}\n\n{c['youtube']['description']}\n\nTags: {', '.join(c['youtube']['tags'])}\n")

def confirm(date, index, outcome):
    jobs = jload(JOBS, {}); job = jobs[date]; v = job["videos"][index - 1]
    if outcome == "delivered": v.update({"delivery": "delivered", "status_detail": "confirmed by human"})
    else: v.update({"delivery": None, "status_detail": "human confirmed it did not land; safe to resend"})
    if job.get("status") == "NEEDS_HUMAN": job["status"] = "new"
    jobs[date] = job; _save(jobs); return job
