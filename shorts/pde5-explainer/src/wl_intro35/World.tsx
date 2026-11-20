import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {Txt, useFontReady} from '../engine/stage3d';
import {wcue} from '../engine/world3d';
import {Word, Seg, clamp, eob} from '../engine/ui';

/**
 * "Weight-loss care. Without the waiting room." One continuous, warmly lit 3D room; the camera glides along it on the spoken words.
 *   hook  : an empty row of waiting-room chairs and a fast clock; on "without" they slide away and the camera moves on
 *   b1    : two travertine plinths; an ILLUSTRATIVE glass vial lands on each on its name; a clipboard checks off on "evaluation"
 *   b2    : three thick frosted-glass tiles swing in on "intake", "provider", "delivered"
 *   b3    : a phone fills in a generic intake form on "phone"; a plain kraft box closes and slides forward on "ships" / "door";
 *           a paper hang tag swings in on "transparent"
 *   cta   : the camera rises over the whole room for the end card
 * Vials carry no text or brand (a blank paper band only); the box and tag are generic. Everything is an illustration.
 */
type V3 = [number, number, number];
type Cu = Record<string, number>;
const ease = (x: number) => { const c = clamp(x); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const lerp3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const win = (tg: number, t0: number, d = 0.6) => ease((tg - t0) / d);

export const S = {hook: -9, s1: 0, s2: 9, s3: 18};

const KEYS: [string, string][] = [
  ['without', 'without'], ['two', 'two'], ['sema', 'semaglutide'], ['tirz', 'tirzepatide'], ['evaln', 'evaluation'], ['intake', 'intake'],
  ['prov', 'provider#2'], ['deliv', 'delivered'], ['phone', 'phone'], ['presc', 'prescribed'], ['ships', 'ships'], ['door', 'door'],
  ['transp', 'transparent'], ['member', 'membership'], ['explore', 'explore'],
];
export const cuesOf = (words: Word[], segs: Seg[]): Cu => {
  const out: Cu = {}; let prev = 0.3;
  for (const [k, v] of KEYS) { let t = wcue(words, v); if (!Number.isFinite(t)) t = prev + 0.6; out[k] = Math.max(t, prev + 0.05); prev = out[k]; }
  const seg = (id: string, f: number) => segs.find((s) => s.id === id)?.t0 ?? f;
  out.b1 = seg('b1', out.two - 0.1); out.b2 = seg('b2', out.intake - 1); out.b3 = seg('b3', out.phone - 0.5); out.cta = seg('cta', out.member + 2);
  return out;
};

/* ------------------------------------------------------------------ camera: keyframes on spoken words */
type Key = {t: number; pos: V3; look: V3; d?: number};
const keysOf = (c: Cu, end: number): Key[] => {
  const k: Key[] = [
    {t: 0, pos: [-9.4, 2.2, 7.6], look: [-9, 1.15, 0]},
    {t: c.b1 + 0.6, pos: [0.3, 2.6, 9.8], look: [0, 1.05, 0], d: Math.max(1.2, c.b1 + 0.5 - c.without)},
    {t: c.sema + 0.35, pos: [-1.6, 2.0, 7.2], look: [-1.0, 1.15, 0]},
    {t: c.tirz + 0.35, pos: [1.6, 2.0, 7.2], look: [1.0, 1.15, 0]},
    {t: c.evaln + 0.3, pos: [0.2, 2.9, 9.4], look: [0, 1.15, -0.4]},
    {t: c.b2 + 0.9, pos: [9.6, 2.7, 10.8], look: [9, 2.0, 0]},
    {t: c.intake + 0.3, pos: [8.6, 3.3, 10.0], look: [9, 2.6, 0]},
    {t: c.prov + 0.3, pos: [9.5, 2.4, 10.0], look: [9, 2.0, 0]},
    {t: c.deliv + 0.3, pos: [8.7, 1.7, 10.0], look: [9, 1.5, 0]},
    {t: c.b3 + 0.55, pos: [16.9, 2.0, 6.7], look: [17.4, 1.35, 0]},
    {t: c.door + 0.3, pos: [19.3, 2.2, 6.4], look: [19.6, 0.9, 0.9]},
    {t: c.transp + 0.9, pos: [18.6, 2.5, 9.6], look: [18.7, 1.45, 0.3]},
    {t: c.cta + 1.0, pos: [9.5, 8.5, 19.5], look: [8.5, 1.4, 0]},
    {t: end + 1, pos: [11.0, 9.2, 18.6], look: [8.5, 1.4, 0]},
  ];
  for (let i = 1; i < k.length; i++) k[i].t = Math.max(k[i].t, k[i - 1].t + 0.35);
  return k;
};
const camAt = (keys: Key[], tg: number) => {
  let i = 0; while (i < keys.length - 2 && tg >= keys[i + 1].t) i++;
  const a = keys[i], b = keys[i + 1];
  const D = Math.max(0.4, Math.min(b.d ?? 1.5, b.t - a.t));          // keys are ARRIVAL times: hold (drifting), then glide in to land on the cue
  const k = ease((tg - (b.t - D)) / D);
  const pos = lerp3(a.pos, b.pos, k), look = lerp3(a.look, b.look, k);
  // a slow hand-held drift so the camera is never dead still
  pos[0] += Math.sin(tg * 0.45) * 0.12; pos[1] += Math.sin(tg * 0.7 + 1) * 0.05; pos[2] += Math.cos(tg * 0.35) * 0.1;
  return {pos, look};
};
const Rig: React.FC<{pos: V3; look: V3}> = ({pos, look}) => {
  const {camera} = useThree();
  camera.position.set(...pos); camera.lookAt(...look); camera.updateMatrixWorld();
  return null;
};

/* ------------------------------------------------------------------ materials and textures */
const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat?: [number, number]) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
};
const rnd = (s: number) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};

const useWoodTex = () => useMemo(() => canvasTex(1024, 1024, (g) => {
  for (let i = 0; i < 8; i++) {
    const base = 150 + rnd(i) * 30;
    const pg = g.createLinearGradient(0, i * 128, 0, i * 128 + 128); pg.addColorStop(0, `rgb(${base + 34},${base - 4},${base - 62})`); pg.addColorStop(1, `rgb(${base + 22},${base - 16},${base - 72})`);
    g.fillStyle = pg; g.fillRect(0, i * 128, 1024, 128);
    for (let n = 0; n < 2; n++) { const kx = rnd(i * 13 + n) * 1024, ky = i * 128 + 30 + rnd(i * 17 + n) * 68; const kg = g.createRadialGradient(kx, ky, 1, kx, ky, 14); kg.addColorStop(0, 'rgba(80,45,15,.55)'); kg.addColorStop(1, 'rgba(80,45,15,0)'); g.fillStyle = kg; g.beginPath(); g.ellipse(kx, ky, 26, 9, 0, 0, Math.PI * 2); g.fill(); }
    for (let k = 0; k < 90; k++) {
      const y = i * 128 + rnd(i * 100 + k) * 128, a = 0.05 + rnd(k * 7 + i) * 0.08;
      g.strokeStyle = `rgba(110,70,30,${a})`; g.lineWidth = 1 + rnd(k) * 2; g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 64) g.lineTo(x, y + Math.sin(x * 0.006 + k) * 3); g.stroke();
    }
    g.fillStyle = 'rgba(55,32,12,.6)'; g.fillRect(0, i * 128, 1024, 3);
    const cut = rnd(i * 3) * 1024; g.fillRect(cut, i * 128, 2, 128);
  }
}, [6, 2.4]), []);

/** Warm cream wall with soft window light falling across it (pre-blurred, so it reads as out of focus behind the subject). */
const useWallTex = () => useMemo(() => canvasTex(2048, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 512); gr.addColorStop(0, '#e9dbbd'); gr.addColorStop(0.75, '#e2cfa8'); gr.addColorStop(1, '#c9b38a'); g.fillStyle = gr; g.fillRect(0, 0, 2048, 512);
  for (let i = 0; i < 9000; i++) { g.fillStyle = rnd(i * 3) > 0.5 ? `rgba(255,250,235,${rnd(i) * 0.08})` : `rgba(120,95,60,${rnd(i) * 0.06})`; g.fillRect(rnd(i * 5) * 2048, rnd(i * 7) * 512, 2, 2); }
  g.filter = 'blur(26px)';
  for (let w = 0; w < 6; w++) {
    const x0 = 120 + w * 340;
    for (let p = 0; p < 2; p++) for (let q = 0; q < 2; q++) {
      g.fillStyle = 'rgba(255,236,190,.7)';
      g.beginPath(); const x = x0 + p * 92, y = 70 + q * 120;
      g.moveTo(x, y); g.lineTo(x + 80, y - 10); g.lineTo(x + 120, y + 100); g.lineTo(x + 40, y + 110); g.closePath(); g.fill();
    }
  }
  g.filter = 'none';
}), []);

const PAPER = '#f6efe1';
const useLabelTex = () => useMemo(() => canvasTex(512, 256, (g) => {
  g.fillStyle = PAPER; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(120,100,70,${rnd(i) * 0.06})`; g.fillRect(rnd(i * 3) * 512, rnd(i * 5) * 256, 2, 2); }
  g.fillStyle = '#EEB318'; g.fillRect(0, 22, 512, 10); g.fillRect(0, 224, 512, 10);
}), []);

/* ------------------------------------------------------------------ environment */
const Env: React.FC = () => {
  const {gl, scene} = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    (scene as THREE.Scene & {environmentIntensity?: number}).environmentIntensity = 0.5;
  }, [gl, scene]);
  return null;
};
const KeyLight: React.FC<{x: number}> = ({x}) => {
  const target = useMemo(() => new THREE.Object3D(), []);
  target.position.set(x, 0.6, 0); target.updateMatrixWorld();
  return (
    <>
      <primitive object={target} />
      <directionalLight position={[x - 5, 9, 7]} target={target} intensity={3.9} color="#ffd59a" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
        shadow-camera-left={-8} shadow-camera-right={8} shadow-camera-top={8} shadow-camera-bottom={-8} shadow-camera-near={1} shadow-camera-far={30} />
    </>
  );
};

/* ------------------------------------------------------------------ text that always faces the camera */
const faceCam = (at: V3, cam: V3): V3 => {
  const dx = cam[0] - at[0], dy = cam[1] - at[1], dz = cam[2] - at[2];
  return [-Math.atan2(dy, Math.hypot(dx, dz)), Math.atan2(dx, dz), 0];
};
const NameChip: React.FC<{top: string; name: string; at: V3; cam: V3; s: number; ready: boolean}> = ({top, name, at, cam, s, ready}) => {
  // one baked texture (a dark rounded pill with two lines), so transparent planes never sort over each other
  const tex = useMemo(() => canvasTex(640, 256, (g) => {
    g.fillStyle = 'rgba(18,20,25,.9)'; rr(g, 6, 6, 628, 244, 64); g.fill();
    g.strokeStyle = 'rgba(238,179,24,.75)'; g.lineWidth = 6; rr(g, 6, 6, 628, 244, 64); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#F4C855'; g.font = '700 54px Outfit, system-ui'; g.fillText(top, 320, 84);
    g.fillStyle = '#ffffff'; g.font = '800 84px Outfit, system-ui'; g.fillText(name, 320, 166);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [top, name, ready]);
  if (s <= 0.02) return null;
  return (
    <group position={at} rotation={faceCam(at, cam)} scale={s}>
      <mesh><planeGeometry args={[1.35, 0.54]} /><meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} /></mesh>
    </group>
  );
};
const useKraftTex = () => useMemo(() => canvasTex(512, 512, (g) => {
  g.fillStyle = '#c49a64'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) { const a = rnd(i) * 0.08; g.fillStyle = rnd(i * 7) > 0.5 ? `rgba(90,60,25,${a})` : `rgba(255,235,200,${a})`; g.fillRect(rnd(i * 3) * 512, rnd(i * 5) * 512, 1 + rnd(i * 11) * 6, 1); }
  for (let y = 0; y < 512; y += 9) { g.fillStyle = 'rgba(80,55,25,.035)'; g.fillRect(0, y, 512, 3); }
}, [1, 1]), []);

/* ------------------------------------------------------------------ hook: the waiting room */
const useFabricTex = () => useMemo(() => canvasTex(256, 256, (g) => {
  g.fillStyle = '#525a66'; g.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) { g.fillStyle = `rgba(0,0,0,${0.05 + rnd(y) * 0.06})`; g.fillRect(0, y, 256, 1); }
  for (let x = 0; x < 256; x += 3) { g.fillStyle = `rgba(255,255,255,${0.02 + rnd(x * 3) * 0.03})`; g.fillRect(x, 0, 1, 256); }
}, [2, 2]), []);
const Chair: React.FC<{x: number; k: number; i: number}> = ({x, k, i}) => {
  const seat = useMemo(() => new RoundedBoxGeometry(0.92, 0.13, 0.86, 3, 0.05), []);
  const back = useMemo(() => new RoundedBoxGeometry(0.92, 0.82, 0.12, 3, 0.05), []);
  if (k >= 0.99) return null;
  const fabricTex = useFabricTex();
  const fabric = <meshStandardMaterial map={fabricTex} roughness={0.95} />;
  return (
    <group position={[x - k * (5 + i * 0.6), k * 0.4, -1.5 - k * 1.2]} rotation={[0, k * 0.8, 0]} scale={1 - k * 0.85}>
      <mesh geometry={seat} position={[0, 0.5, 0]} castShadow receiveShadow>{fabric}</mesh>
      <mesh geometry={back} position={[0, 0.98, -0.38]} rotation={[-0.08, 0, 0]} castShadow>{fabric}</mesh>
      {[[-0.38, -0.34], [0.38, -0.34], [-0.38, 0.34], [0.38, 0.34]].map(([lx, lz], j) => (
        <mesh key={j} position={[lx, 0.22, lz]} castShadow><cylinderGeometry args={[0.03, 0.03, 0.44, 10]} /><meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.25} /></mesh>
      ))}
    </group>
  );
};
const Clock: React.FC<{tg: number; c: Cu}> = ({tg, c}) => {
  const face = useMemo(() => canvasTex(256, 256, (g) => {
    g.fillStyle = '#fbf7ee'; g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#121419';
    for (let i = 0; i < 12; i++) { const a = (i * Math.PI) / 6; g.lineWidth = i % 3 === 0 ? 8 : 4; g.beginPath(); g.moveTo(128 + Math.cos(a) * 100, 128 + Math.sin(a) * 100); g.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116); g.stroke(); }
  }), []);
  const k = win(tg, c.b1 + 1.5, 0.8); if (k >= 0.99) return null;
  const spin = Math.min(tg, c.without + 0.2) * 3.2;          // minutes racing by while you wait, then it stops
  return (
    <group position={[S.hook + 1.45, 2.2 + k * 2, -2.88]} scale={(1 - k) * 0.8}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.56, 0.56, 0.08, 48]} /><meshStandardMaterial color="#2a2d34" metalness={0.6} roughness={0.35} /></mesh>
      <mesh position={[0, 0, 0.045]}><circleGeometry args={[0.5, 48]} /><meshStandardMaterial map={face} roughness={0.6} /></mesh>
      <mesh position={[0, 0, 0.06]} rotation={[0, 0, -spin]}><boxGeometry args={[0.035, 0.8, 0.01]} /><meshStandardMaterial color="#121419" /></mesh>
      <mesh position={[0, 0, 0.065]} rotation={[0, 0, -spin / 12]}><boxGeometry args={[0.05, 0.5, 0.01]} /><meshStandardMaterial color="#121419" /></mesh>
      <mesh position={[0, 0, 0.07]}><circleGeometry args={[0.04, 16]} /><meshStandardMaterial color="#EEB318" /></mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ b1: illustrative vials */
const Vial: React.FC<{cap: string; label: THREE.Texture; spin: number}> = ({cap, label, spin}) => {
  const glass = useMemo(() => {
    const p = [[0.001, 0], [0.4, 0], [0.43, 0.025], [0.44, 0.08], [0.44, 1.0], [0.425, 1.1], [0.31, 1.19], [0.22, 1.25], [0.21, 1.33], [0.25, 1.35], [0.25, 1.41], [0.001, 1.41]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(p, 64);
  }, []);
  return (
    <group rotation={[0, spin, 0]}>
      <mesh geometry={glass} castShadow>
        <meshPhysicalMaterial color="#f6fbff" transmission={1} thickness={0.14} roughness={0.02} ior={1.52} clearcoat={1} clearcoatRoughness={0.03} specularIntensity={1} envMapIntensity={1.7} />
      </mesh>
      <mesh position={[0, 0.045, 0]}><cylinderGeometry args={[0.41, 0.42, 0.09, 48]} /><meshPhysicalMaterial color="#eef6f8" transmission={1} thickness={0.5} roughness={0.05} ior={1.52} envMapIntensity={1.5} /></mesh>
      <mesh position={[0, 0.47, 0]}><cylinderGeometry args={[0.405, 0.405, 0.74, 48]} /><meshPhysicalMaterial color="#fbfdff" transmission={1} thickness={0.5} roughness={0.0} ior={1.33} envMapIntensity={1.2} /></mesh>
      <mesh position={[0, 0.84, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.36, 0.405, 48]} /><meshPhysicalMaterial color="#ffffff" transmission={0.7} roughness={0.05} transparent opacity={0.55} envMapIntensity={2} /></mesh>
      <mesh position={[0, 0.56, 0]} castShadow><cylinderGeometry args={[0.448, 0.448, 0.5, 64, 1, true]} /><meshStandardMaterial map={label} roughness={0.92} /></mesh>
      <mesh position={[0, 1.4, 0]} castShadow><cylinderGeometry args={[0.262, 0.262, 0.15, 40]} /><meshStandardMaterial color="#d3d7dd" metalness={1} roughness={0.22} /></mesh>
      {[1.345, 1.455].map((y) => <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.262, 0.012, 8, 40]} /><meshStandardMaterial color="#b9bec6" metalness={1} roughness={0.3} /></mesh>)}
      <mesh position={[0, 1.5, 0]} castShadow><cylinderGeometry args={[0.25, 0.258, 0.07, 40]} /><meshPhysicalMaterial color={cap} roughness={0.38} clearcoat={0.6} clearcoatRoughness={0.3} /></mesh>
      <mesh position={[0, 1.536, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.2, 40]} /><meshStandardMaterial color={cap} roughness={0.55} /></mesh>
    </group>
  );
};
const useStoneTex = () => useMemo(() => canvasTex(512, 256, (g) => {
  g.fillStyle = '#e4d8c3'; g.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(150,125,90,${0.05 + rnd(i) * 0.1})`; g.fillRect(0, rnd(i * 3) * 256, 512, 1 + rnd(i * 7) * 3); }
  for (let i = 0; i < 260; i++) { g.fillStyle = 'rgba(120,95,65,.25)'; g.beginPath(); g.ellipse(rnd(i * 5) * 512, rnd(i * 11) * 256, 1 + rnd(i) * 5, 0.6 + rnd(i * 2) * 1.2, 0, 0, Math.PI * 2); g.fill(); }
}), []);
const Plinth: React.FC<{x: number; k: number}> = ({x, k}) => {
  const stone = useStoneTex();
  return (
    <mesh position={[x, 0.25 * k, 0]} scale={[1, Math.max(0.001, k), 1]} castShadow receiveShadow>
      <cylinderGeometry args={[0.72, 0.76, 0.5, 64]} /><meshStandardMaterial map={stone} roughness={0.7} />
    </mesh>
  );
};
const Clipboard: React.FC<{tg: number; c: Cu; ready: boolean}> = ({tg, c, ready}) => {
  const k = win(tg, c.evaln - 0.35, 0.7);
  const ticks = Math.min(3, Math.max(0, Math.floor((tg - c.evaln + 0.1) / 0.35) + 1));
  const board = useMemo(() => new RoundedBoxGeometry(1.25, 1.65, 0.05, 3, 0.04), []);
  const paper = useMemo(() => canvasTex(384, 480, (g) => {
    g.fillStyle = '#fffdf8'; g.fillRect(0, 0, 384, 480);
    for (let i = 0; i < 3; i++) {
      const y = 110 + i * 120;
      g.strokeStyle = '#121419'; g.lineWidth = 6; rr(g, 34, y - 30, 60, 60, 12); g.stroke();
      g.fillStyle = 'rgba(18,20,25,.18)'; rr(g, 120, y - 14, 220 - i * 30, 28, 14); g.fill();
      if (i < ticks) { g.strokeStyle = '#D6A21E'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(44, y); g.lineTo(60, y + 18); g.lineTo(90, y - 22); g.stroke(); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ticks, ready]);
  if (k <= 0.01 || tg > c.b2 + 0.8) return null;
  return (
    <group position={[0, 1.15 + (1 - k) * -1.2, -1.15]} rotation={[-0.12, 0, 0]} scale={k}>
      <mesh geometry={board} castShadow><meshStandardMaterial color="#8a6a45" roughness={0.6} /></mesh>
      <mesh position={[0, -0.05, 0.03]}><planeGeometry args={[1.1, 1.38]} /><meshStandardMaterial map={paper} roughness={0.9} /></mesh>
      <mesh position={[0, 0.78, 0.05]} castShadow><boxGeometry args={[0.5, 0.12, 0.08]} /><meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.25} /></mesh>
    </group>
  );
};

/* ------------------------------------------------------------------ b2: frosted glass tiles */
const TILES = [{t: 'Online medical intake', y: 3.05, z: 0, cue: 'intake'}, {t: 'Licensed provider review', y: 1.95, z: 0.3, cue: 'prov'}, {t: 'Prescription delivery, if approved', y: 0.85, z: 0.6, cue: 'deliv'}];
const Tile: React.FC<{i: number; tg: number; c: Cu; ready: boolean}> = ({i, tg, c, ready}) => {
  const geo = useMemo(() => new RoundedBoxGeometry(3.3, 0.86, 0.16, 4, 0.08), []);
  const T = TILES[i], t0 = c[T.cue] - 0.15, k = eob((tg - t0) / 0.7), out = win(tg, c.b3 + 0.7, 0.8);
  if (k <= 0.01 || out >= 0.99) return null;
  const active = Math.exp(-Math.max(0, tg - t0) / 1.6);
  return (
    <group position={[S.s2 + (1 - k) * 1.6, T.y + Math.sin(tg * 1.1 + i) * 0.03, T.z]} rotation={[0, (1 - clamp(k)) * -1.3 + Math.sin(tg * 0.6 + i) * 0.05, 0]} scale={clamp(k) * (1 - out)}>
      <mesh geometry={geo} castShadow><meshPhysicalMaterial color="#fffaf0" transmission={0.55} thickness={0.6} roughness={0.32} ior={1.45} clearcoat={1} clearcoatRoughness={0.2} /></mesh>
      <mesh position={[-1.3, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[0.26, 0.26, 0.08, 40]} /><meshStandardMaterial color="#EEB318" metalness={0.35} roughness={0.3} emissive="#EEB318" emissiveIntensity={0.15 + active * 0.5} /></mesh>
      <Txt text={String(i + 1)} w={0.4} h={0.4} pos={[-1.3, 0, 0.15]} color="#241C0C" ready={ready} />
      <Txt text={T.t} w={2.5} h={0.42} pos={[0.2, 0, 0.09]} color="#121419" ready={ready} />
    </group>
  );
};

/* ------------------------------------------------------------------ b3: phone, box, tag */
const ROWS = ['Health history', 'Current medications', 'Goals'];
const Phone: React.FC<{tg: number; c: Cu; ready: boolean}> = ({tg, c, ready}) => {
  const body = useMemo(() => new RoundedBoxGeometry(1.05, 2.12, 0.1, 6, 0.13), []);
  const p = clamp((tg - c.phone) / Math.max(1, c.presc - c.phone + 0.6)), q = Math.round(p * 24);
  const screen = useMemo(() => canvasTex(480, 980, (g) => {
    g.fillStyle = '#050608'; g.fillRect(0, 0, 480, 980); rr(g, 0, 0, 480, 980, 54); g.save(); g.clip(); g.fillStyle = '#ffffff'; g.fillRect(0, 0, 480, 980);
    g.fillStyle = '#FDF2D0'; g.fillRect(0, 0, 480, 200); g.fillStyle = '#050608'; rr(g, 186, 22, 108, 32, 16); g.fill();
    g.fillStyle = '#121419'; g.font = '800 46px Outfit, system-ui'; g.fillText('Medical intake', 34, 128);
    g.fillStyle = 'rgba(18,20,25,.12)'; rr(g, 34, 166, 412, 16, 8); g.fill();
    g.fillStyle = '#EEB318'; rr(g, 34, 166, Math.max(16, 412 * (q / 24)), 16, 8); g.fill();
    ROWS.forEach((r, i) => {
      const y = 250 + i * 150, done = q / 24 > (i + 1) / 4, cur = !done && q / 24 > i / 4;
      g.fillStyle = done ? '#FDF2D0' : '#f6f6f4'; rr(g, 34, y, 412, 116, 22); g.fill();
      if (cur) { g.strokeStyle = '#EEB318'; g.lineWidth = 5; rr(g, 34, y, 412, 116, 22); g.stroke(); }
      g.fillStyle = '#121419'; g.font = '600 32px Figtree, system-ui'; g.fillText(r, 66, y + 70);
      if (done) { g.fillStyle = '#EEB318'; g.beginPath(); g.arc(400, y + 58, 22, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#241C0C'; g.lineWidth = 5; g.beginPath(); g.moveTo(390, y + 58); g.lineTo(398, y + 66); g.lineTo(412, y + 50); g.stroke(); }
    });
    g.fillStyle = q >= 23 ? '#EEB318' : 'rgba(238,179,24,.4)'; rr(g, 34, 820, 412, 96, 48); g.fill();
    g.fillStyle = '#241C0C'; g.font = '800 34px Outfit, system-ui'; g.textAlign = 'center'; g.fillText('Submit for review', 240, 880); g.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [q, ready]);
  const k = eob((tg - c.phone + 0.45) / 0.7), out = win(tg, c.cta + 0.4, 0.8);
  if (k <= 0.01) return null;
  return (
    <group position={[S.s3 - 0.6, 0, 0.1]} scale={clamp(k) * (1 - out * 0.0)}>
      <mesh position={[0, 0.07, -0.08]} castShadow receiveShadow><boxGeometry args={[0.8, 0.14, 0.62]} /><meshStandardMaterial color="#9c6d42" roughness={0.5} /></mesh>
      <mesh position={[0, 0.2, -0.2]} rotation={[-0.14, 0, 0]} castShadow><boxGeometry args={[0.8, 0.16, 0.08]} /><meshStandardMaterial color="#8f633b" roughness={0.5} /></mesh>
      <group position={[0, 1.2 + (1 - clamp(k)) * 0.5, 0]} rotation={[-0.14, 0.25 + Math.sin(tg * 0.5) * 0.08, 0]}>
        <mesh geometry={body} castShadow><meshStandardMaterial color="#8e9096" metalness={0.92} roughness={0.32} /></mesh>
        <mesh position={[0, 0, 0.0505]}><planeGeometry args={[1.0, 2.07]} /><meshStandardMaterial color="#050608" roughness={0.2} /></mesh>
        <mesh position={[0, 0, 0.052]}><planeGeometry args={[0.95, 1.98]} /><meshBasicMaterial map={screen} color="#f4f1ea" toneMapped={false} /></mesh>
        <mesh position={[0, 0, 0.055]}><planeGeometry args={[1.0, 2.07]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.08} roughness={0.02} clearcoat={1} envMapIntensity={2.5} depthWrite={false} /></mesh>
        {[[0.53, 0.45, 0.22], [0.53, 0.15, 0.22], [-0.53, 0.38, 0.32]].map(([x, y, l], j) => <mesh key={j} position={[x, y, 0]}><boxGeometry args={[0.02, l, 0.05]} /><meshStandardMaterial color="#8e9096" metalness={0.9} roughness={0.3} /></mesh>)}
      </group>
    </group>
  );
};
const Box: React.FC<{tg: number; c: Cu}> = ({tg, c}) => {
  const kraftTex = useKraftTex();
  const k = eob((tg - c.presc + 0.2) / 0.7);
  const close = (j: number) => ease((tg - c.ships - j * 0.12) / 0.55), tape = ease((tg - c.ships - 0.65) / 0.4), slide = ease((tg - c.door) / 1.1);
  const kraft = <meshStandardMaterial map={kraftTex} roughness={0.9} />;
  if (k <= 0.01) return null;
  const Wd = 1.6, H = 0.85, D = 1.15, th = 0.03;
  return (
    <group position={[S.s3 + 1.7, 0, 0.1 + slide * 1.1]} rotation={[0, -0.35 + slide * 0.25, 0]} scale={clamp(k)}>
      <mesh position={[0, th / 2, 0]} castShadow receiveShadow><boxGeometry args={[Wd, th, D]} />{kraft}</mesh>
      <mesh position={[0, H / 2, D / 2]} castShadow><boxGeometry args={[Wd, H, th]} />{kraft}</mesh>
      <mesh position={[0, H / 2, -D / 2]} castShadow><boxGeometry args={[Wd, H, th]} />{kraft}</mesh>
      <mesh position={[Wd / 2, H / 2, 0]} castShadow><boxGeometry args={[th, H, D]} />{kraft}</mesh>
      <mesh position={[-Wd / 2, H / 2, 0]} castShadow><boxGeometry args={[th, H, D]} />{kraft}</mesh>
      <mesh position={[0, 0.5, 0]} castShadow><boxGeometry args={[1.38, 0.34, 0.92]} /><meshStandardMaterial color="#f2f1ee" roughness={0.45} metalness={0.05} /></mesh>
      {[0, 1, 2, 3].map((j) => {
        const side = j < 2, sgn = j % 2 ? -1 : 1, a = (1 - close(j)) * 2.1;
        const len = side ? D / 2 : Wd / 2;
        return side
          ? <group key={j} position={[0, H, sgn * D / 2]} rotation={[sgn * a, 0, 0]}><mesh position={[0, 0, -sgn * len / 2]} castShadow><boxGeometry args={[Wd, th, len]} />{kraft}</mesh></group>
          : <group key={j} position={[sgn * Wd / 2, H + th, 0]} rotation={[0, 0, -sgn * a]}><mesh position={[-sgn * len / 2, 0, 0]} castShadow><boxGeometry args={[len, th, D]} />{kraft}</mesh></group>;
      })}
      {tape > 0.01 && <mesh position={[0, H + th * 2.2, 0]} scale={[tape, 1, 1]}><boxGeometry args={[Wd + 0.04, 0.012, 0.3]} /><meshPhysicalMaterial color="#d8b47a" roughness={0.12} clearcoat={1} transparent opacity={0.6} /></mesh>}
    </group>
  );
};
const Tag: React.FC<{tg: number; c: Cu; ready: boolean; cam: V3}> = ({tg, c, ready}) => {
  const geo = useMemo(() => new RoundedBoxGeometry(1.9, 1.05, 0.03, 3, 0.06), []);
  const k = eob((tg - c.transp - 0.15) / 0.6); if (k <= 0.01) return null;
  const dt = Math.max(0, tg - c.transp), swing = Math.sin(dt * 3.2) * 0.35 * Math.exp(-dt * 1.1);
  return (
    <group position={[S.s3 + 0.75, 3.15, 0.9]} rotation={[0, -0.25 + Math.sin(tg * 0.7) * 0.06, swing]} scale={clamp(k)}>
      <mesh position={[0, -0.45, 0]}><cylinderGeometry args={[0.008, 0.008, 0.9, 6]} /><meshStandardMaterial color="#8a6a45" /></mesh>
      <group position={[0, -1.45, 0]}>
        <mesh geometry={geo} castShadow><meshStandardMaterial color="#fbf3e2" roughness={0.9} /></mesh>
        <mesh position={[0, 0.4, 0.02]}><ringGeometry args={[0.05, 0.08, 24]} /><meshStandardMaterial color="#c9ced6" metalness={0.9} roughness={0.3} /></mesh>
        <Txt text="Cash-pay" w={1.5} h={0.3} pos={[0, 0.12, 0.02]} color="#D6A21E" ready={ready} />
        <Txt text="No membership fee" w={1.7} h={0.32} pos={[0, -0.22, 0.02]} color="#121419" ready={ready} />
      </group>
    </group>
  );
};

/* ------------------------------------------------------------------ set dressing: potted plants along the wall (parallax and scale) */
const Plant: React.FC<{x: number; z: number; s: number; tg: number}> = ({x, z, s, tg}) => {
  const pot = useMemo(() => new THREE.LatheGeometry([[0.001, 0], [0.3, 0], [0.36, 0.05], [0.42, 0.62], [0.45, 0.66], [0.001, 0.66]].map(([a, b]) => new THREE.Vector2(a, b)), 40), []);
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh geometry={pot} castShadow receiveShadow><meshStandardMaterial color="#b9714a" roughness={0.85} /></mesh>
      {Array.from({length: 9}, (_, i) => {
        const a = i * 2.4, r = 0.12 + (i % 3) * 0.08, y = 0.95 + (i % 4) * 0.28, sway = Math.sin(tg * 0.8 + i) * 0.04;
        return <mesh key={i} position={[Math.cos(a) * r, y, Math.sin(a) * r]} rotation={[0.5 * Math.cos(a) + sway, a, 0.5 * Math.sin(a)]} scale={[0.18, 0.5, 0.06]} castShadow><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color={i % 2 ? '#4f6b3a' : '#3f5a2e'} roughness={0.7} /></mesh>;
      })}
    </group>
  );
};

/* ------------------------------------------------------------------ the world */
export const Wl35World: React.FC<{w: number; h: number; tg: number; words: Word[]; segs: Seg[]; end: number}> = ({w, h, tg, words, segs, end}) => {
  const ready = useFontReady();
  const c = useMemo(() => cuesOf(words, segs), [words, segs]);
  const keys = useMemo(() => keysOf(c, end), [c, end]);
  const {pos, look} = camAt(keys, tg);
  const wood = useWoodTex(), wall = useWallTex(), label = useLabelTex();
  const chairK = (i: number) => ease((tg - c.without - i * 0.12) / 1.1);
  const plK = win(tg, c.two - 0.2, 0.8), out1 = win(tg, c.b2 + 1.2, 0.6);
  const vialK = (t0: number) => eob((tg - t0 + 0.25) / 0.7);
  const sp = {tg, c, ready};
  return (
    <ThreeCanvas width={Math.round(w)} height={Math.round(h)} shadows camera={{fov: 44, position: [0, 2, 8], near: 0.1, far: 80}} gl={{antialias: true, alpha: false}}>
      <color attach="background" args={['#e9d9b8']} />
      <fog attach="fog" args={['#e9d9b8', 14, 34]} />
      <Env />
      <Rig pos={pos} look={look} />
      <hemisphereLight args={['#fff1d6', '#6b4a2a', 0.26]} />
      <KeyLight x={look[0]} />
      <pointLight position={[look[0] + 3.5, 3.2, -1.6]} intensity={14} color="#fff0d2" distance={12} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5, 0, 2]} receiveShadow><planeGeometry args={[80, 24]} /><meshStandardMaterial map={wood} roughness={0.55} metalness={0.02} /></mesh>
      <mesh position={[5, 6, -3]} receiveShadow><planeGeometry args={[80, 16]} /><meshStandardMaterial map={wall} roughness={0.95} /></mesh>
      <mesh position={[5, 0.06, -2.97]}><boxGeometry args={[80, 0.12, 0.04]} /><meshStandardMaterial color="#f6efe1" roughness={0.6} /></mesh>

      <Plant x={-4.4} z={-2.3} s={1.4} tg={tg} /><Plant x={4.6} z={-2.2} s={1.2} tg={tg} /><Plant x={13.6} z={-2.3} s={1.5} tg={tg} /><Plant x={22.4} z={-2.2} s={1.3} tg={tg} />
      {[0, 1, 2, 3].map((i) => <Chair key={i} i={i} x={S.hook - 1.6 + i * 1.05} k={chairK(3 - i) * 0.12} />)}
      <Clock tg={tg} c={c} />

      <group scale={1 - out1 * 0.999} position={[0, -out1 * 0.5, 0]}>
        <Plinth x={-1.35} k={plK} /><Plinth x={1.35} k={plK} />
        {vialK(c.sema) > 0.01 && <group position={[-1.35, 0.5 + (1 - clamp(vialK(c.sema))) * 1.6, 0]} scale={clamp(vialK(c.sema))}><Vial cap="#EEB318" label={label} spin={tg * 0.35} /></group>}
        {vialK(c.tirz) > 0.01 && <group position={[1.35, 0.5 + (1 - clamp(vialK(c.tirz))) * 1.6, 0]} scale={clamp(vialK(c.tirz))}><Vial cap="#32353D" label={label} spin={-tg * 0.35 + 1.2} /></group>}
        <Clipboard {...sp} />
      </group>
      <NameChip top="Compounded" name="Semaglutide" at={[-1.25, 2.45, 0.2]} cam={pos} s={clamp(vialK(c.sema)) * (1 - out1)} ready={ready} />
      <NameChip top="Compounded" name="Tirzepatide" at={[1.25, 2.45, 0.2]} cam={pos} s={clamp(vialK(c.tirz)) * (1 - out1)} ready={ready} />

      {[0, 1, 2].map((i) => <Tile key={i} i={i} {...sp} />)}

      <Phone {...sp} />
      <Box tg={tg} c={c} />
      <Tag {...sp} cam={pos} />
    </ThreeCanvas>
  );
};
