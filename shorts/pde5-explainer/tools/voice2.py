"""Per-scene Kokoro narration. Usage: python tools/voice2.py SCRIPT.md OUTDIR JSON [voice] [speed]"""
import json, re, sys
import numpy as np, soundfile as sf
from kokoro import KPipeline

script, outdir, jpath = sys.argv[1:4]
voice = sys.argv[4] if len(sys.argv) > 4 else 'af_heart'
speed = float(sys.argv[5]) if len(sys.argv) > 5 else 1.12
txt = open(script).read().split('## Narration')[1]
scenes = re.findall(r'^\d+\. (\w+): (.+)$', txt, re.M)
SPOKEN = [('GLP-1', 'G L P one'), ('GIP', 'G I P'), ('PDE5', 'P D E 5'), ('cGMP', 'cyclic G M P')]
pipe = KPipeline(lang_code='a')
out = {}
for k, t in scenes:
    spoken = t
    for a, b in SPOKEN:
        spoken = spoken.replace(a, b)
    parts = [a for _, _, a in pipe(spoken, voice=voice, speed=speed, split_pattern=r'\n+')]
    audio = np.concatenate(parts)
    nz = np.where(np.abs(audio) > 0.01)[0]
    audio = audio[max(0, nz[0] - 600): nz[-1] + 1200]
    sf.write(f'{outdir}/{k}.wav', audio, 24000)
    out[k] = {'text': t, 'dur': round(len(audio) / 24000, 2)}
json.dump(out, open(jpath, 'w'), indent=1)
print({k: v['dur'] for k, v in out.items()}, sum(v['dur'] for v in out.values()))
