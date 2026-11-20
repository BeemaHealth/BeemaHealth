import React, {useEffect, useMemo, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import {continueRender, delayRender, staticFile} from 'remotion';
import * as THREE from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Txt, useFontReady} from '../engine/stage3d';
import {wcue} from '../engine/world3d';
import {Word, clamp, eob} from '../engine/ui';

/**
 * WELLNESS WORLD: one continuous, warmly lit room for the wellness overview short (hair loss care, compounded NAD+ and
 * sermorelin, how online care works). A long stone counter runs along x; the camera travels along it on the spoken words.
 *   x=0  hook: a tape measure (weight loss); on "beyond" its tape unrolls past its end toward the rest of the counter.
 *   x=7  hair loss: oral finasteride and minoxidil bottles and the compounded topical spray, rising on their names.
 *   x=14 compounded NAD+ and sermorelin vials on a slate plinth.
 *   x=21 online care: a tablet whose intake form fills, a stethoscope (provider review), a shipping box that closes on "prescribed".
 * Bottles and vials are 3D models wearing CROPPED areas of the live-site label art (src/assets/treatments, copied to
 * public/engine/products/well-*.webp). The crops leave out 'Longevity Medication', '1000 mg/mL' and 'Supports Healthier Hair'.
 * No people are shown. Everything is timed from spoken-word cues; nothing by guesswork.
 */
type V3 = [number, number, number];
const ease = (x: number) => { const c = clamp(x); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const rnd = (s: number) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

const KEYS: Record<string, string> = {
  beyond: 'beyond', weight: 'weight', hair: 'hair-loss', oral: 'oral', fin: 'finasteride', minox: 'minoxidil', topical: 'topical', spray: 'spray',
  nad: 'nad', ser: 'sermorelin', fda: 'fda-approved', indiv: 'individual', online: 'online', intake: 'intake', provider: 'provider',
  review: 'review', pharmacy: 'pharmacy', prescribed: 'prescribed', explore: 'explore',
};
export type Cu = Record<string, number>;
export const cuesOf = (words: Word[]): Cu => {
  const out: Cu = {}; let prev = 0.3;
  for (const [k, v] of Object.entries(KEYS)) { let t = wcue(words, v); if (!Number.isFinite(t)) t = prev + 0.6; out[k] = Math.max(t, prev + 0.05); prev = out[k]; }
  return out;
};

/* ------------------------------------------------------------------ camera: poses chained on the words, always drifting */
type Pose = {t: number; pos: V3; look: V3};
const posesOf = (c: Cu): Pose[] => [
  {t: 0, pos: [1.7, 1.45, 4.3], look: [0.15, 0.5, 0]},
  {t: c.beyond, pos: [2.6, 1.6, 4.4], look: [1.9, 0.5, 0]},
  {t: c.weight, pos: [4.6, 1.9, 5.0], look: [4.0, 0.5, 0]},
  {t: c.hair, pos: [8.7, 2.3, 6.1], look: [7.4, 0.85, -0.1]},
  {t: c.fin, pos: [7.0, 1.55, 4.4], look: [6.6, 0.85, 0.4]},
  {t: c.minox, pos: [8.3, 1.55, 4.5], look: [7.5, 0.85, 0]},
  {t: c.topical, pos: [9.7, 1.95, 4.9], look: [8.2, 1.0, -0.3]},
  {t: c.spray + 0.3, pos: [9.4, 1.6, 4.0], look: [8.5, 1.5, -0.5]},
  {t: c.nad, pos: [12.5, 1.9, 4.5], look: [13.7, 1.15, 0.1]},
  {t: c.ser, pos: [15.6, 1.8, 4.3], look: [14.3, 1.15, 0]},
  {t: c.fda, pos: [14.2, 2.6, 5.9], look: [14.1, 1.45, 0]},
  {t: c.indiv, pos: [13.0, 2.2, 5.3], look: [14.0, 1.4, 0]},
  {t: c.online, pos: [19.1, 2.0, 4.7], look: [20.6, 0.95, 0]},
  {t: c.intake, pos: [19.9, 1.6, 3.4], look: [20.4, 1.0, 0]},
  {t: c.provider, pos: [21.7, 1.9, 4.3], look: [21.2, 0.7, 0.3]},
  {t: c.pharmacy, pos: [23.5, 2.2, 4.7], look: [22.5, 0.8, -0.2]},
  {t: c.prescribed, pos: [22.6, 2.7, 5.6], look: [22.0, 0.9, -0.2]},
  {t: c.prescribed + 2.2, pos: [21.3, 3.3, 7.6], look: [21.3, 1.0, 0]},
];
export const camAt = (P: Pose[], tg: number) => {
  let pos = P[0].pos, look = P[0].look;
  for (let i = 1; i < P.length; i++) {
    const dur = Math.max(0.6, Math.min(1.5, P[i].t - P[i - 1].t + 0.3));
    const k = ease((tg - P[i].t + 0.3) / dur);         // starts just before the word, settles about a second after it
    if (k <= 0) break;
    pos = lerp3(pos, P[i].pos, k); look = lerp3(look, P[i].look, k);
  }
  const d: V3 = [Math.sin(tg * 0.33) * 0.14, Math.sin(tg * 0.27 + 1) * 0.07, Math.sin(tg * 0.21) * 0.1];   // handheld-slow drift, never dead still
  const Z = 1.65;                                     // pull back: portrait frame, whole objects with room for their chips
  return {pos: [look[0] + (pos[0] - look[0]) * Z + d[0], look[1] + (pos[1] - look[1]) * Z + d[1], look[2] + (pos[2] - look[2]) * Z + d[2]] as V3, look};
};
const Rig: React.FC<{pos: V3; look: V3; dy: number; W: number; H: number}> = ({pos, look, dy, W, H}) => {
  const {camera} = useThree(); const c = camera as THREE.PerspectiveCamera;
  c.position.set(...pos); c.lookAt(...look); c.setViewOffset(W, H, 0, dy, W, H); c.updateProjectionMatrix(); c.updateMatrixWorld();
  return null;
};

/** Studio reflections without any downloaded HDR: three's RoomEnvironment through PMREM. */
const Env: React.FC = () => {
  const {gl, scene} = useThree();
  useEffect(() => {
    const pm = new THREE.PMREMGenerator(gl); const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env; scene.environmentIntensity = 0.55;
    return () => { env.dispose(); pm.dispose(); };
  }, [gl, scene]);
  return null;
};

/* ------------------------------------------------------------------ textures */
const useImage = (src: string) => {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [h] = useState(() => delayRender('well-img ' + src));
  useEffect(() => {
    const im = new Image(); im.onload = () => { setImg(im); continueRender(h); }; im.onerror = () => continueRender(h); im.src = staticFile(src);
  }, [src, h]);
  return img;
};
/** A crop of an image in pixel coordinates (x0,y0)-(x1,y1) of a W x H picture, as a texture. */
const useCrop = (img: HTMLImageElement | null, W: number, H: number, x0: number, y0: number, x1: number, y1: number) => useMemo(() => {
  if (!img) return null;
  const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.repeat.set((x1 - x0) / W, (y1 - y0) / H); t.offset.set(x0 / W, 1 - y1 / H); t.needsUpdate = true;
  return t;
}, [img, W, H, x0, y0, x1, y1]);
const noiseTex = (seed: number, base: string, spots: string, n: number, veins = 0) => {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d')!;
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < n; i++) { g.fillStyle = spots; g.globalAlpha = 0.04 + rnd(seed + i) * 0.08; g.beginPath(); g.arc(rnd(seed + i * 3) * 512, rnd(seed + i * 7) * 512, 0.6 + rnd(seed + i * 11) * 2.4, 0, Math.PI * 2); g.fill(); }
  for (let v = 0; v < veins; v++) {
    g.globalAlpha = 0.07; g.strokeStyle = spots; g.lineWidth = 1 + rnd(seed + v) * 2; g.beginPath(); let x = 0, y = rnd(seed + v * 13) * 512; g.moveTo(x, y);
    while (x < 512) { x += 18; y += (rnd(seed + v * 31 + x) - 0.5) * 22; g.lineTo(x, y); } g.stroke();
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
};

/* ------------------------------------------------------------------ small pieces */
const Chip: React.FC<{text: string; at: V3; cam: V3; s: number; ready: boolean; color?: string; w?: number}> = ({text, at, cam, s, ready, color = '#ffffff', w}) => {
  if (s <= 0.02) return null;
  const yaw = Math.atan2(cam[0] - at[0], cam[2] - at[2]);
  const ww = w ?? Math.min(3.6, 0.105 * text.length + 0.5);
  return <group position={at} rotation={[0, yaw, 0]}><Txt text={text} w={ww} h={0.36} s={s} color={color} bg="rgba(18,20,25,.86)" border="#EEB31899" ready={ready} radius={0.18} /></group>;
};
const glassMat = (op = 0.16) => <meshPhysicalMaterial color="#f4fbff" transparent opacity={op} roughness={0.04} metalness={0} clearcoat={1} clearcoatRoughness={0.03} envMapIntensity={0.9} side={THREE.DoubleSide} depthWrite={false} />;
const Tablet: React.FC<{p: V3; r?: V3; s?: number}> = ({p, r = [0, 0, 0], s = 1}) => (
  <mesh position={p} rotation={r} scale={s} castShadow receiveShadow><cylinderGeometry args={[0.105, 0.105, 0.055, 28]} /><meshStandardMaterial color="#f7f6f2" roughness={0.55} /></mesh>
);

/** Pill bottle: clear glass jar, white ridged cap, tablets inside, the real label crop wrapped on its front. */
const PillBottle: React.FC<{p: V3; vis: number; yaw: number; label: THREE.Texture | null}> = ({p, vis, yaw, label}) => {
  const pills = useMemo(() => Array.from({length: 34}, (_, i): {p: V3; r: V3} => {
    const a = rnd(i * 5.1) * Math.PI * 2, rr = Math.sqrt(rnd(i * 2.3)) * 0.27, layer = Math.floor(i / 9);
    return {p: [Math.cos(a) * rr, 0.08 + layer * 0.075 + rnd(i) * 0.03, Math.sin(a) * rr], r: [(rnd(i * 9) - 0.5) * 0.9, rnd(i * 4), (rnd(i * 7) - 0.5) * 0.9]};
  }), []);
  if (vis <= 0.01) return null;
  const lift = (1 - eob(vis)) * -0.6;
  return (
    <group position={[p[0], p[1] + lift, p[2]]} rotation={[0, yaw, 0]} scale={0.25 + 0.75 * Math.min(1, vis * 1.2)}>
      <mesh position={[0, 0.53, 0]}><cylinderGeometry args={[0.42, 0.42, 1.04, 48, 1, true]} />{glassMat(0.2)}</mesh>
      <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.42, 0.4, 0.06, 48]} />{glassMat(0.45)}</mesh>
      <mesh position={[0, 1.1, 0]}><cylinderGeometry args={[0.35, 0.42, 0.12, 48, 1, true]} />{glassMat(0.25)}</mesh>
      {pills.map((q, i) => <Tablet key={i} p={q.p} r={q.r} />)}
      <mesh position={[0, 1.33, 0]} castShadow receiveShadow><cylinderGeometry args={[0.45, 0.45, 0.38, 64]} /><meshStandardMaterial color="#fbfbf9" roughness={0.42} /></mesh>
      <mesh position={[0, 1.52, 0]} castShadow><cylinderGeometry args={[0.43, 0.45, 0.02, 64]} /><meshStandardMaterial color="#ffffff" roughness={0.4} /></mesh>
      {Array.from({length: 40}, (_, i) => { const a = (i / 40) * Math.PI * 2; return <mesh key={i} position={[Math.sin(a) * 0.452, 1.33, Math.cos(a) * 0.452]} rotation={[0, a, 0]}><boxGeometry args={[0.018, 0.33, 0.012]} /><meshStandardMaterial color="#efefec" roughness={0.5} /></mesh>; })}
      {label && <mesh position={[0, 0.55, 0]} castShadow><cylinderGeometry args={[0.427, 0.427, 0.74, 64, 1, true, -1.3, 2.6]} /><meshStandardMaterial map={label} roughness={0.6} side={THREE.FrontSide} /></mesh>}
    </group>
  );
};

/** Spray bottle: heavy-based clear glass, white pump, the real label crop (without the benefit line) on its front. */
const SprayBottle: React.FC<{p: V3; vis: number; yaw: number; label: THREE.Texture | null; mist: number}> = ({p, vis, yaw, label, mist}) => {
  const drops = useMemo(() => Array.from({length: 46}, (_, i) => ({a: (rnd(i * 3.3) - 0.5) * 0.7, b: (rnd(i * 1.7) - 0.5) * 0.5, sp: 0.6 + rnd(i * 8.1) * 0.9, r: 0.012 + rnd(i * 2.9) * 0.02})), []);
  if (vis <= 0.01) return null;
  const lift = (1 - eob(vis)) * -0.7;
  return (
    <group position={[p[0], p[1] + lift, p[2]]} rotation={[0, yaw, 0]} scale={0.25 + 0.75 * Math.min(1, vis * 1.2)}>
      <mesh position={[0, 0.74, 0]}><cylinderGeometry args={[0.3, 0.3, 1.36, 48, 1, true]} />{glassMat(0.2)}</mesh>
      <mesh position={[0, 0.09, 0]} castShadow><cylinderGeometry args={[0.3, 0.3, 0.18, 48]} />{glassMat(0.55)}</mesh>
      <mesh position={[0, 0.62, 0]}><cylinderGeometry args={[0.27, 0.27, 1.0, 40]} /><meshPhysicalMaterial color="#fffaf0" transparent opacity={0.12} roughness={0.1} depthWrite={false} /></mesh>
      <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.012, 0.012, 1.3, 8]} /><meshStandardMaterial color="#ffffff" transparent opacity={0.5} /></mesh>
      <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.22, 0.26, 0.2, 40]} /><meshStandardMaterial color="#fafafa" roughness={0.35} /></mesh>
      <mesh position={[0, 1.72, 0]} castShadow><cylinderGeometry args={[0.15, 0.17, 0.26, 40]} /><meshStandardMaterial color="#f6f6f4" roughness={0.35} /></mesh>
      <mesh position={[0, 1.95, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.22, 40]} /><meshStandardMaterial color="#ffffff" roughness={0.3} /></mesh>
      <mesh position={[0.155, 1.97, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.025, 0.025, 0.02, 16]} /><meshStandardMaterial color="#555" /></mesh>
      {label && <mesh position={[0, 0.74, 0]} castShadow><cylinderGeometry args={[0.304, 0.304, 0.82, 64, 1, true, -1.0, 2.0]} /><meshStandardMaterial map={label} roughness={0.55} side={THREE.FrontSide} /></mesh>}
      {mist > 0 && mist < 1 && drops.map((d, i) => {
        const k = clamp(mist * d.sp * 1.2); const x = 0.17 + k * 1.3, y = 1.97 + d.a * k * 0.9, z = d.b * k * 0.9;
        return <mesh key={i} position={[x, y, z]}><sphereGeometry args={[d.r * (1 + k * 2), 8, 8]} /><meshStandardMaterial color="#ffffff" transparent opacity={(1 - mist) * 0.55} roughness={0.2} depthWrite={false} /></mesh>;
      })}
    </group>
  );
};

/** Injection vial: clear glass with shoulder and neck, silver crimp, gold cap, the real label NAME crop with gold stripes. */
const Vial: React.FC<{p: V3; vis: number; yaw: number; label: THREE.Texture | null}> = ({p, vis, yaw, label}) => {
  if (vis <= 0.01) return null;
  const lift = (1 - eob(vis)) * -0.6;
  return (
    <group position={[p[0], p[1] + lift, p[2]]} rotation={[0, yaw, 0]} scale={0.25 + 0.75 * Math.min(1, vis * 1.2)}>
      <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.36, 0.36, 0.92, 48, 1, true]} />{glassMat(0.22)}</mesh>
      <mesh position={[0, 0.05, 0]} castShadow><cylinderGeometry args={[0.36, 0.34, 0.1, 48]} />{glassMat(0.5)}</mesh>
      <mesh position={[0, 0.43, 0]}><cylinderGeometry args={[0.33, 0.33, 0.56, 40]} /><meshPhysicalMaterial color="#fff6e2" transparent opacity={0.16} roughness={0.08} depthWrite={false} /></mesh>
      <mesh position={[0, 1.04, 0]}><cylinderGeometry args={[0.2, 0.36, 0.18, 48, 1, true]} />{glassMat(0.3)}</mesh>
      <mesh position={[0, 1.18, 0]}><cylinderGeometry args={[0.2, 0.2, 0.12, 40]} />{glassMat(0.35)}</mesh>
      <mesh position={[0, 1.3, 0]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.16, 48]} /><meshStandardMaterial color="#d9dde2" metalness={0.6} roughness={0.25} /></mesh>
      <mesh position={[0, 1.43, 0]} castShadow><cylinderGeometry args={[0.27, 0.27, 0.12, 48]} /><meshStandardMaterial color="#d8b25e" metalness={0.65} roughness={0.32} /></mesh>
      {label && <mesh position={[0, 0.52, 0]} castShadow><cylinderGeometry args={[0.364, 0.364, 0.3, 64, 1, true, -1.15, 2.3]} /><meshStandardMaterial map={label} roughness={0.55} side={THREE.FrontSide} /></mesh>}
      {label && [0.37, 0.71].map((y) => <mesh key={y} position={[0, y, 0]}><cylinderGeometry args={[0.366, 0.366, 0.035, 64, 1, true, -1.15, 2.3]} /><meshStandardMaterial color="#c9a24a" metalness={0.9} roughness={0.3} side={THREE.FrontSide} /></mesh>)}
    </group>
  );
};

/** Tape measure: honey case with a crank, and a tape that unrolls along the counter on "beyond". */
const TapeMeasure: React.FC<{len: number; tg: number}> = ({len, tg}) => (
  <group position={[0, 0, 0.35]}>
    <group rotation={[0, -0.35, 0]}>
      <mesh position={[0, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow><cylinderGeometry args={[0.36, 0.36, 0.26, 48]} /><meshStandardMaterial color="#EEB318" roughness={0.38} metalness={0.05} /></mesh>
      {[-0.135, 0.135].map((z) => <mesh key={z} position={[0, 0.36, z]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.24, 0.24, 0.02, 40]} /><meshStandardMaterial color="#1b1d22" roughness={0.5} /></mesh>)}
      <mesh position={[0, 0.36, 0.15]} rotation={[0, 0, tg * 0.6]}><boxGeometry args={[0.28, 0.05, 0.02]} /><meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.25} /></mesh>
      <mesh position={[0.37, 0.06, 0]} castShadow><boxGeometry args={[0.06, 0.12, 0.2]} /><meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.25} /></mesh>
    </group>
    <group position={[0.34, 0.012, 0.12]} rotation={[0, -0.04, 0]}>
      <mesh position={[len / 2, 0, 0]} receiveShadow castShadow><boxGeometry args={[Math.max(0.001, len), 0.012, 0.19]} /><meshStandardMaterial color="#f2d36b" roughness={0.35} metalness={0.15} /></mesh>
      {Array.from({length: Math.floor(len / 0.2)}, (_, i) => <mesh key={i} position={[(i + 0.5) * 0.2, 0.008, 0.06 - (i % 5 === 4 ? 0.025 : 0)]}><boxGeometry args={[0.012, 0.004, i % 5 === 4 ? 0.12 : 0.07]} /><meshStandardMaterial color="#1b1d22" /></mesh>)}
      {len > 0.2 && <mesh position={[len + 0.02, 0.04, 0]} castShadow><boxGeometry args={[0.04, 0.09, 0.21]} /><meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.25} /></mesh>}
    </group>
  </group>
);

const Plant: React.FC<{tg: number}> = ({tg}) => (
  <group position={[-1.9, 0, -1.9]}>
    <mesh position={[0, 0.32, 0]} castShadow receiveShadow><cylinderGeometry args={[0.36, 0.28, 0.64, 40]} /><meshStandardMaterial color="#d9cbb5" roughness={0.85} /></mesh>
    {Array.from({length: 11}, (_, i) => { const a = i * 2.4, tilt = 0.5 + rnd(i) * 0.5, sw = Math.sin(tg * 0.8 + i) * 0.04; return (
      <group key={i} position={[0, 0.6, 0]} rotation={[0, a, tilt + sw]}>
        <mesh position={[0, 0.42, 0]} scale={[0.13, 0.42, 0.035]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color={i % 2 ? '#5d7a4f' : '#6f8d5c'} roughness={0.6} /></mesh>
      </group>
    ); })}
  </group>
);

const WaterGlass: React.FC = () => (
  <group position={[-1.05, 0, 0.55]}>
    <mesh position={[0, 0.5, 0]}><cylinderGeometry args={[0.3, 0.26, 1.0, 48, 1, true]} />{glassMat(0.18)}</mesh>
    <mesh position={[0, 0.03, 0]} castShadow><cylinderGeometry args={[0.26, 0.26, 0.06, 48]} />{glassMat(0.5)}</mesh>
    <mesh position={[0, 0.36, 0]}><cylinderGeometry args={[0.27, 0.255, 0.62, 48]} /><meshPhysicalMaterial color="#e6f3f7" transparent opacity={0.2} roughness={0.05} depthWrite={false} /></mesh>
  </group>
);

/** Tablet device on a wooden stand; the screen is drawn from the spoken progress (form rows fill, then a check). No words on it. */
const Device: React.FC<{on: number; fill: number; check: number}> = ({on, fill, check}) => {
  const q = Math.round(fill * 40) / 40, cq = Math.round(check * 20) / 20, oq = Math.round(on * 10) / 10;
  const tex = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 600; c.height = 820; const g = c.getContext('2d')!;
    g.fillStyle = `rgb(${Math.round(20 + 228 * oq)},${Math.round(22 + 224 * oq)},${Math.round(26 + 214 * oq)})`; g.fillRect(0, 0, 600, 820);
    if (oq > 0.3) {
      g.fillStyle = '#EEB318'; g.fillRect(60, 70, 200, 26);
      for (let i = 0; i < 5; i++) {
        const y = 160 + i * 112; g.fillStyle = '#d9d4ca'; g.fillRect(60, y, 300, 16);
        g.strokeStyle = '#cfc8bb'; g.lineWidth = 4; g.strokeRect(60, y + 34, 480, 50);
        const k = clamp(q * 5 - i); if (k > 0) { g.fillStyle = '#2a2d34'; g.fillRect(78, y + 52, 420 * k * (0.55 + 0.4 * rnd(i)), 14); }
      }
      if (cq > 0) {
        g.globalAlpha = cq; g.fillStyle = '#2f9e66'; g.beginPath(); g.arc(300, 410, 150 * (0.6 + 0.4 * cq), 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 26; g.lineCap = 'round'; g.beginPath(); g.moveTo(232, 412); g.lineTo(285, 465); g.lineTo(375, 360); g.stroke(); g.globalAlpha = 1;
      }
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [q, cq, oq]);
  return (
    <group position={[20.4, 0, -0.1]} rotation={[0, 0.25, 0]}>
      <mesh position={[0, 0.06, -0.15]} castShadow receiveShadow><boxGeometry args={[1.0, 0.12, 0.5]} /><meshStandardMaterial color="#9a7452" roughness={0.6} /></mesh>
      <group position={[0, 0.88, -0.1]} rotation={[-0.2, 0, 0]}>
        <mesh castShadow><boxGeometry args={[1.12, 1.52, 0.06]} /><meshStandardMaterial color="#202227" metalness={0.5} roughness={0.3} /></mesh>
        <mesh position={[0, 0, 0.032]}><planeGeometry args={[1.0, 1.38]} /><meshStandardMaterial map={tex} emissiveMap={tex} emissive="#ffffff" emissiveIntensity={0.55 * on} roughness={0.15} /></mesh>
      </group>
    </group>
  );
};

/** Stethoscope lying on the counter (rubber tube along a curve, steel chest piece, ear tips). */
const Stethoscope: React.FC<{k: number}> = ({k}) => {
  const tube = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0.05, 0], [0.5, 0.05, 0.25], [0.9, 0.05, 0.05], [1.1, 0.05, -0.35], [0.8, 0.05, -0.6], [0.45, 0.05, -0.55], [0.3, 0.05, -0.35]].map((p) => new THREE.Vector3(...p))), 80, 0.03, 10, false), []);
  const ears = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0.3, 0.05, -0.35], [0.05, 0.05, -0.5], [-0.15, 0.05, -0.75]].map((p) => new THREE.Vector3(...p))), 30, 0.018, 8, false), []);
  if (k <= 0.01) return null;
  return (
    <group position={[21.3 + (1 - k) * 1.8, 0, 0.75]} rotation={[0, (1 - k) * 0.8 - 0.2, 0]}>
      <mesh geometry={tube} castShadow><meshStandardMaterial color="#2b2e35" roughness={0.45} /></mesh>
      <mesh geometry={ears} castShadow><meshStandardMaterial color="#c7ccd2" metalness={1} roughness={0.2} /></mesh>
      <mesh position={[0, 0.05, 0]} castShadow><cylinderGeometry args={[0.2, 0.2, 0.08, 40]} /><meshStandardMaterial color="#c7ccd2" metalness={1} roughness={0.18} /></mesh>
      <mesh position={[0, 0.095, 0]}><cylinderGeometry args={[0.17, 0.17, 0.01, 40]} /><meshStandardMaterial color="#e8ebee" metalness={0.3} roughness={0.4} /></mesh>
      <mesh position={[-0.15, 0.05, -0.75]} castShadow><sphereGeometry args={[0.04, 16, 16]} /><meshStandardMaterial color="#2b2e35" /></mesh>
    </group>
  );
};

/** Kraft shipping box: drops in on "pharmacy", flaps close on "prescribed", then a strip of tape. */
const ShipBox: React.FC<{k: number; close: number; tape: number}> = ({k, close, tape}) => {
  if (k <= 0.01) return null;
  const W = 1.1, D = 0.8, H = 0.7, th = 0.025, kraft = '#c39a6b';
  const m = <meshStandardMaterial color={kraft} roughness={0.92} />;
  const fl = (1 - close) * 2.1;
  return (
    <group position={[22.7, (1 - eob(k)) * 2.2, -0.3]} rotation={[0, -0.35 + (1 - k) * 0.6, 0]}>
      <mesh position={[0, th / 2, 0]} castShadow receiveShadow><boxGeometry args={[W, th, D]} />{m}</mesh>
      <mesh position={[0, H / 2, D / 2]} castShadow receiveShadow><boxGeometry args={[W, H, th]} />{m}</mesh>
      <mesh position={[0, H / 2, -D / 2]} castShadow receiveShadow><boxGeometry args={[W, H, th]} />{m}</mesh>
      <mesh position={[W / 2, H / 2, 0]} castShadow receiveShadow><boxGeometry args={[th, H, D]} />{m}</mesh>
      <mesh position={[-W / 2, H / 2, 0]} castShadow receiveShadow><boxGeometry args={[th, H, D]} />{m}</mesh>
      <group position={[0, H, D / 2]} rotation={[fl, 0, 0]}><mesh position={[0, 0, -D / 4]} castShadow><boxGeometry args={[W, th, D / 2]} />{m}</mesh></group>
      <group position={[0, H, -D / 2]} rotation={[-fl, 0, 0]}><mesh position={[0, 0.002, D / 4]} castShadow><boxGeometry args={[W, th, D / 2]} />{m}</mesh></group>
      {tape > 0 && <mesh position={[0, H + 0.02, 0]}><boxGeometry args={[0.22, 0.006, D * tape]} /><meshStandardMaterial color="#d9c49a" roughness={0.3} transparent opacity={0.85} /></mesh>}
      <mesh position={[0.18, 0.3, 0.02]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.5, 32]} /><meshStandardMaterial color="#f4f4f2" roughness={0.45} /></mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ the room */
const Room: React.FC = () => {
  const stone = useMemo(() => { const t = noiseTex(3, '#e8dfd1', '#8b7a66', 2600, 9); t.repeat.set(6, 1); return t; }, []);
  const plaster = useMemo(() => { const t = noiseTex(9, '#efe6d8', '#b09d86', 1800); t.repeat.set(5, 2); return t; }, []);
  const hide = <meshBasicMaterial colorWrite={false} depthWrite={false} />;
  return (
    <>
      <mesh position={[11, -0.35, -0.3]} receiveShadow castShadow><boxGeometry args={[40, 0.7, 5.6]} /><meshStandardMaterial map={stone} roughness={0.5} metalness={0} /></mesh>
      <mesh position={[11, 2.5, -3.2]} receiveShadow><planeGeometry args={[60, 9]} /><meshStandardMaterial map={plaster} roughness={0.95} /></mesh>
      <mesh position={[11, 0.06, -3.12]} receiveShadow castShadow><boxGeometry args={[40, 0.12, 0.12]} /><meshStandardMaterial color="#d6cab7" roughness={0.7} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[11, -1.8, 4]} receiveShadow><planeGeometry args={[80, 40]} /><meshStandardMaterial color="#b89a78" roughness={0.8} /></mesh>
      {/* invisible window mullions between the sun and the room: they only cast soft window-shaped light onto the wall */}
      {Array.from({length: 6}, (_, i) => <mesh key={'v' + i} position={[-14 + i * 7.5, 7.5, 9]} castShadow><boxGeometry args={[0.22, 9, 0.22]} />{hide}</mesh>)}
      <mesh position={[4, 6.4, 9]} castShadow><boxGeometry args={[40, 0.2, 0.22]} />{hide}</mesh>
    </>
  );
};

const Sun: React.FC<{cx: number}> = ({cx}) => {
  const light = useMemo(() => { const l = new THREE.DirectionalLight('#ffe2b8', 2.6); l.castShadow = true; l.shadow.mapSize.set(2048, 2048); l.shadow.radius = 14; l.shadow.blurSamples = 16; l.shadow.bias = -0.0004; l.shadow.normalBias = 0.02; return l; }, []);
  const off = new THREE.Vector3(-7, 11, 13);
  light.position.set(cx + off.x, off.y, off.z); light.target.position.set(cx, 0, -1); light.target.updateMatrixWorld();
  const cam = light.shadow.camera as THREE.OrthographicCamera; cam.left = -10; cam.right = 10; cam.top = 9; cam.bottom = -9; cam.near = 1; cam.far = 50; cam.updateProjectionMatrix();
  return <><primitive object={light} /><primitive object={light.target} /></>;
};

export const WellWorld: React.FC<{w: number; h: number; dy: number; tg: number; words: Word[]}> = ({w, h, dy, tg, words}) => {
  const ready = useFontReady();
  const c = useMemo(() => cuesOf(words), [words]);
  const poses = useMemo(() => posesOf(c), [c]);
  const {pos, look} = camAt(poses, tg);
  const imF = useImage('engine/products/well-finasteride-oral-tablets-bottle.webp');
  const imM = useImage('engine/products/well-oral-minoxidil-tablets-bottle.webp');
  const imS = useImage('engine/products/well-hair-loss-spray-men-bottle.webp');
  const imN = useImage('engine/products/well-nad-injection-vial.webp');
  const imR = useImage('engine/products/well-sermorelin-injection-vial.webp');
  const lbF = useCrop(imF, 720, 900, 150, 352, 570, 686);
  const lbM = useCrop(imM, 720, 900, 150, 352, 570, 686);
  const lbS = useCrop(imS, 720, 900, 268, 362, 452, 606);
  const lbN = useCrop(imN, 800, 1000, 105, 482, 465, 612);
  const lbR = useCrop(imR, 800, 1000, 200, 478, 600, 612);

  const face = (x: number, z: number) => Math.atan2(pos[0] - x, pos[2] - z) * 0.85;
  const sway = (i: number) => Math.sin(tg * 0.45 + i) * 0.22;
  const up = (t0: number) => clamp((tg - t0 + 0.15) / 0.7);
  const chip = (t0: number, t1 = 1e9) => eob((tg - t0) / 0.4) * (1 - ease((tg - t1) / 0.4));
  const tapeLen = 0.35 + 6.2 * ease((tg - c.beyond + 0.1) / 1.6);
  const loose = clamp((tg - c.oral) / 0.8);
  const mist = c.spray > 0 ? (tg - c.spray - 0.1) / 1.3 : -1;
  const camX = look[0];
  return (
    <ThreeCanvas width={Math.round(w)} height={Math.round(h)} shadows="variance" camera={{fov: 40, position: [1.7, 1.45, 4.3], near: 0.05, far: 80}} gl={{antialias: true, alpha: false}}>
      <color attach="background" args={['#e6d9c6']} />
      <fog attach="fog" args={['#e6d9c6', 11, 30]} />
      <Env />
      <Rig pos={pos} look={look} dy={dy} W={Math.round(w)} H={Math.round(h)} />
      <hemisphereLight args={['#fff3df', '#b8956f', 0.9]} />
      <ambientLight intensity={0.12} />
      <Sun cx={camX} />
      <pointLight position={[camX + 3, 3.2, 3.5]} intensity={6} distance={12} color="#ffd9a8" />
      <Room />
      <Plant tg={tg} />
      <WaterGlass />
      <TapeMeasure len={tapeLen} tg={tg} />
      <Chip text="Weight loss" at={[0.1, 1.15, 0.35]} cam={pos} s={chip(-1, c.hair - 0.6)} ready={ready} />

      {/* hair loss tray */}
      <mesh position={[7.4, 0.04, -0.05]} castShadow receiveShadow><boxGeometry args={[3.6, 0.08, 2.0]} /><meshStandardMaterial color="#d8cbb8" roughness={0.45} /></mesh>
      {loose > 0 && Array.from({length: 6}, (_, i) => <Tablet key={i} p={[6.0 + i * 0.27 + rnd(i) * 0.1, 0.11 + (1 - ease(loose - i * 0.08)) * 0.5, 0.75 + rnd(i * 3) * 0.25]} r={[0, rnd(i) * 3, (1 - ease(loose)) * 2]} />)}
      <PillBottle p={[6.5, 0.08, 0.35]} vis={up(c.fin)} yaw={face(6.5, 0.35) + sway(1) * 0.6} label={lbF} />
      <PillBottle p={[7.65, 0.08, -0.2]} vis={up(c.minox)} yaw={face(7.65, -0.2) + sway(2) * 0.6} label={lbM} />
      <SprayBottle p={[8.65, 0.08, -0.55]} vis={up(c.topical)} yaw={face(8.65, -0.55) + sway(3) * 0.4} label={lbS} mist={mist} />
      <Chip text="Oral finasteride" at={[6.5, 2.05, 0.35]} cam={pos} s={chip(c.fin, c.nad - 0.8)} ready={ready} />
      <Chip text="Oral minoxidil" at={[7.65, 2.05, -0.2]} cam={pos} s={chip(c.minox, c.nad - 0.8)} ready={ready} />
      <Chip text="Compounded topical spray" at={[8.65, 2.55, -0.55]} cam={pos} s={chip(c.topical, c.nad - 0.8)} ready={ready} />

      {/* compounded NAD+ and sermorelin on a slate plinth */}
      <mesh position={[14.0, 0.2, -0.1]} castShadow receiveShadow><boxGeometry args={[2.8, 0.4, 1.7]} /><meshStandardMaterial color="#3c3e44" roughness={0.75} /></mesh>
      <Vial p={[13.5, 0.4, 0.15]} vis={up(c.nad)} yaw={face(13.5, 0.15) + sway(4) * 0.5} label={lbN} />
      <Vial p={[14.55, 0.4, -0.25]} vis={up(c.ser)} yaw={face(14.55, -0.25) + sway(5) * 0.5} label={lbR} />
      <Chip text="Compounded. Not FDA-approved." at={[14.0, 2.45, -0.05]} cam={pos} s={chip(c.fda, c.online - 0.6)} ready={ready} />
      <Chip text="Individual clinical assessment required." at={[14.0, 2.05, -0.05]} cam={pos} s={chip(c.indiv, c.online - 0.6)} color="#ffe08a" ready={ready} />

      {/* online care */}
      <Device on={clamp((tg - c.online + 0.2) / 0.6)} fill={clamp((tg - c.intake) / 1.6)} check={clamp((tg - c.review) / 0.5)} />
      <Stethoscope k={ease((tg - c.provider + 0.1) / 0.9)} />
      <ShipBox k={clamp((tg - c.pharmacy + 0.1) / 0.8)} close={ease((tg - c.prescribed) / 0.9)} tape={ease((tg - c.prescribed - 0.8) / 0.5)} />
      <Chip text="Health history intake" at={[20.4, 2.15, -0.1]} cam={pos} s={chip(c.intake, c.explore - 0.3)} ready={ready} />
      <Chip text="Licensed provider review" at={[21.4, 1.0, 0.8]} cam={pos} s={chip(c.provider, c.explore - 0.3)} ready={ready} />
      <Chip text="Pharmacy fulfillment, if prescribed" at={[22.7, 1.55, -0.3]} cam={pos} s={chip(c.pharmacy, c.explore - 0.3)} ready={ready} />
    </ThreeCanvas>
  );
};
