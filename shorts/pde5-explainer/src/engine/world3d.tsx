import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Txt, useFontReady} from './stage3d';
import {Word, clamp, eob} from './ui';

/**
 * A continuous 3D WORLD, not a flat card. One scene spans the whole video; the CAMERA flies through it on a path keyed to the
 * spoken words (orbits the ring, dollies in, rises above, drops low), objects have real depth (glass, stacked solids, spinning
 * chains) and parallax against each other, and every object appears on the word that names it.
 *
 * This file is the "peptide safety" world: five glass pillars (the amount of human safety data for each peptide), people dropping in,
 * a certainty ring, a syringe at an injection site, a vial with three hazards orbiting it, and a 911 sign in layered depth.
 * Everything is an ILLUSTRATION. Cues are spoken-word times; nothing is timed by guesswork.
 */
type V3 = [number, number, number];
const ease = (x: number) => { const c = clamp(x); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const norm = (w: string) => w.toLowerCase().replace(/[^a-z0-9'-]/g, '');
const UP = new THREE.Vector3(0, 1, 0);

/** Time a word or phrase ("very low", "bpc-157#2" = second occurrence) is spoken, over the whole video. NaN if absent. */
export const wcue = (words: Word[], key: string): number => {
  const [phrase, nth] = key.split('#'); const parts = phrase.toLowerCase().split(' '); const n = nth ? parseInt(nth, 10) : 1;
  const ws = words.map((w) => ({t: w.t0, n: norm(w.w)})); let c = 0;
  for (let i = 0; i < ws.length; i++) if (parts.every((p, j) => ws[i + j] && ws[i + j].n === p)) { c++; if (c === n) return ws[i].t; }
  return NaN;
};

const KEYS: Record<string, string> = {
  five: 'five', bpc1: 'bpc-157#1', tb1: 'tb-500#1', ghk: 'ghk-cu#1', mots1: 'mots-c#1', ser1: 'sermorelin#1', pillar: 'pillar', height: 'height',
  bpc2: 'bpc-157#2', three: 'three', thirty: 'thirty', vlow: 'very low', tb2: 'tb-500#2', mots2: 'mots-c#2', nohuman: 'no human',
  ser2: 'sermorelin#2', history: 'history', medical: 'medical', sore: 'sore', injectable: 'injectable', impur: 'impurities', immune: 'immune', infect: 'infection',
  nodata: 'no data', risk: 'risk', breath: 'breathing', swollen: 'swollen', n911: '911',
};
type Cu = Record<string, number>;
const cuesOf = (words: Word[]): Cu => {
  const out: Cu = {}; let prev = 0.3;
  for (const [k, v] of Object.entries(KEYS)) { let t = wcue(words, v); if (!Number.isFinite(t)) t = prev + 0.6; out[k] = Math.max(t, prev + 0.05); prev = out[k]; }
  return out;
};

const R = 3.6, N = 5, NAMES = ['BPC-157', 'TB-500', 'GHK-Cu', 'MOTS-C', 'Sermorelin'], CUBES = [3, 0, 2, 0, 12], TUBE = 6;
const th = (i: number) => (i * Math.PI * 2) / N;
const pp = (i: number): V3 => [R * Math.sin(th(i)), 0, R * Math.cos(th(i))];

/* ------------------------------------------------------------------ camera path (keyframes on spoken words) */
type Key = {t: number; az: number; el: number; d: number; look: V3};
const focus = (i: number, d: number, el: number, y: number, lap = 0, off = 0.35): Omit<Key, 't'> => { const p = pp(i); return {az: th(i) + off + lap * Math.PI * 2, el, d, look: [p[0] * 0.9, y, p[2] * 0.9]}; };
const keysOf = (c: Cu): Key[] => {
  const k: Key[] = [
    {t: 0, az: 0.2, el: 0.4, d: 21, look: [0, 4.6, 0]},
    {t: c.five, az: 0.5, el: 0.36, d: 19, look: [0, 4.2, 0]},
    {t: c.bpc1, ...focus(0, 7.2, 0.28, 6.4)},
    {t: c.tb1, ...focus(1, 7.2, 0.28, 6.4)},
    {t: c.ghk, ...focus(2, 7.2, 0.28, 6.4)},
    {t: c.mots1, ...focus(3, 7.2, 0.28, 6.4)},
    {t: c.ser1, ...focus(4, 7.2, 0.28, 6.4)},
    {t: c.height, az: th(4) + 1.2, el: 0.04, d: 12, look: [0, 3.3, 0]},
    {t: c.bpc2, ...focus(0, 7.5, 0.22, 2.2, 1)},
    {t: c.three, ...focus(0, 5.2, 0.3, 1.6, 1, 0.6)},
    {t: c.thirty, ...focus(0, 6.2, 0.75, 0.6, 1, 0.95)},
    {t: c.vlow, ...focus(0, 8.6, 0.2, 3.2, 1, 1.3)},
    {t: c.tb2, ...focus(1, 7.2, 0.22, 3, 1)},
    {t: c.mots2, ...focus(3, 7.2, 0.22, 3, 1)},
    {t: c.ser2, ...focus(4, 8.6, 0.16, 3.4, 1, 0.5)},
    {t: c.history, az: th(4) + 2 * Math.PI + 1.4, el: 0.12, d: 12.5, look: [0, 3.4, 0]},
    {t: c.medical, az: 13.1, el: 0.3, d: 7.6, look: [0, 1.7, 0]},
    {t: c.sore, az: 14.0, el: 0.26, d: 4.6, look: [0.1, 0.45, 0]},
    {t: c.injectable, az: 15.0, el: 0.32, d: 6.4, look: [0, 1.2, 0]},
    {t: c.impur, az: 15.9, el: 0.2, d: 5.4, look: [0, 1.3, 0]},
    {t: c.immune, az: 17.0, el: 0.36, d: 5.4, look: [0, 1.3, 0]},
    {t: c.infect, az: 18.1, el: 0.22, d: 5.0, look: [0, 1.3, 0]},
    {t: c.nodata, az: 19.0, el: 0.62, d: 15, look: [0, 2.6, 0]},
    {t: c.risk, az: 19.7, el: 0.36, d: 11.5, look: [0, 3, 0]},
    {t: c.breath, az: 20.4, el: 0.2, d: 6.6, look: [0, 1.3, 0]},
    {t: c.n911, az: 21.0, el: 0.08, d: 4.8, look: [0, 1.7, 0]},
    {t: c.n911 + 8, az: 22.2, el: 0.14, d: 4.4, look: [0, 1.7, 0]},
  ];
  for (let i = 1; i < k.length; i++) k[i].t = Math.max(k[i].t, k[i - 1].t + 0.35);
  return k;
};
const camAt = (keys: Key[], tg: number) => {
  let i = 0; while (i < keys.length - 2 && tg >= keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1], k = ease((tg - a.t) / Math.max(0.3, Math.min(1.4, b.t - a.t)));   // move during the first ~1.4 s, then drift
  const az = lerp(a.az, b.az, k) + Math.sin(tg * 0.5) * 0.04, el = lerp(a.el, b.el, k), d = lerp(a.d, b.d, k) * 1.18;
  const look: V3 = [lerp(a.look[0], b.look[0], k), lerp(a.look[1], b.look[1], k), lerp(a.look[2], b.look[2], k)];
  const pos: V3 = [look[0] + d * Math.cos(el) * Math.sin(az), look[1] + d * Math.sin(el), look[2] + d * Math.cos(el) * Math.cos(az)];
  return {pos, look};
};
const Rig: React.FC<{pos: V3; look: V3; dy: number; W: number; H: number}> = ({pos, look, dy, W, H}) => {
  const {camera} = useThree(); const c = camera as THREE.PerspectiveCamera;
  c.position.set(...pos); c.lookAt(...look); c.setViewOffset(W, H, 0, dy, W, H); c.updateProjectionMatrix(); c.updateMatrixWorld();
  return null;
};

/* ------------------------------------------------------------------ pieces */
const Bead: React.FC<{p: V3; r: number; color: string; glow?: number; s?: number}> = ({p, r, color, glow = 0.15, s = 1}) => (
  <mesh position={p} scale={s}><sphereGeometry args={[r, 20, 20]} /><meshStandardMaterial color={color} metalness={0.25} roughness={0.28} emissive={color} emissiveIntensity={glow} /></mesh>
);
const Rod: React.FC<{a: V3; b: V3; r: number; color: string}> = ({a, b, r, color}) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), dir = B.clone().sub(A), len = dir.length();
  return <mesh position={A.clone().add(B).multiplyScalar(0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize())} scale={[1, len, 1]}><cylinderGeometry args={[r, r, 1, 8]} /><meshStandardMaterial color={color} metalness={0.2} roughness={0.5} /></mesh>;
};
const Chain: React.FC<{n: number; r: number; C: Record<string, string>; glow: number; spin: number}> = ({n, r, C, glow, spin}) => {
  const pts = Array.from({length: n}, (_, i): V3 => [Math.cos(i * 0.85) * r, (i - (n - 1) / 2) * 0.2, Math.sin(i * 0.85) * r]);
  return (
    <group rotation={[0, spin, 0]}>
      {pts.map((p, i) => <Bead key={i} p={p} r={0.12} color={i % 3 === 0 ? C.honeyLight : C.honey} glow={0.2 + glow * 0.9} />)}
      {pts.slice(0, -1).map((p, i) => <Rod key={'r' + i} a={p} b={pts[i + 1]} r={0.03} color={C.honeyDeep} />)}
    </group>
  );
};
const Bill: React.FC<{text: string; at: V3; cam: V3; w?: number; h?: number; s?: number; o?: number; color?: string; bg?: string; ready: boolean}> = ({text, at, cam, w, h = 0.62, s = 1, o = 1, color = '#fff', bg = 'rgba(8,16,22,.82)', ready}) => {
  const yaw = Math.atan2(cam[0] - at[0], cam[2] - at[2]);
  const ww = w ?? Math.min(4.6, 0.19 * text.length + 0.8);
  return <group position={at} rotation={[0, yaw, 0]}><Txt text={text} w={ww} h={h} s={s} o={o} color={color} bg={bg} border="#ffffff55" ready={ready} radius={0.3} /></group>;
};
const QMark: React.FC<{C: Record<string, string>; spin: number; s: number}> = ({C, spin, s}) => (
  <group rotation={[0, spin, 0]} scale={s}>
    <mesh position={[0, 0.55, 0]} rotation={[0, 0, -0.5]}><torusGeometry args={[0.45, 0.14, 18, 40, Math.PI * 1.55]} /><meshStandardMaterial color={C.honeyLight} emissive={C.honey} emissiveIntensity={0.7} roughness={0.3} /></mesh>
    <mesh position={[0.05, -0.1, 0]}><cylinderGeometry args={[0.13, 0.13, 0.4, 16]} /><meshStandardMaterial color={C.honeyLight} emissive={C.honey} emissiveIntensity={0.7} /></mesh>
    <mesh position={[0.05, -0.55, 0]}><sphereGeometry args={[0.17, 20, 20]} /><meshStandardMaterial color={C.honeyLight} emissive={C.honey} emissiveIntensity={0.7} /></mesh>
  </group>
);

type SP = {tg: number; c: Cu; C: Record<string, string>; cam: V3; ready: boolean};

const Pillar: React.FC<SP & {i: number; vis: number}> = ({i, vis, tg, c, C, cam, ready}) => {
  const p = pp(i), nameT = [c.bpc1, c.tb1, c.ghk, c.mots1, c.ser1][i];
  const named = tg >= nameT ? Math.exp(-(tg - nameT) / 2.2) : 0;
  const pop = eob((tg - nameT) / 0.5);
  const y0 = -17 * (1 - vis);
  const fillT = c.height + 0.2;
  const people = i === 0 ? Array.from({length: 30}, (_, k) => k) : [];
  const certK = ease((tg - c.vlow) / 1.2);
  const chipAt: V3 = [0, TUBE + 3.3, 0];
  return (
    <group position={[p[0], y0, p[2]]}>
      <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[1.05, 1.15, 0.14, 40]} /><meshStandardMaterial color={C.honeyDeep} emissive={C.honey} emissiveIntensity={0.15 + named * 0.6} metalness={0.4} roughness={0.35} /></mesh>
      <mesh position={[0, TUBE / 2 + 0.14, 0]}><cylinderGeometry args={[0.72, 0.72, TUBE, 40, 1, true]} /><meshPhysicalMaterial color="#cfeeff" transparent opacity={0.16 + 0.1 * named} roughness={0.05} clearcoat={1} side={THREE.DoubleSide} depthWrite={false} /></mesh>
      <mesh position={[0, TUBE + 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.72, 0.035, 10, 48]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.5 + named} /></mesh>
      {Array.from({length: CUBES[i]}, (_, k) => {
        const drop = ease((tg - fillT - k * 0.11) / 0.45), pulse = i === 0 ? 1 + 0.25 * Math.max(0, Math.sin(clamp((tg - c.three - k * 0.18) / 0.6) * Math.PI)) : 1;
        if (drop <= 0.01) return null;
        return (
          <mesh key={k} position={[0, 0.14 + 0.26 + k * 0.46 + (1 - drop) * 3.5, 0]} rotation={[0, k * 0.5 + (1 - drop) * 2, 0]} scale={drop * pulse}>
            <boxGeometry args={[0.8, 0.4, 0.8]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.3 + (pulse - 1) * 2} roughness={0.35} metalness={0.2} />
          </mesh>
        );
      })}
      {(i === 1 || i === 3) && tg >= c.nohuman && <group position={[0, 3.1, 0]}><QMark C={C} spin={tg * 1.6 + i} s={eob((tg - c.nohuman) / 0.5) * 1.5} /></group>}
      <group position={[0, TUBE + 1.05, 0]} scale={Math.max(0.001, vis) * (0.55 + 0.45 * pop) * (1 + named * 0.35)}><Chain n={11} r={0.4} C={C} glow={named} spin={tg * 1.2 + i} /></group>
      <Bill text={NAMES[i]} at={[0, TUBE + 2.25, 0]} cam={cam} s={0.001 + eob((tg - nameT + 0.05) / 0.4)} o={vis} color={named > 0.2 ? C.honeyLight : '#fff'} ready={ready} />
      {people.map((k) => {
        const l = clamp((tg - (c.thirty + k * 0.09)) / 0.55); if (l <= 0) return null;
        const cl = k % 3, a = (cl - 1) * 0.95, rr = 0.6 * Math.sqrt(((k / 3) | 0) / 10 + 0.12) * 1.8;
        const x = Math.sin(a) * 2.7 + Math.cos(k * 2.4) * rr * 0.7, zz = Math.cos(a) * 2.7 + Math.sin(k * 2.4) * rr * 0.7;
        return (
          <group key={k} position={[x, 0.3 + (1 - eob(l)) * 5, zz]} scale={1.7}>
            <mesh><capsuleGeometry args={[0.1, 0.2, 6, 12]} /><meshStandardMaterial color={C.cream} roughness={0.4} emissive={C.cream} emissiveIntensity={0.12} /></mesh>
            <mesh position={[0, 0.3, 0]}><sphereGeometry args={[0.11, 14, 14]} /><meshStandardMaterial color={C.cream} roughness={0.4} emissive={C.cream} emissiveIntensity={0.12} /></mesh>
          </group>
        );
      })}
      {i === 0 && tg >= c.three && (
        <group position={[0, 3.4, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={lerp(2.4, 1.05, certK)}><torusGeometry args={[1, 0.07, 14, 64]} /><meshStandardMaterial color={certK > 0.5 ? '#ff6b5e' : C.honeyLight} emissive={certK > 0.5 ? '#ff3b2e' : C.honey} emissiveIntensity={0.8} transparent opacity={eob((tg - c.three) / 0.5)} /></mesh>
          <mesh rotation={[Math.PI / 2, tg, 0]} scale={lerp(2.4, 1.05, certK) * 0.7}><torusGeometry args={[1, 0.025, 8, 48, Math.PI * 1.2]} /><meshBasicMaterial color={C.cream} transparent opacity={0.6} /></mesh>
        </group>
      )}
      {i === 0 && tg >= c.three - 0.1 && <Bill text="3 small studies" at={chipAt} cam={cam} s={eob((tg - c.three) / 0.4) * (1 - ease((tg - c.thirty) / 0.4))} ready={ready} />}
      {i === 0 && tg >= c.thirty && <Bill text="30 people in total" at={chipAt} cam={cam} s={eob((tg - c.thirty) / 0.4) * (1 - ease((tg - c.vlow) / 0.4))} ready={ready} />}
      {i === 0 && tg >= c.vlow && <Bill text="Very low certainty" at={chipAt} cam={cam} s={eob((tg - c.vlow) / 0.4)} color="#ffb4aa" ready={ready} />}
      {(i === 1 || i === 3) && tg >= c.nohuman && <Bill text="No human data found" at={chipAt} cam={cam} s={eob((tg - c.nohuman - (i === 3 ? 0.35 : 0)) / 0.4)} color="#ffb4aa" ready={ready} />}
      {i === 4 && tg >= c.history && <Bill text="Has a history of human use" at={chipAt} cam={cam} s={eob((tg - c.history) / 0.4) * (1 - ease((tg - c.medical - 0.3) / 0.4))} ready={ready} />}
    </group>
  );
};

const Injection: React.FC<SP & {vis: number}> = ({tg, c, C, cam, ready, vis}) => {
  if (vis <= 0.01) return null;
  const drop = ease((tg - c.medical - 0.3) / 1.4), push = ease((tg - c.sore + 0.5) / 1.8), sore = clamp((tg - c.sore) / 0.6);
  const pulse = 1 + 0.12 * Math.sin(tg * 6) * sore;
  return (
    <group scale={vis}>
      <mesh position={[0, -0.28, 0]}><boxGeometry args={[3.6, 0.56, 2.6]} /><meshStandardMaterial color="#f0b8a0" roughness={0.65} /></mesh>
      <mesh position={[0, 0.02, 0]} scale={[1.15 * pulse * (0.4 + 0.6 * sore), 0.32, 1.0 * pulse * (0.4 + 0.6 * sore)]}><sphereGeometry args={[0.55, 28, 20]} /><meshStandardMaterial color="#e5484d" emissive="#ff3b2e" emissiveIntensity={0.15 + 0.7 * sore} roughness={0.5} transparent opacity={0.5 + 0.5 * sore} /></mesh>
      {sore > 0 && [0, 1].map((k) => { const q = ((tg - c.sore) * 0.7 + k * 0.5) % 1; return <mesh key={k} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.5 + q * 2.2}><ringGeometry args={[0.92, 1, 40]} /><meshBasicMaterial color="#ff6b5e" transparent opacity={(1 - q) * 0.6} side={THREE.DoubleSide} /></mesh>; })}
      <group position={[0, 0.06 + (1 - drop) * 3.2, 0]} rotation={[0, tg * 0.45, 0.32]}>
        <mesh position={[0, 0.6, 0]}><cylinderGeometry args={[0.03, 0.03, 1.2, 10]} /><meshStandardMaterial color="#d8dde3" metalness={0.9} roughness={0.2} /></mesh>
        <mesh position={[0, 1.3, 0]}><cylinderGeometry args={[0.18, 0.06, 0.3, 16]} /><meshStandardMaterial color="#b7dff0" transparent opacity={0.8} /></mesh>
        <mesh position={[0, 2.5, 0]}><cylinderGeometry args={[0.32, 0.32, 2.1, 28, 1, true]} /><meshPhysicalMaterial color="#e3f6ff" transparent opacity={0.28} clearcoat={1} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh position={[0, 1.6 + (1.0 - 0.9 * push) * 0.5, 0]} scale={[1, 1 - 0.85 * push + 0.15, 1]}><cylinderGeometry args={[0.26, 0.26, 1.0, 24]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.35} transparent opacity={0.9} /></mesh>
        <mesh position={[0, 3.15 - push * 0.8, 0]}><cylinderGeometry args={[0.07, 0.07, 1.2, 12]} /><meshStandardMaterial color="#e8e8ee" /></mesh>
        <mesh position={[0, 3.8 - push * 0.8, 0]}><cylinderGeometry args={[0.4, 0.4, 0.08, 24]} /><meshStandardMaterial color="#e8e8ee" /></mesh>
        <mesh position={[0, 3.55, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.34, 0.03, 8, 28]} /><meshStandardMaterial color="#e8e8ee" /></mesh>
      </group>
      <Bill text="Sore, red injection site" at={[0, 2.9, 0]} cam={cam} s={eob((tg - c.sore) / 0.4)} color="#ffd0ca" ready={ready} />
    </group>
  );
};

const Hazard: React.FC<{kind: 'imp' | 'imm' | 'inf'; t0: number; tg: number; ph: number; cam: V3; ready: boolean; label: string}> = ({kind, t0, tg, ph, cam, ready, label}) => {
  const spikes = useMemo(() => Array.from({length: 16}, (_, i) => { const yv = 1 - (i / 15) * 2, r = Math.sqrt(1 - yv * yv), g = i * 2.399963; return new THREE.Vector3(Math.cos(g) * r, yv, Math.sin(g) * r); }), []);
  const k = eob((tg - t0) / 0.55); if (k <= 0.01) return null;
  const a = tg * 0.9 + ph, rad = 2.5, y = 1.2 + Math.sin(tg * 1.7 + ph) * 0.5;
  const at: V3 = [Math.cos(a) * rad, y, Math.sin(a) * rad];
  return (
    <group position={at} scale={k}>
      <group rotation={[tg * 0.8, tg * 1.1, 0]}>
        {kind === 'imp' && Array.from({length: 7}, (_, i) => <mesh key={i} position={[Math.cos(i * 2.1) * 0.34, Math.sin(i * 1.7) * 0.3, Math.sin(i * 2.9) * 0.3]} rotation={[i, i * 2, 0]}><dodecahedronGeometry args={[0.15 + (i % 3) * 0.04, 0]} /><meshStandardMaterial color="#9a5b44" roughness={0.9} flatShading /></mesh>)}
        {kind === 'imm' && (
          <>
            <mesh><sphereGeometry args={[0.36, 20, 20]} /><meshStandardMaterial color="#ffa733" emissive="#ff8a00" emissiveIntensity={0.5} roughness={0.4} /></mesh>
            {spikes.map((d, i) => <mesh key={i} position={d.clone().multiplyScalar(0.5)} quaternion={new THREE.Quaternion().setFromUnitVectors(UP, d)}><coneGeometry args={[0.065, 0.26, 8]} /><meshStandardMaterial color="#ffcc66" emissive="#ff8a00" emissiveIntensity={0.4} /></mesh>)}
          </>
        )}
        {kind === 'inf' && [0, 1, 2].map((i) => <mesh key={i} position={[(i - 1) * 0.3, (i % 2) * 0.2 - 0.1, 0]} rotation={[0, 0, 0.5 * i + 0.3]}><capsuleGeometry args={[0.09, 0.34, 6, 12]} /><meshStandardMaterial color="#e5484d" emissive="#c01020" emissiveIntensity={0.45} roughness={0.5} /></mesh>)}
      </group>
      <Bill text={label} at={[0, 0.95, 0]} cam={[cam[0] - at[0], cam[1], cam[2] - at[2]]} s={0.9} ready={ready} />
    </group>
  );
};
const Vial: React.FC<SP & {vis: number}> = ({vis, tg, c, C, cam, ready}) => {
  if (vis <= 0.01) return null;
  return (
    <group scale={vis}>
      <group position={[0, 1.2, 0]} rotation={[0, tg * 0.6, 0]}>
        <mesh><cylinderGeometry args={[0.8, 0.8, 1.7, 36, 1, true]} /><meshPhysicalMaterial color="#e3f6ff" transparent opacity={0.28} clearcoat={1} roughness={0.05} side={THREE.DoubleSide} depthWrite={false} /></mesh>
        <mesh position={[0, -0.28, 0]}><cylinderGeometry args={[0.72, 0.72, 1.12, 32]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.3} transparent opacity={0.8} /></mesh>
        <mesh position={[0, 1.0, 0]}><cylinderGeometry args={[0.38, 0.5, 0.35, 28]} /><meshPhysicalMaterial color="#e3f6ff" transparent opacity={0.4} /></mesh>
        <mesh position={[0, 1.28, 0]}><cylinderGeometry args={[0.46, 0.46, 0.22, 28]} /><meshStandardMaterial color="#2a2d34" roughness={0.6} /></mesh>
        <mesh position={[0, 1.15, 0]}><cylinderGeometry args={[0.5, 0.5, 0.1, 28]} /><meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.25} /></mesh>
        {tg >= c.impur && Array.from({length: 8}, (_, i) => <mesh key={i} position={[Math.cos(i * 2.2) * 0.45, -0.7 + ((tg * 0.25 + i * 0.13) % 1) * 1.1, Math.sin(i * 1.3) * 0.45]}><dodecahedronGeometry args={[0.07, 0]} /><meshStandardMaterial color="#7a4b3a" flatShading /></mesh>)}
      </group>
      <Hazard kind="imp" t0={c.impur} ph={0} tg={tg} cam={cam} ready={ready} label="Impurities" />
      <Hazard kind="imm" t0={c.immune} ph={2.1} tg={tg} cam={cam} ready={ready} label="Immune reaction" />
      <Hazard kind="inf" t0={c.infect} ph={4.2} tg={tg} cam={cam} ready={ready} label="Infection" />
    </group>
  );
};

const Sign911: React.FC<SP> = ({tg, c, ready, cam}) => {
  const k = eob((tg - c.n911) / 0.6); if (k <= 0.01) return null;
  return (
    <group position={[0, 1.75, 0]} rotation={[0, Math.atan2(cam[0], cam[2]) + Math.sin(tg * 1.3) * 0.55, 0]} scale={k}>
      {Array.from({length: 7}, (_, i) => <Txt key={i} text="911" w={3.2} h={1.5} pos={[0, 0, -i * 0.07]} color={i === 0 ? '#ffffff' : '#b3261e'} bg={null} ready={ready} />)}
      {[0, 1, 2].map((i) => { const q = ((tg - c.n911) * 0.8 + i / 3) % 1; return <mesh key={i} position={[0, 0, -0.2]} scale={1.2 + q * 3.6}><torusGeometry args={[1, 0.03, 10, 64]} /><meshBasicMaterial color="#ff4b3e" transparent opacity={(1 - q) * 0.7} /></mesh>; })}
    </group>
  );
};

const Stars: React.FC<{color: string}> = ({color}) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(), a: number[] = [];
    for (let i = 0; i < 420; i++) { const r = 22 + ((i * 37) % 17), u = (((i * 97) % 360) * Math.PI) / 180, v = Math.acos(1 - ((i * 53) % 100) / 60 - 0.05); a.push(r * Math.sin(v) * Math.cos(u), r * Math.cos(v) * 0.8 + 6, r * Math.sin(v) * Math.sin(u)); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return g;
  }, []);
  return <points geometry={geo}><pointsMaterial color={color} size={0.14} sizeAttenuation transparent opacity={0.7} /></points>;
};

export const PeptideWorld: React.FC<{w: number; h: number; dy: number; tg: number; words: Word[]; C: Record<string, string>}> = ({w, h, dy, tg, words, C}) => {
  const ready = useFontReady();
  const c = useMemo(() => cuesOf(words), [words]);
  const keys = useMemo(() => keysOf(c), [c]);
  const {pos, look} = camAt(keys, tg);
  const sinkA = ease((tg - c.medical) / 1.0), riseB = ease((tg - c.nodata) / 1.2), sinkB = ease((tg - c.breath) / 1.0);
  const vis = (i: number) => ease((tg - 0.15 - i * 0.2) / 1.4) * (1 - sinkA * (1 - riseB)) * (1 - sinkB);
  const injVis = ease((tg - c.medical - 0.2) / 0.8) * (1 - ease((tg - c.injectable + 0.1) / 0.6));
  const vialVis = ease((tg - c.injectable) / 0.8) * (1 - ease((tg - c.nodata + 0.4) / 0.8));
  const sp = {tg, c, C, cam: pos, ready};
  return (
    <ThreeCanvas width={Math.round(w)} height={Math.round(h)} camera={{fov: 52, position: [0, 6, 18], near: 0.1, far: 90}} gl={{antialias: true, alpha: false}}>
      <color attach="background" args={[C.ink]} />
      <fog attach="fog" args={[C.ink, 16, 44]} />
      <Rig pos={pos} look={look} dy={dy} W={Math.round(w)} H={Math.round(h)} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 10, 7]} intensity={2.3} color="#fff4e0" />
      <pointLight position={[0, 9, 0]} intensity={90} color={C.honey} />
      <pointLight position={[-8, 3, -7]} intensity={50} color={C.cream} />
      <Stars color={C.honeyLight} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}><circleGeometry args={[26, 72]} /><meshStandardMaterial color={C.ink} metalness={0.5} roughness={0.55} /></mesh>
      <gridHelper args={[52, 52, C.honey, C.honeyDeep]} position={[0, 0.005, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}><ringGeometry args={[R + 1.9, R + 1.97, 96]} /><meshBasicMaterial color={C.honey} transparent opacity={0.5} /></mesh>
      {Array.from({length: N}, (_, i) => <Pillar key={i} i={i} vis={vis(i)} {...sp} />)}
      <Injection {...sp} vis={injVis} />
      <Vial {...sp} vis={vialVis} />
      <Sign911 {...sp} />
    </ThreeCanvas>
  );
};
