import React from 'react';
import {Img, staticFile} from 'remotion';
import {ClipProps, F, Seg, Word, Zones, cueAt, cueTimes, clamp, eo3, eob, eio, tone, PRODUCT_LABEL} from './ui';
import {GutBrain, Pde5Flow} from './diagrams';
import {Chain3D} from './three';
import {BuildScene, OriginScene, Cues} from './story3d';
import {StageScene, StageSpec} from './stage3d';
import {GutMsgScene, ReceptorScene, AppetiteScene, CompoundScene, FdaScene, ProviderScene, NoChargeScene, BalanceScene, RadioScene, Glp1KeyScene, CentersScene, BeltScene} from './scenes3d';

const METAPHOR_SCENES: Record<string, React.FC<{w: number; h: number; t: number; T: Cues; C: Record<string, string>; v?: Record<string, unknown>}>> = {gutmsg: GutMsgScene, receptors: ReceptorScene, appetite: AppetiteScene, compound: CompoundScene, fda: FdaScene, provider: ProviderScene, nocharge: NoChargeScene, balance: BalanceScene, radio: RadioScene, glp1key: Glp1KeyScene, centers: CentersScene, belt: BeltScene};

export type VP = {seg: Seg; t: number; dur: number; cont: boolean; z: Zones; C: Record<string, string>; props: ClipProps; words: Word[]};
const abs = (z: Zones, x = 0, y = z.vt, w = z.W, h = z.vh): React.CSSProperties => ({position: 'absolute', left: x, top: y, width: w, height: h, perspective: 1500});

export const Headline: React.FC<{text: string | null; t: number; z: Zones; C: Record<string, string>; bg: string; cont: boolean}> = ({text, t, z, C, bg, cont}) => {
  if (!text) return null;
  const o = cont ? 1 : eo3((t - 0.05) / 0.3), y = cont ? 0 : (1 - eo3((t - 0.05) / 0.35)) * 24;
  const tn = tone(bg, C);
  return (
    <div style={{position: 'absolute', left: z.side, top: z.vt, width: z.W - z.side * 2, opacity: o, transform: `translateY(${y}px)`}}>
      <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.066, lineHeight: 1.05, color: tn.fg, letterSpacing: -1}}>
        {text}
      </div>
      <div style={{height: 8, width: 120, background: C.honey, borderRadius: 4, marginTop: 14}} />
    </div>
  );
};

const photoUrl = (p: string) => staticFile(p);
const HEX_PTS = (r: number) => Array.from({length: 6}, (_, i) => `${50 + r * Math.cos(Math.PI / 3 * i - Math.PI / 2)},${50 + r * Math.sin(Math.PI / 3 * i - Math.PI / 2)}`).join(' ');
/** Real CSS 3D: the product sways in perspective over a spinning hex platform, with a soft shadow plane behind it. */
export const Tilt3D: React.FC<{t: number; amp?: number; C: Record<string, string>; children: React.ReactNode}> = ({t, amp = 16, C, children}) => (
  <div style={{width: '100%', height: '100%', perspective: 1300, position: 'relative'}}>
    <div style={{width: '100%', height: '100%', position: 'relative', transformStyle: 'preserve-3d', transform: `rotateX(${6 + Math.cos(t * 0.9) * amp * 0.3}deg) rotateY(${Math.sin(t * 1.25) * amp}deg)`}}>
      <div style={{position: 'absolute', left: '-14%', width: '128%', bottom: '-16%', height: '36%', transformStyle: 'preserve-3d', transform: `translateZ(-60px) rotateX(74deg) rotateZ(${t * 32}deg)`}}>
        <svg viewBox="0 0 100 100" style={{width: '100%', height: '100%'}}>
          <polygon points={HEX_PTS(47)} fill="rgba(238,179,24,.14)" stroke={C.honey} strokeWidth={2.4} strokeLinejoin="round" />
          <polygon points={HEX_PTS(33)} fill="none" stroke={C.honey} strokeWidth={1.4} strokeDasharray="6 5" opacity={0.8} />
        </svg>
      </div>
      <div style={{position: 'absolute', inset: '6%', transform: 'translateZ(-90px) scale(1.06)', background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,.45), rgba(0,0,0,0) 65%)', filter: 'blur(14px)'}} />
      <div style={{position: 'absolute', inset: 0, transform: `translateZ(${40 + Math.sin(t * 1.6) * 14}px)`}}>{children}</div>
    </div>
  </div>
);
/** Real product photo when one is cleared for use, otherwise the Beema mark on a white card (never an invented package). */
const Hero: React.FC<{src: string | null; mark: string; w: number; h: number}> = ({src, mark, w, h}) => src
  ? <Img src={photoUrl(src)} style={{width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 26px 30px rgba(0,0,0,.4))'}} />
  : <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><div style={{width: Math.min(w, h) * 0.8, height: Math.min(w, h) * 0.8, background: '#fff', borderRadius: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 26px 40px rgba(0,0,0,.35)'}}><Img src={photoUrl(mark)} style={{width: '86%', height: '86%', objectFit: 'contain'}} /></div></div>;

export const HookV: React.FC<VP> = ({seg, t, z, C, props, words}) => {
  // Visible from frame 0: hexagon already drawing, photo pops, hook words slam in with the voice.
  const hexR = z.W * 0.34, cx = z.W / 2, cy = z.vt + hexR * 0.98;
  const pts = Array.from({length: 6}, (_, i) => [cx + hexR * Math.cos(Math.PI / 3 * i - Math.PI / 2), cy + hexR * Math.sin(Math.PI / 3 * i - Math.PI / 2)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ') + ' Z';
  const per = hexR * 6;
  const draw = 0.35 + 0.65 * eo3(t / 0.7);
  const pop = eob((t - 0.05) / 0.45);
  const segWords = words.filter((w) => w.seg === seg.id);
  const emphIdx = segWords.reduce((best, w, i) => (w.w.replace(/\W/g, '').length > segWords[best].w.replace(/\W/g, '').length ? i : best), 0);
  const base = z.W * 0.085;
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <svg width={z.W} height={z.H} style={{position: 'absolute', inset: 0}}>
        <polygon points={pts.map((p) => p.join(',')).join(' ')} fill="rgba(238,179,24,.08)" />
        <path d={d} fill="none" stroke={C.honey} strokeWidth={16} strokeLinejoin="round" strokeDasharray={per} strokeDashoffset={per * (1 - draw)} />
      </svg>
      <div style={{position: 'absolute', left: cx - hexR * 0.62, top: cy - hexR * 0.72, width: hexR * 1.24, height: hexR * 1.44, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.6 + 0.4 * pop}) rotate(${(1 - pop) * -8}deg)`, opacity: clamp(pop * 2)}}>
        {props.endcard.hero === 'chain' ? <div style={{position: 'absolute', left: -hexR * 0.3, top: -hexR * 0.2, width: hexR * 1.84, height: hexR * 1.84}}><Chain3D w={hexR * 1.84} h={hexR * 1.84} t={t + 1.2} n={15} C={C} /></div> : <Tilt3D t={t} C={C}><Hero src={props.endcard.photo} mark={props.endcard.mark} w={hexR * 1.24} h={hexR * 1.44} /></Tilt3D>}
      </div>
      <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: cy + hexR + 40, display: 'flex', flexWrap: 'wrap', gap: `0 ${base * 0.3}px`, justifyContent: 'center'}}>
        {segWords.map((w, i) => {
          const k = eob((t - Math.max(0, w.t0 - seg.t0) + 0.12) / 0.22);
          const on = t >= w.t0 - seg.t0 - 0.12;
          const hot = i === emphIdx;
          return <span key={i} style={{fontFamily: F.display, fontWeight: 800, fontSize: base, lineHeight: 1.08, color: hot ? C.honey : '#fff', opacity: on ? 1 : 0, transform: `translateY(${(1 - clamp(k)) * 40}px) scale(${0.85 + 0.15 * clamp(k)})`, display: 'inline-block', letterSpacing: -1.5}}>{w.w}</span>;
        })}
      </div>
    </div>
  );
};

export const ProductV: React.FC<VP> = ({seg, t, dur, cont, z, C, props}) => {
  const v = seg.visual, tn = tone(v.bg, C);
  const photo: string | null = v.photo ?? props.endcard.photo;
  const s = 1 + 0.07 * clamp(t / dur), pop = cont ? 1 : eob((t - 0.1) / 0.5);
  const size = Math.min(z.vh * 0.78, z.W * 0.72);
  const cx = z.W / 2, cy = z.vt + z.vh * 0.56;
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <Headline text={seg.screen} t={t} z={z} C={C} bg={v.bg} cont={cont} />
      <div style={{position: 'absolute', left: cx - size / 2, top: cy - size / 2, width: size, height: size, transform: `scale(${s * (0.7 + 0.3 * pop)})`, opacity: clamp(pop * 1.6)}}>
        <Tilt3D t={t} C={C}><Hero src={photo} mark={props.endcard.mark} w={size} h={size} /></Tilt3D>
      </div>
      {(v.tags ?? []).map((tag: string, i: number) => {
        const k = eob((t - 0.5 - i * 0.35) / 0.4);
        const right = i % 2 === 0;
        const x = right ? cx + size * 0.18 : cx - size * 0.18, y = cy - size * 0.34 + i * size * 0.5;
        return (
          <div key={i} style={{position: 'absolute', left: right ? x : x - 4, top: y, transform: `translateX(${right ? '' : '-100%'}) scale(${clamp(k)})`, transformOrigin: right ? 'left center' : 'right center', opacity: clamp(k * 1.5)}}>
            <div style={{background: C.ink, color: '#fff', fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.044, padding: '14px 28px', borderRadius: 999, border: `4px solid ${C.honey}`, whiteSpace: 'nowrap', boxShadow: '0 10px 24px rgba(0,0,0,.25)'}}>{tag}</div>
          </div>
        );
      })}
      {v.disclose && <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: z.vb - 70, textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.04, color: tn.fg, opacity: eo3((t - 1) / 0.4)}}>{v.disclose}</div>}
    </div>
  );
};

export const DiagramV: React.FC<VP> = ({seg, t, dur, cont, z, C, props}) => {
  const v = seg.visual, D = {t, dur, stage: v.stage, C, product: props.product, cont, w: z.W, h: z.vh};
  const gh = z.vh - z.W * 0.14;
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <Headline text={seg.screen} t={t} z={z} C={C} bg={v.bg} cont={cont} />
      <div style={{position: 'absolute', left: z.side * 0.4, width: z.W - z.side * 0.8, top: z.vt + z.W * 0.14, height: gh}}>
        {v.preset === 'pde5_flow' ? <Pde5Flow {...D} /> : <GutBrain {...D} />}
      </div>
    </div>
  );
};

export const StepsV: React.FC<VP> = ({seg, t, cont, z, C}) => {
  const v = seg.visual, tn = tone(v.bg, C), items: {n: number; t: string}[] = v.items;
  const rowH = (z.vh - z.W * 0.18) / items.length, top = z.vt + z.W * 0.16;
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <Headline text={seg.screen} t={t} z={z} C={C} bg={v.bg} cont={cont} />
      {items.map((it, i) => {
        const active = it.n === v.reveal, done = it.n < v.reveal, future = it.n > v.reveal;
        const k = active ? eob((t - 0.1) / 0.45) : 1;
        const op = future ? 0.22 : done ? 0.55 : clamp(k * 2);
        return (
          <div key={i} style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: top + i * rowH, height: rowH - 22, display: 'flex', alignItems: 'center', gap: 26, background: active ? C.honey : tn.card, color: active ? C.onHoney : tn.fg, borderRadius: 30, padding: '0 34px', opacity: op, transform: `translateX(${active ? (1 - clamp(k)) * 90 : 0}px) rotateY(${active ? (1 - clamp(k)) * -38 : 0}deg) scale(${active ? 1 : 0.97})`, boxShadow: active ? '0 14px 34px rgba(36,28,12,.28)' : 'none', border: active ? 'none' : `2px solid ${tn.line}`}}>
            <div style={{width: 84, height: 84, flex: '0 0 84px', borderRadius: 42, background: active ? C.ink : C.honey, color: active ? C.honey : C.onHoney, fontFamily: F.display, fontWeight: 800, fontSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{done ? '✓' : it.n}</div>
            <div style={{fontFamily: F.display, fontWeight: 700, fontSize: z.W * 0.05, lineHeight: 1.1}}>{it.t}</div>
          </div>
        );
      })}
    </div>
  );
};

export const VersusV: React.FC<VP> = ({seg, t, cont, z, C, words}) => {
  const v = seg.visual, tn = tone(v.bg, C), labels: string[] | undefined = v.labels;
  const isMyth = !labels;
  const cardH = (z.vh - z.W * 0.2) / 2 - 16, top = z.vt + z.W * 0.17;
  const t2 = v.cue2 ? cueTimes(words, seg.id, seg.t0, [v.cue2])[0] : 0.75;
  const k1 = eob((t - 0.1) / 0.45), k2 = eob((t - t2) / 0.45), strike = eio((t - 0.55) / 0.4);
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <Headline text={seg.screen} t={t} z={z} C={C} bg={v.bg} cont={cont} />
      <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top, height: cardH, background: tn.card, border: `3px solid ${tn.line}`, borderRadius: 30, padding: '24px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', transform: `translateX(${(1 - clamp(k1)) * -120}px) rotateY(${(1 - clamp(k1)) * 42}deg)`, opacity: clamp(k1 * 2)}}>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.034, letterSpacing: 4, color: tn.sub}}>{isMyth ? 'MYTH' : labels![0].toUpperCase()}</div>
        <div style={{position: 'relative', display: 'inline-block', marginTop: 10}}>
          <div style={{fontFamily: F.display, fontWeight: 700, fontSize: z.W * 0.056, lineHeight: 1.12, color: tn.fg, opacity: isMyth ? 1 - 0.35 * strike : 1}}>{v.myth}</div>
          {isMyth && <div style={{position: 'absolute', left: 0, top: '52%', height: 8, width: `${strike * 100}%`, background: '#d9363e', borderRadius: 4}} />}
        </div>
      </div>
      <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: top + cardH + 32, height: cardH, background: C.honey, color: C.onHoney, borderRadius: 30, padding: '24px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', transform: `translateX(${(1 - clamp(k2)) * 120}px) rotateY(${(1 - clamp(k2)) * -42}deg)`, opacity: clamp(k2 * 2), boxShadow: '0 16px 36px rgba(36,28,12,.28)'}}>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.034, letterSpacing: 4}}>{isMyth ? 'FACT' : labels![1].toUpperCase()}</div>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.058, lineHeight: 1.1, marginTop: 10}}>{v.fact}</div>
      </div>
    </div>
  );
};

export const PriceV: React.FC<VP> = ({seg, t, cont, z, C}) => {
  const v = seg.visual, tn = tone(v.bg, C), rows: {l: string; v: string}[] = v.rows;
  const rowH = (z.vh - z.W * 0.3) / rows.length, top = z.vt + z.W * 0.17;
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <Headline text={seg.screen} t={t} z={z} C={C} bg={v.bg} cont={cont} />
      {rows.map((r, i) => {
        const k = eob((t - 0.15 - i * 0.3) / 0.45);
        const num = parseFloat(r.v.replace(/[^0-9.]/g, '')), cur = Math.round(num * eo3((t - 0.2 - i * 0.3) / 0.7));
        return (
          <div key={i} style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: top + i * rowH, height: rowH - 24, background: i === rows.length - 1 ? C.honey : '#fff', color: i === rows.length - 1 ? C.onHoney : C.foreground, borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 44px', transform: `scale(${0.85 + 0.15 * clamp(k)})`, opacity: clamp(k * 2), boxShadow: '0 14px 34px rgba(36,28,12,.22)'}}>
            <div style={{fontFamily: F.display, fontWeight: 700, fontSize: z.W * 0.058}}>{r.l}</div>
            <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.15, letterSpacing: -3}}>${cur}</div>
          </div>
        );
      })}
      {v.foot && <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: top + rows.length * rowH - 6, fontFamily: F.display, fontWeight: 700, fontSize: z.W * 0.036, color: tn.sub}}>{v.foot} - cash pay, no insurance</div>}
    </div>
  );
};

export const ChecklistV: React.FC<VP> = ({seg, t, dur, cont, z, C}) => {
  const v = seg.visual, tn = tone(v.bg, C), items: string[] = v.items;
  const top = z.vt + z.W * 0.17, rowH = (z.vh - z.W * 0.2) / items.length;
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <Headline text={seg.screen} t={t} z={z} C={C} bg={v.bg} cont={cont} />
      {items.map((it, i) => {
        const at = 0.3 + (i * (dur * 0.7)) / items.length, k = eob((t - at) / 0.4);
        return (
          <div key={i} style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: top + i * rowH, height: rowH - 18, display: 'flex', alignItems: 'center', gap: 26, background: tn.card, border: `2px solid ${tn.line}`, borderRadius: 26, padding: '0 30px', opacity: clamp(k * 2), transform: `translateX(${(1 - clamp(k)) * 70}px) rotateX(${(1 - clamp(k)) * 50}deg)`}}>
            <div style={{width: 64, height: 64, flex: '0 0 64px', borderRadius: 32, background: C.honey, color: C.onHoney, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 800, fontFamily: F.display}}>✓</div>
            <div style={{fontFamily: F.display, fontWeight: 700, fontSize: z.W * 0.05, color: tn.fg, lineHeight: 1.1}}>{it}</div>
          </div>
        );
      })}
    </div>
  );
};

export const WarnV: React.FC<VP> = ({seg, t, cont, z, C}) => {
  const v = seg.visual, k = eob((t - 0.1) / 0.5);
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <Headline text={seg.screen} t={t} z={z} C={C} bg={v.bg} cont={cont} />
      <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: z.vt + z.W * 0.2, height: z.vh - z.W * 0.24, background: C.ink, border: `8px solid ${C.honey}`, borderRadius: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, padding: 40, transform: `rotateX(${(1 - clamp(k)) * 55}deg) scale(${0.85 + 0.15 * clamp(k)})`, opacity: clamp(k * 2), boxShadow: '0 24px 50px rgba(0,0,0,.35)'}}>
        <svg width={z.W * 0.2} height={z.W * 0.18} viewBox="0 0 100 90"><path d="M50 6 L96 84 L4 84 Z" fill={C.honey} stroke={C.honey} strokeWidth={6} strokeLinejoin="round" /><rect x={46} y={32} width={8} height={30} rx={4} fill={C.ink} /><circle cx={50} cy={71} r={5} fill={C.ink} /></svg>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.07, lineHeight: 1.1, color: '#fff', textAlign: 'center'}}>{v.title}</div>
      </div>
    </div>
  );
};

export type CalloutItem = string | {t: string; at?: string};
export const Callouts: React.FC<{items: CalloutItem[]; times: number[]; t: number; z: Zones; C: Record<string, string>; y: number}> = ({items, times, t, z, C, y}) => {
  if (!items.length) return null;
  const gap = 16, w = (z.W - z.side * 2 - gap * (items.length - 1)) / items.length;
  return (
    <div style={{position: 'absolute', left: z.side, top: y, width: z.W - z.side * 2, display: 'flex', gap, perspective: 900}}>
      {items.map((it, i) => {
        const k = eob((t - times[i]) / 0.4);
        return (
          <div key={i} style={{width: w, background: C.ink, color: '#fff', border: `4px solid ${C.honey}`, borderRadius: 26, padding: '16px 10px', textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: z.W * (items.length > 2 ? 0.036 : 0.042), lineHeight: 1.1, opacity: clamp(k * 2), transform: `rotateX(${(1 - clamp(k)) * 80}deg) translateY(${(1 - clamp(k)) * 30}px) scale(${0.9 + 0.1 * clamp(k)})`, transformOrigin: '50% 100%', boxShadow: '0 12px 26px rgba(0,0,0,.3)'}}>{typeof it === 'string' ? it : it.t}</div>
        );
      })}
    </div>
  );
};

/** On-screen label pill (the beat's `screen` text) for scenes that have no headline of their own. */
const LabelPill: React.FC<{text: string; t: number; z: Zones; C: Record<string, string>}> = ({text, t, z, C}) => {
  const k = eob((t - 0.05) / 0.4);
  return <div style={{position: 'absolute', left: z.side, top: z.vt, transform: `rotateX(${(1 - clamp(k)) * 70}deg) scale(${0.92 + 0.08 * clamp(k)})`, transformOrigin: '0 0', opacity: clamp(k * 2), background: C.ink, color: C.honey, border: `4px solid ${C.honey}`, borderRadius: 999, padding: '10px 30px', fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.042, letterSpacing: 1}}>{text}</div>;
};

export const KineticV: React.FC<VP> = ({seg, t, z, C, words}) => {
  const v = seg.visual, tn = tone(v.bg, C), segWords = words.filter((w) => w.seg === seg.id);
  const hot = (w: string) => seg.emph.some((e) => e && w.toLowerCase().replace(/[^a-z0-9-]/g, '').includes(e.toLowerCase().split(' ')[0].replace(/[^a-z0-9-]/g, '')));
  const fs = z.W * 0.086;   // ONE size for every kinetic beat so text never jumps between sizes
  const callouts: CalloutItem[] = v.callouts ?? [], top = z.vt + (seg.screen ? 96 : 0), bottomPad = callouts.length ? 170 : 0;
  const cTimes = cueTimes(words, seg.id, seg.t0, callouts.map((c) => (typeof c === 'string' ? undefined : c.at)));
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      {seg.screen && <LabelPill text={seg.screen} t={t} z={z} C={C} />}
      <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top, height: z.cb - top - bottomPad, display: 'flex', alignItems: 'center'}}>
        <svg width={z.W} height={z.W} viewBox="0 0 100 100" style={{position: 'absolute', left: -z.side, top: '50%', marginTop: -z.W / 2, opacity: v.bg === 'ink' ? 0.1 : 0.16, transform: `rotate(${t * 4}deg)`}}><polygon points="50,4 90,27 90,73 50,96 10,73 10,27" fill="none" stroke={v.bg === 'ink' ? C.honey : C.ink} strokeWidth={1.2} /></svg>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: `0 ${fs * 0.28}px`, position: 'relative', perspective: 900}}>
          {segWords.map((w, i) => {
            const on = t >= w.t0 - seg.t0 - 0.1, k = eob((t - (w.t0 - seg.t0) + 0.1) / 0.25);
            const h = hot(w.w);
            return <span key={i} style={{fontFamily: F.display, fontWeight: 800, fontSize: fs, lineHeight: 1.12, letterSpacing: -1.5, color: h ? (v.bg === 'honey' ? C.ink : v.bg === 'cream' ? C.honeyDeep : C.honey) : tn.fg, opacity: on ? 1 : 0.0, transform: `translateY(${(1 - clamp(k)) * 36}px) rotateX(${(1 - clamp(k)) * 65}deg)`, transformOrigin: '50% 100%', textDecoration: h ? 'underline' : 'none', textDecorationThickness: 8, textUnderlineOffset: 10, textDecorationColor: v.bg === 'honey' ? C.ink : v.bg === 'cream' ? C.honeyDeep : C.honey, display: 'inline-block'}}>{w.w}</span>;
          })}
        </div>
      </div>
      <Callouts items={callouts} times={cTimes} t={t} z={z} C={C} y={z.cb - 150} />
    </div>
  );
};

/** 3D molecule-style chain with a big count and callouts. Always labelled as an illustration. */
export const ChainV: React.FC<VP> = ({seg, t, cont, z, C}) => {
  const v = seg.visual, n: number = v.n ?? 15, callouts: string[] = v.callouts ?? [];
  const top = z.vt + z.W * 0.17, h = z.vh - z.W * 0.17;
  const k = eob((t - 0.2) / 0.5);
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <Headline text={seg.screen} t={t} z={z} C={C} bg={v.bg} cont={cont} />
      <div style={{position: 'absolute', left: 0, top, width: z.W, height: h}}>
        <Chain3D w={z.W} h={h} t={t} n={n} C={C} />
      </div>
      <div style={{position: 'absolute', left: z.side, top: top + 6, opacity: clamp(k * 2), transform: `translateX(${(1 - clamp(k)) * -60}px) rotateY(${(1 - clamp(k)) * 40}deg)`}}>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.2, lineHeight: 0.9, color: C.honey, letterSpacing: -4}}>{n}</div>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.04, color: '#fff'}}>{v.unit ?? 'units'}</div>
      </div>
      {callouts.map((c, i) => {
        const kk = eob((t - 0.6 - i * 0.3) / 0.4);
        return <div key={i} style={{position: 'absolute', right: z.side, top: top + h * (0.22 + i * 0.26), opacity: clamp(kk * 2), transform: `translateX(${(1 - clamp(kk)) * 80}px) rotateY(${(1 - clamp(kk)) * -50}deg)`, background: C.ink, color: '#fff', border: `4px solid ${C.honey}`, borderRadius: 24, padding: '12px 24px', fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.04, boxShadow: '0 12px 26px rgba(0,0,0,.35)'}}>{c}</div>;
      })}
      <div style={{position: 'absolute', left: z.side, top: top + h - 38, fontFamily: F.body, fontWeight: 600, fontSize: z.W * 0.03, color: 'rgba(255,255,255,.7)'}}>Illustration, not the actual structure</div>
    </div>
  );
};

/** Narration-driven 3D explainer. Each step fires on the second its cue word is spoken. */
export const StoryV: React.FC<VP> = ({seg, t, z, C, words}) => {
  const v = seg.visual, cues: string[] = v.cues, n: number = v.n ?? 15;
  const times = cueTimes(words, seg.id, seg.t0, cues);
  const T: Cues = Object.fromEntries(cues.map((c, i) => [c, times[i]]));
  const stages: {t: string; cue: string}[] = v.stages ?? [];
  const live = stages.map((st) => ({...st, at: T[st.cue] ?? 0})).filter((st) => t >= st.at - 0.05);
  const cur = live[live.length - 1];
  const k = cur ? eob((t - cur.at) / 0.35) : 0;
  const mode: string = v.mode;
  const count = mode === 'build' ? Math.floor(clamp((t - T.fifteen) / 1.5) * n + 0.0001) : t >= (T.piece ?? 1e9) + 0.9 ? n : 0;
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <div style={{position: 'absolute', left: 0, top: z.vt, width: z.W, height: z.vh}}>
        {mode === 'build' ? <BuildScene w={z.W} h={z.vh} t={t} T={T} n={n} C={C} /> : mode === 'origin' ? <OriginScene w={z.W} h={z.vh} t={t} T={T} C={C} /> : (() => { const Sc = METAPHOR_SCENES[mode]; return Sc ? <Sc w={z.W} h={z.vh} t={t} T={T} C={C} v={v} /> : null; })()}
      </div>
      {cur && <div key={cur.t} style={{position: 'absolute', left: z.side, top: z.vt + 8, transform: `rotateX(${(1 - clamp(k)) * 70}deg) scale(${0.92 + 0.08 * clamp(k)})`, transformOrigin: '0 0', opacity: clamp(k * 2), background: C.ink, color: C.honey, border: `4px solid ${C.honey}`, borderRadius: 999, padding: '12px 32px', fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.05, letterSpacing: 0.5, boxShadow: '0 12px 26px rgba(0,0,0,.35)'}}>{cur.t}</div>}
      {count > 0 && <div style={{position: 'absolute', right: z.side, top: z.vt + 96, textAlign: 'right'}}>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.2, lineHeight: 0.9, color: C.honey, letterSpacing: -4}}>{count}</div>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.04, color: '#fff'}}>amino acids</div>
      </div>}
      <div style={{position: 'absolute', left: z.side, top: z.vt + z.vh - 44, fontFamily: F.body, fontWeight: 600, fontSize: z.W * 0.03, color: 'rgba(255,255,255,.7)'}}>{v.note ?? (mode === 'build' || mode === 'origin' ? 'Illustration, not the actual structure' : 'Illustration')}</div>
    </div>
  );
};

/** Generic narration-driven stage: actors + actions from a storyboard, every action fired on a spoken word. */
export const StageV: React.FC<VP> = ({seg, t, z, C, words}) => {
  const v = seg.visual;
  const spec: StageSpec = {actors: v.actors ?? [], script: v.script ?? []};
  const stages: {t: string; at: string}[] = v.stages ?? [];
  const keys = Array.from(new Set<string>([...spec.script.map((a) => a.at), ...spec.actors.map((a) => (typeof a.at === 'string' ? '' : '')), ...stages.map((x) => x.at)].filter(Boolean)));
  const T: Record<string, number> = Object.fromEntries(keys.map((k) => [k, cueAt(words, seg.id, seg.t0, k)]));
  const live = stages.map((st) => ({...st, tt: T[st.at]})).filter((st) => Number.isFinite(st.tt) && t >= st.tt - 0.05);
  const cur = live[live.length - 1];
  const k = cur ? eob((t - cur.tt) / 0.35) : 0;
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <div style={{position: 'absolute', left: 0, top: z.vt, width: z.W, height: z.vh}}>
        <StageScene w={z.W} h={z.vh} t={t} T={T} C={C} spec={spec} />
      </div>
      {cur && <div key={cur.t} style={{position: 'absolute', left: z.side, top: z.vt + 8, transform: `rotateX(${(1 - clamp(k)) * 70}deg) scale(${0.92 + 0.08 * clamp(k)})`, transformOrigin: '0 0', opacity: clamp(k * 2), background: C.ink, color: C.honey, border: `4px solid ${C.honey}`, borderRadius: 999, padding: '12px 32px', fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.05, letterSpacing: 0.5, boxShadow: '0 12px 26px rgba(0,0,0,.35)'}}>{cur.t}</div>}
    </div>
  );
};

export const IsiV: React.FC<VP> = ({seg, t, dur, z, C, props}) => {
  const items = props.endcard.safety.split(/(?<=\.)\s+/);
  const scroll = clamp(t / dur) * Math.max(0, items.length - 5) * 130;
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: z.vt, fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.06, color: C.honey}}>Important Safety Information</div>
      <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: z.vt + z.W * 0.12, height: z.vh - z.W * 0.12, overflow: 'hidden'}}>
        <div style={{transform: `translateY(${-scroll}px)`}}>
          {items.map((s, i) => (
            <div key={i} style={{fontFamily: F.body, fontWeight: 600, fontSize: z.W * 0.052, lineHeight: 1.25, color: '#fff', padding: '20px 0', borderBottom: '2px solid rgba(238,179,24,.35)', opacity: eo3((t - i * 0.4) / 0.4)}}>{s}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const EndcardV: React.FC<VP> = ({seg, t, z, C, props, words}) => {
  const k = eob(t / 0.55), e = props.endcard;
  const price = e.price;
  const logoW = Math.min(z.W * 0.44, z.vh * 0.4) * (price ? 0.62 : 1);
  const tp = price ? cueTimes(words, seg.id, seg.t0, [String(price.amount)])[0] : 0;
  const kp = eob((t - Math.max(0.2, tp - 0.4)) / 0.5);
  const count = price ? Math.round(price.amount * eo3((t - tp) / 0.9)) : 0;
  const priceH = price ? z.W * 0.27 : 0;
  const top1 = z.vt + logoW + (price ? 18 : 40) + priceH;
  return (
    <div style={abs(z, 0, 0, z.W, z.H)}>
      <div style={{position: 'absolute', left: (z.W - logoW) / 2, top: z.vt - 6, width: logoW, height: logoW, background: '#fff', borderRadius: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${0.75 + 0.25 * clamp(k)})`, opacity: clamp(k * 2), boxShadow: '0 20px 44px rgba(0,0,0,.4)'}}>
        <Img src={staticFile(e.logo)} style={{width: '92%', height: '92%', objectFit: 'contain'}} />
      </div>
      {price && (
        <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: z.vt + logoW + 10, height: priceH, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: clamp(kp * 2), transform: `rotateX(${(1 - clamp(kp)) * 60}deg) scale(${0.9 + 0.1 * clamp(kp)})`, transformOrigin: '50% 100%'}}>
          <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.04, letterSpacing: 3, color: C.honey, textTransform: 'uppercase'}}>{price.label}</div>
          <div style={{display: 'flex', alignItems: 'baseline', gap: 10, lineHeight: 1}}>
            <span style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.17, color: '#fff', letterSpacing: -4}}>${count}</span>
            <span style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.06, color: '#fff'}}>/{price.per}</span>
          </div>
          {price.fine && <div style={{fontFamily: F.body, fontWeight: 600, fontSize: z.W * 0.03, color: 'rgba(255,255,255,.78)', marginTop: 4}}>{price.fine}</div>}
        </div>
      )}
      <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: top1, textAlign: 'center', opacity: eo3((t - 0.3) / 0.4), transform: `translateY(${(1 - eo3((t - 0.3) / 0.4)) * 20}px)`}}>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.05, color: '#fff', lineHeight: 1.1}}>{e.lines[0]}</div>
{e.lines[1] && <div style={{display: 'inline-block', marginTop: 16, background: C.honey, color: C.onHoney, fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.046, padding: '12px 32px', borderRadius: 999}}>{e.lines[1]}</div>}
      </div>
      <div style={{position: 'absolute', left: z.side, width: z.W - z.side * 2, top: top1 + z.W * 0.2, textAlign: 'center', fontFamily: F.body, fontWeight: 600, fontSize: z.W * 0.034, lineHeight: 1.35, color: 'rgba(255,255,255,.88)', opacity: eo3((t - 0.6) / 0.4)}}>
        {e.disclosures.map((d, i) => <div key={i}>{d}</div>)}
      </div>
    </div>
  );
};
