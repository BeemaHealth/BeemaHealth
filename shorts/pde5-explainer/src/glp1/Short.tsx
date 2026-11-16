import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import voice from './voice.json';
import {FPS, seg} from '../theme';
import {SceneHook, SceneGut, SceneBrain, SceneStomach, SceneLasting, SceneType1, SceneType2, SceneType3, SceneBeema} from './scenes';

const SCENES = [
  {id: 'hook', C: SceneHook},
  {id: 'gut', C: SceneGut},
  {id: 'brain', C: SceneBrain},
  {id: 'stomach', C: SceneStomach},
  {id: 'lasting', C: SceneLasting},
  {id: 'type1', C: SceneType1},
  {id: 'type2', C: SceneType2},
  {id: 'type3', C: SceneType3},
  {id: 'beema', C: SceneBeema},
] as const;

const LEAD = 0.12;
const PAD = 0.3;
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

export const Glp1Short: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      {TIMELINE.map((s, i) => {
        const Comp = SCENES[i].C;
        const local = f - s.start;
        if (local < 0 || local >= s.len) return null;
        const t = local / FPS;
        const dur = s.len / FPS;
        const o = seg(t, 0, 0.25) * (1 - seg(t, dur - 0.25, dur));
        return (
          <AbsoluteFill key={s.id} style={{opacity: o}}>
            <Comp t={t} dur={dur} />
          </AbsoluteFill>
        );
      })}
      {TIMELINE.map((s) => (
        <Sequence key={s.id} from={s.start + Math.round(LEAD * FPS)} durationInFrames={s.len}>
          <Audio src={staticFile(`voice/glp1/${s.id}.wav`)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
