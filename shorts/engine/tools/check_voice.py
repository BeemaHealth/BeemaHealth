"""Hear what a composed video actually SAYS: transcribes each segment of out/<id>/voice.wav with Whisper and prints
SAID (the script) next to HEARD (the recognizer). Use it after every compose, and for any new drug name or URL.

    shorts/pde5-explainer/.venv/bin/python shorts/engine/tools/check_voice.py shorts/engine/out/<id>/package.json [b2 cta ...]

Needs `transformers` (already in the venv); the first run downloads openai/whisper-base.en (~290 MB).
A recognizer is not an ear: it proves the word is intelligible and the stress/syllables are plausible, not that the voice sounds nice.
Spelling differences like "Terzepatide" for "tirzepatide" are expected and fine; a dropped syllable ("Sepatine") or a glued word ("comzepatide") is not.
"""
import sys, json, wave, warnings
from pathlib import Path
import numpy as np
warnings.filterwarnings("ignore")

def main():
    if len(sys.argv) < 2:
        print(__doc__); return 1
    pkg_path = Path(sys.argv[1]); want = set(sys.argv[2:])
    pkg = json.loads(pkg_path.read_text())
    with wave.open(str(pkg_path.with_name("voice.wav"))) as f:
        sr = f.getframerate(); a = np.frombuffer(f.readframes(f.getnframes()), dtype="<i2").astype(np.float32) / 32768
    from transformers import pipeline
    asr = pipeline("automatic-speech-recognition", model="openai/whisper-base.en", device="cpu")
    for s in pkg["segments"]:
        if want and s["id"] not in want: continue
        seg = a[int(s["t0"] * sr): int((s["end"] + 1.5) * sr)]          # +1.5s so a late word is never cut off
        n = int(len(seg) * 16000 / sr)
        w = np.interp(np.linspace(0, len(seg) - 1, n), np.arange(len(seg)), seg).astype(np.float32)
        heard = asr({"raw": w, "sampling_rate": 16000})["text"].strip()
        print(f"[{s['id']}] SAID : {s['text']}\n      HEARD: {heard}\n", flush=True)
    return 0

if __name__ == "__main__":
    sys.exit(main())
