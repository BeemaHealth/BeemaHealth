import React, {useEffect, useMemo, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {F, Word, Zones, clamp, eob, eo3} from '../engine/ui';
import {wcue} from '../engine/world3d';
import {SH, SW, paintScreen} from './phoneScreen';

/**
 * 'How It Works' as ONE continuous 3D world with a moving camera, every change keyed to the spoken word.
 *  Station A: a real-looking phone (titanium frame, black glass, reflections) walking through a NONFUNCTIONAL intake mockup.
 *  The intake lifts off the screen as a card and travels the gold status path (the asynchronous workflow) to
 *  Station B: a neutral clinical review (clipboard with abstract history rows, magnifier, stethoscope; no person), then a fork:
 *    one branch continues, one ends (prescribing is never guaranteed).
 *  Station C: a licensed pharmacy counter: a generic carton gets a 'Prescription / Rx' label, goes into a shipping box,
 *    and the box travels to a front door. No brand, no drug name, no times anywhere.
 * Everything is an illustration; nothing is timed by guesswork (cues = spoken-word times).
 */
type V3 = [number, number, number];
const ease = (x: number) => { const c = clamp(x); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const bez = (a: V3, m: V3, b: V3, k: number): V3 => lerp3(lerp3(a, m, k), lerp3(m, b, k), k);

const KEYS: Record<string, string> = {
  healthcare: 'healthcare', how: 'how', works: 'works', first: 'first', create: 'create', account: 'account', complete: 'complete', medical: 'medical#1',
  intake: 'intake', online: 'online#2', next: 'next', indep: 'independently', provider: 'provider', reviews: 'reviews', history: 'history',
  determine: 'determine', treatment: 'treatment', appropriate: 'appropriate', iff: 'if', prescribed: 'prescribed#1', licensed2: 'licensed#2',
  pharmacy: 'pharmacy', prepares: 'prepares', ships: 'ships', medication: 'medication',
};
export type Cu = Record<string, number>;
export const cuesOf = (words: Word[]): Cu => {
  const out: Cu = {}; let prev = 0.3;
  for (const [k, v] of Object.entries(KEYS)) { let t = wcue(words, v); if (!Number.isFinite(t)) t = prev + 0.6; out[k] = Math.max(t, prev + 0.05); prev = out[k]; }
  return out;
};

/* ------------------------------------------------------------------ layout */
const PHONE: V3 = [0, 2.35, 0];
const NODE_A: V3 = [0.2, 0, 1.3], NODE_B: V3 = [7.4, 0, 0.2], FORK: V3 = [9.4, 0, 0.2], NODE_C: V3 = [14.2, 0, 0.6], NODE_D: V3 = [19.0, 0, 0.9], DEAD: V3 = [10.9, 0, -2.6];
const DESK: V3 = [8, 0, -1.6], CLIP: V3 = [8, 2.18, -1.75], COUNTER: V3 = [15, 0, -1.4], BOX0: V3 = [16.6, 0, -0.1], DOOR: V3 = [19.4, 0, -0.6];
const CARTON_ON: V3 = [14.6, 1.38, -1.25];

/* ------------------------------------------------------------------ camera: keyframes on spoken words, always drifting */
type Key = {t: number; pos: V3; look: V3};
const keysOf = (c: Cu): Key[] => {
  const k: Key[] = [
    {t: 0, pos: [-3.6, 3.3, 9.4], look: [0, 2.35, 0]},
    {t: c.healthcare, pos: [-3.1, 3.2, 9.3], look: [0, 2.35, 0]},
    {t: c.how, pos: [-1.6, 3.0, 9.0], look: [0, 2.35, 0]},
    {t: c.first, pos: [-0.7, 2.95, 7.2], look: [0, 2.4, 0]},
    {t: c.medical, pos: [0.35, 2.9, 6.9], look: [0.05, 2.35, 0]},
    {t: c.online, pos: [1.6, 3.2, 8.2], look: [0.9, 2.3, 0]},
    {t: c.next, pos: [4.6, 3.7, 7.6], look: [6.6, 1.9, -1.2]},
    {t: c.provider, pos: [6.6, 3.5, 5.4], look: [8, 1.9, -1.6]},
    {t: c.reviews, pos: [7.5, 3.25, 4.0], look: [8, 2.05, -1.7]},
    {t: c.history, pos: [8.7, 3.2, 3.9], look: [8.05, 2.0, -1.7]},
    {t: c.determine, pos: [11.0, 5.6, 6.6], look: [9.2, 1.0, -1.0]},
    {t: c.appropriate, pos: [11.6, 5.2, 6.4], look: [9.9, 1.0, -1.0]},
    {t: c.prescribed, pos: [12.4, 4.2, 6.6], look: [13.6, 1.2, -0.9]},
    {t: c.pharmacy, pos: [13.5, 3.4, 5.4], look: [15, 1.6, -1.4]},
    {t: c.prepares, pos: [14.2, 3.0, 3.9], look: [14.9, 1.5, -1.3]},
    {t: c.ships, pos: [15.6, 3.3, 5.0], look: [16.3, 1.0, -0.6]},
    {t: c.medication + 0.3, pos: [18.0, 2.9, 5.6], look: [18.4, 0.9, -0.3]},
    {t: c.medication + 6, pos: [18.8, 2.6, 5.0], look: [19.2, 1.0, -0.4]},
  ];
  for (let i = 1; i < k.length; i++) k[i].t = Math.max(k[i].t, k[i - 1].t + 0.35);
  return k;
};
const camAt = (keys: Key[], tg: number) => {
  let i = 0; while (i < keys.length - 2 && tg >= keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1];
  const span = Math.max(0.4, Math.min(2.0, b.t - a.t));
  const k = ease((tg - a.t) / span);
  const pos = lerp3(a.pos, b.pos, k), look = lerp3(a.look, b.look, k);
  pos[0] += Math.sin(tg * 0.37) * 0.12; pos[1] += Math.sin(tg * 0.53 + 1) * 0.06; pos[2] += Math.cos(tg * 0.29) * 0.1;   // never dead still
  return {pos, look};
};
const Rig: React.FC<{pos: V3; look: V3; dy: number; W: number; H: number}> = ({pos, look, dy, W, H}) => {
  const {camera} = useThree(); const c = camera as THREE.PerspectiveCamera;
  c.position.set(...pos); c.lookAt(...look); c.setViewOffset(W, H, 0, dy, W, H); c.updateProjectionMatrix(); c.updateMatrixWorld();
  return null;
};
const Env: React.FC = () => {
  const {gl, scene} = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.03).texture;
    scene.environmentIntensity = 0.55;
    pm.dispose();
  }, [gl, scene]);
  return null;
};

/** Canvas textures must be painted AFTER the web fonts load, or they keep the fallback font forever. */
const useFontsReady = () => {
  const [ok, setOk] = useState(false);
  const [h] = useState(() => delayRender('how-world-fonts'));
  useEffect(() => {
    let done = false; const fin = () => { if (!done) { done = true; setOk(true); continueRender(h); } };
    Promise.all(['700 64px Figtree', '700 54px Figtree', '600 30px Figtree', '500 30px Figtree', '700 54px Outfit', '500 60px Georgia'].map((f) => document.fonts.load(f))).then(fin).catch(fin);
  }, [h]);
  return ok;
};

/* ------------------------------------------------------------------ textures */
const canvasTex = (w: number, h: number, paint: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d')!; paint(g);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
};
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const blobTex = () => canvasTex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(0,0,0,.75)'); r.addColorStop(0.55, 'rgba(0,0,0,.28)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); });
const poolTex = () => canvasTex(256, 256, (g) => { const r = g.createRadialGradient(128, 128, 0, 128, 128, 128); r.addColorStop(0, 'rgba(255,236,190,.55)'); r.addColorStop(0.5, 'rgba(255,214,140,.14)'); r.addColorStop(1, 'rgba(255,214,140,0)'); g.fillStyle = r; g.fillRect(0, 0, 256, 256); });
const streakTex = () => canvasTex(512, 512, (g) => {
  const l = g.createLinearGradient(0, 0, 512, 512);
  l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(0.42, 'rgba(255,255,255,0)'); l.addColorStop(0.5, 'rgba(255,255,255,.9)'); l.addColorStop(0.56, 'rgba(255,255,255,.25)'); l.addColorStop(0.62, 'rgba(255,255,255,0)'); l.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = l; g.fillRect(0, 0, 512, 512);
});
const labelTex = () => canvasTex(720, 420, (g) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 720, 420);
  g.fillStyle = '#EEB318'; g.fillRect(0, 0, 720, 96);
  g.fillStyle = '#14161B'; g.font = `700 54px ${F.body}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Prescription', 40, 50);
  g.font = `700 150px Georgia, serif`; g.fillText('Rx', 36, 250);
  g.fillStyle = '#c9cbd0'; [150, 205, 260, 315].forEach((y, i) => { rr(g, 270, y, i === 3 ? 230 : 400, 24, 12); g.fill(); });
  g.strokeStyle = '#e4e5e8'; g.lineWidth = 4; g.strokeRect(2, 2, 716, 416);
});
const shipLabelTex = () => canvasTex(400, 260, (g) => {
  g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, 400, 260); g.fillStyle = '#c9cbd0';
  [40, 90, 140].forEach((y, i) => { rr(g, 30, y, i === 2 ? 180 : 300, 22, 11); g.fill(); });
  g.fillStyle = '#14161B'; for (let i = 0; i < 26; i++) g.fillRect(30 + i * 13, 196, i % 3 === 0 ? 7 : 4, 44);
});
const paperPaint = (g: CanvasRenderingContext2D, reviewed: number, appear: number) => {
  g.fillStyle = '#fbfaf6'; g.fillRect(0, 0, 640, 820);
  g.fillStyle = '#EEB318'; g.fillRect(0, 0, 640, 110);
  g.fillStyle = '#14161B'; g.font = `700 50px ${F.body}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Medical history', 40, 58);
  for (let i = 0; i < 6; i++) {
    const y = 160 + i * 106, k = clamp(appear * 6 - i);
    if (k <= 0) continue;
    g.globalAlpha = k;
    const done = reviewed * 6 > i + 0.6;
    g.fillStyle = done ? '#FDF2D0' : '#f1efe9'; rr(g, 30, y, 580, 84, 14); g.fill();
    g.fillStyle = done ? '#B47F00' : '#c4c6cb'; rr(g, 52, y + 20, 44, 44, 10); g.fill();
    g.fillStyle = done ? '#8d7a4c' : '#cfd1d6'; rr(g, 120, y + 22, 300 - (i % 3) * 50, 16, 8); g.fill(); rr(g, 120, y + 48, 200 + (i % 2) * 60, 14, 7); g.fill();
    if (done) { g.strokeStyle = '#B47F00'; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(530, y + 42); g.lineTo(548, y + 60); g.lineTo(580, y + 26); g.stroke(); }
    g.globalAlpha = 1;
  }
};
const intakeCardTex = () => canvasTex(400, 520, (g) => {
  g.fillStyle = '#fdfaf2'; g.fillRect(0, 0, 400, 520); g.fillStyle = '#EEB318'; g.fillRect(0, 0, 400, 70);
  g.fillStyle = '#14161B'; g.font = `700 32px ${F.body}`; g.textBaseline = 'middle'; g.fillText('Medical intake', 26, 37);
  for (let i = 0; i < 6; i++) { g.fillStyle = '#d9d6cc'; rr(g, 26, 110 + i * 62, i % 2 ? 250 : 330, 20, 10); g.fill(); }
});

const roundedRect = (w: number, h: number, r: number) => {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 12);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - x) / w, (p.getY(i) - y) / h);
  return g;
};

/* ------------------------------------------------------------------ billboard chip (always faces the camera) */
const chipTexCache = new Map<string, THREE.CanvasTexture>();
const chipTex = (text: string, tone: 'dark' | 'gold' | 'grey', ready: boolean) => {
  const key = `${text}|${tone}|${ready}`;
  if (chipTexCache.has(key)) return chipTexCache.get(key)!;
  const g0 = document.createElement('canvas').getContext('2d')!; g0.font = `700 64px ${F.body}`;
  const tw = Math.ceil(g0.measureText(text).width), W = tw + 150, H = 116;
  const t = canvasTex(W, H, (g) => {
    rr(g, 3, 3, W - 6, H - 6, 56);
    g.fillStyle = tone === 'gold' ? '#EEB318' : tone === 'grey' ? 'rgba(52,55,62,.92)' : 'rgba(14,16,20,.88)'; g.fill();
    g.lineWidth = 4; g.strokeStyle = tone === 'gold' ? '#F4C855' : 'rgba(255,255,255,.28)'; g.stroke();
    g.beginPath(); g.arc(58, H / 2, 13, 0, Math.PI * 2); g.fillStyle = tone === 'gold' ? '#14161B' : tone === 'grey' ? '#9a9da5' : '#EEB318'; g.fill();
    g.font = `700 64px ${F.body}`; g.fillStyle = tone === 'gold' ? '#14161B' : '#ffffff'; g.textBaseline = 'middle'; g.fillText(text, 92, H / 2 + 3);
  });
  (t as THREE.CanvasTexture & {aspect?: number}).aspect = W / H;
  chipTexCache.set(key, t); return t;
};
const Chip: React.FC<{text: string; at: V3; cam: V3; k: number; h?: number; tone?: 'dark' | 'gold' | 'grey'; ready: boolean}> = ({text, at, cam, k, h = 0.42, tone = 'dark', ready}) => {
  if (k <= 0.01) return null;
  const tex = chipTex(text, tone, ready), asp = (tex as THREE.CanvasTexture & {aspect?: number}).aspect ?? 4;
  const yaw = Math.atan2(cam[0] - at[0], cam[2] - at[2]);
  return (
    <group position={[at[0], at[1] + (1 - clamp(k)) * -0.25, at[2]]} rotation={[0, yaw, 0]} scale={Math.max(0.001, eob(k))}>
      <mesh renderOrder={10}><planeGeometry args={[h * asp, h]} /><meshBasicMaterial map={tex} transparent opacity={clamp(k * 1.5)} toneMapped={false} depthWrite={false} /></mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ the phone */
const usePhoneScreen = (tg: number, c: Cu) => {
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [h] = useState(() => delayRender('how-logo'));
  useEffect(() => {
    const im = new Image(); im.onload = () => { setLogo(im); continueRender(h); }; im.onerror = () => continueRender(h); im.src = staticFile('engine/brand/inline.png');
  }, [h]);
  const {canvas, tex} = useMemo(() => {
    const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
    return {canvas: cv, tex: t};
  }, []);
  paintScreen(canvas.getContext('2d')!, tg, {first: c.first, create: c.create, account: c.account, complete: c.complete, medical: c.medical, intake: c.intake, online: c.online}, logo);
  tex.needsUpdate = true;
  return tex;
};

const Phone: React.FC<{tg: number; c: Cu; cam: V3; screen: THREE.Texture; streak: THREE.Texture; blob: THREE.Texture}> = ({tg, c, cam, screen, streak, blob}) => {
  const geo = useMemo(() => ({
    body: new RoundedBoxGeometry(1.5, 3.1, 0.17, 8, 0.2), glass: roundedRect(1.47, 3.07, 0.215), scr: roundedRect(1.38, 2.98, 0.17),
    btn: new RoundedBoxGeometry(0.04, 0.26, 0.06, 3, 0.018), bump: new RoundedBoxGeometry(0.66, 0.66, 0.05, 4, 0.12),
  }), []);
  const yaw0 = lerp(0.62, 0.2, ease((tg - 0.1) / 2.6));
  const yawTrack = Math.atan2(cam[0] - PHONE[0], cam[2] - PHONE[2]);
  const yaw = lerp(yaw0, yawTrack * 0.55 + 0.04, ease((tg - c.first + 0.2) / 1.2));
  const bob = Math.sin(tg * 1.1) * 0.035, tilt = -0.07 + Math.sin(tg * 0.8) * 0.015;
  const glow = ease((tg - c.online) / 0.4) * (1 - ease((tg - c.online - 1.2) / 1.0));
  // reflection streak slides as the phone turns relative to the camera
  streak.offset.set(-0.35 + (yaw - yawTrack) * 0.9 + tg * 0.03, 0); streak.wrapS = THREE.ClampToEdgeWrapping;
  return (
    <group>
      <mesh position={[PHONE[0], 0.012, PHONE[2] + 0.1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.6, 1.3]} /><meshBasicMaterial map={blob} transparent opacity={0.55} depthWrite={false} /></mesh>
      <group position={[PHONE[0], PHONE[1] + bob, PHONE[2]]} rotation={[tilt, yaw, Math.sin(tg * 0.6) * 0.01]}>
        <mesh geometry={geo.body}><meshPhysicalMaterial color="#5c5f66" metalness={1} roughness={0.32} clearcoat={0.4} clearcoatRoughness={0.25} envMapIntensity={1.3} /></mesh>
        <mesh geometry={geo.glass} position={[0, 0, 0.0855]}><meshPhysicalMaterial color="#020203" metalness={0} roughness={0.06} clearcoat={1} envMapIntensity={1} /></mesh>
        <mesh geometry={geo.scr} position={[0, 0, 0.0868]}><meshBasicMaterial map={screen} toneMapped={false} /></mesh>
        <mesh geometry={geo.glass} position={[0, 0, 0.0885]}><meshStandardMaterial color="#000000" metalness={1} roughness={0.07} transparent blending={THREE.AdditiveBlending} envMapIntensity={0.55} depthWrite={false} /></mesh>
        <mesh geometry={geo.scr} position={[0, 0, 0.089]}><meshBasicMaterial map={streak} transparent opacity={0.13} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
        {glow > 0.01 && <mesh geometry={geo.glass} position={[0, 0, 0.09]} scale={1 + glow * 0.02}><meshBasicMaterial color="#EEB318" transparent opacity={0.16 * glow} blending={THREE.AdditiveBlending} depthWrite={false} /></mesh>}
        <mesh geometry={geo.btn} position={[-0.765, 0.78, 0]}><meshStandardMaterial color="#6a6d74" metalness={1} roughness={0.3} /></mesh>
        <mesh geometry={geo.btn} position={[-0.765, 0.42, 0]}><meshStandardMaterial color="#6a6d74" metalness={1} roughness={0.3} /></mesh>
        <mesh geometry={geo.btn} position={[0.765, 0.62, 0]} scale={[1, 1.5, 1]}><meshStandardMaterial color="#6a6d74" metalness={1} roughness={0.3} /></mesh>
        <mesh geometry={geo.bump} position={[-0.36, 1.1, -0.1]}><meshPhysicalMaterial color="#3a3c42" metalness={0.6} roughness={0.35} clearcoat={1} /></mesh>
        {[[-0.5, 1.24], [-0.5, 0.96], [-0.22, 1.1]].map(([x, y], i) => (
          <group key={i} position={[x, y, -0.14]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh><cylinderGeometry args={[0.105, 0.105, 0.05, 28]} /><meshStandardMaterial color="#8a8d94" metalness={1} roughness={0.25} /></mesh>
            <mesh position={[0, -0.028, 0]}><cylinderGeometry args={[0.075, 0.075, 0.01, 28]} /><meshPhysicalMaterial color="#05060a" roughness={0.05} clearcoat={1} /></mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ the intake card that leaves the phone and lands on the clipboard */
const IntakeCard: React.FC<{tg: number; c: Cu; tex: THREE.Texture}> = ({tg, c, tex}) => {
  const t0 = c.online + 0.35, t1 = t0 + 0.6, t2 = Math.max(t1 + 1.2, c.provider - 0.25);
  if (tg < t0 || tg > t2 + 0.5) return null;
  const start: V3 = [PHONE[0] + 0.05, PHONE[1] + 0.1, 0.2], pop: V3 = [0.55, 2.75, 1.2], land: V3 = [CLIP[0], CLIP[1] - 0.05, CLIP[2] + 0.12];
  const k1 = ease((tg - t0) / (t1 - t0)), k2 = ease((tg - t1) / (t2 - t1));
  const p = tg < t1 ? lerp3(start, pop, k1) : bez(pop, [4.2, 5.2, 0.6], land, k2);
  const s = (tg < t1 ? lerp(0.55, 1, k1) : lerp(1, 1.12, k2)) * (1 - ease((tg - t2) / 0.45));
  const rotY = tg < t1 ? 0.2 * k1 : lerp(0.2, 0, k2) + Math.sin(k2 * Math.PI) * 0.6, rotX = tg < t1 ? 0 : lerp(0, -0.3, k2);
  return (
    <group position={p} rotation={[rotX, rotY, Math.sin(k2 * Math.PI) * 0.15]} scale={Math.max(0.001, s)}>
      <mesh><boxGeometry args={[0.92, 1.2, 0.02]} /><meshStandardMaterial color="#fdfaf2" roughness={0.6} /></mesh>
      <mesh position={[0, 0, 0.0115]}><planeGeometry args={[0.92, 1.2]} /><meshBasicMaterial map={tex} toneMapped={false} /></mesh>
      <pointLight position={[0, 0, 0.6]} intensity={3 * (1 - k2 * 0.6)} color="#ffd979" distance={3} />
    </group>
  );
};

/* ------------------------------------------------------------------ gold status path and nodes (the asynchronous workflow) */
const Seg: React.FC<{a: V3; b: V3; k: number; color: string; glow: number; w?: number; o?: number}> = ({a, b, k, color, glow, w = 0.09, o = 1}) => {
  if (k <= 0.005) return null;
  const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz) * k, ang = Math.atan2(dx, dz);
  return (
    <mesh position={[a[0] + (dx * k) / 2, 0.02, a[2] + (dz * k) / 2]} rotation={[0, ang, 0]}>
      <boxGeometry args={[w, 0.02, len]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={glow} transparent opacity={o} roughness={0.4} />
    </mesh>
  );
};
const Node: React.FC<{at: V3; on: number; color?: string}> = ({at, on, color = '#EEB318'}) => (
  <group position={at}>
    <mesh position={[0, 0.03, 0]}><cylinderGeometry args={[0.3, 0.3, 0.05, 40]} /><meshStandardMaterial color={on > 0.5 ? color : '#3a3d45'} emissive={color} emissiveIntensity={on * 1.2} metalness={0.3} roughness={0.35} /></mesh>
    {on > 0.01 && [0, 1].map((i) => { const q = ((on * 2 + i * 0.5) % 1); return <mesh key={i} position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={0.4 + q * 1.1}><ringGeometry args={[0.85, 1, 48]} /><meshBasicMaterial color={color} transparent opacity={(1 - q) * 0.5 * clamp(on * 3)} side={THREE.DoubleSide} depthWrite={false} /></mesh>; })}
  </group>
);

/* ------------------------------------------------------------------ station B: neutral clinical review */
const Review: React.FC<{tg: number; c: Cu; vis: number; paper: THREE.CanvasTexture; paperCanvas: HTMLCanvasElement; blob: THREE.Texture}> = ({tg, c, vis, paper, paperCanvas, blob}) => {
  const steth = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0.2, 0, 0.1), new THREE.Vector3(-0.3, 0, 0.35), new THREE.Vector3(-0.85, 0, 0.15), new THREE.Vector3(-1.0, 0, -0.3), new THREE.Vector3(-0.7, 0, -0.55), new THREE.Vector3(-0.35, 0, -0.45)]);
    const ears = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.35, 0, -0.45), new THREE.Vector3(-0.1, 0, -0.62), new THREE.Vector3(0.05, 0, -0.5)]);
    const ears2 = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.35, 0, -0.45), new THREE.Vector3(-0.2, 0, -0.75), new THREE.Vector3(-0.02, 0, -0.78)]);
    return {tube: new THREE.TubeGeometry(curve, 80, 0.035, 12, false), e1: new THREE.TubeGeometry(ears, 30, 0.022, 10, false), e2: new THREE.TubeGeometry(ears2, 30, 0.022, 10, false),
      desk: new RoundedBoxGeometry(3.6, 0.1, 1.9, 4, 0.04), board: new RoundedBoxGeometry(1.5, 2.0, 0.06, 4, 0.06), clip: new RoundedBoxGeometry(0.62, 0.16, 0.08, 3, 0.03)};
  }, []);
  if (vis <= 0.01) return null;
  const rev = clamp((tg - c.reviews - 0.1) / Math.max(1.2, c.determine - c.reviews + 0.4));
  paperPaint(paperCanvas.getContext('2d')!, rev, ease((tg - c.provider + 0.3) / 0.9)); paper.needsUpdate = true;
  const stK = eob((tg - c.provider) / 0.6);
  const magK = ease((tg - c.reviews + 0.15) / 0.5) * (1 - ease((tg - c.appropriate) / 0.6));
  const row = rev * 6, mx = Math.sin(row * Math.PI * 1.0) * 0.32, my = 0.62 - (Math.min(row, 5.6) / 6) * 1.5;
  const y = (1 - vis) * -3;
  return (
    <group position={[DESK[0], y, DESK[2]]}>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[4.4, 2.6]} /><meshBasicMaterial map={blob} transparent opacity={0.6} depthWrite={false} /></mesh>
      <mesh position={[0, 1.15, 0]} geometry={steth.desk}><meshPhysicalMaterial color="#d9c3a0" roughness={0.45} clearcoat={0.6} clearcoatRoughness={0.3} /></mesh>
      {[[-1.65, -0.82], [1.65, -0.82], [-1.65, 0.82], [1.65, 0.82]].map(([x, z], i) => <mesh key={i} position={[x, 0.55, z]}><cylinderGeometry args={[0.04, 0.04, 1.1, 12]} /><meshStandardMaterial color="#8d9097" metalness={1} roughness={0.3} /></mesh>)}
      {/* clipboard leaning back on a small stand */}
      <group position={[CLIP[0] - DESK[0], CLIP[1], CLIP[2] - DESK[2]]} rotation={[-0.28, 0, 0]}>
        <mesh geometry={steth.board}><meshPhysicalMaterial color="#2c2f36" roughness={0.4} clearcoat={0.8} /></mesh>
        <mesh position={[0, -0.08, 0.035]}><planeGeometry args={[1.3, 1.67]} /><meshStandardMaterial map={paper} roughness={0.9} /></mesh>
        <mesh position={[0, 0.93, 0.06]} geometry={steth.clip}><meshStandardMaterial color="#d4ad4a" metalness={1} roughness={0.25} /></mesh>
        {/* magnifier sweeping the rows */}
        {magK > 0.01 && (
          <group position={[mx, my, 0.32]} scale={magK} rotation={[0, 0, -0.5]}>
            <mesh><torusGeometry args={[0.3, 0.035, 16, 60]} /><meshStandardMaterial color="#d4ad4a" metalness={1} roughness={0.2} /></mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.29, 0.29, 0.015, 48]} /><meshPhysicalMaterial color="#e8f6ff" transparent opacity={0.22} roughness={0} metalness={0} clearcoat={1} envMapIntensity={2} depthWrite={false} /></mesh>
            <mesh position={[0, -0.62, 0]}><cylinderGeometry args={[0.05, 0.06, 0.62, 16]} /><meshPhysicalMaterial color="#1d1f24" roughness={0.3} clearcoat={1} /></mesh>
          </group>
        )}
      </group>
      {/* stethoscope lying on the desk: a neutral clinical cue, no person */}
      <group position={[1.15, 1.22, 0.25]} scale={Math.max(0.001, stK)} rotation={[0, -0.4, 0]}>
        <mesh geometry={steth.tube}><meshPhysicalMaterial color="#1e2024" roughness={0.35} clearcoat={0.7} /></mesh>
        <mesh geometry={steth.e1}><meshStandardMaterial color="#c9ccd2" metalness={1} roughness={0.2} /></mesh>
        <mesh geometry={steth.e2}><meshStandardMaterial color="#c9ccd2" metalness={1} roughness={0.2} /></mesh>
        <mesh position={[0.24, 0.03, 0.08]}><cylinderGeometry args={[0.15, 0.15, 0.06, 36]} /><meshStandardMaterial color="#c9ccd2" metalness={1} roughness={0.18} /></mesh>
        <mesh position={[0.24, 0.065, 0.08]}><cylinderGeometry args={[0.12, 0.12, 0.012, 36]} /><meshPhysicalMaterial color="#14161b" roughness={0.2} clearcoat={1} /></mesh>
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ station C: licensed pharmacy, packaging, delivery */
const Pharmacy: React.FC<{tg: number; c: Cu; vis: number; label: THREE.Texture; ship: THREE.Texture; blob: THREE.Texture}> = ({tg, c, vis, label, ship, blob}) => {
  const geo = useMemo(() => ({counter: new RoundedBoxGeometry(3.6, 1.1, 1.2, 4, 0.05), top: new RoundedBoxGeometry(3.8, 0.08, 1.35, 4, 0.03), carton: new RoundedBoxGeometry(0.8, 0.5, 0.34, 4, 0.025)}), []);
  if (vis <= 0.01) return null;
  const y = (1 - vis) * -3.5;
  // carton slides in on 'prepares', label applied, then lifted into the shipping box on 'ships'
  const slide = ease((tg - c.prepares + 0.25) / 0.5), lab = ease((tg - c.prepares - 0.2) / 0.45);
  const into = ease((tg - c.ships) / 0.5);
  const cartonP: V3 = into <= 0 ? [CARTON_ON[0] + (1 - slide) * 1.4, CARTON_ON[1], CARTON_ON[2]] : bez(CARTON_ON, [16.0, 2.6, -0.6], [BOX0[0], 0.42, BOX0[2]], into);
  const hideCarton = tg > c.ships + 0.75;
  const flapA = ease((tg - c.ships - 0.45) / 0.35), flapB = ease((tg - c.ships - 0.7) / 0.35), tape = ease((tg - c.ships - 1.0) / 0.25);
  const go = ease((tg - c.ships - 1.15) / Math.max(1.0, c.medication + 1.35 - (c.ships + 1.15)));
  const boxP: V3 = [lerp(BOX0[0], DOOR[0] + 0.1, go), Math.abs(Math.sin(go * Math.PI * 3)) * 0.05 * (1 - go), lerp(BOX0[2], DOOR[2] + 0.75, go)];
  const boxVis = ease((tg - c.prepares + 0.1) / 0.5);
  const kraft = '#c49a63';
  const flap = (side: 'x' | 'z', s: number, k: number, key: string) => {
    const open = -2.1, rot = lerp(open, -Math.PI / 2 * 0, k);   // open outward -> closed flat
    const w = side === 'z' ? 1.0 : 0.66, d = side === 'z' ? 0.34 : 0.34;
    return (
      <group key={key} position={side === 'z' ? [0, 0.6, s * 0.34] : [s * 0.5, 0.6, 0]} rotation={side === 'z' ? [s * -rot, 0, 0] : [0, 0, s * rot]}>
        <mesh position={side === 'z' ? [0, 0, -s * d / 2] : [-s * d / 2 * (0.5 / 0.34), 0, 0]}><boxGeometry args={side === 'z' ? [w, 0.012, d] : [0.5, 0.012, w * 0.66]} /><meshStandardMaterial color={kraft} roughness={0.85} /></mesh>
      </group>
    );
  };
  return (
    <group>
      <group position={[0, y, 0]}>
        <mesh position={[COUNTER[0], 0.012, COUNTER[2] + 0.1]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[5, 2.6]} /><meshBasicMaterial map={blob} transparent opacity={0.6} depthWrite={false} /></mesh>
        <mesh geometry={geo.counter} position={[COUNTER[0], 0.55, COUNTER[2]]}><meshPhysicalMaterial color="#ece6da" roughness={0.55} clearcoat={0.3} /></mesh>
        <mesh geometry={geo.top} position={[COUNTER[0], 1.14, COUNTER[2]]}><meshPhysicalMaterial color="#f7f4ee" roughness={0.25} clearcoat={1} clearcoatRoughness={0.15} /></mesh>
        <mesh position={[COUNTER[0], 0.55, COUNTER[2] + 0.605]}><boxGeometry args={[3.2, 0.06, 0.01]} /><meshStandardMaterial color="#EEB318" emissive="#EEB318" emissiveIntensity={0.6} /></mesh>
        {/* back shelves with generic, unlabeled stock */}
        <group position={[COUNTER[0], 0, COUNTER[2] - 1.35]}>
          <mesh position={[0, 1.9, -0.18]}><boxGeometry args={[4.2, 3.8, 0.08]} /><meshStandardMaterial color="#23262d" roughness={0.8} /></mesh>
          {[1.35, 2.25, 3.15].map((sy, r) => (
            <group key={r}>
              <mesh position={[0, sy, 0]}><boxGeometry args={[4.0, 0.05, 0.42]} /><meshStandardMaterial color="#e6dfd2" roughness={0.5} /></mesh>
              {Array.from({length: 9}, (_, i) => {
                const x = -1.75 + i * 0.44, amber = (i + r) % 3 === 0;
                return amber
                  ? <mesh key={i} position={[x, sy + 0.2, 0]}><cylinderGeometry args={[0.11, 0.11, 0.36, 20]} /><meshPhysicalMaterial color="#b8732a" roughness={0.15} transmission={0} clearcoat={1} transparent opacity={0.92} /></mesh>
                  : <mesh key={i} position={[x, sy + 0.17, 0]}><boxGeometry args={[0.3, 0.3 + ((i * 7 + r) % 3) * 0.06, 0.24]} /><meshStandardMaterial color="#f2f1ee" roughness={0.7} /></mesh>;
              })}
            </group>
          ))}
          <pointLight position={[0, 3.6, 0.8]} intensity={10} distance={5} color="#ffe6b8" />
        </group>
      </group>
      {/* the carton (generic: 'Prescription' + 'Rx' label only) */}
      {!hideCarton && slide > 0.01 && (
        <group position={cartonP} rotation={[0, -0.25 + into * 0.25, 0]} scale={1 - into * 0.15}>
          <mesh geometry={geo.carton}><meshPhysicalMaterial color="#f8f8f5" roughness={0.45} clearcoat={0.4} /></mesh>
          {lab > 0.01 && <mesh position={[-(1 - lab) * 0.36, 0, 0.172]} scale={[lab, 1, 1]}><planeGeometry args={[0.72, 0.42]} /><meshStandardMaterial map={label} roughness={0.6} /></mesh>}
        </group>
      )}
      {/* shipping box: waits beside the counter, closes on 'ships', then travels to the door */}
      {boxVis > 0.01 && (
        <group position={boxP} scale={Math.max(0.001, eob(boxVis))} rotation={[0, -0.15 + go * 0.4, 0]}>
          <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.8, 1.3]} /><meshBasicMaterial map={blob} transparent opacity={0.5} depthWrite={false} /></mesh>
          <mesh position={[0, 0.02, 0]}><boxGeometry args={[1.0, 0.04, 0.68]} /><meshStandardMaterial color={kraft} roughness={0.85} /></mesh>
          <mesh position={[0, 0.3, 0.34]}><boxGeometry args={[1.0, 0.6, 0.02]} /><meshStandardMaterial color={kraft} roughness={0.85} /></mesh>
          <mesh position={[0, 0.3, -0.34]}><boxGeometry args={[1.0, 0.6, 0.02]} /><meshStandardMaterial color={kraft} roughness={0.85} /></mesh>
          <mesh position={[0.5, 0.3, 0]}><boxGeometry args={[0.02, 0.6, 0.68]} /><meshStandardMaterial color={kraft} roughness={0.85} /></mesh>
          <mesh position={[-0.5, 0.3, 0]}><boxGeometry args={[0.02, 0.6, 0.68]} /><meshStandardMaterial color={kraft} roughness={0.85} /></mesh>
          <mesh position={[0.05, 0.3, 0.352]}><planeGeometry args={[0.46, 0.3]} /><meshStandardMaterial map={ship} roughness={0.7} /></mesh>
          {flap('x', 1, flapA, 'fx1')}{flap('x', -1, flapA, 'fx2')}{flap('z', 1, flapB, 'fz1')}{flap('z', -1, flapB, 'fz2')}
          {tape > 0.01 && <mesh position={[0, 0.612, 0]} scale={[1, 1, tape]}><boxGeometry args={[0.2, 0.008, 0.72]} /><meshStandardMaterial color="#e8d9b8" roughness={0.35} transparent opacity={0.85} /></mesh>}
        </group>
      )}
    </group>
  );
};

/* ------------------------------------------------------------------ front door (destination) */
const Door: React.FC<{vis: number; tg: number}> = ({vis, tg}) => {
  if (vis <= 0.01) return null;
  return (
    <group position={[DOOR[0], (1 - vis) * -4, DOOR[2]]}>
      <mesh position={[0, 1.8, -0.15]}><boxGeometry args={[4.2, 3.6, 0.2]} /><meshStandardMaterial color="#e9dcc2" roughness={0.85} /></mesh>
      <mesh position={[0, 1.25, -0.02]}><boxGeometry args={[1.3, 2.5, 0.1]} /><meshStandardMaterial color="#f6f1e6" roughness={0.6} /></mesh>
      <mesh position={[0, 1.2, 0.04]}><boxGeometry args={[1.1, 2.3, 0.06]} /><meshPhysicalMaterial color="#1f2a33" roughness={0.35} clearcoat={0.8} /></mesh>
      <mesh position={[0.4, 1.2, 0.1]}><sphereGeometry args={[0.05, 16, 16]} /><meshStandardMaterial color="#d4ad4a" metalness={1} roughness={0.2} /></mesh>
      <mesh position={[0.95, 2.1, 0.0]}><sphereGeometry args={[0.1, 16, 16]} /><meshStandardMaterial color="#fff2cc" emissive="#ffd479" emissiveIntensity={1.6 + Math.sin(tg * 3) * 0.1} /></mesh>
      <pointLight position={[0.95, 2.1, 0.5]} intensity={6} distance={4} color="#ffd479" />
      <mesh position={[0, 0.02, 0.75]}><boxGeometry args={[1.5, 0.03, 0.85]} /><meshStandardMaterial color="#3b3f47" roughness={0.95} /></mesh>
      <mesh position={[0, 0.06, 0.25]}><boxGeometry args={[1.6, 0.12, 0.5]} /><meshStandardMaterial color="#d6cdbb" roughness={0.8} /></mesh>
    </group>
  );
};

const Bokeh: React.FC<{tex: THREE.Texture}> = ({tex}) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry(), a: number[] = [];
    for (let i = 0; i < 160; i++) a.push(-14 + ((i * 37) % 48), 0.8 + ((i * 53) % 90) / 10, -9 - ((i * 29) % 14));
    g.setAttribute('position', new THREE.Float32BufferAttribute(a, 3)); return g;
  }, []);
  return <points geometry={geo}><pointsMaterial map={tex} color="#ffd88a" size={0.55} sizeAttenuation transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} /></points>;
};

export const HowWorld: React.FC<{w: number; h: number; dy: number; tg: number; words: Word[]; C: Record<string, string>}> = ({w, h, dy, tg, words, C}) => {
  const c = useMemo(() => cuesOf(words), [words]);
  const keys = useMemo(() => keysOf(c), [c]);
  const {pos, look} = camAt(keys, tg);
  const ready = useFontsReady();
  const tx = useMemo(() => {
    const pc = document.createElement('canvas'); pc.width = 640; pc.height = 820;
    const paper = new THREE.CanvasTexture(pc); paper.colorSpace = THREE.SRGBColorSpace; paper.anisotropy = 8;
    const dot = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    return {blob: blobTex(), pool: poolTex(), streak: streakTex(), label: labelTex(), ship: shipLabelTex(), card: intakeCardTex(), paper, paperCanvas: pc, dot};
  }, [ready]);
  const screen = usePhoneScreen(tg, c);
  // station visibility, each on the word that names it
  const revVis = ease((tg - c.indep + 0.3) / 0.9);
  const phVis = ease((tg - c.licensed2 + 0.1) / 0.8);
  const doorVis = ease((tg - c.ships + 0.2) / 0.9);
  // gold path progress
  const pAB = ease((tg - c.online - 0.4) / Math.max(1.0, c.provider - c.online - 0.6));
  const pBF = ease((tg - c.determine) / 0.6), pDead = ease((tg - c.determine - 0.1) / 0.8);
  const pFC = ease((tg - c.prescribed) / Math.max(0.6, c.licensed2 - c.prescribed));
  const pCD = ease((tg - c.ships - 1.15) / Math.max(1.0, c.medication + 1.35 - (c.ships + 1.15)));
  const chip = (t0: number, t1 = 1e9) => clamp((tg - t0) / 0.45) * (1 - clamp((tg - t1) / 0.4));
  return (
    <ThreeCanvas width={Math.round(w)} height={Math.round(h)} camera={{fov: 40, position: [0, 3, 9], near: 0.1, far: 120}} gl={{antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05}}>
      <color attach="background" args={['#0d0f13']} />
      <fog attach="fog" args={['#0d0f13', 14, 34]} />
      <Env />
      <Rig pos={pos} look={look} dy={dy} W={Math.round(w)} H={Math.round(h)} />
      <hemisphereLight args={['#fff4e2', '#1a1c22', 0.55]} />
      <directionalLight position={[-4, 9, 7]} intensity={2.2} color="#fff1dc" />
      <directionalLight position={[6, 4, -6]} intensity={1.4} color="#ffd38a" />
      <pointLight position={[pos[0] + 2, pos[1] + 1, pos[2]]} intensity={14} distance={14} color="#ffffff" />
      <spotLight position={[-1.5, 6, 3]} angle={0.5} penumbra={1} intensity={60} distance={14} color="#fff6e8" />
      <Bokeh tex={tx.dot} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[9, 0, 0]}><planeGeometry args={[80, 50]} /><meshPhysicalMaterial color="#16181d" roughness={0.42} metalness={0.15} clearcoat={0.5} clearcoatRoughness={0.4} /></mesh>
      {[NODE_A, CLIP, COUNTER, DOOR].map((p, i) => <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[p[0], 0.006, p[2] + 0.6]}><planeGeometry args={[7, 6]} /><meshBasicMaterial map={tx.pool} transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh>)}
      {/* faint full track, then the bright progress over it */}
      <Seg a={NODE_A} b={NODE_B} k={1} color="#EEB318" glow={0.05} o={0.18} />
      <Seg a={NODE_B} b={FORK} k={pBF > 0 ? 1 : 0} color="#EEB318" glow={0.05} o={0.18} />
      <Seg a={FORK} b={NODE_C} k={pFC > 0 ? 1 : 0} color="#EEB318" glow={0.05} o={0.18} />
      <Seg a={NODE_A} b={NODE_B} k={pAB} color="#EEB318" glow={0.9} />
      <Seg a={NODE_B} b={FORK} k={pBF} color="#EEB318" glow={0.9} />
      <Seg a={FORK} b={DEAD} k={pDead} color="#6b6f78" glow={0.05} />
      <Seg a={FORK} b={NODE_C} k={Math.max(pBF * 0.3, pFC)} color="#EEB318" glow={pFC > 0 ? 0.9 : 0.2} o={pFC > 0 ? 1 : 0.6} />
      <Seg a={NODE_C} b={NODE_D} k={pCD} color="#EEB318" glow={0.9} />
      <Node at={NODE_A} on={ease((tg - c.online) / 0.4)} />
      <Node at={NODE_B} on={ease((tg - c.reviews) / 0.4)} />
      <Node at={DEAD} on={pDead > 0.95 ? 0.15 : 0} color="#8a8e97" />
      <Node at={NODE_C} on={ease((tg - c.prepares) / 0.4)} />
      <Node at={NODE_D} on={ease((tg - c.medication - 1.3) / 0.4)} />
      <Phone tg={tg} c={c} cam={pos} screen={screen} streak={tx.streak} blob={tx.blob} />
      <IntakeCard tg={tg} c={c} tex={tx.card} />
      <Review tg={tg} c={c} vis={revVis} paper={tx.paper} paperCanvas={tx.paperCanvas} blob={tx.blob} />
      <Pharmacy tg={tg} c={c} vis={phVis} label={tx.label} ship={tx.ship} blob={tx.blob} />
      <Door vis={doorVis} tg={tg} />
      {/* status chips, each on its word */}
      <Chip text="Intake complete" at={[NODE_A[0] + 0.9, 0.75, NODE_A[2] + 0.3]} cam={pos} k={chip(c.online + 0.1, c.provider)} tone="gold" ready={ready} />
      <Chip text="Independently licensed provider" at={[DESK[0], 3.75, DESK[2] + 0.2]} cam={pos} k={chip(c.provider, c.history)} h={0.36} ready={ready} />
      <Chip text="Under review" at={[NODE_B[0] - 0.6, 0.62, NODE_B[2] + 0.8]} cam={pos} k={chip(c.reviews + 0.1, c.prescribed)} tone="gold" ready={ready} />
      <Chip text="Never guaranteed" at={[FORK[0] + 1.0, 0.75, FORK[2] - 1.2]} cam={pos} k={chip(c.appropriate - 0.1, c.prescribed + 0.4)} tone="grey" ready={ready} />
      <Chip text="If prescribed" at={[(FORK[0] + NODE_C[0]) / 2, 0.7, (FORK[2] + NODE_C[2]) / 2 + 0.3]} cam={pos} k={chip(c.prescribed, c.prepares)} tone="gold" ready={ready} />
      <Chip text="Licensed pharmacy" at={[COUNTER[0], 4.15, COUNTER[2] - 1.0]} cam={pos} k={chip(c.pharmacy)} h={0.38} ready={ready} />
      <Chip text="Being filled" at={[NODE_C[0] - 0.8, 0.62, NODE_C[2] + 0.8]} cam={pos} k={chip(c.prepares + 0.15, c.medication + 0.2)} tone="gold" ready={ready} />
      <Chip text="On the way" at={[NODE_D[0] - 0.9, 0.62, NODE_D[2] + 0.9]} cam={pos} k={chip(c.ships + 0.6)} tone="gold" ready={ready} />
    </ThreeCanvas>
  );
};

/* ------------------------------------------------------------------ DOM overlay: walkthrough step header + illustration note */
export const StepOverlay: React.FC<{tg: number; words: Word[]; z: Zones; C: Record<string, string>}> = ({tg, words, z, C}) => {
  const c = useMemo(() => cuesOf(words), [words]);
  const steps = [
    {t: c.first - 0.15, n: 1, title: 'Medical intake online'},
    {t: c.next - 0.15, n: 2, title: 'Licensed provider review'},
    {t: c.iff - 0.15, n: 3, title: 'If prescribed: filled and shipped'},
  ];
  let cur = -1; steps.forEach((s, i) => { if (tg >= s.t) cur = i; });
  const s = cur >= 0 ? steps[cur] : null, k = s ? eo3((tg - s.t) / 0.4) : eo3((tg + 0.3) / 0.5);
  const note = tg < c.next - 0.2 ? 'Illustrative mockup' : 'Illustration';
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: z.side, top: z.vt - 6, width: z.W - z.side * 2, opacity: k, transform: `translateY(${(1 - k) * 16}px)`}}>
        <div style={{display: 'flex', gap: 10, marginBottom: 14}}>
          {[0, 1, 2].map((i) => <div key={i} style={{height: 8, flex: 1, borderRadius: 4, background: s && i <= cur ? C.honey : 'rgba(255,255,255,.22)'}} />)}
        </div>
        <div style={{fontFamily: F.body, fontWeight: 700, fontSize: z.W * 0.03, letterSpacing: 5, color: C.honey, textTransform: 'uppercase'}}>{s ? `Step ${s.n} of 3` : 'How it works'}</div>
        {s && <div style={{fontFamily: F.display, fontWeight: 800, fontSize: z.W * 0.056, color: '#fff', lineHeight: 1.1, marginTop: 6, textShadow: '0 4px 24px rgba(0,0,0,.6)'}}>{s.title}</div>}
      </div>
      <div style={{position: 'absolute', right: z.side + 60, top: z.vb - 30, fontFamily: F.body, fontWeight: 600, fontSize: z.W * 0.024, color: 'rgba(255,255,255,.75)', background: 'rgba(14,16,20,.6)', padding: '6px 16px', borderRadius: 999, border: '1px solid rgba(255,255,255,.18)'}}>{note}</div>
    </div>
  );
};
