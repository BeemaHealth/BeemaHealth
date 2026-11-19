import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Sequence, delayRender, continueRender, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/figtree/600.css';
import {Scene3D} from './three';
import {ClipProps, F, Seg, Word, clamp, eio, eo3, tone, useZones} from './ui';
import {ChainV, StageV, WorldV, StoryV, ChecklistV, DiagramV, EndcardV, HookV, IsiV, KineticV, PriceV, ProductV, StepsV, VersusV, VP, WarnV} from './visuals';

const VIS: Record<string, React.FC<VP>> = {hook: HookV, product: ProductV, diagram: DiagramV, steps: StepsV, versus: VersusV, price: PriceV, checklist: ChecklistV, warn: WarnV, kinetic: KineticV, chain3d: ChainV, story3d: StoryV, stage3d: StageV, world3d: WorldV, isi: IsiV, endcard: EndcardV};
const NO_CAPTIONS = new Set(['hook', 'kinetic', 'isi']);

const useFonts = () => {
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => {
    Promise.all([document.fonts.load('800 60px Outfit'), document.fonts.load('700 40px Outfit'), document.fonts.load('600 30px Figtree')]).then(() => continueRender(h)).catch(() => continueRender(h));
  }, [h]);
};

const hexPath = (cx: number, cy: number, r: number) => Array.from({length: 6}, (_, i) => `${i ? 'L' : 'M'}${(cx + r * Math.cos(Math.PI / 3 * i + Math.PI / 6)).toFixed(1)},${(cy + r * Math.sin(Math.PI / 3 * i + Math.PI / 6)).toFixed(1)}`).join(' ') + 'Z';

/** Subtle brand honeycomb. Slow drift only; the scene's bg tone decides contrast. */
const Honeycomb: React.FC<{t: number; w: number; h: number; stroke: string; o: number}> = ({t, w, h, stroke, o}) => {
  const r = 70, dx = r * Math.sqrt(3), dy = r * 1.5;
  const cells: string[] = [];
  for (let row = -1; row < h / dy + 2; row++) for (let col = -1; col < w / dx + 2; col++) cells.push(hexPath(col * dx + (row % 2 ? dx / 2 : 0), row * dy, r - 4));
  return <svg width={w} height={h} style={{position: 'absolute', inset: 0, opacity: o}}><g transform={`translate(${(t * 6) % dx} ${(t * 3) % (dy * 2)})`}><path d={cells.join(' ')} fill="none" stroke={stroke} strokeWidth={3} /></g></svg>;
};

const Bg: React.FC<{bg: string; C: Record<string, string>; t: number; w: number; h: number; pose: number; prevPose: number; blend: number; u: number; dim?: boolean; theme?: string}> = ({bg, C, t, w, h, pose, prevPose, blend, u, dim, theme}) => {
  const tn = tone(bg, C);
  const glow = bg === 'ink' ? `radial-gradient(ellipse at 50% 22%, ${C.honey}4d 0%, ${C.honey}00 60%)` : bg === 'honey' ? 'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,.35) 0%, rgba(255,255,255,0) 65%)' : `radial-gradient(ellipse at 50% 20%, ${C.creamSoft} 0%, ${C.cream} 100%)`;
  return <AbsoluteFill style={{background: `${glow}, ${tn.bg}`}}><AbsoluteFill style={{opacity: dim ? 0.3 : bg === 'ink' ? 0.85 : 0.7}}><Scene3D w={w} h={h} bg={bg} t={t} pose={pose} prevPose={prevPose} blend={blend} u={u} C={C} theme={theme} /></AbsoluteFill><AbsoluteFill style={{background: bg === 'ink' ? `linear-gradient(180deg, ${C.ink}8c, ${C.ink}26 45%, ${C.ink}8c)` : 'linear-gradient(180deg, rgba(255,250,235,.55), rgba(255,250,235,.1) 45%, rgba(255,250,235,.5))'}} /></AbsoluteFill>;
};

/** Scene-to-scene transition: a short fade and settle. No wipes or masks, so text is never clipped mid-reveal. */
const Reveal: React.FC<{i: number; t: number; w: number; h: number; skip: boolean; children: React.ReactNode}> = ({t, skip, children}) => {
  const k = skip ? 1 : eo3(t / 0.32);
  return <AbsoluteFill style={{opacity: k, transform: `scale(${0.985 + 0.015 * k})`}}>{children}</AbsoluteFill>;
};

const Captions: React.FC<{words: Word[]; T: number; seg: Seg; z: ReturnType<typeof useZones>; C: Record<string, string>; bare?: boolean}> = ({words, T, seg, z, C, bare}) => {
  const sw = words.filter((w) => w.seg === seg.id);
  const pages: Word[][] = [];
  let cur: Word[] = [];
  sw.forEach((w) => {
    cur.push(w);
    const end = /[.?!]$/.test(w.w) || (/,$/.test(w.w) && cur.length >= 3) || cur.length >= 5;
    if (end) { pages.push(cur); cur = []; }
  });
  if (cur.length) pages.push(cur);
  const idx = pages.findIndex((p, i) => T < (pages[i + 1]?.[0].t0 ?? 1e9) - 0.02 && T >= p[0].t0 - 0.12);
  const page = pages[idx];
  if (!page) return null;
  const first = page[0].t0;
  const k = eo3((T - first + 0.12) / 0.18);
  const fs = z.W * 0.064;
  return (
    <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: z.ct, height: z.ch, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{background: bare ? 'transparent' : `${C.ink}e6`, borderRadius: 34, padding: bare ? '10px 20px' : '26px 36px', textShadow: bare ? '0 3px 0 rgba(0,0,0,.85), 0 0 18px rgba(0,0,0,.9), 0 0 3px #000' : undefined, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 0.42em', fontSize: fs, transform: `translateY(${(1 - k) * 22}px) scale(${0.96 + 0.04 * k})`, opacity: k, border: bare ? 'none' : `3px solid ${C.honey}8c`, boxShadow: bare ? 'none' : '0 16px 40px rgba(0,0,0,.35)'}}>
        {page.map((w, i) => {
          const active = T >= w.t0 && T < w.t1 + 0.04, past = T >= w.t1 + 0.04;
          const emph = seg.emph.some((e) => e && w.w.toLowerCase().includes(e.toLowerCase().split(' ')[0]));
          return <span key={i} style={{fontFamily: F.display, fontWeight: 800, fontSize: fs, lineHeight: 1.18, letterSpacing: -1, display: 'inline-block', color: active ? C.honey : emph ? C.honeyLight : '#fff', opacity: active || past ? 1 : 0.62, transform: active ? 'scale(1.08)' : 'scale(1)'}}>{w.w}</span>;
        })}
      </div>
    </div>
  );
};

export const Clip: React.FC<ClipProps> = (props) => {
  useFonts();
  const frame = useCurrentFrame(), {fps} = useVideoConfig(), z = useZones();
  const brandC = props.brand.colors, T = frame / fps;
  const C = props.look?.colors ? {...brandC, ...props.look.colors} : brandC;      // each nightly video has its own palette; the brand palette is for the end card only
  const bare = props.look?.caption === 'bare';
  const segs = props.segments;
  // merge adjacent segments that share a visual (endcard stays up through CTA + disclaimer)
  const scenes: {segs: Seg[]; t0: number; end: number; first: Seg}[] = [];
  segs.forEach((s) => {
    const last = scenes[scenes.length - 1];
    if (last && ((s.visual.type === 'endcard' && last.first.visual.type === 'endcard') || (s.visual.type === 'world3d' && last.first.visual.type === 'world3d'))) { last.segs.push(s); last.end = s.end; } else scenes.push({segs: [s], t0: s.t0, end: s.end, first: s});
  });
  scenes[scenes.length - 1].end = props.duration;
  const curSeg = segs.find((s) => T >= s.t0 && T < s.end) ?? segs[segs.length - 1];
  return (
    <AbsoluteFill style={{background: C.ink}}>
      <Audio src={staticFile(props.audio)} />
      {scenes.map((sc, i) => {
        const prev = scenes[i - 1];
        const same = !!prev && prev.first.visual.type === sc.first.visual.type && prev.first.visual.bg === sc.first.visual.bg;
        const from = Math.round(sc.t0 * fps), dur = Math.max(1, Math.round((sc.end - sc.t0) * fps) + (i < scenes.length - 1 ? 8 : 0));
        const Vis = VIS[sc.first.visual.type] ?? KineticV;
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <SceneBody sc={sc} i={i} same={same} props={props} z={z} C={sc.first.visual.type === 'endcard' ? brandC : C} Vis={Vis} fps={fps} />
          </Sequence>
        );
      })}
      {!NO_CAPTIONS.has(curSeg.visual.type) && curSeg.visual.type !== 'kinetic' && <Captions words={props.words} T={T} seg={curSeg} z={z} C={C} bare={bare} />}
    </AbsoluteFill>
  );
};

/** The backdrop camera never jumps: one steady pose per scene with a very slow drift. Motion that matters is in the foreground and keyed to the words. */
const SceneBody: React.FC<{sc: {segs: Seg[]; t0: number; end: number; first: Seg}; i: number; same: boolean; props: ClipProps; z: any; C: Record<string, string>; Vis: React.FC<VP>; fps: number}> = ({sc, i, same, props, z, C, Vis, fps}) => {
  const frame = useCurrentFrame();
  const t = frame / fps;
  const seg = sc.first;
  const dur = sc.end - sc.t0;
  const pose = i, u = clamp(t / Math.max(1, dur));
  const drift = 1 + 0.012 * u;
  return (
    <Reveal i={i} t={t} w={z.W} h={z.H} skip={same || i === 0}>
      {seg.visual.type !== 'world3d' && <Bg bg={seg.visual.bg ?? 'ink'} C={C} t={sc.t0 + t} w={z.W} h={z.H} pose={pose} prevPose={pose} blend={1} u={u} dim={seg.visual.type === 'story3d' || seg.visual.type === 'stage3d'} theme={seg.visual.bg3d} />}
      <AbsoluteFill style={{transform: `scale(${drift})`, transformOrigin: '50% 40%'}}>
        <Vis seg={seg} t={t} dur={dur} cont={same} z={z} C={C} props={props} words={props.words} />
      </AbsoluteFill>
    </Reveal>
  );
};
