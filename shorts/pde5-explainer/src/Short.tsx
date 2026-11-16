import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import voice from './voice.json';
import {Backdrop} from './parts';
import {W, H, FPS, seg} from './theme';
import {SceneHook, SceneVessel, SceneSignal, SceneRelax, ScenePde5, SceneInhibit, SceneTiming, SceneSafety} from './scenes';

const SCENES = [
  {id: 'hook', C: SceneHook},
  {id: 'vessel', C: SceneVessel},
  {id: 'signal', C: SceneSignal},
  {id: 'relax', C: SceneRelax},
  {id: 'pde5', C: ScenePde5},
  {id: 'inhibit', C: SceneInhibit},
  {id: 'timing', C: SceneTiming},
  {id: 'safety', C: SceneSafety},
] as const;

const LEAD = 0.35; // seconds of picture before the voice starts
const PAD = 0.9; // seconds of picture after the voice ends

type Dur = {id: string; start: number; len: number};
export const TIMELINE: Dur[] = (() => {
  let s = 0;
  return SCENES.map(({id}) => {
    const d = (voice as Record<string, {dur: number}>)[id].dur;
    const len = Math.ceil((d + LEAD + PAD) * FPS);
    const r = {id, start: s, len};
    s += len;
    return r;
  });
})();
export const TOTAL = TIMELINE.reduce((a, b) => a + b.len, 0);

export const Short: React.FC = () => {
  const f = useCurrentFrame();
  const {width, height} = useVideoConfig();
  return (
    <AbsoluteFill>
      <svg width={width} height={height} viewBox={`0 0 ${W} ${H}`}>
        <Backdrop t={f / FPS} />
        {TIMELINE.map((s, i) => {
          const C = SCENES[i].C;
          const local = f - s.start;
          if (local < 0 || local >= s.len) return null;
          return <SceneWrapNoAudio key={s.id} Comp={C} t={local / FPS} dur={s.len / FPS} />;
        })}
      </svg>
      {TIMELINE.map((s) => (
        <Sequence key={s.id} from={s.start + Math.round(LEAD * FPS)} durationInFrames={s.len}>
          <Audio src={staticFile(`voice/${s.id}.wav`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

const SceneWrapNoAudio: React.FC<{Comp: React.FC<{t: number; dur: number}>; t: number; dur: number}> = ({Comp, t, dur}) => {
  const o = seg(t, 0, 0.35) * (1 - seg(t, dur - 0.35, dur));
  return <g opacity={o}><Comp t={t} dur={dur} /></g>;
};
