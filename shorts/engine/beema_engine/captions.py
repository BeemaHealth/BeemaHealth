"""Per-platform caption packages. Natural opener (the hook), one body line, required disclosure, hashtags.
Limits come from config.platform_specs. X counts any URL as 23 characters."""
from __future__ import annotations
from .common import config, products, sha

def _nc(P):
    nc = (P.get("no_charge") or {}).get("line")
    return (" " + nc) if nc else ""

def _disc_long(P, url):
    if P.get("educational"):
        base = "For education only, not medical advice. BPC-157 is not FDA-approved."
        return base if P.get("no_links") else f"{base} More: {url}"
    if P["compounded"] and P["category"] == "ed":
        return f"Compounded, not FDA-approved. Rx only. Not for use with nitrates. Prescribing is never guaranteed.{_nc(P)} Safety info: {url}"
    if P["compounded"]:
        return f"Compounded, not FDA-approved. Rx only. Prescribing is never guaranteed.{_nc(P)} Safety info: {url}"
    return f"Rx only. Not for use with nitrates. Prescribing is never guaranteed.{_nc(P)} Safety info: {url}"

def _disc_short(P):
    if P.get("educational"): return "Education only. Not FDA-approved."
    if P["compounded"] and P["category"] == "ed": return "Compounded, not FDA-approved. Rx only."
    if P["compounded"]: return "Compounded, not FDA-approved. Rx only."
    return "Rx only. Not for use with nitrates."

def _x_len(s, url):
    return len(s.replace(url, "x" * 23)) if url else len(s)

def build_captions(pkg, hook, meat):
    cfg = config(); P = products()[pkg["product"]]; spec = cfg["platform_specs"]
    nl = bool(P.get("no_links"))                     # peptide education: no link, no brand tag, no prescribing language
    url = "" if nl else cfg["site"].replace("https://", "") + P["landing_path"]
    tags = P["hashtags"]
    opener = hook["text"].strip()
    body = meat["caption_bodies"][int(sha(pkg["id"]), 16) % len(meat["caption_bodies"])]
    disc = _disc_long(P, url)

    # priority when over the limit: opener + disclosure + hashtags are required, the body line is optional
    ig = "\n\n".join([opener, body, disc, " ".join(tags[:3])])
    if len(ig) > spec["instagram"]["caption_max"]:
        ig = "\n\n".join([opener, disc, " ".join(tags[:3])])
    if len(ig) > spec["instagram"]["caption_max"]:
        ig = "\n\n".join([opener, _disc_short(P) + ("" if nl else " Prescribing is never guaranteed."), " ".join(tags[:3])])
    xs = " ".join(x for x in [opener, _disc_short(P), url, " ".join(tags[:2])] if x)
    if _x_len(xs, url) > spec["x"]["caption_max"]:
        xs = " ".join(x for x in [opener, _disc_short(P), url] if x)
    if _x_len(xs, url) > spec["x"]["caption_max"]:
        xs = " ".join(x for x in [_disc_short(P), url] if x)
    tt = "\n".join([opener, body, _disc_short(P) + ("" if nl else " Prescribing is never guaranteed."), " ".join(tags[:3] + ([] if nl else ["#BeemaHealth"]))])
    yt_title = opener if len(opener) <= 82 else opener[:79].rstrip() + "..."
    yt_title = f"{yt_title} | Beema Health" if (not nl and len(yt_title) + 15 <= spec["youtube"]["title_max"]) else yt_title
    yt_desc = f"{body}\n\n{disc}\n\n{' '.join(tags[:3])}"
    return {
        "instagram_facebook_threads": ig,
        "x": xs,
        "tiktok": tt,
        "youtube": {"title": yt_title, "description": yt_desc, "tags": list(dict.fromkeys([t.lstrip("#").lower() for t in tags] + ([] if nl else ["beemahealth", "telehealth"])))},
        "_lengths": {"instagram_facebook_threads": len(ig), "x": _x_len(xs, url), "tiktok": len(tt), "youtube_title": len(yt_title)},
    }
