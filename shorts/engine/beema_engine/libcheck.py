from __future__ import annotations
from collections import Counter
from .common import ROOT, jsave
from . import library, lint

def _visual_text(v):
    """All on-screen strings in a visual, including list fields (callouts, labels, items) and {t: ...} / {l, v} rows."""
    out = []
    for val in v.values():
        for x in (val if isinstance(val, list) else [val]):
            if isinstance(x, str): out.append(x)
            elif isinstance(x, dict): out += [str(y) for y in x.values() if isinstance(y, str)]
    return " ".join(out)

def check_library(fmt="organic"):
    rows = []
    for kind, c in library.all_components():
        if kind == "hooks": text = c["text"]
        elif kind == "ctas": text = c["text"] + " " + c["screen"]
        else:
            text = " ".join(b["text"] + " " + (b.get("screen") or "") + " " + _visual_text(b["visual"]) for b in c["beats"])
        F = lint.lint_text(text, c["product"], fmt, c["id"])
        F = [f for f in F if f["rule"] not in ("price_reverify",)]
        rows.append({"id": c["id"], "kind": kind, "status": lint.status_of(F), "findings": F})
    summ = Counter((r["id"].split("-")[0], r["status"]) for r in rows)
    jsave(ROOT / "compliance" / "library_report.json", {"format_checked": fmt, "rows": rows})
    return rows, summ
