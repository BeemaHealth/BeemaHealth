"""Search-demand signals for the nightly job.

Source: Google autocomplete (suggestqueries.google.com). What it gives: the ORDER in which people's most common
completions appear for a phrase. That is a popularity PROXY, not search-volume numbers. No API key, no personal data:
only the public search phrases in topics.json are sent. Results are cached per day in .cache/demand/.
If every request fails the job falls back to a flat baseline (source "offline") and says so in Slack, so a network
problem never means "no videos" and never pretends to be data.
"""
from __future__ import annotations
import re
import json, time, hashlib, urllib.parse, urllib.request
from .common import ROOT, CACHE, jload, jsave, today

TOPICS = ROOT / "topics.json"
URL = "https://suggestqueries.google.com/complete/search?client=firefox&hl=en&gl=us&q={q}"

def topics():
    return jload(TOPICS)

def _ssl_context():
    """Python on macOS often has no CA bundle; use the system one (or certifi) so TLS verifies."""
    import ssl, os
    for cafile in ("/etc/ssl/cert.pem", "/private/etc/ssl/cert.pem"):
        if os.path.exists(cafile): return ssl.create_default_context(cafile=cafile)
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()

def _parse(raw):
    data = json.loads(raw)
    if not (isinstance(data, list) and len(data) >= 2 and isinstance(data[1], list)):
        raise ValueError("unexpected autocomplete response")
    return [str(s).lower() for s in data[1]]

def fetch_suggestions(query, timeout=8):
    """Live autocomplete for one phrase -> list[str]. urllib first; if TLS or the network misbehaves, the system `curl`."""
    url = URL.format(q=urllib.parse.quote(query))
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=timeout, context=_ssl_context()) as r:
            return _parse(r.read().decode("utf-8", "replace"))
    except Exception:
        import subprocess
        r = subprocess.run(["curl", "-s", "-m", str(timeout), "-A", "Mozilla/5.0", url], capture_output=True, text=True, timeout=timeout + 4)
        if r.returncode != 0 or not r.stdout.strip(): raise RuntimeError(f"autocomplete fetch failed (curl rc={r.returncode})")
        return _parse(r.stdout)

def _cached(query, date, fetch):
    d = CACHE / "demand"; d.mkdir(parents=True, exist_ok=True)
    f = d / f"{date}_{hashlib.sha256(query.encode()).hexdigest()[:16]}.json"
    c = jload(f)
    if c is not None: return c["s"], False
    s = fetch(query)
    jsave(f, {"q": query, "s": s})
    return s, True

def classify(text, product, facets):
    """Which facets does this completion belong to? A completion can hit several."""
    out = []
    for name, f in facets.items():
        if f.get("products") and product not in f["products"]: continue
        if any(t in text for t in f["triggers"]): out.append(name)
    return out

def signals(date=None, fetch=None, sleep=0.12):
    """-> {"source": "google_autocomplete"|"offline", "products": {product: {"popularity": float, "facets": {facet: {"score": float, "top": [str]}}}}, "errors": int, "requests": int}"""
    date = date or today(); T = topics(); polite = fetch is None; fetch = fetch or fetch_suggestions      # only real network calls need the polite delay
    out = {"source": "google_autocomplete", "products": {}, "errors": 0, "requests": 0}
    ok = 0
    for product, terms in T["search_terms"].items():
        pop = 0.0; facets = {}; comp = {}
        for term in terms:
            for pat in T["question_prefixes"]:
                q = pat.format(t=term).strip() + " "
                out["requests"] += 1
                try:
                    sugg, live = _cached(q, date, fetch)
                    ok += 1
                    if live and sleep and polite: time.sleep(sleep)
                except Exception:
                    out["errors"] += 1; continue
                if "reddit" in pat: sugg = [x for x in (re.sub(r"\breddit\b", "", y).replace("  ", " ").strip() for y in sugg) if x]      # Reddit-flavoured searches: keep the question, drop the site name
                for rank, s in enumerate(sugg):
                    w = 1.0 / (1 + rank)
                    pop += w
                    comp[s] = comp.get(s, 0.0) + w
                    for fct in classify(s, product, T["facets"]):
                        e = facets.setdefault(fct, {"score": 0.0, "top": []})
                        e["score"] += w
                        if s not in e["top"] and len(e["top"]) < 6: e["top"].append(s)
        out["products"][product] = {"popularity": round(pop, 3), "completions": [c for c, _ in sorted(comp.items(), key=lambda kv: -kv[1])[:40]], "facets": {k: {"score": round(v["score"], 3), "top": v["top"]} for k, v in facets.items()}}
    if ok == 0:
        out["source"] = "offline"
    return out
