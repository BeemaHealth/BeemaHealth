import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, delayRender, continueRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/figtree/700.css';
import {Scene3D} from '../engine/three';
import {ClipProps, F, Seg, Word, clamp, eo3, tone, useZones} from '../engine/ui';
import {EndcardV} from '../engine/visuals';
import {HowWorld, StepOverlay} from './HowWorld';

/**
 * Composition for the 'How It Works' Story video. Same scene/caption rules as engine/Clip.tsx (first scene starts at frame 0,
 * short fades, captions per segment), but every 'howworld' segment is ONE continuous 3D world (HowWorld) with a moving camera.
 * The end card reuses the shared EndcardV unchanged.
 */
const useFonts = () => {
  const [h] = useState(() => delayRender('how-fonts'));
  useEffect(() => {
    Promise.all(['800 60px Outfit', '700 40px Outfit', '500 30px Figtree', '600 30px Figtree', '700 30px Figtree'].map((f) => document.fonts.load(f)))
      .then(() => continueRender(h)).catch(() => continueRender(h));
  }, [h]);
};

const Bg: React.FC<{C: Record<string, string>; t: number; w: number; h: number}> = ({C, t, w, h}) => {
  const tn = tone('ink', C);
  return (
    <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 22%, ${C.honey}4d 0%, ${C.honey}00 60%), ${tn.bg}`}}>
      <AbsoluteFill style={{opacity: 0.85}}><Scene3D w={w} h={h} bg="ink" t={t} pose={5} prevPose={5} blend={1} u={0} C={C} /></AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(180deg, ${C.ink}8c, ${C.ink}26 45%, ${C.ink}8c)`}} />
    </AbsoluteFill>
  );
};

const Captions: React.FC<{words: Word[]; T: number; seg: Seg; z: ReturnType<typeof useZones>; C: Record<string, string>}> = ({words, T, seg, z, C}) => {
  const sw = words.filter((w) => w.seg === seg.id);
  const pages: Word[][] = [];
  let cur: Word[] = [];
  sw.forEach((w) => {
    cur.push(w);
    if (/[.?!]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 3) || cur.length >= 5) { pages.push(cur); cur = []; }
  });
  if (cur.length) pages.push(cur);
  const idx = pages.findIndex((p, i) => T < (pages[i + 1]?.[0].t0 ?? 1e9) - 0.02 && (i === 0 || T >= p[0].t0 - 0.12));
  const page = pages[idx];
  if (!page) return null;
  const first = page[0].t0;
  const k = idx === 0 && T < first ? 1 : eo3((T - first + 0.12) / 0.18);
  const fs = z.W * 0.06;
  return (
    <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: z.ct, height: z.ch, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{background: `${C.ink}d9`, borderRadius: 30, padding: '22px 34px', display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.4em', fontSize: fs, transform: `translateY(${(1 - k) * 18}px)`, opacity: k, border: '2px solid rgba(255,255,255,.14)', boxShadow: '0 18px 44px rgba(0,0,0,.4)', backdropFilter: 'blur(6px)'}}>
        {page.map((w, i) => {
          const active = T >= w.t0 && T < w.t1 + 0.04, past = T >= w.t1 + 0.04;
          return <span key={i} style={{fontFamily: F.display, fontWeight: 800, fontSize: fs, lineHeight: 1.18, letterSpacing: -0.5, display: 'inline-block', color: active ? C.honey : '#fff', opacity: active || past ? 1 : 0.6}}>{w.w}</span>;
        })}
      </div>
    </div>
  );
};

export const HowClip: React.FC<ClipProps> = (props) => {
  useFonts();
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), z = useZones();
  const C = props.brand.colors, T = frame / fps;
  const segs = props.segments;
  const scenes: {segs: Seg[]; t0: number; end: number; first: Seg}[] = [];
  segs.forEach((s) => {
    const last = scenes[scenes.length - 1];
    if (last && last.first.visual.type === s.visual.type) { last.segs.push(s); last.end = s.end; } else scenes.push({segs: [s], t0: s.t0, end: s.end, first: s});
  });
  if (!scenes.length) return <AbsoluteFill style={{background: C.ink}} />;
  scenes[scenes.length - 1].end = props.duration;
  const curSeg = segs.find((s) => T >= s.t0 && T < s.end) ?? (T < segs[0].t0 ? segs[0] : segs[segs.length - 1]);
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Audio src={staticFile(props.audio)} />
      {scenes.map((sc, i) => {
        const t0f = Math.round(sc.t0 * fps), dur0 = Math.max(1, Math.round((sc.end - sc.t0) * fps) + (i < scenes.length - 1 ? 10 : 0));
        // The first scene always starts at frame 0 (frame 0 is the social preview). Its clock still starts at t0.
        const from = i === 0 ? 0 : t0f, dur = i === 0 ? dur0 + t0f : dur0, lead = i === 0 ? t0f : 0;
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <SceneBody sc={sc} i={i} props={props} z={z} C={C} fps={fps} lead={lead} />
          </Sequence>
        );
      })}
      <Captions words={props.words} T={T} seg={curSeg} z={z} C={C} />
    </AbsoluteFill>
  );
};

const SceneBody: React.FC<{sc: {segs: Seg[]; t0: number; end: number; first: Seg}; i: number; props: ClipProps; z: ReturnType<typeof useZones>; C: Record<string, string>; fps: number; lead: number}> = ({sc, i, props, z, C, fps, lead}) => {
  const frame = useCurrentFrame();
  const t = Math.max(0, frame - lead) / fps;
  const seg = sc.first, dur = sc.end - sc.t0;
  const k = i === 0 ? 1 : eo3(t / 0.4);
  if (seg.visual.type === 'howworld') {
    const dy = z.H / 2 - (z.vt + z.vb) / 2;
    const tg = sc.t0 + t;
    return (
      <AbsoluteFill style={{opacity: k}}>
        <HowWorld w={z.W} h={z.H} dy={dy} tg={tg} words={props.words} C={C} />
        <StepOverlay tg={tg} words={props.words} z={z} C={C} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{opacity: k, transform: `scale(${0.985 + 0.015 * k})`}}>
      <Bg C={C} t={sc.t0 + t} w={z.W} h={z.H} />
      <AbsoluteFill style={{transform: `scale(${1 + 0.012 * clamp(t / Math.max(1, dur))})`, transformOrigin: '50% 40%'}}>
        <EndcardV seg={seg} t={t} dur={dur} cont={false} z={z} C={C} props={props} words={props.words} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
