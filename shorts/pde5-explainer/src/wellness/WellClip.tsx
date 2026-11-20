import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, continueRender, delayRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/figtree/600.css';
import {ClipProps, F, Seg, Word, clamp, eo3, useZones} from '../engine/ui';
import {EndcardV} from '../engine/visuals';
import {WellWorld} from './WellWorld';

/**
 * Standalone composition for the wellness overview short (built by shorts/engine/tools/well_wellness_build.py).
 * It mirrors engine/Clip.tsx (voice, word captions, brand end card) but draws its own 3D world, so no shared engine file
 * had to change. If this world is kept, the clean merge is a `visual.world` switch in engine/visuals.tsx WorldV.
 */
const useFonts = () => {
  const [h] = useState(() => delayRender('well-fonts'));
  useEffect(() => {
    Promise.all([document.fonts.load('800 60px Outfit'), document.fonts.load('700 40px Outfit'), document.fonts.load('600 30px Figtree')]).then(() => continueRender(h)).catch(() => continueRender(h));
  }, [h]);
};

const Captions: React.FC<{words: Word[]; T: number; seg: Seg; z: ReturnType<typeof useZones>; C: Record<string, string>}> = ({words, T, seg, z, C}) => {
  const sw = words.filter((w) => w.seg === seg.id);
  const pages: Word[][] = []; let cur: Word[] = [];
  sw.forEach((w) => { cur.push(w); if (/[.?!:]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 3) || cur.length >= 5) { pages.push(cur); cur = []; } });
  if (cur.length) pages.push(cur);
  const idx = pages.findIndex((p, i) => T < (pages[i + 1]?.[0].t0 ?? 1e9) - 0.02 && (i === 0 || T >= p[0].t0 - 0.12));
  const page = pages[idx];
  if (!page) return null;
  const k = idx === 0 && T < page[0].t0 ? 1 : eo3((T - page[0].t0 + 0.12) / 0.18);
  const fs = z.W * 0.062;
  return (
    <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: z.ct, height: z.ch, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{background: `${C.ink}e8`, borderRadius: 34, padding: '24px 34px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.38em', fontSize: fs, transform: `translateY(${(1 - k) * 22}px) scale(${0.96 + 0.04 * k})`, opacity: k, border: `3px solid ${C.honey}8c`, boxShadow: '0 16px 40px rgba(0,0,0,.28)'}}>
        {page.map((w, i) => {
          const active = T >= w.t0 && T < w.t1 + 0.04, past = T >= w.t1 + 0.04;
          return <span key={i} style={{fontFamily: F.display, fontWeight: 800, fontSize: fs, lineHeight: 1.18, letterSpacing: -1, display: 'inline-block', color: active ? C.honey : '#fff', opacity: active || past ? 1 : 0.62, transform: active ? 'scale(1.06)' : 'scale(1)'}}>{w.w}</span>;
        })}
      </div>
    </div>
  );
};

/** The beat's label (`screen`) as a pill at the top of the picture. The NAD+/sermorelin beat's pill is the required
 *  "Individual clinical assessment required." label, on screen for that whole beat. */
const Pill: React.FC<{seg: Seg; T: number; z: ReturnType<typeof useZones>; C: Record<string, string>}> = ({seg, T, z, C}) => {
  if (!seg.screen || seg.kind !== 'beat') return null;
  const k = clamp((T - seg.t0 + 0.25) / 0.35);
  return (
    <div style={{position: 'absolute', left: z.side, top: z.vt - 30, maxWidth: z.W - z.side * 2, opacity: k, transform: `translateY(${(1 - k) * -14}px)`, background: `${C.ink}eb`, color: C.honey, border: `4px solid ${C.honey}`, borderRadius: 40, padding: '12px 30px', fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.043, lineHeight: 1.15, boxShadow: '0 12px 26px rgba(0,0,0,.28)'}}>{seg.screen}</div>
  );
};

export const WellClip: React.FC<ClipProps> = (props) => {
  useFonts();
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), z = useZones();
  const C = props.brand.colors, T = frame / fps, segs = props.segments;
  const endIdx = segs.findIndex((s) => s.visual.type === 'endcard');
  const endT0 = endIdx >= 0 ? segs[endIdx].t0 - 0.15 : props.duration;
  const curSeg = segs.find((s) => T >= s.t0 && T < s.end) ?? (T < segs[0].t0 ? segs[0] : segs[segs.length - 1]);
  const dy = z.H / 2 - (z.vt + z.vb) / 2 + z.H * 0.04;
  const endDur = props.duration - endT0;
  const endSeg = endIdx >= 0 ? {...segs[endIdx], t0: endT0} : null;
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Audio src={staticFile(props.audio)} />
      <Sequence from={0} durationInFrames={Math.round((endT0 + 0.5) * fps)} layout="none">
        <AbsoluteFill><WellWorld w={z.W} h={z.H} dy={dy} tg={T} words={props.words} /></AbsoluteFill>
      </Sequence>
      {endSeg && (
        <Sequence from={Math.round(endT0 * fps)} layout="none">
          <AbsoluteFill style={{opacity: eo3((T - endT0) / 0.45), background: C.ink}}>
            <EndcardV seg={endSeg} t={T - endT0} dur={endDur} cont={false} z={z} C={C} props={props} words={props.words} />
          </AbsoluteFill>
        </Sequence>
      )}
      <Pill seg={curSeg} T={T} z={z} C={C} />
      {curSeg.visual.type !== 'endcard' || curSeg.kind === 'cta' || curSeg.kind === 'disc' ? <Captions words={props.words} T={T} seg={curSeg} z={z} C={C} /> : null}
    </AbsoluteFill>
  );
};
