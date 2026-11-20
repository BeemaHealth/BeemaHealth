"""First-frame gate: a video must never open on an empty frame (socials use frame 0 as the preview/thumbnail).

`content_fraction(png)` = share of pixels that differ clearly from the frame's median luminance. A flat background or a
plain gradient scores about 0; a frame with a caption, a grid, a product or a logo scores several percent.
Uses macOS `sips` to downscale and convert to BMP (no Pillow in the venv). Rule lives in the beema-organic-video and
beema-ad-video skills: never start a video blank unless Matt explicitly asks for it.
CLI:  python -m beema_engine.firstframe path/to/frame0.png|video.mp4
"""
from __future__ import annotations
import struct, subprocess, sys, tempfile, shutil
from pathlib import Path
import numpy as np

MIN_FRACTION = 0.02       # at least 2% of pixels must differ from the median by LUM_DELTA
LUM_DELTA = 12            # 0-255 luminance

def _bmp_luma(path: Path) -> np.ndarray:
    b = path.read_bytes()
    off = struct.unpack_from("<I", b, 10)[0]
    w, h = struct.unpack_from("<ii", b, 18); bpp = struct.unpack_from("<H", b, 28)[0]
    flip = h > 0; h = abs(h); bytes_pp = bpp // 8
    stride = (w * bytes_pp + 3) & ~3
    a = np.frombuffer(b, dtype=np.uint8, count=stride * h, offset=off).reshape(h, stride)[:, :w * bytes_pp].reshape(h, w, bytes_pp)
    if flip: a = a[::-1]
    bgr = a[:, :, :3].astype(np.float32)
    return 0.114 * bgr[:, :, 0] + 0.587 * bgr[:, :, 1] + 0.299 * bgr[:, :, 2]

def content_fraction(image: Path) -> float:
    """Fraction of pixels that stand out from the background. image: PNG/JPEG still."""
    if not shutil.which("sips"):
        raise RuntimeError("first-frame check needs macOS `sips`")
    with tempfile.TemporaryDirectory() as d:
        bmp = Path(d) / "f.bmp"
        r = subprocess.run(["sips", "-z", "384", "216", "-s", "format", "bmp", str(image), "--out", str(bmp)], capture_output=True, text=True)
        if r.returncode != 0 or not bmp.exists(): raise RuntimeError(f"sips failed: {(r.stderr or r.stdout)[-300:]}")
        y = _bmp_luma(bmp)
    return float((np.abs(y - np.median(y)) > LUM_DELTA).mean())

def is_blank(image: Path) -> tuple[bool, float]:
    f = content_fraction(image)
    return f < MIN_FRACTION, f

if __name__ == "__main__":
    p = Path(sys.argv[1])
    if p.suffix.lower() in (".mp4", ".mov", ".webm"):
        import glob
        ff = next(iter(glob.glob(str(Path(__file__).resolve().parents[2] / "pde5-explainer/node_modules/@remotion/compositor-*/ffmpeg"))), None)
        if not ff: sys.exit("ffmpeg (remotion compositor) not found")
        out = Path(tempfile.mkdtemp()) / "f0.png"
        subprocess.run([ff, "-y", "-v", "error", "-i", str(p.resolve()), "-frames:v", "1", str(out)], cwd=str(Path(ff).parent), check=True)
        p = out
    blank, f = is_blank(p)
    print(f"{'BLANK' if blank else 'ok'}  content fraction {f:.3f} (min {MIN_FRACTION})")
    sys.exit(1 if blank else 0)
