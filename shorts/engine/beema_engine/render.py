"""Remotion rendering wrapper: props file -> mp4 / stills. Records render time."""
from __future__ import annotations
import subprocess, time, json
from .common import REMOTION, OUT, jsave
from . import compose, firstframe

def _run(cmd, cwd):
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"remotion failed ({r.returncode}):\n{(r.stderr or r.stdout)[-1500:]}")
    return r

def write_props(pkg):
    props = compose.to_props(pkg)
    d = OUT / pkg["id"]; d.mkdir(parents=True, exist_ok=True)
    jsave(d / "props.json", props)
    return d / "props.json", props

def assert_first_frame(pkg, pj):
    """Rule: a video never opens on an empty frame (socials use frame 0 as the preview). Renders frame 0 and refuses a blank one."""
    d = OUT / pkg["id"]; d.mkdir(parents=True, exist_ok=True)
    f0 = d / "first_frame.png"
    _run(["npx", "remotion", "still", "src/index.ts", f"Clip{pkg['aspect']}", str(f0), f"--props={pj}", "--frame=0", "--log=error", "--overwrite"], REMOTION)
    blank, frac = firstframe.is_blank(f0)
    pkg.setdefault("checks", {})["first_frame_content"] = round(frac, 3)
    if blank:
        raise RuntimeError(f"first frame is blank (content {frac:.3f} < {firstframe.MIN_FRACTION}): every video must open on something visible. See {f0}")

def render(pkg, preview=False):
    """Returns path of mp4. preview=True renders at 40% scale / high CRF for fast review."""
    pj, props = write_props(pkg)
    d = OUT / pkg["id"]
    assert_first_frame(pkg, pj)
    name = "preview.mp4" if preview else f"{pkg['id']}.mp4"
    out = d / name
    cmd = ["npx", "remotion", "render", "src/index.ts", f"Clip{pkg['aspect']}", str(out), f"--props={pj}", "--codec=h264",
           "--crf=" + ("30" if preview else "18"), "--log=error", "--overwrite"]
    if preview: cmd += ["--scale=0.4"]
    t0 = time.time(); _run(cmd, REMOTION); dt_ = round(time.time() - t0, 1)
    pkg.setdefault("cost", {})["render_seconds_preview" if preview else "render_seconds"] = dt_
    pkg["render"] = {"file": str(out), "preview": preview, "seconds": dt_, "bytes": out.stat().st_size}
    return out

def stills(pkg, times):
    pj, props = write_props(pkg)
    d = OUT / pkg["id"] / "stills"; d.mkdir(parents=True, exist_ok=True)
    outs = []
    for t in times:
        o = d / f"t{t:05.2f}.png"
        _run(["npx", "remotion", "still", "src/index.ts", f"Clip{pkg['aspect']}", str(o), f"--props={pj}", f"--frame={int(t * 30)}", "--log=error", "--overwrite"], REMOTION)
        outs.append(o)
    return outs
