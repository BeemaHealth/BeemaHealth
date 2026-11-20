import React, {useEffect, useMemo, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {continueRender, delayRender} from 'remotion';
import * as THREE from 'three';
import {clamp, eob} from './ui';

/**
 * Generic narration-driven 3D stage. A video beat is a STORYBOARD (JSON): `actors` (what is on stage) and `script`
 * (actions, each fired on a SPOKEN WORD). No new code is needed to make a new video: the nightly writer composes actors and
 * actions from this catalog. Everything here is an ILLUSTRATION. Keep this catalog in sync with beema_engine/storyboard.py.
 */
type V3 = [number, number, number];
type Pal = Record<string, string>;
export type Act = {at: string; do: string; who?: string; [k: string]: unknown};
export type ActorSpec = {id: string; kind: string; at?: string | [number, number]; size?: number; label?: string; color?: string; visible?: boolean; [k: string]: unknown};
export type StageSpec = {actors: ActorSpec[]; script: Act[]};

const ease = (x: number) => { const c = clamp(x); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const num = (o: Record<string, unknown>, k: string, d: number) => (typeof o[k] === 'number' ? (o[k] as number) : d);
const str = (o: Record<string, unknown>, k: string, d: string) => (typeof o[k] === 'string' ? (o[k] as string) : d);
const arr = (o: Record<string, unknown>, k: string): string[] => (Array.isArray(o[k]) ? (o[k] as unknown[]).map(String) : []);

export const SLOTS: Record<string, [number, number]> = {
  tl: [-3.3, 2.2], t: [0, 2.4], tr: [3.3, 2.2], l: [-3.6, 0], cl: [-1.8, 0], c: [0, 0], cr: [1.8, 0], r: [3.6, 0], bl: [-3.3, -2.3], b: [0, -2.4], br: [3.3, -2.3],
};

/* ------------------------------------------------------------------ text plane (fonts must be loaded) */
export const useFontReady = () => {
  const [ok, setOk] = useState(false);
  const [h] = useState(() => delayRender('stage-fonts'));
  useEffect(() => {
    let done = false;
    const fin = () => { if (!done) { done = true; setOk(true); continueRender(h); } };
    Promise.all([document.fonts.load('800 100px Outfit'), document.fonts.load('600 40px Figtree')]).then(fin).catch(fin);
  }, [h]);
  return ok;
};
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
export const Txt: React.FC<{text: string; w: number; h: number; pos?: V3; rot?: V3; s?: number; o?: number; color?: string; bg?: string | null; border?: string | null; ready: boolean; radius?: number}> = ({text, w, h, pos = [0, 0, 0], rot = [0, 0, 0], s = 1, o = 1, color = '#fff', bg = null, border = null, ready, radius = 0.25}) => {
  const tex = useMemo(() => {
    const cw = Math.round(w * 160), ch = Math.round(h * 160);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d')!;
    const bw = border ? ch * 0.07 : 0;
    if (bg || border) { rr(g, bw / 2, bw / 2, cw - bw, ch - bw, radius * 160); if (bg) { g.fillStyle = bg; g.fill(); } if (border) { g.lineWidth = bw; g.strokeStyle = border; g.stroke(); } }
    let fs = ch * 0.6;
    g.font = `800 ${fs}px Outfit, system-ui, sans-serif`;
    const mw = g.measureText(text).width;
    if (mw > cw * 0.9) { fs *= (cw * 0.9) / mw; g.font = `800 ${fs}px Outfit, system-ui, sans-serif`; }
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + fs * 0.04);
    const tx = new THREE.CanvasTexture(c); tx.anisotropy = 4; tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, w, h, color, bg, border, ready, radius]);
  if (s <= 0.02 || o <= 0.02) return null;
  return (
    <mesh position={pos} rotation={rot} scale={s}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent opacity={o} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};
const chipW = (t: string, min = 1.3) => Math.min(4.4, Math.max(min, 0.16 * t.length + 0.7));

/* ------------------------------------------------------------------ actor state, folded from the actions fired so far */
type State = {
  x: number; y: number; s: number; o: number; glow: number; color: string | null; fill: number; widen: number; open: number; value: number; count: number; spin: number;
  label: {text: string; t0: number} | null; shake: [number, number]; stamp: {text: string; t0: number} | null; mark: {k: string; t0: number} | null; size: number; spec: ActorSpec;
};
const fold = (acts: Act[], names: string[], init: number, t: number, dur = 1.0): number => {
  let cur = init;
  for (const a of acts.filter((x) => names.includes(x.do))) {
    const t0 = a._t as number, to = typeof a.to === 'number' ? a.to : typeof a.value === 'number' ? (a.value as number) : cur;
    if (t >= t0 + dur) cur = to; else { if (t > t0) cur = lerp(cur, to, ease((t - t0) / dur)); break; }
  }
  return cur;
};
export const evalActor = (spec: ActorSpec, all: Act[], T: Record<string, number>, t: number): State => {
  const mine: Act[] = all.filter((x) => x.who === spec.id).map((x): Act => ({...x, _t: T[x.at]})).filter((x) => Number.isFinite(x._t)).sort((a, b) => (a._t as number) - (b._t as number));
  const base: [number, number] = Array.isArray(spec.at) ? [spec.at[0], spec.at[1]] : SLOTS[spec.at ?? 'c'] ?? [0, 0];
  let o = spec.visible ? 1 : 0;
  for (const a of mine) { if (t < (a._t as number)) break; if (a.do === 'show') o = eob((t - (a._t as number)) / 0.5); else if (a.do === 'hide') o = 1 - ease((t - (a._t as number)) / 0.45); }
  let [x, y] = base;
  for (const a of mine.filter((m) => m.do === 'move')) {
    const t0 = a._t as number, d = typeof a.dur === 'number' ? a.dur : 1.0, to: [number, number] = Array.isArray(a.to) ? [Number((a.to as unknown[])[0]), Number((a.to as unknown[])[1])] : SLOTS[String(a.to)] ?? [x, y];
    if (t >= t0 + d) { x = to[0]; y = to[1]; } else { if (t > t0) { const k = ease((t - t0) / d); x = lerp(x, to[0], k); y = lerp(y, to[1], k); } break; }
  }
  const LIM: Record<string, number> = {building: 0.6, vessel: 0.6, scale: 1.4, meter: 1.6, clipboard: 2.6, person: 2.8, card: 2.3, radio: 2.4, stomach: 2.4, gut: 2.2, plate: 2.8, flask: 2.9, vial: 2.9};   // wide actors need more room from the edge
  const lim = (LIM[spec.kind] ?? 3.0) / Math.max(1, (spec.size ?? 1) * 0.9);
  x = Math.max(-lim, Math.min(lim, x)); y = Math.max(-2.3, Math.min(2.3, y));      // safe area: with the 1.45x actor scale nothing can reach or cross the canvas edge
  const sc = fold(mine, ['scale'], 1, t, 0.8);
  let glow = 0;
  for (const a of mine.filter((m) => m.do === 'glow' || m.do === 'pulse')) { const d = t - (a._t as number); if (d >= 0) glow += Math.min(1, d / 0.15) * (a.keep ? 1 : Math.exp(-d / 1.5)); }
  let color: string | null = null;
  for (const a of mine.filter((m) => m.do === 'color')) { if (t >= (a._t as number)) color = String(a.to); }
  let label: State['label'] = null;
  for (const a of mine.filter((m) => m.do === 'label')) { if (t >= (a._t as number)) label = {text: String(a.text ?? ''), t0: a._t as number}; }
  let stamp: State['stamp'] = null;
  for (const a of mine.filter((m) => m.do === 'stamp')) { if (t >= (a._t as number)) stamp = {text: String(a.text ?? ''), t0: a._t as number}; }
  let mark: State['mark'] = null;
  for (const a of mine.filter((m) => m.do === 'cross' || m.do === 'tick')) { if (t >= (a._t as number)) mark = {k: String(a.do), t0: a._t as number}; }
  let sh: [number, number] = [0, 0];
  for (const a of mine.filter((m) => m.do === 'shake')) { const d = t - (a._t as number); if (d >= 0) { const e = Math.exp(-7 * d); sh = [Math.sin(d * 90) * 0.2 * e, Math.cos(d * 77) * 0.14 * e]; } }
  let spin = 0;
  for (const a of mine.filter((m) => m.do === 'spin')) { if (t >= (a._t as number)) spin = (t - (a._t as number)) * (typeof a.speed === 'number' ? a.speed : 2); }
  return {
    x, y, s: sc * (spec.size ?? 1), o, glow: Math.min(1.4, glow), color, label, stamp, mark, shake: sh, spin, size: spec.size ?? 1, spec,
    fill: fold(mine, ['fill'], typeof spec.fill === 'number' ? spec.fill : 0, t), widen: fold(mine, ['widen'], typeof spec.widen === 'number' ? spec.widen : 0, t),
    open: fold(mine.map((m) => (m.do === 'close' ? {...m, do: 'open', to: 0} : m)), ['open'], 0, t, 0.8),
    value: fold(mine, ['set'], typeof spec.value === 'number' ? spec.value : 0, t), count: fold(mine, ['count'], 0, t, 1.2),
  };
};

/* ------------------------------------------------------------------ shared pieces */
const CUP = [[0.001, 0], [0.95, 0], [1.05, 0.25], [1.2, 1.25], [1.0, 1.25], [0.85, 0.4], [0.001, 0.38]].map(([x, y]) => new THREE.Vector2(x, y));
const FLASK = [[0.001, 0], [1.25, 0], [1.25, 0.08], [0.95, 0.9], [0.42, 1.8], [0.36, 2.4], [0.5, 2.46]].map(([x, y]) => new THREE.Vector2(x, y));
const GLASS = {color: '#dff3ff', transparent: true, roughness: 0.08, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false} as const;
const PINK = '#f2a9bd';

const Ring: React.FC<{pos: V3; p: number; r?: number; color: string}> = ({pos, p, r = 2.4, color}) => {
  if (p <= 0 || p >= 1) return null;
  const k = ease(p);
  return <mesh position={pos} scale={0.3 + k * r}><torusGeometry args={[1, 0.03 + 0.04 * (1 - k), 12, 64]} /><meshBasicMaterial color={color} transparent opacity={(1 - k) * 0.9} /></mesh>;
};

type KP = {st: State; C: Pal; t: number; ready: boolean};
const hot = (C: Pal, st: State, fallback?: string) => st.color ?? fallback ?? C.honey;

const BrainK: React.FC<KP> = ({st, C}) => (
  <group>
    {[-0.62, 0.62].map((x, i) => <mesh key={i} position={[x, 0, 0]} scale={[1, 0.82, 1.1]}><sphereGeometry args={[0.95, 32, 24]} /><meshStandardMaterial color={st.color ?? PINK} roughness={0.55} emissive="#ff6f9a" emissiveIntensity={0.6 * st.glow} /></mesh>)}
    {Array.from({length: 9}, (_, i) => <mesh key={'b' + i} position={[Math.cos(i * 0.7) * 1.1, 0.35 + Math.sin(i * 1.3) * 0.4, Math.sin(i * 1.9) * 0.55]}><sphereGeometry args={[0.3, 16, 12]} /><meshStandardMaterial color="#f7bfce" roughness={0.6} emissive="#ff6f9a" emissiveIntensity={0.5 * st.glow} /></mesh>)}
    <mesh position={[0, -0.78, 0]}><cylinderGeometry args={[0.2, 0.28, 0.5, 12]} /><meshStandardMaterial color="#e69bb0" /></mesh>
  </group>
);
const StomachK: React.FC<KP> = ({st, C}) => {
  const eso = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, 1.3, 0), new THREE.Vector3(0.45, 2.0, 0), new THREE.Vector3(0.3, 2.7, 0)]), 24, 0.2, 16, false), []);
  const duo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(1.0, -1.1, 0), new THREE.Vector3(1.7, -1.6, 0), new THREE.Vector3(2.4, -1.2, 0), new THREE.Vector3(2.6, -0.5, 0)]), 28, 0.17, 16, false), []);
  const shell = {color: '#f4b19c', transparent: true, roughness: 0.15, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false} as const;
  const lv = Math.max(0.05, st.fill || 0.6);
  return (
    <group scale={0.62}>
      <mesh rotation={[0, 0, -0.5]} scale={[1.35, 1.7, 1.0]}><sphereGeometry args={[1, 36, 28]} /><meshPhysicalMaterial {...shell} opacity={0.42} /></mesh>
      <mesh position={[0.75, -1.05, 0]} rotation={[0, 0, -0.9]} scale={[0.95, 0.7, 0.72]}><sphereGeometry args={[1, 28, 22]} /><meshPhysicalMaterial {...shell} opacity={0.42} /></mesh>
      <mesh geometry={eso}><meshPhysicalMaterial {...shell} opacity={0.45} /></mesh>
      <mesh geometry={duo}><meshPhysicalMaterial {...shell} opacity={0.45} /></mesh>
      <mesh rotation={[0, 0, -0.5]} position={[0, -(1 - lv) * 0.9, 0]} scale={[1.2 * (0.35 + 0.65 * lv), 1.5 * (0.2 + 0.8 * lv), 0.88 * (0.35 + 0.65 * lv)]}><sphereGeometry args={[1, 28, 22]} /><meshStandardMaterial color={hot(C, st)} emissive={hot(C, st)} emissiveIntensity={0.2 + 0.4 * st.glow} transparent opacity={0.55} depthWrite={false} /></mesh>
    </group>
  );
};
const GutK: React.FC<KP> = ({st, C}) => {
  const geo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-2, -0.9, 0], [-0.7, -1.3, 0], [0.6, -0.5, 0], [-0.4, 0.2, 0], [-1.8, 0.7, 0], [-0.2, 1.3, 0], [1.6, 1.4, 0]].map((p) => new THREE.Vector3(...(p as V3)))), 140, 0.26, 14, false), []);
  return <mesh geometry={geo} scale={0.75}><meshStandardMaterial color={st.color ?? '#f08fa8'} roughness={0.45} emissive={C.honey} emissiveIntensity={0.08 + 0.5 * st.glow} /></mesh>;
};
const VesselK: React.FC<KP> = ({st, C, t}) => {
  const curve = useMemo(() => new THREE.CatmullRomCurve3([[-2.6, 0.2, 0], [-1.3, -0.25, 0], [0, 0.25, 0], [1.3, -0.25, 0], [2.6, 0.2, 0]].map((p) => new THREE.Vector3(...(p as V3)))), []);
  const r = 0.2 + 0.36 * st.widen;
  const geo = useMemo(() => new THREE.TubeGeometry(curve, 60, r, 20, false), [curve, r]);
  return (
    <group>
      <mesh geometry={geo}><meshPhysicalMaterial color={st.color ?? '#d9575f'} transparent opacity={0.5} roughness={0.2} clearcoat={1} depthWrite={false} emissive="#ff6f6f" emissiveIntensity={0.15 + 0.4 * st.glow} /></mesh>
      {Array.from({length: 12}, (_, i) => { const p = ((t * (0.18 + 0.5 * st.widen) + i / 12) % 1); const q = curve.getPoint(p); return <mesh key={i} position={[q.x, q.y + Math.sin(i * 2.7) * r * 0.45, Math.cos(i * 1.9) * r * 0.4]}><sphereGeometry args={[0.07 + 0.03 * (i % 3), 10, 10]} /><meshStandardMaterial color="#ff9b9b" emissive="#ff6f6f" emissiveIntensity={0.5} /></mesh>; })}
    </group>
  );
};
const PlateK: React.FC<KP> = ({C}) => (
  <group scale={0.9}>
    <mesh><cylinderGeometry args={[1.25, 1.25, 0.14, 40]} /><meshStandardMaterial color="#f7f1e2" roughness={0.3} /></mesh>
    {[[-0.45, 0.3, 0.1], [0.4, 0.3, -0.2], [0.1, 0.55, 0.35], [-0.1, 0.3, -0.5], [0.55, 0.25, 0.4]].map((p, i) => <mesh key={i} position={p as V3}><sphereGeometry args={[0.3 + (i % 2) * 0.08, 20, 16]} /><meshStandardMaterial color={i % 2 ? C.honey : '#8bc26a'} roughness={0.5} /></mesh>)}
  </group>
);
const OrbK: React.FC<KP> = ({st, C, ready}) => {
  const text = str(st.spec, 'text', ''), r = Math.min(1.25, Math.max(0.62, 0.45 + 0.07 * text.length));   // the sphere grows to hold its label
  return (
    <group>
      <mesh><sphereGeometry args={[r, 32, 28]} /><meshStandardMaterial color={hot(C, st)} roughness={0.25} emissive={hot(C, st)} emissiveIntensity={0.2 + 0.6 * st.glow} /></mesh>
      {text && <Txt text={text} w={r * 1.7} h={Math.min(0.62, r * 0.7)} pos={[0, 0, r + 0.05]} color={C.ink} ready={ready} />}
    </group>
  );
};
const ChainK: React.FC<KP> = ({st, C}) => {
  const n = Math.round(num(st.spec, 'n', 8));
  const pts = useMemo(() => Array.from({length: n}, (_, i) => new THREE.Vector3(Math.cos(i * 0.8) * 0.9, (i - (n - 1) / 2) * 0.3, Math.sin(i * 0.8) * 0.9)), [n]);
  const lit = Math.round(st.fill * n);
  return (
    <group rotation={[0.3, st.spin || 0.6, 0.1]}>
      {pts.map((p, i) => <mesh key={i} position={p}><sphereGeometry args={[0.2, 20, 20]} /><meshStandardMaterial color={i < lit ? hot(C, st) : '#fff1cf'} emissive={i < lit ? hot(C, st) : '#000'} emissiveIntensity={i < lit ? 0.4 : 0} roughness={0.3} /></mesh>)}
      {pts.slice(0, -1).map((p, i) => { const d = pts[i + 1].clone().sub(p); const m = p.clone().add(pts[i + 1]).multiplyScalar(0.5); return <mesh key={'b' + i} position={m} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())} scale={[1, d.length(), 1]}><cylinderGeometry args={[0.04, 0.04, 1, 8]} /><meshStandardMaterial color="#b88a14" /></mesh>; })}
    </group>
  );
};
const ReceptorK: React.FC<KP> = ({st, C}) => (
  <group scale={0.7} position={[0, -0.5, 0]}>
    <mesh><latheGeometry args={[CUP, 36]} /><meshPhysicalMaterial color="#8da2c9" roughness={0.3} clearcoat={0.6} side={THREE.DoubleSide} emissive={C.honey} emissiveIntensity={0.7 * st.glow} /></mesh>
    <mesh position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.1, 0.08, 12, 40]} /><meshBasicMaterial color={st.glow > 0.2 ? C.honey : '#c6d0e6'} /></mesh>
  </group>
);
const LockK: React.FC<KP> = ({st, C}) => (
  <group>
    <mesh position={[0, -0.25, 0]}><boxGeometry args={[1.2, 0.95, 0.5]} /><meshStandardMaterial color={st.color ?? '#8da2c9'} metalness={0.5} roughness={0.35} emissive={C.honey} emissiveIntensity={0.7 * st.glow} /></mesh>
    <group position={[st.open * 0.35, 0.22 + st.open * 0.25, 0]} rotation={[0, 0, -st.open * 0.5]}><mesh><torusGeometry args={[0.38, 0.09, 12, 28, Math.PI]} /><meshStandardMaterial color="#c9ccd6" metalness={0.7} roughness={0.3} /></mesh></group>
    <mesh position={[0, -0.25, 0.27]}><circleGeometry args={[0.09, 16]} /><meshBasicMaterial color={C.ink} /></mesh>
  </group>
);
const KeyK: React.FC<KP> = ({st, C}) => (
  <group rotation={[0, 0, Math.PI / 2]}>
    <mesh position={[0, 0.9, 0]}><torusGeometry args={[0.38, 0.1, 14, 32]} /><meshStandardMaterial color={hot(C, st)} metalness={0.55} roughness={0.25} emissive={hot(C, st)} emissiveIntensity={0.15 + 0.5 * st.glow} /></mesh>
    <mesh position={[0, 0, 0]}><cylinderGeometry args={[0.1, 0.1, 1.5, 14]} /><meshStandardMaterial color={hot(C, st)} metalness={0.55} roughness={0.25} /></mesh>
    {[-0.55, -0.3].map((y) => <mesh key={y} position={[0.2, y, 0]}><boxGeometry args={[0.4, 0.14, 0.14]} /><meshStandardMaterial color={hot(C, st)} metalness={0.55} roughness={0.25} /></mesh>)}
  </group>
);
const EnzymeK: React.FC<KP> = ({st}) => {
  const open = Math.round(st.open * 8) / 8, mouth = 0.75 + 1.5 * open;           // mouth angle in radians; open 0..1 chomps wider
  const g = useMemo(() => new THREE.CylinderGeometry(0.9, 0.9, 0.7, 44, 1, false, Math.PI / 2 + mouth / 2, Math.PI * 2 - mouth), [mouth]);
  const col = st.color ?? '#6fb7ff';
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={g}><meshStandardMaterial color={col} roughness={0.35} side={THREE.DoubleSide} emissive={col} emissiveIntensity={0.15 + 0.6 * st.glow} /></mesh>
      <mesh position={[0.15, 0.42, 0.4]} rotation={[-Math.PI / 2, 0, 0]}><sphereGeometry args={[0.11, 12, 12]} /><meshStandardMaterial color="#fff" /></mesh>
      <mesh position={[0.15, 0.4, 0.5]} rotation={[-Math.PI / 2, 0, 0]}><sphereGeometry args={[0.05, 10, 10]} /><meshStandardMaterial color="#14161c" /></mesh>
    </group>
  );
};
const PillK: React.FC<KP> = ({st, C}) => (
  <group rotation={[0.3, st.spin, Math.PI / 4]}>
    <mesh position={[-0.28, 0, 0]}><capsuleGeometry args={[0.28, 0.35, 8, 20]} /><meshStandardMaterial color={hot(C, st)} roughness={0.3} emissive={hot(C, st)} emissiveIntensity={0.5 * st.glow} /></mesh>
    <mesh position={[0.28, 0, 0]}><capsuleGeometry args={[0.28, 0.35, 8, 20]} /><meshStandardMaterial color="#fff" roughness={0.3} /></mesh>
  </group>
);
const VialK: React.FC<KP> = ({st, C, ready}) => {
  const text = str(st.spec, 'text', '');
  return (
    <group scale={0.8}>
      <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.72, 0.72, 1.8, 32]} /><meshPhysicalMaterial {...GLASS} opacity={0.3} /></mesh>
      <mesh position={[0, 0.1 + st.fill * 0.7, 0]}><cylinderGeometry args={[0.64, 0.64, 0.1 + st.fill * 1.4, 28]} /><meshStandardMaterial color={hot(C, st)} emissive={hot(C, st)} emissiveIntensity={0.3 + 0.4 * st.glow} transparent opacity={0.9} /></mesh>
      <mesh position={[0, 2.0, 0]}><cylinderGeometry args={[0.5, 0.55, 0.45, 24]} /><meshStandardMaterial color="#c9ccd6" metalness={0.7} roughness={0.3} /></mesh>
      {text && <Txt text={text} w={chipW(text, 1.2)} h={0.5} pos={[0, 1.0, 0.74]} color={C.ink} bg="#fff" ready={ready} radius={0.12} />}
    </group>
  );
};
const FlaskK: React.FC<KP> = ({st, C}) => (
  <group scale={0.7} position={[0, -0.9, 0]}>
    <mesh><latheGeometry args={[FLASK, 40]} /><meshPhysicalMaterial {...GLASS} opacity={0.28} /></mesh>
    <mesh position={[0, 0.05 + (st.fill || 0.5) * 0.55, 0]}><cylinderGeometry args={[Math.max(0.2, 1.2 - (st.fill || 0.5) * 0.85), 1.2, (st.fill || 0.5) * 1.1 + 0.05, 32]} /><meshStandardMaterial color={hot(C, st)} emissive={hot(C, st)} emissiveIntensity={0.3 + 0.4 * st.glow} transparent opacity={0.85} /></mesh>
  </group>
);
const ClockK: React.FC<KP> = ({st, C}) => (
  <group>
    <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.85, 0.85, 0.14, 40]} /><meshStandardMaterial color="#f7f1e2" /></mesh>
    <mesh position={[0, 0, 0.09]}><torusGeometry args={[0.85, 0.06, 10, 40]} /><meshStandardMaterial color={hot(C, st)} emissive={hot(C, st)} emissiveIntensity={0.5 * st.glow} /></mesh>
    <group rotation={[0, 0, -(st.value || st.count) * Math.PI * 2]}><mesh position={[0, 0.34, 0.12]}><boxGeometry args={[0.07, 0.68, 0.05]} /><meshStandardMaterial color={C.ink} /></mesh></group>
    <group rotation={[0, 0, -(st.value || st.count) * Math.PI * 2 / 12]}><mesh position={[0, 0.2, 0.12]}><boxGeometry args={[0.09, 0.4, 0.05]} /><meshStandardMaterial color={C.ink} /></mesh></group>
  </group>
);
const DialK: React.FC<KP> = ({st, C, ready}) => (
  <group scale={0.85}>
    <mesh><torusGeometry args={[1.4, 0.14, 14, 48, Math.PI]} /><meshStandardMaterial color="#f7f1e2" emissive={hot(C, st)} emissiveIntensity={0.4 * st.glow} /></mesh>
    {[0, 1, 2, 3, 4, 5, 6].map((i) => { const a = Math.PI * (i / 6); return <mesh key={i} position={[Math.cos(a) * 1.1, Math.sin(a) * 1.1, 0]} rotation={[0, 0, a]}><boxGeometry args={[0.26, 0.06, 0.06]} /><meshStandardMaterial color={C.honey} /></mesh>; })}
    <group rotation={[0, 0, Math.PI - st.value * Math.PI]}><mesh position={[1.0, 0, 0.05]}><boxGeometry args={[1.0, 0.09, 0.09]} /><meshStandardMaterial color="#d9363e" emissive="#d9363e" emissiveIntensity={0.3} /></mesh></group>
    <mesh><sphereGeometry args={[0.16, 14, 12]} /><meshStandardMaterial color={C.ink} /></mesh>
  </group>
);
const ScaleK: React.FC<KP> = ({st, C, ready}) => {
  const tilt = -Math.max(-1, Math.min(1, st.value)) * 0.3, L = str(st.spec, 'left', ''), R = str(st.spec, 'right', '');
  return (
    <group>
      <mesh position={[0, -0.7, 0]}><cylinderGeometry args={[0.09, 0.18, 1.8, 14]} /><meshStandardMaterial color="#c9ccd6" metalness={0.6} /></mesh>
      <group position={[0, 0.2, 0]} rotation={[0, 0, tilt]}>
        <mesh><boxGeometry args={[3.2, 0.12, 0.2]} /><meshStandardMaterial color={hot(C, st)} metalness={0.5} roughness={0.3} /></mesh>
        {[-1.5, 1.5].map((x, i) => (
          <group key={x} position={[x, 0, 0]} rotation={[0, 0, -tilt]}>
            <mesh position={[0, -0.7, 0]}><cylinderGeometry args={[0.55, 0.55, 0.08, 24]} /><meshStandardMaterial color="#e6e9f1" /></mesh>
            {(i ? R : L) && <Txt text={i ? R : L} w={chipW(i ? R : L, 1.3)} h={0.46} pos={[0, -0.25, 0.3]} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.2} />}
          </group>
        ))}
      </group>
    </group>
  );
};
const BuildingK: React.FC<KP> = ({st, C, ready, t}) => {
  const sp = st.stamp ? Math.max(0, t - st.stamp.t0) : -1, text = str(st.spec, 'text', 'FDA');
  return (
    <group scale={0.62}>
      <mesh position={[0, -2.35, 0]}><boxGeometry args={[7.0, 0.32, 2.4]} /><meshStandardMaterial color="#c3c9d8" roughness={0.8} /></mesh>
      {[-2.25, -1.35, -0.45, 0.45, 1.35, 2.25].map((x) => <mesh key={x} position={[x, -0.55, 0]}><cylinderGeometry args={[0.26, 0.3, 2.7, 20]} /><meshStandardMaterial color="#e6e9f1" roughness={0.7} /></mesh>)}
      <mesh position={[0, 1.0, 0]}><boxGeometry args={[6.4, 0.55, 2.1]} /><meshStandardMaterial color="#d8dce8" roughness={0.75} /></mesh>
      <mesh position={[0, 1.28, 0]}><extrudeGeometry args={[(() => { const sh = new THREE.Shape(); sh.moveTo(-3.3, 0); sh.lineTo(3.3, 0); sh.lineTo(0, 1.35); sh.closePath(); return sh; })(), {depth: 2.0, bevelEnabled: false}]} /><meshStandardMaterial color="#cfd4e2" roughness={0.8} /></mesh>
      <Txt text={text} w={2.2} h={0.5} pos={[0, 1.0, 1.08]} color="#3b4358" ready={ready} />
      {st.stamp && <group position={[0, -0.4, 1.4]} rotation={[0, 0, -0.1]} scale={eob(sp / 0.22) * 1.4}><Txt text={st.stamp.text} w={chipW(st.stamp.text, 3)} h={0.95} color="#d9363e" bg="rgba(255,255,255,0.88)" border="#d9363e" ready={ready} radius={0.12} /></group>}
      {st.stamp && sp >= 0 && sp < 0.7 && <Ring pos={[0, -0.4, 1.5]} p={sp / 0.7} r={4} color="#ff5a52" />}
    </group>
  );
};
const ClipboardK: React.FC<KP> = ({st, C, ready}) => {
  const rows = arr(st.spec, 'rows');
  return (
    <group scale={0.62}>
      <mesh><boxGeometry args={[3.4, 4.4, 0.16]} /><meshStandardMaterial color="#c98f00" roughness={0.55} /></mesh>
      <mesh position={[0, 0, 0.1]}><planeGeometry args={[3.0, 3.9]} /><meshStandardMaterial color="#fffdf6" roughness={0.9} /></mesh>
      <mesh position={[0, 2.3, 0.15]}><boxGeometry args={[1.2, 0.36, 0.2]} /><meshStandardMaterial color="#c9ccd6" metalness={0.7} roughness={0.3} /></mesh>
      {rows.slice(0, 5).map((r, i) => (
        <group key={i} position={[0, 1.3 - i * 0.85, 0.12]}>
          <mesh position={[-1.2, 0, 0]}><boxGeometry args={[0.36, 0.36, 0.04]} /><meshStandardMaterial color="#e4e6ee" /></mesh>
          <Txt text={r} w={chipW(r, 1.6)} h={0.4} pos={[0.2, 0, 0.03]} color={C.ink} ready={ready} />
          <Txt text="✓" w={0.5} h={0.5} pos={[-1.2, 0.02, 0.07]} s={ease(st.count - i)} color="#2e9d62" ready={ready} />
        </group>
      ))}
    </group>
  );
};
const PersonK: React.FC<KP> = ({st, C, ready}) => (
  <group scale={0.62} position={[0, -0.4, 0]}>
    <mesh position={[0, -0.5, 0]}><capsuleGeometry args={[0.9, 1.7, 8, 24]} /><meshStandardMaterial color="#f6f7fb" roughness={0.5} /></mesh>
    <mesh position={[0, 1.95, 0]}><sphereGeometry args={[0.72, 32, 24]} /><meshStandardMaterial color="#f0c7a2" roughness={0.6} /></mesh>
    <mesh position={[0, 2.3, -0.05]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.7, 28, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} /><meshStandardMaterial color="#4a3426" roughness={0.7} /></mesh>
    {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.24, 2.05, 0.62]}><sphereGeometry args={[0.07, 12, 10]} /><meshStandardMaterial color="#2b2b33" /></mesh>)}
    <mesh position={[0, 1.88, 0.64]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.2, 0.03, 8, 20, Math.PI]} /><meshStandardMaterial color="#b3524a" /></mesh>
    {[-1, 1].map((sd) => <mesh key={'a' + sd} position={[sd * 1.0, -0.35, 0.1]} rotation={[0, 0, sd * 0.25]}><capsuleGeometry args={[0.24, 1.2, 6, 14]} /><meshStandardMaterial color="#eef0f6" roughness={0.5} /></mesh>)}
    <Txt text="+" w={0.5} h={0.5} pos={[0.4, -0.15, 0.93]} color="#fff" bg="#2e9d62" ready={ready} radius={0.25} s={1 + 0.3 * st.glow} />
  </group>
);
const CoinK: React.FC<KP> = ({st, C, ready}) => {
  const text = str(st.spec, 'text', '$0');
  return (
    <group rotation={[0.1, st.spin * Math.PI, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.95, 0.95, 0.2, 40]} /><meshStandardMaterial color={hot(C, st)} metalness={0.75} roughness={0.25} emissive={hot(C, st)} emissiveIntensity={0.25 + 0.4 * st.glow} /></mesh>
      <Txt text={text} w={1.5} h={0.9} pos={[0, 0, 0.12]} color={C.ink} ready={ready} />
      <Txt text={text} w={1.5} h={0.9} pos={[0, 0, -0.12]} rot={[0, Math.PI, 0]} color={C.ink} ready={ready} />
    </group>
  );
};
const RadioK: React.FC<KP> = ({st, C, t}) => (
  <group>
    <mesh><boxGeometry args={[2.0, 1.2, 0.5]} /><meshStandardMaterial color="#3a2a1e" roughness={0.6} /></mesh>
    <mesh position={[-0.45, 0, 0.27]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.38, 0.38, 0.06, 24]} /><meshStandardMaterial color="#c9ccd6" metalness={0.6} /></mesh>
    <mesh position={[0.55, 0.2, 0.27]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.18, 0.18, 0.06, 20]} /><meshStandardMaterial color={C.honey} /></mesh>
    <mesh position={[0.9, 0.9, 0]} rotation={[0, 0, -0.5]}><cylinderGeometry args={[0.03, 0.03, 1.4, 8]} /><meshStandardMaterial color="#c9ccd6" /></mesh>
    {[0, 1, 2].map((i) => <Ring key={i} pos={[1.1, 1.5, 0.2]} p={(((t * 0.7 + i / 3) % 1) * (st.value > 0.05 || st.glow > 0.05 ? 1 : 0))} r={1.3} color={st.color ?? C.honey} />)}
  </group>
);
const BubbleK: React.FC<KP> = ({st, C, ready}) => {
  const text = str(st.spec, 'text', '!');
  return <Txt text={text} w={chipW(text, 0.9)} h={0.6} color={C.ink} bg={st.color ?? C.honey} border="#fff" ready={ready} radius={0.28} />;
};
const CardK: React.FC<KP> = ({st, C, ready}) => {
  const title = str(st.spec, 'text', ''), sub = str(st.spec, 'sub', '');
  return (
    <group>
      <mesh><boxGeometry args={[3.0, 1.9, 0.08]} /><meshStandardMaterial color="#fffaf0" roughness={0.6} /></mesh>
      <Txt text={title} w={2.7} h={0.55} pos={[0, 0.35, 0.06]} color={C.ink} ready={ready} />
      {sub && <Txt text={sub} w={2.3} h={0.38} pos={[0, -0.25, 0.06]} color="#6a6f80" ready={ready} />}
    </group>
  );
};
const ShieldK: React.FC<KP> = ({st, C, ready}) => {
  const geo = useMemo(() => { const s = new THREE.Shape(); s.moveTo(0, 1); s.lineTo(0.9, 0.7); s.lineTo(0.9, -0.1); s.quadraticCurveTo(0.9, -0.8, 0, -1.1); s.quadraticCurveTo(-0.9, -0.8, -0.9, -0.1); s.lineTo(-0.9, 0.7); s.closePath(); return new THREE.ExtrudeGeometry(s, {depth: 0.2, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1}); }, []);
  return <group><mesh geometry={geo}><meshStandardMaterial color={hot(C, st)} metalness={0.4} roughness={0.35} emissive={hot(C, st)} emissiveIntensity={0.2 + 0.5 * st.glow} /></mesh><Txt text={str(st.spec, 'text', '✓')} w={1} h={0.8} pos={[0, 0, 0.3]} color={C.ink} ready={ready} /></group>;
};
const MagnifierK: React.FC<KP> = ({st, C}) => (
  <group rotation={[0, 0, -0.6]}>
    <mesh><torusGeometry args={[0.5, 0.09, 12, 32]} /><meshStandardMaterial color="#363b4d" metalness={0.5} emissive={C.honey} emissiveIntensity={0.4 * st.glow} /></mesh>
    <mesh><circleGeometry args={[0.47, 28]} /><meshPhysicalMaterial {...GLASS} opacity={0.2} /></mesh>
    <mesh position={[0, -0.95, 0]}><cylinderGeometry args={[0.08, 0.08, 0.9, 10]} /><meshStandardMaterial color="#363b4d" /></mesh>
  </group>
);
const ArrowK: React.FC<KP> = ({st, C}) => {
  const len = num(st.spec, 'length', 1.6), rot = (num(st.spec, 'rotate', 0) * Math.PI) / 180;
  return (
    <group rotation={[0, 0, rot]}>
      <mesh position={[len / 2 - 0.15, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.09, 0.09, len - 0.3, 12]} /><meshStandardMaterial color={hot(C, st)} emissive={hot(C, st)} emissiveIntensity={0.3 + 0.5 * st.glow} /></mesh>
      <mesh position={[len - 0.05, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.25, 0.4, 16]} /><meshStandardMaterial color={hot(C, st)} emissive={hot(C, st)} emissiveIntensity={0.3 + 0.5 * st.glow} /></mesh>
    </group>
  );
};
const MeterK: React.FC<KP> = ({st, C, ready}) => {
  const v = Math.max(0, Math.min(1, st.value)), label = str(st.spec, 'text', '');
  return (
    <group>
      <mesh><boxGeometry args={[3.0, 0.4, 0.2]} /><meshStandardMaterial color="#323951" /></mesh>
      <mesh position={[-1.45 + 1.45 * v, 0, 0.12]} scale={[Math.max(0.01, v), 1, 1]}><boxGeometry args={[2.9, 0.3, 0.1]} /><meshStandardMaterial color={hot(C, st)} emissive={hot(C, st)} emissiveIntensity={0.3 + 0.5 * st.glow} /></mesh>
      {label && <Txt text={label} w={chipW(label, 1.4)} h={0.42} pos={[0, 0.55, 0.1]} color={C.ink} bg="#fff" ready={ready} radius={0.2} />}
    </group>
  );
};
const CounterK: React.FC<KP> = ({st, C, ready}) => {
  const unit = str(st.spec, 'text', ''), n = Math.round(st.count);
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.15, 1.15, 0.2, 40]} /><meshStandardMaterial color={C.ink} roughness={0.5} emissive={C.honey} emissiveIntensity={0.1 + 0.4 * st.glow} /></mesh>
      <mesh position={[0, 0, 0.1]}><torusGeometry args={[1.15, 0.07, 10, 48]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.5} /></mesh>
      <Txt text={String(n)} w={1.7} h={1.2} pos={[0, unit ? 0.15 : 0, 0.14]} color={C.honey} ready={ready} />
      {unit && <Txt text={unit} w={chipW(unit, 1.4)} h={0.4} pos={[0, -0.72, 0.14]} color="#fff" ready={ready} />}
    </group>
  );
};
const ShapeK: React.FC<KP> = ({st, C}) => {
  const k = str(st.spec, 'shape', 'sphere'), col = hot(C, st);
  const m = <meshStandardMaterial color={col} roughness={0.35} emissive={col} emissiveIntensity={0.15 + 0.6 * st.glow} />;
  return <group rotation={[0.3, st.spin, 0]}>{k === 'box' ? <mesh><boxGeometry args={[1, 1, 1]} />{m}</mesh> : k === 'cylinder' ? <mesh><cylinderGeometry args={[0.5, 0.5, 1.1, 24]} />{m}</mesh> : k === 'torus' ? <mesh><torusGeometry args={[0.6, 0.18, 14, 32]} />{m}</mesh> : k === 'cone' ? <mesh><coneGeometry args={[0.6, 1.2, 24]} />{m}</mesh> : <mesh><sphereGeometry args={[0.6, 28, 22]} />{m}</mesh>}</group>;
};

const KSCALE: Record<string, number> = {brain: 1.35, stomach: 2.3, gut: 2.2, vessel: 1.05, plate: 2.0, orb: 2.3, chain: 1.6, receptor: 2.0, lock: 2.6, key: 2.4, enzyme: 2.2, pill: 3.0, vial: 2.3, flask: 1.9, clock: 2.4, dial: 1.55, scale: 1.35, building: 1.15, clipboard: 2.0, person: 1.9, coin: 2.1, radio: 1.9, bubble: 2.0, card: 1.75, shield: 2.4, magnifier: 2.6, arrow: 2.0, meter: 1.3, shape: 2.4, counter: 2.0};

export const KINDS: Record<string, React.FC<KP>> = {
  brain: BrainK, stomach: StomachK, gut: GutK, vessel: VesselK, plate: PlateK, orb: OrbK, chain: ChainK, receptor: ReceptorK, lock: LockK, key: KeyK, enzyme: EnzymeK, pill: PillK,
  vial: VialK, flask: FlaskK, clock: ClockK, dial: DialK, scale: ScaleK, building: BuildingK, clipboard: ClipboardK, person: PersonK, coin: CoinK, radio: RadioK, bubble: BubbleK,
  card: CardK, shield: ShieldK, magnifier: MagnifierK, arrow: ArrowK, meter: MeterK, shape: ShapeK, counter: CounterK,
};

/* ------------------------------------------------------------------ the stage */
export const StageScene: React.FC<{w: number; h: number; t: number; T: Record<string, number>; C: Pal; spec: StageSpec}> = ({w, h, t, T, C, spec}) => {
  const ready = useFontReady();
  const states = spec.actors.map((a) => evalActor(a, spec.script, T, t));
  const byId: Record<string, State> = {};
  spec.actors.forEach((a, i) => { byId[a.id] = states[i]; });
  const pos = (id: string): V3 => { const s = byId[id]; return s ? [s.x, s.y, 0.4] : [0, 0, 0.4]; };
  const travels = spec.script.filter((a) => a.do === 'travel' && Number.isFinite(T[a.at]));
  const connects = spec.script.filter((a) => a.do === 'connect' && Number.isFinite(T[a.at]));
  const bursts = spec.script.filter((a) => a.do === 'burst' && Number.isFinite(T[a.at]));
  return (
    <ThreeCanvas width={Math.round(w)} height={Math.round(h)} camera={{fov: 40, position: [0, 0, 12.5]}} gl={{antialias: true, alpha: true}}>
      <ambientLight intensity={0.95} />
      <directionalLight position={[3, 6, 9]} intensity={2.2} color="#fff4d6" />
      <pointLight position={[-5, -2, 6]} intensity={34} color={C.honey} />
      <group rotation={[0.04, Math.sin(t * 0.4) * 0.07, 0]}>
        {connects.map((a, i) => {
          const p0 = pos(String(a.from)), p1 = pos(String(a.to)), k = ease((t - T[a.at]) / 0.7);
          const d = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], 0), len = d.length() * k;
          if (len < 0.05) return null;
          const dir = d.clone().normalize();
          return <mesh key={'c' + i} position={[p0[0] + dir.x * len / 2, p0[1] + dir.y * len / 2, 0.2]} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)} scale={[1, len, 1]}><cylinderGeometry args={[0.04, 0.04, 1, 8]} /><meshBasicMaterial color={String(a.color ?? C.honey)} /></mesh>;
        })}
        {spec.actors.map((a, i) => {
          const st = states[i], K = KINDS[a.kind];
          if (!K || st.o <= 0.02) return null;
          const sc = Math.max(0.001, st.s * st.o * (KSCALE[a.kind] ?? 2.0));      // each kind is scaled so its hero size reads at ~35% of the frame width
          const label = st.label ?? (a.label ? {text: a.label, t0: -99} : null);
          return (
            <group key={a.id} position={[st.x + st.shake[0], st.y + st.shake[1], 0]}>
              <mesh position={[0, 0, -0.6]} scale={sc}><circleGeometry args={[1.5, 40]} /><meshBasicMaterial color={C.honey} transparent opacity={0.06 + 0.1 * Math.min(1, st.glow)} depthWrite={false} /></mesh>
              <group scale={sc} rotation={[0, a.kind === 'brain' || a.kind === 'stomach' ? Math.sin(t * 0.5) * 0.25 : 0, 0]}><K st={st} C={C} t={t} ready={ready} /></group>
              {label && <Txt text={label.text} w={chipW(label.text)} h={0.5} pos={[0, -Math.min(2.0, (KSCALE[a.kind] ?? 2) * 0.55 * Math.max(0.7, st.size) + 0.2), 0.6]} s={eob((t - Math.max(label.t0, T[a.at as string] || 0) + (label.t0 < 0 ? 0.5 : 0)) / 0.35)} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.25} />}
              {st.mark && (() => {
                const k = eob((t - st.mark.t0) / 0.3), big = 1.6 * Math.max(0.8, st.size);
                return st.mark.k === 'cross'
                  ? <group position={[0, 0, 1.2]} scale={Math.max(0.001, k)}>{[Math.PI / 4, -Math.PI / 4].map((r) => <mesh key={r} rotation={[0, 0, r]}><boxGeometry args={[big * 2.6, 0.26, 0.14]} /><meshStandardMaterial color="#e8564e" emissive="#e8564e" emissiveIntensity={0.35} /></mesh>)}</group>
                  : <group position={[big * 0.9, big * 0.8, 1.2]} scale={Math.max(0.001, k)}><mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.55, 0.55, 0.14, 32]} /><meshStandardMaterial color="#2e9d62" emissive="#2e9d62" emissiveIntensity={0.35} /></mesh><Txt text="✓" w={0.9} h={0.9} pos={[0, 0, 0.1]} color="#fff" ready={ready} /></group>;
              })()}
              {st.glow > 0.05 && <Ring pos={[0, 0, 0]} p={Math.max(0, Math.min(0.99, 1 - st.glow / 1.4))} r={2.4 * st.size} color={C.honey} />}
            </group>
          );
        })}
        {travels.map((a, i) => {
          const n = Math.max(1, Math.round(Number(a.count ?? 3))), p0 = pos(String(a.from)), p1 = pos(String(a.to)), icon = String(a.icon ?? 'bubble:!');
          return Array.from({length: n}, (_, j) => {
            const p = (t - T[a.at] - j * 0.38) / 1.3;
            if (p <= 0 || p >= 1.02) return null;
            const k = ease(p), px = lerp(p0[0], p1[0], k), py = lerp(p0[1], p1[1], k) + Math.sin(Math.PI * k) * 0.7;
            return <group key={`t${i}-${j}`} position={[px, py, 0.7]} scale={1.5 * Math.min(1, p * 5) * (1 - 0.6 * Math.max(0, (p - 0.9) * 10))}>
              {icon.startsWith('bubble:') ? <Txt text={icon.slice(7) || '!'} w={chipW(icon.slice(7), 0.8)} h={0.55} color={C.ink} bg={C.honey} border="#fff" ready={ready} radius={0.28} /> : <mesh><sphereGeometry args={[0.2, 14, 12]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.5} /></mesh>}
            </group>;
          });
        })}
        {bursts.map((a, i) => { const s = byId[String(a.who)]; return s ? <Ring key={'b' + i} pos={[s.x, s.y, 0.5]} p={(t - T[a.at]) / 1.0} r={2.2} color={C.honey} /> : null; })}
      </group>
    </ThreeCanvas>
  );
};
