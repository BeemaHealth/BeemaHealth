"""Black Friday ad audio: Kokoro voiceover placed on the scene cuts + a quiet, warm ambient bed (original, no licensed track).
Calm, clinical-premium feel: no drums, no chiptune synths. Voice is NOT pitch-squeezed; each line is re-synthesized at a faster native
speed until it fits its scene window.
Usage: python shorts/engine/tools/bf_audio_mints.py [voice_id]  -> shorts/pde5-explainer/public/engine/tmp/bf-mints.wav (16 s, 44.1 kHz mono)."""
import sys, copy, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from beema_engine.common import config
from beema_engine import tts

SR, DUR = 44100, 16.0
VOICE = sys.argv[1] if len(sys.argv) > 1 else "af_heart"
OUT = ROOT.parent / "pde5-explainer/public/engine/tmp/bf-mints.wav"
# (start s, window s, text). Starts sit just after each visual cut.
LINES = [
    (0.15, 2.20, "Black Friday at Beema Health."),
    (2.50, 3.90, "Fifty dollars off Ed Mints, on any plan."),
    (6.55, 3.95, "Use code Beema Health fifty off Ed Mints. Any plan."),
    (10.70, 2.80, "Online visit, licensed provider, shipped to your door."),
    (13.70, 2.20, "Get started. Rx only."),
]
rng = np.random.default_rng(11)

def resample(a, ratio):
    n = int(len(a) / ratio); return np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a)

def reverb(x, wet=0.13, tail=0.45):
    t = np.arange(int(tail * SR)) / SR
    ir = rng.standard_normal(len(t)) * np.exp(-t * 7.5); ir[0] = 0
    ir /= np.abs(ir).sum() + 1e-9
    return x + wet * 6 * np.convolve(x, ir)[:len(x)]

def voice():
    track = np.zeros(int(DUR * SR), dtype=np.float32); env = np.zeros_like(track)
    for start, win, text in LINES:
        best = None
        for sp in (1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3):       # native Kokoro speed: no pitch change
            cfg = copy.deepcopy(config()); cfg["voice"]["voice"] = VOICE; cfg["voice"]["speed"] = sp
            a, _, _, _ = tts.synth_segment(text, f"bf{sp}", cfg)
            a = resample(a.astype(np.float64), tts.SR / SR); d = len(a) / SR
            best = (a, d, sp)
            if d <= win: break
        a, d, sp = best
        print(f"{start:5.2f}s  {d:4.2f}s / {win:4.2f}s  speed {sp:.2f}  {text}")
        a = a[:len(track) - int(start * SR)]
        i = int(start * SR); track[i:i + len(a)] += a.astype(np.float32); env[i:i + len(a)] = 1
    track = reverb(track.astype(np.float64))
    k = np.ones(int(0.12 * SR)) / int(0.12 * SR)
    return track, np.convolve(env, k, "same")

def lowpass(x, hz):
    a = np.exp(-2 * np.pi * hz / SR); y = np.zeros_like(x); s = 0.0
    for i in range(len(x)): s = (1 - a) * x[i] + a * s; y[i] = s
    return y

def music():
    t = np.arange(int(DUR * SR)) / SR
    m = np.zeros_like(t)
    # slow chord changes (Cmaj7 -> Am7 -> Fmaj7 -> G), two seconds each, crossfaded, each note slightly detuned for width
    chords = [(130.81, 164.81, 196.0, 246.94), (110.0, 164.81, 196.0, 261.63), (87.31, 174.61, 220.0, 261.63), (98.0, 196.0, 246.94, 293.66)]
    for ci, ch in enumerate(chords):
        c0 = ci * 4.0 - 0.8; w = np.clip((t - c0) / 1.4, 0, 1) * np.clip((c0 + 5.4 - t) / 1.4, 0, 1)
        for f in ch:
            for det in (-0.6, 0.6):
                m += w * np.sin(2 * np.pi * (f + det) * t + rng.uniform(0, 6.28)) * 0.045
    m *= 0.85 + 0.15 * np.sin(2 * np.pi * 0.35 * t)                    # slow breathing
    m = lowpass(m, 1400)
    m *= np.minimum(1, t / 0.6) * np.minimum(1, (DUR - t) / 0.7)
    def add(t0, x, g=1.0):
        i = int(t0 * SR); j = min(len(m), i + len(x))
        if 0 <= i < len(m): m[i:j] += g * x[:j - i]
    # soft sub-swell into the slam and into the end card, no hard hits
    for t0, g in ((0.16, 1.0), (13.7, 0.7)):
        d = 1.4; tt = np.arange(int(d * SR)) / SR
        add(t0, np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 3.2) * np.minimum(1, tt / 0.03), 0.28 * g)
    # air whooshes on the cuts (very quiet)
    for t0 in (2.0, 6.1, 10.2):
        d = 0.5; tt = np.arange(int(d * SR)) / SR
        n = lowpass(rng.standard_normal(len(tt)), 1800) * np.sin(np.pi * tt / d) ** 2
        add(t0, n, 0.07)
    # UI sounds: soft glass tones (low level)
    def glass(t0, f, g):
        d = 0.9; tt = np.arange(int(d * SR)) / SR
        add(t0, (np.sin(2 * np.pi * f * tt) + 0.25 * np.sin(2 * np.pi * 2.76 * f * tt)) * np.exp(-tt * 5.5) * np.minimum(1, tt / 0.004), g)
    glass(7.8, 1046.5, 0.16); glass(7.8, 1568.0, 0.08)
    for t0, f in ((10.62, 784.0), (11.38, 880.0), (12.14, 1046.5)): glass(t0, f, 0.1)
    glass(14.2, 1174.7, 0.1)
    return reverb(m, 0.1, 0.6)

def main():
    v, env = voice()
    m = music()
    duck = 1 - 0.45 * env
    mix = m * duck * 0.9 + v * 1.0
    mix *= np.minimum(1, (DUR - np.arange(len(mix)) / SR) / 0.25)
    mix = np.tanh(mix * 1.05)
    mix = mix / max(1e-6, np.abs(mix).max()) * 0.9
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype("<i2").tobytes())
    print("wrote", OUT, "voice", VOICE)

if __name__ == "__main__": main()
