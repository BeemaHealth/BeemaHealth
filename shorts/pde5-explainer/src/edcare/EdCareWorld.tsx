import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {Txt, useFontReady} from '../engine/stage3d';
import {Word, clamp, eob, rnd} from '../engine/ui';
import {wcue} from '../engine/world3d';

/**
 * "ED care, privately" world for the 30 s men's health short. ONE continuous scene, one camera that flies on the spoken words
 * through four rooms laid out along x:
 *   WR  a clinic waiting room (cool fluorescent light, empty vinyl chairs, a wall clock whose hand races on "awkward")
 *   PR  a warm gallery with three stone plinths that rise on the drug names (two FDA-approved generic tablet bottles, then a
 *       glass divider and the compounded ED Mints bottle with square dissolving tablets, each labelled on the word)
 *   PC  a walnut desk by a daylight window: a tablet with an intake form that fills on "intake", a lamp that switches on and a
 *       clipboard on "licensed", a magnifier that reads the history on "reviews"; a plain shipping box closes on "prescribed"
 *   DS  a front doorstep at golden hour; the box flies there on "ships", lands on "door", and three chips stack on the words
 * Everything is an ILLUSTRATION: generic bottles modelled on Beema Health's own site imagery with NO text on the labels, and a
 * plain kraft box with no logo, brand or claim. No people. Nothing is timed by guesswork: every change keys off a spoken word.
 */
type V3 = [number, number, number];
const ease = (x: number) => { const c = clamp(x); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const appear = (tg: number, t: number, d = 0.55) => eob((tg - t) / d);

const GAP = 20;
const WR: V3 = [-GAP, 0, 0], PR: V3 = [0, 0, 0], PC: V3 = [GAP, 0, 0], DS: V3 = [GAP + 14, 0, 0];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

const KEYS: [string, string][] = [
  ['ed', 'ed'], ['treat', 'treatment'], ['awk', 'awkward'], ['wait', 'waiting'],
  ['sil', 'sildenafil'], ['tad', 'tadalafil'], ['fda', 'fda-approved'], ['mints', 'mints'], ['comp', 'compounded'], ['not', 'not'],
  ['online', 'online'], ['intake', 'intake'], ['lic', 'licensed'], ['rev', 'reviews'], ['hist', 'history'], ['every', 'everyone'],
  ['presc', 'prescribed'], ['ships', 'ships'], ['door', 'door'], ['priv', 'private'], ['online2', 'online#2'], ['prov', 'provider-reviewed'],
];
type Cu = Record<string, number>;
const cuesOf = (words: Word[]): Cu => {
  const out: Cu = {}; let prev = 0.3;
  for (const [k, v] of KEYS) { let t = wcue(words, v); if (!Number.isFinite(t)) t = prev + 0.6; out[k] = Math.max(t, prev + 0.05); prev = out[k]; }
  return out;
};

/* ------------------------------------------------------------------ camera: keyframes on spoken words */
type Key = {t: number; dur: number; az: number; el: number; d: number; look: V3};
const K = (t: number, zone: V3, az: number, el: number, d: number, look: V3, dur = 1.3): Key => ({t, dur, az, el, d, look: add(zone, look)});
const keysOf = (c: Cu): Key[] => {
  const k: Key[] = [
    K(0, WR, -0.62, 0.2, 9.6, [0, 1.7, -1.6]),
    K(c.awk - 0.2, WR, -0.25, 0.1, 7.4, [-1.0, 1.4, -2.0], 1.8),
    K(c.wait - 0.1, WR, 0.3, 0.2, 6.6, [0.4, 2.5, -2.6], 2.0),
    K(c.sil - 1.0, PR, -0.4, 0.2, 6.8, [-2.4, 2.0, 0], 1.6),
    K(c.tad - 0.25, PR, -0.1, 0.2, 7.2, [-0.05, 2.0, 0.4], 1.0),
    K(c.fda - 0.15, PR, -0.04, 0.22, 10.4, [-1.1, 2.35, 0.2], 1.0),
    K(c.mints - 0.3, PR, 0.36, 0.2, 7.6, [2.5, 2.2, 0], 1.0),
    K(c.not - 0.1, PR, 0.12, 0.24, 14.2, [0.1, 2.55, 0.2], 1.2),
    K(c.online - 0.9, PC, -0.32, 0.28, 6.6, [-0.9, 2.3, -0.2], 1.6),
    K(c.lic - 0.2, PC, 0.08, 0.34, 8.2, [0.2, 2.2, 0]),
    K(c.rev - 0.15, PC, 0.3, 0.72, 5.2, [0.9, 1.75, 0.15]),
    K(c.every - 0.2, PC, 0.02, 0.28, 9.6, [0.1, 2.4, 0]),
    K(c.presc - 0.2, PC, 0.38, 0.28, 6.8, [1.7, 2.15, 0]),
    K(c.ships, DS, -0.2, 0.16, 10.0, [0.2, 2.0, -1.0], 1.2),        // ships -> door: the camera TRACKS the box (see track in EdCareWorld)
    K(c.priv - 0.15, DS, 0.02, 0.1, 11.6, [0.2, 2.6, -0.6], 1.6),
    K(c.prov + 6, DS, 0.12, 0.12, 10.8, [0.2, 2.5, -0.6], 4),
  ];
  for (let i = 1; i < k.length; i++) k[i].t = Math.max(k[i].t, k[i - 1].t + 0.3);
  return k;
};
const camAt = (keys: Key[], tg: number) => {
  let i = 0; while (i < keys.length - 1 && tg >= keys[i + 1].t) i++;
  const a = keys[Math.max(0, i - 1)], b = keys[i];
  const k = i === 0 ? 1 : ease((tg - b.t) / b.dur);
  const from = i === 0 ? b : a;
  const az = lerp(from.az, b.az, k) + Math.sin(tg * 0.35) * 0.035, el = lerp(from.el, b.el, k) + Math.sin(tg * 0.27) * 0.012, d = lerp(from.d, b.d, k);
  const look = lerp3(from.look, b.look, k);
  const pos: V3 = [look[0] + d * Math.cos(el) * Math.sin(az), look[1] + d * Math.sin(el), look[2] + d * Math.cos(el) * Math.cos(az)];
  return {pos, look};
};

/* ------------------------------------------------------------------ procedural textures (seeded, deterministic) */
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, rep: [number, number] = [1, 1]) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
  return t;
};
const shade = (hex: string, f: number) => { const c = new THREE.Color(hex); c.multiplyScalar(f); return `#${c.getHexString()}`; };
const woodTex = (base: string, seed: number, rep: [number, number]) => canvasTex(1024, 1024, (g) => {
  const rows = 8, rh = 1024 / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rnd(seed + r) * 600;
    while (x < 1024) {
      const len = 380 + rnd(seed + r * 13 + x) * 420;
      g.fillStyle = shade(base, 0.86 + rnd(seed + r * 7 + x * 0.01) * 0.24); g.fillRect(x, r * rh, len, rh);
      for (let l = 0; l < 26; l++) {
        const y = r * rh + rnd(seed + l * 3.1 + r + x) * rh;
        g.strokeStyle = `rgba(40,22,8,${0.05 + rnd(l + x + r) * 0.08})`; g.lineWidth = 1 + rnd(l * 9 + r) * 2.2;
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len * 0.3, y + 4, x + len * 0.6, y - 4, x + len, y + 1); g.stroke();
      }
      g.fillStyle = 'rgba(25,14,6,.55)'; g.fillRect(x, r * rh, 3, rh);
      x += len;
    }
    g.fillStyle = 'rgba(25,14,6,.6)'; g.fillRect(0, r * rh, 1024, 3);
  }
}, rep);
const tileTex = () => canvasTex(512, 512, (g) => {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    g.fillStyle = shade('#c9cbc4', 0.94 + rnd(i * 4 + j) * 0.1); g.fillRect(i * 128, j * 128, 128, 128);
    for (let s = 0; s < 120; s++) { g.fillStyle = `rgba(80,80,80,${rnd(s + i * 9 + j) * 0.25})`; g.fillRect(i * 128 + rnd(s * 3 + i) * 128, j * 128 + rnd(s * 5 + j) * 128, 2, 2); }
  }
  g.strokeStyle = 'rgba(70,72,70,.5)'; g.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 128, 0); g.lineTo(i * 128, 512); g.stroke(); g.beginPath(); g.moveTo(0, i * 128); g.lineTo(512, i * 128); g.stroke(); }
}, [4, 3]);
const noiseTex = (base: string, seed: number, amt: number, rep: [number, number] = [1, 1]) => canvasTex(256, 256, (g) => {
  g.fillStyle = base; g.fillRect(0, 0, 256, 256);
  for (let s = 0; s < 2400; s++) { const v = rnd(seed + s); g.fillStyle = v > 0.5 ? `rgba(255,255,255,${(v - 0.5) * amt})` : `rgba(0,0,0,${(0.5 - v) * amt})`; g.fillRect(rnd(s * 1.7 + seed) * 256, rnd(s * 2.3 + seed) * 256, 2, 2); }
}, rep);
/** Bottle label: white band with two honey rules. Deliberately NO text, no drug name, no brand. */
const labelTex = (honey: string) => canvasTex(512, 256, (g) => {
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = honey; g.fillRect(0, 10, 512, 12); g.fillRect(0, 234, 512, 12);
});
/** Intake form on the tablet: a heading and empty field rows (fills are separate meshes so they animate on the word). */
const formTex = (honey: string, ready: boolean) => canvasTex(690, 470, (g) => {
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 690, 470);
  g.fillStyle = honey; g.fillRect(0, 0, 690, 14);
  g.fillStyle = '#1c1e24'; g.font = `800 46px Outfit, system-ui, sans-serif`; g.textBaseline = 'middle'; g.fillText(ready ? 'Health history' : '', 40, 70);
  for (let r = 0; r < 4; r++) { g.fillStyle = '#d9d6cf'; g.fillRect(40, 132 + r * 78, 250, 14); g.strokeStyle = '#c9c5bc'; g.lineWidth = 3; g.strokeRect(40, 156 + r * 78, 610, 30); }
});

/* ------------------------------------------------------------------ shared pieces */
const Chip: React.FC<{text: string; at: V3; cam: number; s: number; h?: number; color?: string; bg?: string; border?: string | null; ready: boolean}> = ({text, at, cam, s, h = 0.32, color = '#fff', bg = 'rgba(18,20,25,.88)', border = '#EEB318aa', ready}) => {
  const yaw = cam;
  const w = Math.min(5.2, (0.17 * text.length + 0.8) * (h / 0.46));
  return <group position={at} rotation={[0, yaw, 0]}><Txt text={text} w={w} h={h} s={s} color={color} bg={bg} border={border} ready={ready} radius={0.3} /></group>;
};
const GLASS = {color: '#f4fbff', transparent: true, opacity: 0.32, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, reflectivity: 0.6, side: THREE.DoubleSide, depthWrite: false};

type TabletKind = 'round' | 'square';
const roundTab = new THREE.SphereGeometry(0.1, 20, 12);
const squareTab = new RoundedBoxGeometry(0.17, 0.08, 0.17, 3, 0.035);
const Tablet: React.FC<{kind: TabletKind; p: V3; r: V3; s?: number}> = ({kind, p, r, s = 1}) => kind === 'round'
  ? <mesh geometry={roundTab} position={p} rotation={r} scale={[s, s * 0.42, s]}><meshStandardMaterial color="#f2eee6" roughness={0.62} /></mesh>
  : (
    <group position={p} rotation={r} scale={s}>
      <mesh geometry={squareTab}><meshStandardMaterial color="#79a7d6" roughness={0.85} /></mesh>
      <mesh position={[0, 0.041, 0]}><boxGeometry args={[0.15, 0.006, 0.012]} /><meshStandardMaterial color="#4d7fb3" roughness={0.9} /></mesh>
      <mesh position={[0, 0.041, 0]}><boxGeometry args={[0.012, 0.006, 0.15]} /><meshStandardMaterial color="#4d7fb3" roughness={0.9} /></mesh>
    </group>
  );

/** A generic pharmacy bottle modelled on the site's product imagery: clear glass, white ribbed cap, label band with no text. */
const Bottle: React.FC<{kind: TabletKind; label: THREE.Texture; seed: number}> = ({kind, label, seed}) => {
  const tabs = useMemo(() => Array.from({length: 40}, (_, i): {p: V3; r: V3} => {
    const a = rnd(seed + i) * Math.PI * 2, rr = 0.06 + rnd(seed + i * 3) * 0.2;
    return {p: [Math.cos(a) * rr, 0.07 + (i / 40) * 0.66 + rnd(i + seed) * 0.05, Math.sin(a) * rr], r: [rnd(i * 5 + seed) * 3, rnd(i * 7) * 3, rnd(i * 11) * 3]};
  }), [seed]);
  return (
    <group>
      {tabs.map((t, i) => <Tablet key={i} kind={kind} p={t.p} r={t.r} s={kind === 'round' ? 0.95 : 0.9} />)}
      <mesh position={[0, 0.48, 0]} userData={{noShadow: true}}><cylinderGeometry args={[0.4, 0.4, 0.96, 48, 1, true]} /><meshPhysicalMaterial {...GLASS} /></mesh>
      <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.4, 0.38, 0.04, 48]} /><meshPhysicalMaterial {...GLASS} opacity={0.5} /></mesh>
      <mesh position={[0, 1.0, 0]} userData={{noShadow: true}}><cylinderGeometry args={[0.31, 0.4, 0.1, 48, 1, true]} /><meshPhysicalMaterial {...GLASS} /></mesh>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.405, 0.405, 0.5, 64, 1, true]} /><meshStandardMaterial map={label} roughness={0.55} /></mesh>
      <group position={[0, 1.2, 0]}>
        <mesh><cylinderGeometry args={[0.33, 0.33, 0.3, 48]} /><meshStandardMaterial color="#f7f7f4" roughness={0.38} /></mesh>
        {Array.from({length: 44}, (_, i) => { const a = (i / 44) * Math.PI * 2; return <mesh key={i} position={[Math.cos(a) * 0.332, 0, Math.sin(a) * 0.332]} rotation={[0, -a, 0]}><boxGeometry args={[0.012, 0.26, 0.02]} /><meshStandardMaterial color="#e9e9e4" roughness={0.45} /></mesh>; })}
      </group>
    </group>
  );
};

type SP = {tg: number; c: Cu; C: Record<string, string>; cam: number; ready: boolean};

/* ------------------------------------------------------------------ WR: the waiting room (cool, flat light, empty chairs) */
const Chair: React.FC<{x: number}> = ({x}) => (
  <group position={[x, 0, -2.0]}>
    {[[-0.38, -0.32], [0.38, -0.32], [-0.38, 0.32], [0.38, 0.32]].map(([lx, lz], i) => <mesh key={i} position={[lx, 0.25, lz]}><cylinderGeometry args={[0.025, 0.025, 0.5, 10]} /><meshStandardMaterial color="#b8bcc2" metalness={0.9} roughness={0.25} /></mesh>)}
    <mesh position={[0, 0.58, 0.02]}><primitive object={new RoundedBoxGeometry(0.88, 0.16, 0.8, 4, 0.06)} attach="geometry" /><meshStandardMaterial color="#56636f" roughness={0.42} /></mesh>
    <mesh position={[0, 1.08, -0.38]} rotation={[-0.08, 0, 0]}><primitive object={new RoundedBoxGeometry(0.88, 0.82, 0.13, 4, 0.06)} attach="geometry" /><meshStandardMaterial color="#56636f" roughness={0.42} /></mesh>
    <mesh position={[0.5, 0.82, 0]}><boxGeometry args={[0.08, 0.05, 0.7]} /><meshStandardMaterial color="#2b2e33" roughness={0.6} /></mesh>
    <mesh position={[0.5, 0.55, 0.3]}><cylinderGeometry args={[0.02, 0.02, 0.55, 8]} /><meshStandardMaterial color="#b8bcc2" metalness={0.9} roughness={0.25} /></mesh>
  </group>
);
const WaitingRoom: React.FC<SP> = ({tg, c}) => {
  const tile = useMemo(tileTex, []), wall = useMemo(() => noiseTex('#c4cbc2', 3, 0.12, [3, 2]), []);
  const leave = ease((tg - c.sil + 0.6) / 1.2);
  const flick = tg > c.awk && tg < c.awk + 0.5 ? 0.75 + 0.25 * Math.sign(Math.sin(tg * 60)) : 1;
  const spin = 10 * ease((tg - c.awk) / 2.6);
  const minA = -tg * 0.25 - spin, hrA = minA / 12 - 1.1;
  return (
    <group position={WR}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}><planeGeometry args={[16, 12]} /><meshStandardMaterial map={tile} roughness={0.35} /></mesh>
      <mesh position={[0, 3, -3.2]}><boxGeometry args={[16, 6, 0.2]} /><meshStandardMaterial map={wall} roughness={0.9} /></mesh>
      <mesh position={[0, 0.08, -3.08]}><boxGeometry args={[16, 0.16, 0.06]} /><meshStandardMaterial color="#8b918c" roughness={0.6} /></mesh>
      {[-4.2, -3.1, -2.0, -0.9, 0.2, 1.3, 2.4].map((x) => <Chair key={x} x={x} />)}
      <group position={[3.8, 0, -2.0]}>
        <mesh position={[0, 0.5, 0]}><boxGeometry args={[0.9, 0.06, 0.6]} /><meshStandardMaterial color="#c9b79a" roughness={0.5} /></mesh>
        {[[-0.32, -0.22], [0.32, -0.22], [-0.32, 0.22], [0.32, 0.22]].map(([lx, lz], i) => <mesh key={i} position={[lx, 0.24, lz]}><boxGeometry args={[0.04, 0.48, 0.04]} /><meshStandardMaterial color="#8a7a62" /></mesh>)}
        {['#7d8c99', '#b9a07a', '#9aa69a'].map((col, i) => <mesh key={col} position={[-0.12 + i * 0.1, 0.545 + i * 0.012, i * 0.04]} rotation={[0, 0.2 * i - 0.2, 0]}><boxGeometry args={[0.42, 0.01, 0.3]} /><meshStandardMaterial color={col} roughness={0.7} /></mesh>)}
      </group>
      <group position={[0.4, 3.85, -3.05]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.62, 0.62, 0.1, 48]} /><meshStandardMaterial color="#2d3035" roughness={0.4} metalness={0.4} /></mesh>
        <mesh position={[0, 0, 0.055]}><circleGeometry args={[0.56, 48]} /><meshStandardMaterial color="#f4f3ee" roughness={0.6} /></mesh>
        {Array.from({length: 12}, (_, i) => { const a = (i / 12) * Math.PI * 2; return <mesh key={i} position={[Math.sin(a) * 0.48, Math.cos(a) * 0.48, 0.06]} rotation={[0, 0, -a]}><boxGeometry args={[0.025, i % 3 === 0 ? 0.1 : 0.05, 0.01]} /><meshBasicMaterial color="#2d3035" /></mesh>; })}
        <group rotation={[0, 0, hrA]}><mesh position={[0, 0.14, 0.07]}><boxGeometry args={[0.04, 0.3, 0.012]} /><meshBasicMaterial color="#1d1f22" /></mesh></group>
        <group rotation={[0, 0, minA]}><mesh position={[0, 0.2, 0.08]}><boxGeometry args={[0.028, 0.44, 0.012]} /><meshBasicMaterial color="#1d1f22" /></mesh></group>
        <mesh position={[0, 0, 0.09]}><circleGeometry args={[0.03, 16]} /><meshBasicMaterial color="#b3261e" /></mesh>
      </group>
      <mesh position={[0, 5.7, -1]} userData={{noShadow: true}}><boxGeometry args={[4.6, 0.08, 1.0]} /><meshStandardMaterial color="#ffffff" emissive="#eef4ff" emissiveIntensity={1.6 * flick * (1 - 0.7 * leave)} /></mesh>
      <pointLight position={[0, 4.6, 0]} intensity={38 * flick * (1 - 0.8 * leave)} color="#e4ecff" distance={18} decay={2} />
    </group>
  );
};

/* ------------------------------------------------------------------ PR: three plinths, two generics then a divider and ED Mints */
const PLINTH_X = [-2.3, -0.05, 2.5], PLINTH_Z = [0, 0.5, 0];
const Gallery: React.FC<SP> = ({tg, c, C, cam, ready}) => {
  const floor = useMemo(() => woodTex('#9a6e47', 11, [3, 2]), []), wall = useMemo(() => noiseTex('#efe3cc', 7, 0.08, [3, 2]), []);
  const stone = useMemo(() => noiseTex('#ece6dc', 5, 0.1), []), label = useMemo(() => labelTex(C.honey), [C.honey]);
  const cues = [c.sil, c.tad, c.mints];
  const div = ease((tg - c.mints + 0.15) / 0.8);
  return (
    <group position={PR}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[16, 12]} /><meshStandardMaterial map={floor} roughness={0.55} /></mesh>
      <mesh position={[0, 3.2, -3]}><boxGeometry args={[16, 6.4, 0.2]} /><meshStandardMaterial map={wall} roughness={0.92} /></mesh>
      <mesh position={[0, 0.07, -2.88]}><boxGeometry args={[16, 0.14, 0.05]} /><meshStandardMaterial color="#d8c9ae" roughness={0.6} /></mesh>
      {PLINTH_X.map((x, i) => {
        const up = ease((tg - cues[i] + 0.3) / 0.75), y = -1.35 * (1 - up), turn = tg * 0.32 + i * 1.7;
        const float = i === 2 ? appear(tg, c.mints + 0.2, 0.7) : 0;
        return (
          <group key={i} position={[x, y, PLINTH_Z[i]]}>
            <mesh position={[0, 0.55, 0]}><cylinderGeometry args={[0.72, 0.76, 1.1, 64]} /><meshStandardMaterial map={stone} roughness={0.32} /></mesh>
            <mesh position={[0, 1.115, 0]}><cylinderGeometry args={[0.76, 0.76, 0.03, 64]} /><meshStandardMaterial color={C.honeyDeep} metalness={0.7} roughness={0.3} /></mesh>
            <group position={[0, 1.13, 0]} rotation={[0, turn, 0]} scale={0.001 + up}>
              <Bottle kind={i === 2 ? 'square' : 'round'} label={label} seed={i * 40 + 3} />
              <Tablet kind={i === 2 ? 'square' : 'round'} p={[0.55, 0.035, 0.18]} r={[0, 0.4, 0]} />
              <Tablet kind={i === 2 ? 'square' : 'round'} p={[0.5, 0.035, -0.2]} r={[0, 1.1, 0.06]} />
            </group>
            {i === 2 && float > 0.01 && [0, 1, 2].map((k) => {
              const a = tg * 0.7 + (k * Math.PI * 2) / 3;
              return <Tablet key={k} kind="square" p={[Math.cos(a) * 0.95, 2.0 + Math.sin(tg * 1.3 + k) * 0.12, Math.sin(a) * 0.95]} r={[tg * 0.6 + k, tg * 0.9, 0.3]} s={2.1 * float} />;
            })}
          </group>
        );
      })}
      <mesh position={[1.22, -1.4 + 2.62 * div, 0]} userData={{noShadow: true}}><boxGeometry args={[0.05, 2.6, 2.2]} /><meshPhysicalMaterial {...GLASS} opacity={0.22} /></mesh>
      <mesh position={[1.22, -0.08 + 2.62 * div, 0]}><boxGeometry args={[0.07, 0.04, 2.2]} /><meshStandardMaterial color={C.honeyDeep} metalness={0.7} roughness={0.3} /></mesh>
      <Chip text="Sildenafil" at={[PLINTH_X[0], 2.78, 0.2]} cam={cam} s={appear(tg, c.sil)} ready={ready} />
      <Chip text="Tadalafil" at={[PLINTH_X[1], 2.78, 0.7]} cam={cam} s={appear(tg, c.tad)} ready={ready} />
      <Chip text="FDA-approved generic tablets" at={[(PLINTH_X[0] + PLINTH_X[1]) / 2, 3.55, 0.2]} cam={cam} s={appear(tg, c.fda)} color={C.ink} bg={C.honey} border={null} ready={ready} />
      <Chip text="ED Mints" at={[PLINTH_X[2], 2.95, 0.2]} cam={cam} s={appear(tg, c.mints)} ready={ready} />
      <Chip text="Compounded" at={[PLINTH_X[2], 3.6, 0.2]} cam={cam} s={appear(tg, c.comp)} color={C.ink} bg={C.cream} border={null} ready={ready} />
      <Chip text="Not FDA-approved" at={[PLINTH_X[2], 4.2, 0.2]} cam={cam} s={appear(tg, c.not)} color={C.ink} bg={C.cream} border={null} ready={ready} />
      <pointLight position={[0, 4.8, 2.2]} intensity={42} color="#ffd9a6" distance={16} decay={2} />
    </group>
  );
};

/* ------------------------------------------------------------------ PC: intake on a tablet, provider review at a desk, box closes */
const Desk: React.FC<SP> = ({tg, c, C, cam, ready}) => {
  const floor = useMemo(() => woodTex('#6e4d33', 23, [3, 2]), []), wall = useMemo(() => noiseTex('#e9dcc4', 9, 0.08, [3, 2]), []);
  const top = useMemo(() => woodTex('#5a3a24', 31, [1, 0.5]), []), form = useMemo(() => formTex(C.honey, ready), [C.honey, ready]);
  const lamp = ease((tg - c.lic) / 0.5), clip = ease((tg - c.lic - 0.1) / 0.8), mag = appear(tg, c.rev - 0.1, 0.5);
  const sweep = clamp((tg - c.rev) / Math.max(0.6, c.every - c.rev)), row = Math.min(4, Math.floor(sweep * 5));
  const magP: V3 = [0.65 + Math.sin(tg * 2.4) * 0.22, 1.72 + 0.04 * Math.sin(tg * 3), -0.32 + row * 0.16];
  return (
    <group position={PC}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[12, 12]} /><meshStandardMaterial map={floor} roughness={0.55} /></mesh>
      <mesh position={[0, 3.2, -3]}><boxGeometry args={[12, 6.4, 0.2]} /><meshStandardMaterial map={wall} roughness={0.92} /></mesh>
      <group position={[-2.6, 3.3, -2.88]}>
        <mesh><planeGeometry args={[2.3, 2.7]} /><meshStandardMaterial color="#fff2da" emissive="#ffe2b0" emissiveIntensity={1.15} /></mesh>
        {[[0, 1.38, 2.5, 0.09], [0, -1.38, 2.5, 0.09], [-1.2, 0, 0.09, 2.85], [1.2, 0, 0.09, 2.85], [0, 0, 0.06, 2.7], [0, 0, 2.3, 0.06]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, 0.04]}><boxGeometry args={[w, h, 0.08]} /><meshStandardMaterial color="#f3efe6" roughness={0.5} /></mesh>)}
      </group>
      <pointLight position={[-2.4, 3.3, -1.6]} intensity={30} color="#ffe2b8" distance={12} decay={2} />
      <mesh position={[0, 1.5, 0]}><boxGeometry args={[4.4, 0.1, 2.0]} /><meshStandardMaterial map={top} roughness={0.38} /></mesh>
      {[[-2.05, -0.85], [2.05, -0.85], [-2.05, 0.85], [2.05, 0.85]].map(([x, z], i) => <mesh key={i} position={[x, 0.73, z]}><boxGeometry args={[0.09, 1.45, 0.09]} /><meshStandardMaterial color="#3f2817" roughness={0.5} /></mesh>)}
      {/* tablet on a stand with the intake form; rows fill on "intake" */}
      <group position={[-1.2, 2.05, -0.3]} rotation={[-0.32, 0.22, 0]}>
        <mesh><primitive object={new RoundedBoxGeometry(1.56, 1.1, 0.06, 4, 0.05)} attach="geometry" /><meshStandardMaterial color="#25272c" metalness={0.6} roughness={0.3} /></mesh>
        <mesh position={[0, 0, 0.032]}><planeGeometry args={[1.42, 0.97]} /><meshStandardMaterial map={form} emissive="#ffffff" emissiveMap={form} emissiveIntensity={0.35 + 0.3 * ease((tg - c.online + 0.3) / 0.5)} roughness={0.2} /></mesh>
        {[0, 1, 2, 3].map((r) => {
          const f = ease((tg - c.intake - 0.05 - r * 0.28) / 0.35);
          return f > 0.01 ? <mesh key={r} position={[-0.6 + 0.6 * 1.25 * f, 0.17 - r * 0.161, 0.036]} scale={[f, 1, 1]}><planeGeometry args={[1.25, 0.05]} /><meshBasicMaterial color={C.honey} toneMapped={false} /></mesh> : null;
        })}
        <mesh position={[0, -0.6, -0.25]} rotation={[0.9, 0, 0]}><boxGeometry args={[0.5, 0.04, 0.6]} /><meshStandardMaterial color="#c9ccd1" metalness={0.85} roughness={0.25} /></mesh>
      </group>
      {/* brass desk lamp that switches on for the provider review */}
      <group position={[-0.15, 1.55, -0.72]}>
        <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.24, 0.27, 0.06, 32]} /><meshStandardMaterial color="#b08a4a" metalness={0.85} roughness={0.3} /></mesh>
        <mesh position={[0.1, 0.55, 0]} rotation={[0, 0, -0.35]}><cylinderGeometry args={[0.022, 0.022, 1.1, 10]} /><meshStandardMaterial color="#b08a4a" metalness={0.85} roughness={0.3} /></mesh>
        <mesh position={[0.45, 1.05, 0]} rotation={[0, 0, -1.2]}><cylinderGeometry args={[0.022, 0.022, 0.8, 10]} /><meshStandardMaterial color="#b08a4a" metalness={0.85} roughness={0.3} /></mesh>
        <group position={[0.82, 0.98, 0]} rotation={[0, 0, -0.5]}>
          <mesh><coneGeometry args={[0.24, 0.3, 32, 1, true]} /><meshStandardMaterial color="#1f3b34" metalness={0.4} roughness={0.4} side={THREE.DoubleSide} /></mesh>
          <mesh position={[0, -0.08, 0]}><sphereGeometry args={[0.07, 16, 16]} /><meshStandardMaterial color="#fff6e0" emissive="#ffd38a" emissiveIntensity={0.2 + 3 * lamp} /></mesh>
        </group>
        <pointLight position={[0.95, 0.75, 0]} intensity={14 * lamp} color="#ffcf8a" distance={5} decay={2} />
      </group>
      {/* clipboard with the history lines, slides in on "licensed"; magnifier reads it on "reviews" */}
      <group position={[0.7 + (1 - clip) * 3, 1.56, 0.1]} rotation={[0, -0.12, 0]}>
        {clip > 0.01 && <>
          <mesh><primitive object={new RoundedBoxGeometry(0.95, 0.025, 1.25, 3, 0.01)} attach="geometry" /><meshStandardMaterial color="#8a5a35" roughness={0.6} /></mesh>
          <mesh position={[0, 0.016, 0.04]}><boxGeometry args={[0.82, 0.004, 1.05]} /><meshStandardMaterial color="#fbfaf6" roughness={0.8} /></mesh>
          {Array.from({length: 6}, (_, r) => <mesh key={r} position={[-0.05 + (r % 2) * 0.04, 0.02, -0.33 + r * 0.16]}><boxGeometry args={[0.6 - (r % 3) * 0.1, 0.002, 0.03]} /><meshStandardMaterial color={r <= row && tg > c.rev ? C.honeyDeep : '#bdb8ae'} /></mesh>)}
          <mesh position={[0, 0.04, -0.58]}><boxGeometry args={[0.36, 0.05, 0.12]} /><meshStandardMaterial color="#c9ccd1" metalness={0.9} roughness={0.2} /></mesh>
        </>}
      </group>
      {mag > 0.01 && (
        <group position={magP} rotation={[-Math.PI / 2 + 0.25, 0, 0.5]} scale={mag}>
          <mesh><torusGeometry args={[0.22, 0.025, 14, 40]} /><meshStandardMaterial color="#b08a4a" metalness={0.9} roughness={0.25} /></mesh>
          <mesh userData={{noShadow: true}}><circleGeometry args={[0.21, 40]} /><meshPhysicalMaterial {...GLASS} opacity={0.18} /></mesh>
          <mesh position={[0, -0.4, 0]}><cylinderGeometry args={[0.03, 0.035, 0.38, 12]} /><meshStandardMaterial color="#2b1d12" roughness={0.5} /></mesh>
        </group>
      )}
      <Chip text="Online intake" at={[-1.1, 3.0, -0.1]} cam={cam} s={appear(tg, c.intake) * (1 - ease((tg - c.lic + 0.1) / 0.3))} ready={ready} />
      <Chip text="Licensed provider review" at={[0.4, 3.0, 0.2]} cam={cam} s={appear(tg, c.lic) * (1 - ease((tg - c.every + 0.2) / 0.3))} ready={ready} />
      <Chip text="Not right for everyone" at={[0.3, 3.05, 0.2]} cam={cam} s={appear(tg, c.every) * (1 - ease((tg - c.presc) / 0.3))} color={C.ink} bg={C.cream} border={null} ready={ready} />
      <pointLight position={[0.5, 4.6, 2.4]} intensity={26} color="#ffe0b5" distance={14} decay={2} />
    </group>
  );
};

/* ------------------------------------------------------------------ the plain shipping box (no logo, no text) */
const BOX_A: V3 = add(PC, [1.95, 1.55 + 0.29, 0.05]), BOX_B: V3 = add(DS, [0.45, 0.6 + 0.29, -1.25]);
/** Flight from the desk to the doormat: leaves on "ships", lands just after "door". The camera tracks it (see track below). */
const flyK = (tg: number, c: Cu) => ease((tg - c.ships) / Math.max(1.1, c.door - c.ships + 0.35));
const boxPos = (tg: number, c: Cu): V3 => { const f = flyK(tg, c), p = lerp3(BOX_A, BOX_B, f); p[1] += Math.sin(Math.PI * f) * 1.6; return p; };
const ShipBox: React.FC<{tg: number; c: Cu; kraft: THREE.Texture}> = ({tg, c, kraft}) => {
  const show = appear(tg, c.presc, 0.5); if (show <= 0.01) return null;
  const close = ease((tg - c.presc - 0.35) / 0.8), tape = ease((tg - c.presc - 1.05) / 0.3);
  const fly = flyK(tg, c), p = boxPos(tg, c);
  const land = tg > c.door ? Math.exp(-(tg - c.door) * 6) * Math.sin((tg - c.door) * 22) * 0.04 : 0;
  const fa = lerp(2.25, 0, close);
  return (
    <group position={[p[0], p[1] + land, p[2]]} rotation={[0, 0.35 - fly * 0.5 + Math.sin(Math.PI * fly) * 0.6, Math.sin(Math.PI * fly) * 0.12]} scale={show}>
      <mesh><boxGeometry args={[0.9, 0.58, 0.68]} /><meshStandardMaterial map={kraft} roughness={0.85} /></mesh>
      <group position={[0, 0.29, 0.34]} rotation={[fa, 0, 0]}><mesh position={[0, 0, -0.17]}><boxGeometry args={[0.9, 0.012, 0.34]} /><meshStandardMaterial map={kraft} roughness={0.85} /></mesh></group>
      <group position={[0, 0.29, -0.34]} rotation={[-fa, 0, 0]}><mesh position={[0, 0, 0.17]}><boxGeometry args={[0.9, 0.012, 0.34]} /><meshStandardMaterial map={kraft} roughness={0.85} /></mesh></group>
      {tape > 0.01 && <mesh position={[0, 0.3, 0]} scale={[tape, 1, 1]}><boxGeometry args={[0.92, 0.006, 0.13]} /><meshStandardMaterial color="#c9a46a" roughness={0.35} transparent opacity={0.9} /></mesh>}
      {tape > 0.5 && <mesh position={[0.24, 0.304, 0.2]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.28, 0.18]} /><meshStandardMaterial color="#f7f5ef" roughness={0.8} /></mesh>}
    </group>
  );
};

/* ------------------------------------------------------------------ DS: a front doorstep at golden hour */
const Doorstep: React.FC<SP> = ({tg, c, C, cam, ready}) => {
  const conc = useMemo(() => noiseTex('#b9b2a6', 13, 0.22, [2, 2]), []), lawn = useMemo(() => noiseTex('#5f7148', 17, 0.3, [6, 6]), []);
  const lantern = 0.6 + 0.4 * ease((tg - c.door + 0.6) / 0.8);
  return (
    <group position={DS}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[16, 14]} /><meshStandardMaterial map={lawn} roughness={0.95} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 2.6]}><planeGeometry args={[2.6, 6]} /><meshStandardMaterial map={conc} roughness={0.9} /></mesh>
      {Array.from({length: 26}, (_, i) => <mesh key={i} position={[0, 0.14 + i * 0.27, -2.62 + (i % 2) * 0.004]} rotation={[-0.05, 0, 0]}><boxGeometry args={[14, 0.29, 0.08]} /><meshStandardMaterial color={shade('#93a196', 0.97 + rnd(i) * 0.06)} roughness={0.75} /></mesh>)}
      <mesh position={[0, 0.3, -1.6]}><boxGeometry args={[3.2, 0.6, 1.9]} /><meshStandardMaterial map={conc} roughness={0.9} /></mesh>
      <mesh position={[0, 0.15, -0.35]}><boxGeometry args={[3.6, 0.3, 0.7]} /><meshStandardMaterial map={conc} roughness={0.9} /></mesh>
      <mesh position={[0.1, 0.615, -1.3]}><boxGeometry args={[1.7, 0.03, 0.95]} /><meshStandardMaterial color="#5b4430" roughness={1} /></mesh>
      {/* door, trim and brass knob */}
      {[[-1.0, 2.25, 0.16, 3.4], [1.0, 2.25, 0.16, 3.4], [0, 3.98, 2.16, 0.16]].map(([x, y, w, h], i) => <mesh key={i} position={[x, y, -2.5]}><boxGeometry args={[w, h, 0.16]} /><meshStandardMaterial color="#f1ede4" roughness={0.5} /></mesh>)}
      <mesh position={[0, 2.25, -2.52]}><boxGeometry args={[1.84, 3.3, 0.1]} /><meshStandardMaterial color="#2f403c" roughness={0.45} metalness={0.05} /></mesh>
      {[[-0.4, 3.0], [0.4, 3.0], [-0.4, 1.6], [0.4, 1.6]].map(([x, y], i) => <mesh key={i} position={[x, y, -2.455]}><boxGeometry args={[0.6, i < 2 ? 1.0 : 1.3, 0.035]} /><meshStandardMaterial color="#344844" roughness={0.42} metalness={0.05} /></mesh>)}
      <mesh position={[0.68, 2.15, -2.4]}><sphereGeometry args={[0.07, 20, 20]} /><meshStandardMaterial color="#c49a4c" metalness={0.95} roughness={0.2} /></mesh>
      {/* wall lantern */}
      <group position={[1.45, 2.95, -2.45]}>
        <mesh><boxGeometry args={[0.26, 0.42, 0.22]} /><meshStandardMaterial color="#fff1cf" emissive="#ffc46b" emissiveIntensity={1.6 * lantern} transparent opacity={0.9} /></mesh>
        <mesh position={[0, 0.25, 0]}><boxGeometry args={[0.32, 0.06, 0.28]} /><meshStandardMaterial color="#1e1e20" metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[0, -0.24, 0]}><boxGeometry args={[0.3, 0.05, 0.26]} /><meshStandardMaterial color="#1e1e20" metalness={0.5} roughness={0.4} /></mesh>
        <pointLight position={[0, 0, 0.4]} intensity={9 * lantern} color="#ffc778" distance={6} decay={2} />
      </group>
      {/* potted plant */}
      <group position={[-2.35, 0, -0.9]}>
        <mesh position={[0, 0.35, 0]}><cylinderGeometry args={[0.36, 0.26, 0.7, 32]} /><meshStandardMaterial color="#b0603c" roughness={0.85} /></mesh>
        {Array.from({length: 14}, (_, i) => { const a = i * 2.4, tilt = 0.35 + rnd(i) * 0.5; return <mesh key={i} position={[Math.cos(a) * 0.12, 1.05 + rnd(i * 3) * 0.25, Math.sin(a) * 0.12]} rotation={[Math.sin(a) * tilt, a, Math.cos(a) * tilt]} scale={[0.14, 0.62, 0.05]}><sphereGeometry args={[1, 14, 10]} /><meshStandardMaterial color={shade('#4c6a40', 0.85 + rnd(i * 7) * 0.3)} roughness={0.7} /></mesh>; })}
      </group>
      <Chip text="Private." at={[0.2, 4.68, -0.4]} cam={cam} s={appear(tg, c.priv)} ready={ready} />
      <Chip text="Online." at={[0.2, 4.1, -0.4]} cam={cam} s={appear(tg, c.online2)} ready={ready} />
      <Chip text="Provider-reviewed." at={[0.2, 3.52, -0.4]} cam={cam} s={appear(tg, c.prov)} color={C.ink} bg={C.honey} border={null} ready={ready} />
    </group>
  );
};

/** Turns on cast/receive shadows for every solid mesh after each commit (glass and text chips do not cast). A changed flag
 *  recompiles that material, so the very first rendered frame (a still, frame 0) already has its shadows. */
const Shadowed: React.FC<{children: React.ReactNode}> = ({children}) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    ref.current?.traverse((o) => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      const mat = m.material as THREE.MeshStandardMaterial;
      const cast = !(m.userData.noShadow || (mat.transparent && (mat.map || mat.opacity < 0.6)));
      if (m.castShadow !== cast || !m.receiveShadow) { m.castShadow = cast; m.receiveShadow = true; mat.needsUpdate = true; }
    });
  });
  return <group ref={ref}>{children}</group>;
};

/* ------------------------------------------------------------------ rig: camera, image-based reflections, soft shadows */
const Rig: React.FC<{pos: V3; look: V3; dy: number; W: number; H: number; sunColor: THREE.Color}> = ({pos, look, dy, W, H, sunColor}) => {
  const {camera, gl, scene} = useThree(); const c = camera as THREE.PerspectiveCamera;
  const env = useMemo(() => { const pm = new THREE.PMREMGenerator(gl); const t = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); return t; }, [gl]);
  const target = useMemo(() => new THREE.Object3D(), []);
  scene.environment = env; scene.environmentIntensity = 0.32; gl.toneMappingExposure = 0.92;
  c.position.set(...pos); c.lookAt(...look); c.setViewOffset(W, H, 0, dy, W, H); c.updateProjectionMatrix(); c.updateMatrixWorld();
  target.position.set(...look);
  return (
    <>
      <primitive object={target} />
      <directionalLight position={[look[0] - 5, look[1] + 9, look[2] + 6]} target={target} intensity={2.8} color={sunColor} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02} shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-near={0.5} shadow-camera-far={30} shadow-radius={6} />
    </>
  );
};

export const EdCareWorld: React.FC<{w: number; h: number; dy: number; tg: number; words: Word[]; C: Record<string, string>}> = ({w, h, dy, tg, words, C}) => {
  const ready = useFontReady();
  const c = useMemo(() => cuesOf(words), [words]);
  const keys = useMemo(() => keysOf(c), [c]);
  const kraft = useMemo(() => noiseTex('#b58b5c', 29, 0.18), []);
  const cam0 = camAt(keys, tg);
  const track = clamp((tg - c.ships + 0.15) / 0.3) * (1 - clamp((tg - c.door - 0.6) / 0.6));   // follow the box while it flies
  const bp = boxPos(tg, c), look = lerp3(cam0.look, [bp[0], bp[1] + 0.4, bp[2]], track * (1 - flyK(tg, c) * 0.6));
  const pos: V3 = [cam0.pos[0] + (look[0] - cam0.look[0]), cam0.pos[1] + (look[1] - cam0.look[1]), cam0.pos[2] + (look[2] - cam0.look[2])];
  const coolK = clamp((look[0] - WR[0] - 4) / 10);              // cool clinic light in the waiting room, warm everywhere else
  const sun = useMemo(() => new THREE.Color(), []); sun.set('#dfe8ff').lerp(new THREE.Color('#ffd7a3'), coolK);
  const bg = useMemo(() => new THREE.Color(), []); bg.set('#20252b').lerp(new THREE.Color('#2a211a'), coolK);
  const sp = {tg, c, C, cam: Math.atan2(pos[0] - look[0], pos[2] - look[2]), ready};
  return (
    <ThreeCanvas width={Math.round(w)} height={Math.round(h)} shadows camera={{fov: 50, position: [0, 4, 12], near: 0.1, far: 120}} gl={{antialias: true, alpha: false}}>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, 13, 30]} />
      <Rig pos={pos} look={look} dy={dy} W={Math.round(w)} H={Math.round(h)} sunColor={sun} />
      <hemisphereLight args={['#fff1dc', '#3b2c20', 0.32]} />
      <Shadowed>
        <WaitingRoom {...sp} />
        <Gallery {...sp} />
        <Desk {...sp} />
        <ShipBox tg={tg} c={c} kraft={kraft} />
        <Doorstep {...sp} />
      </Shadowed>
    </ThreeCanvas>
  );
};
