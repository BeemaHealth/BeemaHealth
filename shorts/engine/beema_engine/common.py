from __future__ import annotations
import json, re, hashlib, os, time, datetime as dt
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # shorts/engine
REMOTION = ROOT.parent / "pde5-explainer"              # Remotion project hosting the compositions
LIB = ROOT / "library"
OUT = ROOT / "out"
STATE = ROOT / "state"
REG = ROOT / "registry"
CACHE = ROOT / ".cache"

def jload(p, default=None):
    p = Path(p)
    if not p.exists():
        return default
    return json.loads(p.read_text())

def jsave(p, obj):
    p = Path(p)
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(p.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, indent=2, ensure_ascii=False) + "\n")
    os.replace(tmp, p)               # atomic

def config(): return jload(ROOT / "config.json")
def products(): return {k: v for k, v in jload(ROOT / "products.json").items() if not k.startswith("_")}
def brand(): return jload(ROOT / "brand.json")
def claims():
    """claims.json plus claims_proposed.json (claims a nightly script proposed; status ai_proposed_unverified, so the gate always asks a human)."""
    out = {k: v for k, v in jload(ROOT / "claims.json").items() if not k.startswith("_")}
    for k, v in (jload(ROOT / "claims_proposed.json", {}) or {}).items():
        if not k.startswith("_") and k not in out: out[k] = v
    return out

def today(): return dt.date.today().isoformat()
def sha(*parts): return hashlib.sha256("|".join(map(str, parts)).encode()).hexdigest()[:12]

PREFIX = {"tadalafil": "TAD", "sildenafil": "SIL", "ed-mints": "MNT", "tirzepatide": "TRZ", "semaglutide": "SMG", "bpc-157": "BPC"}
PRODUCT_BY_PREFIX = {v: k for k, v in PREFIX.items()}

def product_of(component_id: str) -> str:
    return PRODUCT_BY_PREFIX[component_id.split("-")[0]]

_ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
_TENS = {"twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90}

def words_to_int(s: str):
    """Parse spoken numbers up to 999: 'eighty-nine', 'a hundred and forty-nine', 'one twenty-nine', 'fifty'."""
    t = re.sub(r"[-,]", " ", s.lower()).replace(" and ", " ").split()
    if not t: return None
    total, cur, ok = 0, 0, False
    i = 0
    # spoken shorthand: 'one twenty nine' -> 129, 'one forty nine' -> 149
    if len(t) >= 2 and t[0] == "one" and t[1] in _TENS:
        total = 100; t = t[1:]
    for w in t:
        if w in ("a",): continue
        if w in _ONES: cur += _ONES.index(w); ok = True
        elif w in _TENS: cur += _TENS[w]; ok = True
        elif w == "hundred": cur = max(cur, 1) * 100; ok = True
        else: return None
    return total + cur if ok else None
