"""Creative registry: one inspectable JSON file + CSV metric import. Never fabricates numbers."""
from __future__ import annotations
import csv, datetime as dt, statistics as st
from collections import defaultdict
from .common import REG, ROOT, jload, jsave, config

PATH = REG / "registry.json"
METRIC_FIELDS = ["views", "impressions", "hook_rate_3s", "avg_watch_s", "avg_watch_pct", "completion_rate", "likes", "comments", "shares", "saves",
                 "clicks", "spend", "ctr", "cpc", "lp_cvr", "qualified_leads", "cpql", "customers", "cac", "revenue", "roas"]

def load():
    return jload(PATH, {"version": 1, "videos": {}, "notes": []})

def save(reg): jsave(PATH, reg)

def add_video(pkg, status="rendered"):
    reg = load()
    v = reg["videos"].get(pkg["id"], {})
    v.update({
        "id": pkg["id"], "product": pkg["product"], "format": pkg["format"], "aspect": pkg["aspect"], "version": pkg["version"],
        "date": pkg["date"], "hook_id": pkg["hook_id"], "meat_id": pkg["meat_id"], "cta_id": pkg["cta_id"],
        "creative_style": pkg["creative_style"], "hook_angle": pkg["hook_angle"],
        "extra_ed_mints_mention": pkg.get("extra_ed_mints_mention", False),
        "compliance": {"status": pkg["compliance"]["status"], "counts": pkg["compliance"]["counts"],
                       "human_signoff": (v.get("compliance") or {}).get("human_signoff")},
        "files": {"video": (pkg.get("render") or {}).get("file"), "package": str(ROOT / "out" / pkg["id"] / "package.json"),
                  "voice": pkg.get("voice", {}).get("file")},
        "sources": {"voice": pkg.get("voice", {}).get("provider"), "assets": [pkg["endcard"]["photo"] or pkg["endcard"]["mark"], pkg["endcard"]["logo"]],
                    "licensing": "Brand assets and product photos are Beema Health owned. Voice: Kokoro-82M (Apache-2.0) local TTS. No stock footage or music used."},
        "cost": pkg.get("cost", {}), "status": v.get("status", status),
        "posts": v.get("posts", []), "ads": v.get("ads", []), "label": v.get("label"),
    })
    reg["videos"][pkg["id"]] = v; save(reg); return v

def set_status(vid, status):
    reg = load(); reg["videos"][vid]["status"] = status; save(reg)

def signoff(vid, who, note=""):
    reg = load(); v = reg["videos"][vid]
    if v["compliance"]["status"] == "BLOCKED": raise ValueError("BLOCKED packages cannot be signed off")
    v["compliance"]["human_signoff"] = {"by": who, "at": dt.datetime.now().isoformat(timespec="seconds"), "note": note}
    save(reg)

def mark(vid, label):
    assert label in ("winner", "loser", "retired", "testing", None)
    reg = load(); reg["videos"][vid]["label"] = label; save(reg)

def _num(x):
    x = (x or "").strip().replace("%", "").replace("$", "").replace(",", "")
    if x == "": return None
    try: return float(x)
    except ValueError: return None

def import_metrics(csv_path):
    """CSV columns: video_id,platform,kind(organic|ad),posted_at,url,notes + any of METRIC_FIELDS. Blank cells are ignored."""
    reg = load(); n = 0; skipped = []
    for row in csv.DictReader(open(csv_path)):
        vid = (row.get("video_id") or "").strip()
        if vid not in reg["videos"]: skipped.append(vid); continue
        m = {k: _num(row.get(k)) for k in METRIC_FIELDS}; m = {k: v for k, v in m.items() if v is not None}
        if not m: continue
        entry = {"platform": row.get("platform", "").strip().lower(), "posted_at": (row.get("posted_at") or "").strip() or None,
                 "url": (row.get("url") or "").strip() or None, "metrics": m, "source": "csv_import", "recorded_at": dt.date.today().isoformat(), "notes": row.get("notes", "")}
        key = "ads" if (row.get("kind") or "organic").strip().lower() == "ad" else "posts"
        reg["videos"][vid][key] = [p for p in reg["videos"][vid][key] if not (p["platform"] == entry["platform"] and p.get("posted_at") == entry["posted_at"])] + [entry]
        if key == "posts": reg["videos"][vid]["status"] = "posted"
        n += 1
    save(reg); return n, skipped

def _score(m):
    """Organic quality score from whatever exists: prefer hook rate, then avg watch %, then completion. None if nothing usable."""
    for k in ("hook_rate_3s", "avg_watch_pct", "completion_rate"):
        if k in m: return k, m[k]
    return None, None

def recommend(min_posts=5):
    reg = load(); vids = list(reg["videos"].values())
    scored = []
    for v in vids:
        for p in v["posts"]:
            k, s = _score(p["metrics"])
            if s is not None: scored.append((v, p, k, s))
    lines = ["# Creative recommendations", "", f"Generated {dt.date.today()}. Source: registry/registry.json (manual/CSV metrics only).", ""]
    if len(scored) < min_posts:
        lines += [f"**Insufficient data:** {len(scored)} posts with usable metrics (need at least {min_posts}). Keep running phase {config()['phase']} and import metrics with `beema.py registry import-metrics FILE.csv`.", ""]
        txt = "\n".join(lines); (REG / "recommendations.md").write_text(txt); return txt, {}
    by = {"hook_angle": defaultdict(list), "meat_id": defaultdict(list), "cta_id": defaultdict(list), "product": defaultdict(list)}
    for v, p, k, s in scored:
        for dim in by: by[dim][v[dim]].append(s)
    lines += ["Scores use the best available organic metric per post (hook rate, else avg watch %, else completion). Mixing metrics across platforms is lossy.", "",
              "**Read this carefully:** hooks are never reused, so each hook has n=1. Platform, posting time, product and day-of-week are all confounded with the hook. Treat rankings as hypotheses to retest, not conclusions.", ""]
    out = {}
    for dim, d in by.items():
        rows = sorted(((st.mean(v), len(v), k) for k, v in d.items()), reverse=True)
        out[dim] = rows
        lines += [f"## By {dim}", "", "| value | mean score | n |", "|---|---|---|"] + [f"| {k} | {m:.2f} | {n} |" for m, n, k in rows] + [""]
    top_angle = out["hook_angle"][0]
    lines += ["## Suggested next experiments", "",
              f"1. Retest the best hook angle `{top_angle[2]}` (n={top_angle[1]}) with 3 fresh hooks of that angle on a different product, same control meat and CTA.",
              "2. Once ~10 hooks per product have data, move `config.phase` to 2 and test the other 4 meats with the top hooks.",
              "3. After meats, move to phase 3 and test CTAs C2/C3 on the best hook+meat pair.",
              "4. Paid: use organic winners as *candidates* only. Run a small paid batch and judge on cost per qualified lead and CAC, not organic engagement.", ""]
    txt = "\n".join(lines); (REG / "recommendations.md").write_text(txt); return txt, out

def best_hours(platform, min_posts=10):
    reg = load(); by = defaultdict(list)
    for v in reg["videos"].values():
        for p in v["posts"]:
            if p["platform"] == platform and p.get("posted_at") and "views" in p["metrics"]:
                try: h = dt.datetime.fromisoformat(p["posted_at"]).hour
                except ValueError: continue
                by[h].append(p["metrics"]["views"])
    n = sum(len(x) for x in by.values())
    if n < min_posts: return None, n
    ranked = sorted(((st.median(x), h, len(x)) for h, x in by.items()), reverse=True)[:2]
    return [f"{h:02d}:00" for _, h, _ in ranked], n

def posting_times():
    cfg = config()["posting_times"]; out = {}
    for plat, default in cfg["defaults_local"].items():
        hrs, n = best_hours(plat)
        out[plat] = {"times": hrs or default, "basis": f"measured from {n} posts with timestamps and views" if hrs else "PLACEHOLDER default, no audience data yet"}
    return out
