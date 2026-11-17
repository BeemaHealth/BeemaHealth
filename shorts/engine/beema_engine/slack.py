"""Slack delivery. Transports: bot (SLACK_BOT_TOKEN, needs files:write + chat:write), claude-cli (headless `claude -p`
with the Slack connector), manual (writes the message, tells a human what to post).
Nothing here posts to a channel unless config.daily.slack_channel_id is set. Never publishes to social platforms."""
from __future__ import annotations
import os, json, shutil, subprocess, textwrap
from pathlib import Path
from .common import config, products
from . import registry

def build_message(pkg, times, heading=None):
    P = products()[pkg["product"]]; c = pkg["compliance"]; cap = pkg["captions"]
    flags = [f for f in c["findings"] if f["level"] in ("BLOCK", "REVIEW")]
    need = "\n".join(f"  - [{f['level']}] {f['rule']}: {f['msg']}" + (f" (\"{f['snippet'][:60]}\")" if f["snippet"] else "") for f in flags) or "  - none"
    tt = "\n".join(f"  - {k}: {', '.join(v['times'])} ({v['basis']})" for k, v in times.items())
    tp = pkg.get("topic")
    topic_lines = []
    if tp:
        ev = "; ".join(tp.get("evidence", [])[:3]) or "no direct search match (library rotation)"
        topic_lines = ([f"*Question answered:* {tp['question']}"] if tp.get("question") else []) + [f"*Why this topic:* {tp['category'].replace('_', ' ')} / {tp['facet'].replace('_', ' ')} (search signal: {tp['source']}, score {tp['score']}). People search: {ev}",
                       "*Education only: no links, prices or offers (peptide).*" if tp["category"] == "peptides" else "*Length:* " + f"{pkg['duration']}s (limit 15-45s)"] + ([f"*Script (written fresh tonight; every animation fires on the word it illustrates):*\n```{tp['script']}```"] if tp.get("script") else [])
    L = [f"*{heading or 'Daily Beema video'}: {P['label']}* ({pkg['date']})",
         f"*IDs:* hook `{pkg['hook_id']}` | meat `{pkg['meat_id']}` | CTA `{pkg['cta_id']}` | v{pkg['version']} | {pkg['duration']}s | {pkg['aspect']}",
         f"*Hook:* {pkg['segments'][0]['text']}",
         f"*Style:* {pkg['creative_style']} | angle: {pkg['hook_angle']}", *topic_lines,
         f"*Compliance:* `{c['status']}`. Human sign-off still required before posting. NOT auto-published.",
         "*Needs a human decision:*", need, "",
         f"*Instagram / Facebook / Threads* ({cap['_lengths']['instagram_facebook_threads']} chars)", f"```{cap['instagram_facebook_threads']}```",
         f"*X* ({cap['_lengths']['x']} chars)", f"```{cap['x']}```",
         "*TikTok*", f"```{cap['tiktok']}```",
         f"*YouTube Shorts* title: `{cap['youtube']['title']}`", f"```{cap['youtube']['description']}```", "tags: " + ", ".join(cap["youtube"]["tags"]), "",
         "*Suggested posting times* (local)", tt, "",
         f"*Sign off:* `python shorts/engine/beema.py registry signoff {pkg['id']} --by NAME`"]
    return "\n".join(L)

def channel():
    d = config()["daily"]; return d.get("slack_channel_id")

def pick_transport():
    if os.environ.get("SLACK_BOT_TOKEN"): return "bot"
    if shutil.which("claude"): return "claude-cli"
    return "manual"

def _bot(channel_id, text, file_path):
    import requests
    tok = os.environ["SLACK_BOT_TOKEN"]; H = {"Authorization": f"Bearer {tok}"}
    if not file_path:
        r = requests.post("https://slack.com/api/chat.postMessage", headers=H, json={"channel": channel_id, "text": text}, timeout=60).json()
        if not r.get("ok"): raise RuntimeError(f"slack chat.postMessage: {r.get('error')}")
        return {"ts": r["ts"], "transport": "bot"}
    p = Path(file_path); size = p.stat().st_size
    r = requests.post("https://slack.com/api/files.getUploadURLExternal", headers=H, data={"filename": p.name, "length": size}, timeout=60).json()
    if not r.get("ok"): raise RuntimeError(f"slack getUploadURLExternal: {r.get('error')}")
    with open(p, "rb") as f: up = requests.post(r["upload_url"], data=f, timeout=600)
    up.raise_for_status()
    done = requests.post("https://slack.com/api/files.completeUploadExternal", headers=H,
        json={"files": [{"id": r["file_id"], "title": p.name}], "channel_id": channel_id, "initial_comment": text}, timeout=60).json()
    if not done.get("ok"): raise RuntimeError(f"slack completeUploadExternal: {done.get('error')}")
    return {"file_id": r["file_id"], "transport": "bot"}

def _claude_cli(channel_id, text, file_path):
    msgfile = Path(file_path).with_name("slack_message.md") if file_path else Path("/tmp/slack_message.md")
    msgfile.write_text(text)
    prompt = (f"Post exactly one Slack message to channel ID {channel_id}. Read the message text from {msgfile} and post it verbatim. "
              + (f"Then upload the video file {file_path} to the same channel using slack_get_file_upload_url, a curl PUT/POST of the file bytes, and slack_complete_file_upload. " if file_path else "")
              + "Do not post anywhere else. Do not retry if it succeeds. Reply with only DELIVERED and the message or file ids.")
    r = subprocess.run(["claude", "-p", prompt, "--allowedTools", "mcp__claude_ai_Slack__*", "Bash(curl:*)", "Read", "--output-format", "text"],
                       capture_output=True, text=True, timeout=900)
    if r.returncode != 0 or "DELIVERED" not in r.stdout: raise RuntimeError(f"claude-cli delivery failed: {(r.stderr or r.stdout)[-400:]}")
    return {"transport": "claude-cli", "reply": r.stdout.strip()[-300:]}

def deliver(text, file_path=None, transport=None, channel_id=None):
    channel_id = channel_id or channel()
    transport = transport or pick_transport()
    if not channel_id: return {"transport": "manual", "reason": "no slack_channel_id configured in config.json (daily.slack_channel_id)"}
    if transport == "bot": return _bot(channel_id, text, file_path)
    if transport == "claude-cli": return _claude_cli(channel_id, text, file_path)
    return {"transport": "manual", "reason": "no bot token or claude CLI available"}

def notify_failure(text, transport=None, channel_id=None):
    """Failure notices go to Slack when configured, always also to a macOS notification + log."""
    res = {}
    try:
        if channel_id or channel(): res = deliver(":warning: *Beema daily video problem*\n" + text, None, transport, channel_id=channel_id)
    except Exception as e: res = {"error": str(e)}
    try: subprocess.run(["osascript", "-e", f'display notification "{text[:120].replace(chr(34), chr(39))}" with title "Beema daily video"'], capture_output=True, timeout=10)
    except Exception: pass
    return res
