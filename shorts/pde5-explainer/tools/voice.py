"""Generate per-scene narration with Kokoro (local, free). Usage: python tools/voice.py [voice] [speed]"""
import json, re, sys
import numpy as np, soundfile as sf
from kokoro import KPipeline

voice = sys.argv[1] if len(sys.argv) > 1 else 'af_heart'
speed = float(sys.argv[2]) if len(sys.argv) > 2 else 0.97
txt = open('SCRIPT.md').read().split('## Narration')[1]
scenes = re.findall(r'^\d+\. (\w+): (.+)$', txt, re.M)
pipe = KPipeline(lang_code='a')
out = {}
for k, t in scenes:
    spoken = t.replace('PDE5', 'P D E 5').replace('cGMP', 'cyclic G M P')
    parts = [a for _, _, a in pipe(spoken, voice=voice, speed=speed, split_pattern=r'\n+')]
    audio = np.concatenate(parts)
    sf.write(f'public/voice/{k}.wav', audio, 24000)
    out[k] = {'text': t, 'dur': round(len(audio) / 24000, 2)}
json.dump(out, open('src/voice.json', 'w'), indent=1)
print({k: v['dur'] for k, v in out.items()}, sum(v['dur'] for v in out.values()))
