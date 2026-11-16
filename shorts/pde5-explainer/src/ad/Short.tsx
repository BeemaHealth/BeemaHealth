import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import voice from './voice.json';
import {FPS, seg} from '../theme';
import {AdHook, AdSteps, AdPrice, AdTrust, AdIsi, AdClose} from './scenes';

const SCENES = [
  {id: 'hook', C: AdHook},
  {id: 'steps', C: AdSteps},
  {id: 'price', C: AdPrice},
  {id: 'trust', C: AdTrust},
  {id: 'isi', C: AdIsi},
  {id: 'close', C: AdClose},
] as const;
const LEAD = 0.12;
const PAD = 0.45;
export const TIMELINE = (() => {
  let s = 0;
  return SCENES.map(({id}) => {
    const len = Math.ceil(((voice as Record<string, {dur: number}>)[id].dur + LEAD + PAD) * FPS);
    const r = {id, start: s, len};
    s += len;
    return r;
  });
})();
export const TOTAL = TIMELINE.reduce((a, b) => a + b.len, 0);

export const AdShort: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {TIMELINE.map((s, i) => {
        const Comp = SCENES[i].C;
        const local = f - s.start;
        if (local < 0 || local >= s.len) return null;
        const t = local / FPS;
        const dur = s.len / FPS;
        const o = seg(t, 0, 0.2) * (1 - seg(t, dur - 0.2, dur));
        return (
          <AbsoluteFill key={s.id} style={{opacity: o}}>
            <Comp t={t} dur={dur} />
          </AbsoluteFill>
        );
      })}
      {TIMELINE.map((s) => (
        <Sequence key={s.id} from={s.start + Math.round(LEAD * FPS)} durationInFrames={s.len}>
          <Audio src={staticFile(`voice/ad/${s.id}.wav`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
