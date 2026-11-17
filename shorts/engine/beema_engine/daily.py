"""Daily job: plan -> compose -> compliance gate -> render -> registry -> Slack. Idempotent per date.

Safety properties:
 * one file-lock per run; state in state/jobs.json written atomically
 * delivery is recorded BEFORE and AFTER sending. If a send may have landed but wasn't confirmed
   (crash/timeout), the job refuses to resend and asks a human to check Slack - no duplicate videos
 * BLOCKED compliance or a failed render never delivers a video; a failure notice goes out instead
 * never publishes to any social platform
"""
from __future__ import annotations
import fcntl, time, traceback, datetime as dt
from .common import STATE, OUT, config, jload, jsave, today
from . import planner, compose, render, registry, slack

JOBS = STATE / "jobs.json"; LOCK = STATE / "daily.lock"

def _save(jobs): jsave(JOBS, jobs)

def run(date=None, dry_run=False, deliver_now=True, transport=None, product=None, retry_sleep=20, _sender=None):
    date = date or today(); STATE.mkdir(parents=True, exist_ok=True)
    with open(LOCK, "w") as lf:
        try: fcntl.flock(lf, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError: return {"status": "LOCKED", "detail": "another daily run is active"}
        jobs = jload(JOBS, {}); job = jobs.get(date, {"date": date, "attempts": 0, "status": "new"})
        if job.get("delivery") == "delivered": return {**job, "note": "already delivered, nothing to do"}
        if job.get("delivery") == "sending":
            job["status"] = "NEEDS_HUMAN"; job["detail"] = "A previous send may have landed but was not confirmed. Check Slack, then run `beema.py daily confirm --date DATE delivered|failed`. Not resending."
            jobs[date] = job; _save(jobs); return job
        job["attempts"] += 1; job["started"] = dt.datetime.now().isoformat(timespec="seconds"); jobs[date] = job; _save(jobs)
        try:
            if "package" not in job:
                p = planner.plan(date, product=product)
                pkg = compose.build_package(p["product"], p["hook_id"], p["meat_id"], p["cta_id"], date=date)
                job.update({"plan": p, "package_id": pkg["id"]})
                if pkg["compliance"]["status"] == "BLOCKED":
                    job.update({"status": "BLOCKED_COMPLIANCE", "findings": [f for f in pkg["compliance"]["findings"] if f["level"] == "BLOCK"]})
                    jobs[date] = job; _save(jobs)
                    job["notify"] = slack.notify_failure(f"{date}: {pkg['id']} failed the compliance gate. No video delivered. " + "; ".join(f['rule'] for f in job["findings"]), transport) if not dry_run else "dry_run"
                    return job
                if dry_run: job["status"] = "DRY_RUN_OK"; return job
                pkg = compose.synthesize(pkg)
                last = None
                for attempt in range(1, config()["daily"]["max_render_retries"] + 1):
                    try: render.render(pkg); break
                    except Exception as e:
                        last = e; job.setdefault("render_errors", []).append(f"attempt {attempt}: {str(e)[-300:]}"); _save(jobs)
                        if attempt < config()["daily"]["max_render_retries"]: time.sleep(retry_sleep * attempt)
                else: raise RuntimeError(f"render failed after retries: {last}")
                f = pkg["render"]["file"]
                import os
                if not os.path.exists(f) or os.path.getsize(f) < 200_000: raise RuntimeError("render output missing or implausibly small")
                jsave(OUT / pkg["id"] / "package.json", pkg)
                registry.add_video(pkg, "ready")
                job.update({"package": str(OUT / pkg["id"] / "package.json"), "video": f, "status": "RENDERED"}); jobs[date] = job; _save(jobs)
            pkg = jload(job["package"])
            if not deliver_now: job["status"] = "RENDERED_NOT_DELIVERED"; _save(jobs); return job
            msg = slack.build_message(pkg, registry.posting_times())
            if not slack.channel() and _sender is None:
                job.update({"status": "READY_FOR_MANUAL_DELIVERY", "message_file": str(OUT / pkg["id"] / "slack_message.md")})
                (OUT / pkg["id"] / "slack_message.md").write_text(msg); _save(jobs); return job
            job["delivery"] = "sending"; job["delivery_started"] = dt.datetime.now().isoformat(timespec="seconds"); _save(jobs)
            try:
                res = (_sender or slack.deliver)(msg, job["video"], transport=transport) if _sender is None else _sender(msg, job["video"])
            except Exception:
                # the send may or may not have landed: leave 'sending' so we NEVER blindly resend
                job["status"] = "NEEDS_HUMAN"; job["detail"] = "Delivery errored mid-send. Check Slack before retrying."; _save(jobs); raise
            if res.get("transport") == "manual":
                job["delivery"] = None; job.update({"status": "READY_FOR_MANUAL_DELIVERY", "detail": res.get("reason")})
                (OUT / pkg["id"] / "slack_message.md").write_text(msg)
            else:
                job.update({"delivery": "delivered", "status": "DELIVERED", "slack": res}); registry.set_status(pkg["id"], "delivered")
            _save(jobs); return job
        except Exception as e:
            if job.get("delivery") != "sending":
                job["status"] = "FAILED"; job["error"] = str(e)[-500:]; _save(jobs)
                job["notify"] = slack.notify_failure(f"{date}: daily video failed: {str(e)[:300]}. Nothing was delivered.", transport)
            job["trace"] = traceback.format_exc()[-800:]; jobs[date] = job; _save(jobs)
            return job

def confirm(date, outcome):
    jobs = jload(JOBS, {}); job = jobs[date]
    if outcome == "delivered": job.update({"delivery": "delivered", "status": "DELIVERED", "detail": "confirmed by human"})
    else: job.update({"delivery": None, "status": "RENDERED", "detail": "human confirmed it did not land; safe to resend"})
    jobs[date] = job; _save(jobs); return job
