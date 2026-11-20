import React, {useEffect, useMemo, useState} from 'react';
import {ThreeCanvas} from '@remotion/three';
import {continueRender, delayRender} from 'remotion';
import * as THREE from 'three';
import {clamp, eob} from './ui';

/**
 * Metaphor scenes for the tirzepatide explainer. Each one tells the sentence it sits under with a visual
 * METAPHOR (not a literal diagram) and every step is keyed to a spoken CUE (see cueTimes in ui.ts).
 * All of these are illustrations: simplified, stylised, never to scale and never a result.
 */
export type Cues = Record<string, number>;
type Pal = Record<string, string>;
type V3 = [number, number, number];
type SceneProps = {w: number; h: number; t: number; T: Cues; C: Pal; v?: Record<string, unknown>};

const ease = (x: number) => { const c = clamp(x); return c * c * (3 - 2 * c); };
const easeIn = (x: number) => { const c = clamp(x); return c * c * c; };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const damp = (t: number, k = 6, f = 18) => Math.exp(-k * Math.max(0, t)) * Math.cos(f * Math.max(0, t));

/* ------------------------------------------------------------------ text + canvas textures */
const useFontReady = () => {
  const [ok, setOk] = useState(false);
  const [h] = useState(() => delayRender('scene-fonts'));
  useEffect(() => {
    let done = false;
    const fin = () => { if (!done) { done = true; setOk(true); continueRender(h); } };
    Promise.all([document.fonts.load('800 100px Outfit'), document.fonts.load('600 40px Figtree')]).then(fin).catch(fin);
  }, [h]);
  return ok;
};

const roundRect = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};

/** A flat plane carrying crisp text (optionally on a rounded, bordered plate). */
const Txt: React.FC<{text: string; w: number; h: number; pos: V3; rot?: V3; s?: number; o?: number; color?: string; bg?: string | null; border?: string | null; ready: boolean; radius?: number; weight?: number}> = ({text, w, h, pos, rot = [0, 0, 0], s = 1, o = 1, color = '#fff', bg = null, border = null, ready, radius = 0.2, weight = 800}) => {
  const tex = useMemo(() => {
    const cw = Math.round(w * 160), ch = Math.round(h * 160);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d')!;
    const bw = border ? ch * 0.07 : 0;
    if (bg || border) { roundRect(g, bw / 2, bw / 2, cw - bw, ch - bw, radius * 160); if (bg) { g.fillStyle = bg; g.fill(); } if (border) { g.lineWidth = bw; g.strokeStyle = border; g.stroke(); } }
    let fs = ch * 0.62;
    g.font = `${weight} ${fs}px Outfit, system-ui, sans-serif`;
    const mw = g.measureText(text).width;
    if (mw > cw * 0.88) { fs *= (cw * 0.88) / mw; g.font = `${weight} ${fs}px Outfit, system-ui, sans-serif`; }
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, cw / 2, ch / 2 + fs * 0.04);
    const tx = new THREE.CanvasTexture(c); tx.anisotropy = 4; tx.colorSpace = THREE.SRGBColorSpace;
    return tx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, w, h, color, bg, border, ready, radius, weight]);
  if (s <= 0.001 || o <= 0.01) return null;
  return (
    <mesh position={pos} rotation={rot} scale={s}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} transparent opacity={o} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

const Lights: React.FC<{C: Pal; flash?: number}> = ({C, flash = 0}) => (
  <>
    <ambientLight intensity={0.95 + flash} />
    <directionalLight position={[3, 6, 9]} intensity={2.2} color="#fff4d6" />
    <pointLight position={[-5, -2, 6]} intensity={34} color={C.honey} />
  </>
);

const Canvas: React.FC<{w: number; h: number; children: React.ReactNode}> = ({w, h, children}) => (
  <ThreeCanvas width={Math.round(w)} height={Math.round(h)} camera={{fov: 40, position: [0, 0, 12.5]}} gl={{antialias: true, alpha: true}}>{children}</ThreeCanvas>
);

const Glass = {color: '#dff3ff', transparent: true, roughness: 0.08, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false} as const;

/* ------------------------------------------------------------------ shared props */
const Brain: React.FC<{pos: V3; s?: number; glow?: number; C: Pal}> = ({pos, s = 1, glow = 0, C}) => (
  <group position={pos} scale={s}>
    {[-0.62, 0.62].map((x, i) => (
      <mesh key={i} position={[x, 0, 0]} scale={[1, 0.82, 1.1]}>
        <sphereGeometry args={[0.95, 32, 24]} />
        <meshStandardMaterial color="#f2a9bd" roughness={0.55} emissive="#ff6f9a" emissiveIntensity={glow * 0.6} />
      </mesh>
    ))}
    {Array.from({length: 9}, (_, i) => (
      <mesh key={'b' + i} position={[Math.cos(i * 0.7) * 1.1, 0.35 + Math.sin(i * 1.3) * 0.4, Math.sin(i * 1.9) * 0.55]} scale={0.9}>
        <sphereGeometry args={[0.32, 16, 12]} />
        <meshStandardMaterial color="#f7bfce" roughness={0.6} emissive="#ff6f9a" emissiveIntensity={glow * 0.5} />
      </mesh>
    ))}
    <mesh position={[0, -0.78, 0]} rotation={[0, 0, 0]}>
      <cylinderGeometry args={[0.2, 0.28, 0.5, 12]} />
      <meshStandardMaterial color="#e69bb0" />
    </mesh>
  </group>
);

const StomachMini: React.FC<{pos: V3; s?: number; level: number; C: Pal; o?: number}> = ({pos, s = 1, level, C, o = 1}) => {
  const eso = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, 1.3, 0), new THREE.Vector3(0.45, 2.0, 0), new THREE.Vector3(0.3, 2.7, 0)]), 24, 0.2, 16, false), []);
  const duo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(1.0, -1.1, 0), new THREE.Vector3(1.7, -1.6, 0), new THREE.Vector3(2.4, -1.2, 0), new THREE.Vector3(2.6, -0.5, 0)]), 28, 0.17, 16, false), []);
  const shell = {color: '#f4b19c', transparent: true, roughness: 0.15, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false} as const;
  return (
    <group position={pos} scale={s}>
      <mesh rotation={[0, 0, -0.5]} scale={[1.35, 1.7, 1.0]}><sphereGeometry args={[1, 40, 30]} /><meshPhysicalMaterial {...shell} opacity={0.42 * o} /></mesh>
      <mesh position={[0.75, -1.05, 0]} rotation={[0, 0, -0.9]} scale={[0.95, 0.7, 0.72]}><sphereGeometry args={[1, 30, 24]} /><meshPhysicalMaterial {...shell} opacity={0.42 * o} /></mesh>
      <mesh geometry={eso}><meshPhysicalMaterial {...shell} opacity={0.45 * o} /></mesh>
      <mesh geometry={duo}><meshPhysicalMaterial {...shell} opacity={0.45 * o} /></mesh>
      <mesh rotation={[0, 0, -0.5]} position={[0, -(1 - level) * 0.9, 0]} scale={[1.2 * (0.35 + 0.65 * level), 1.5 * (0.2 + 0.8 * level), 0.88 * (0.35 + 0.65 * level)]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.25} transparent opacity={0.55 * o} depthWrite={false} />
      </mesh>
    </group>
  );
};

const Ring: React.FC<{pos: V3; p: number; r?: number; color: string; rot?: V3}> = ({pos, p, r = 3, color, rot = [0, 0, 0]}) => {
  if (p <= 0 || p >= 1) return null;
  const k = ease(p);
  return (
    <mesh position={pos} rotation={rot} scale={0.3 + k * r}>
      <torusGeometry args={[1, 0.03 + 0.04 * (1 - k), 12, 64]} />
      <meshBasicMaterial color={color} transparent opacity={(1 - k) * 0.9} />
    </mesh>
  );
};

/* ================================================================== 1. GUT SENDS MESSAGES TO THE BRAIN
 * "After a meal, the gut sends hormone messages up to the brain, like tiny text alerts."
 * cues: meal, gut, messages, brain, alerts
 */
export const GutMsgScene: React.FC<SceneProps> = ({w, h, t, T, C}) => {
  const ready = useFontReady();
  const curve = useMemo(() => new THREE.CatmullRomCurve3([[-2.6, -2.7, 0], [-0.9, -3.2, 0], [0.8, -2.4, 0], [-0.5, -1.6, 0], [-2.0, -1.1, 0], [-0.3, -0.3, 0], [1.7, -0.1, 0]].map((p) => new THREE.Vector3(...(p as V3)))), []);
  const gutGeo = useMemo(() => new THREE.TubeGeometry(curve, 160, 0.3, 14, false), [curve]);
  const idx = gutGeo.index ? gutGeo.index.count : 0;
  const pMeal = eob((t - Math.max(0.1, T.meal - 0.5)) / 0.5);
  const pGut = ease((t - T.gut + 0.1) / 1.3);
  gutGeo.setDrawRange(0, Math.floor((idx * pGut) / 3) * 3);
  const pBrain = eob((t - Math.max(0.2, T.brain - 0.7)) / 0.5);
  const path = useMemo(() => new THREE.QuadraticBezierCurve3(new THREE.Vector3(1.7, -0.1, 0.4), new THREE.Vector3(4.6, 0.2, 0.6), new THREE.Vector3(3.2, 1.7, 0.4)), []);
  const msgs = Array.from({length: 5}, (_, i) => ({i, p: (t - T.messages - i * 0.42) / 1.5}));
  const arrivals = msgs.map((m) => clamp(1 - Math.abs(m.p - 1) * 3)).reduce((a, b) => Math.max(a, b), 0);
  const brainGlow = 0.15 * pBrain + 0.8 * arrivals + (t > T.alerts ? 0.5 * Math.max(0, 1 - (t - T.alerts) / 0.9) : 0);
  const food = Array.from({length: 7}, (_, i) => ({i, p: ease((t - T.gut + 0.2 - i * 0.12) / 0.9)}));
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} />
      <group rotation={[0.06, Math.sin(t * 0.5) * 0.1, 0]}>
        {/* the meal */}
        <group position={[-3.7, -3.0, 0]} scale={Math.max(0.001, pMeal) * 0.85}>
          <mesh><cylinderGeometry args={[1.25, 1.25, 0.14, 40]} /><meshStandardMaterial color="#f7f1e2" roughness={0.3} /></mesh>
          {[[-0.45, 0.3, 0.1], [0.4, 0.3, -0.2], [0.1, 0.55, 0.35], [-0.1, 0.3, -0.5], [0.55, 0.25, 0.4]].map((p, i) => (
            <mesh key={i} position={p as V3}><sphereGeometry args={[0.3 + (i % 2) * 0.08, 20, 16]} /><meshStandardMaterial color={i % 2 ? C.honey : '#8bc26a'} roughness={0.5} /></mesh>
          ))}
        </group>
        {/* food drifting into the gut */}
        {food.map((f) => f.p > 0 && f.p < 1 && (
          <mesh key={f.i} position={curve.getPoint(f.p * 0.25).add(new THREE.Vector3(0, 0, 0.3))} scale={0.28}><sphereGeometry args={[1, 14, 12]} /><meshStandardMaterial color={C.honey} /></mesh>
        ))}
        {/* the gut grows along its path */}
        <mesh geometry={gutGeo}><meshStandardMaterial color="#f08fa8" roughness={0.45} emissive={C.honey} emissiveIntensity={0.08 + 0.1 * Math.sin(t * 3)} /></mesh>
        {/* hormone messages: little chat bubbles flying up to the brain */}
        {msgs.map((m) => m.p > 0 && m.p < 1.02 && (
          <group key={m.i} position={path.getPoint(ease(m.p)).toArray() as V3} scale={clamp(m.p * 5) * (1 - 0.5 * clamp((m.p - 0.9) * 10))}>
            <Txt text="!" w={0.95} h={0.7} pos={[0, 0, 0]} rot={[0, 0, Math.sin(m.p * 12) * 0.12]} color={C.ink} bg={C.honey} border="#fff" ready={ready} radius={0.28} />
          </group>
        ))}
        {/* the brain receiving them */}
        <Brain pos={[3.4, 2.2, 0]} s={Math.max(0.001, pBrain) * (1 + 0.06 * arrivals)} glow={brainGlow} C={C} />
        {[0, 0.35, 0.7].map((d, i) => <Ring key={i} pos={[3.4, 2.2, 0]} p={(t - T.alerts - d) / 1.1} r={3.2} color={C.honey} />)}
        <Txt text="New message!" w={2.6} h={0.62} pos={[3.4, 4.0, 0.5]} s={ease((t - T.alerts) / 0.3)} o={1} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.3} />
      </group>
    </Canvas>
  );
};

/* ================================================================== 2. ONE KEY, TWO LOCKS
 * "Two of those hormones are called GLP-1 and GIP. Tirzepatide is a medicine built to activate both of those
 *  receptors, like one key that fits two locks."
 * cues: glp-1, gip, tirzepatide, both, key, locks
 */
const CUP = [[0.001, 0], [0.95, 0], [1.05, 0.25], [1.2, 1.25], [1.0, 1.25], [0.85, 0.4], [0.001, 0.38]].map(([x, y]) => new THREE.Vector2(x, y));
export const ReceptorScene: React.FC<SceneProps> = ({w, h, t, T, C}) => {
  const ready = useFontReady();
  const cupX = 2.75;
  const dockL = ease((t - (T['glp-1'] - 0.3)) / 1.1), dockR = ease((t - (T.gip - 0.3)) / 1.1);
  const orbOut = ease((t - (T.tirzepatide - 0.1)) / 0.45);
  const fork = ease((t - (T.tirzepatide + 0.15)) / 1.5);
  const forkY = lerp(6.2, 0.9, fork) + (t > T.key ? 0.04 * Math.sin((t - T.key) * 8) : 0);
  const lock = clamp((t - T.locks) / 0.35);
  const orb = (side: -1 | 1, dock: number, label: string, color: string, txt: string) => {
    const x = lerp(side * 6.2, side * cupX, dock), y = lerp(3.3 + Math.sin(t * 2 + side) * 0.2, -0.42, ease(dock * 1.05)), s = (1 - orbOut) * Math.max(0.001, eob((t - (side < 0 ? T['glp-1'] : T.gip) + 0.9) / 0.4));
    return (
      <group key={label} position={[x, y, 0.3]} scale={Math.max(0.001, s)}>
        <mesh><sphereGeometry args={[0.66, 32, 28]} /><meshStandardMaterial color={color} roughness={0.25} emissive={color} emissiveIntensity={0.25} /></mesh>
        <Txt text={label} w={1.5} h={0.62} pos={[0, 0, 0.7]} color={txt} ready={ready} />
      </group>
    );
  };
  const cupGlow = (d: number) => clamp(d * 1.2) * (1 - orbOut) + lock;
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} />
      <group rotation={[0.1, Math.sin(t * 0.4) * 0.1, 0]}>
        {/* cell membrane with two receptor cups */}
        <mesh position={[0, -2.6, 0]}><boxGeometry args={[10.8, 0.7, 3]} /><meshStandardMaterial color="#323951" roughness={0.6} /></mesh>
        <mesh position={[0, -2.22, 0]}><boxGeometry args={[10.8, 0.06, 3]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.3} /></mesh>
        {[-1, 1].map((sd, i) => (
          <group key={i} position={[sd * cupX, -2.22, 0]}>
            <mesh geometry={undefined}><latheGeometry args={[CUP, 36]} /><meshPhysicalMaterial color="#8da2c9" roughness={0.3} clearcoat={0.6} side={THREE.DoubleSide} emissive={C.honey} emissiveIntensity={cupGlow(i ? dockR : dockL) * 0.7} /></mesh>
            <mesh position={[0, 1.25, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.1, 0.08, 12, 40]} /><meshBasicMaterial color={cupGlow(i ? dockR : dockL) > 0.2 ? C.honey : '#c6d0e6'} /></mesh>
          </group>
        ))}
        {orb(-1, dockL, 'GLP-1', C.honey, C.ink)}
        {orb(1, dockR, 'GIP', '#fff1cf', C.ink)}
        {/* the double-ended key */}
        {fork > 0.001 && (
          <group position={[0, forkY, 0.4]}>
            <mesh position={[0, 0, 0]}><boxGeometry args={[cupX * 2 + 0.6, 0.42, 0.42]} /><meshStandardMaterial color={C.honey} metalness={0.55} roughness={0.25} emissive={C.honey} emissiveIntensity={0.15 + 0.5 * lock} /></mesh>
            <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.2, 0.2, 1.7, 16]} /><meshStandardMaterial color={C.honey} metalness={0.55} roughness={0.25} /></mesh>
            <mesh position={[0, 1.95, 0]}><torusGeometry args={[0.55, 0.14, 14, 40]} /><meshStandardMaterial color={C.honey} metalness={0.55} roughness={0.25} /></mesh>
            {[-1, 1].map((sd) => (
              <group key={sd} position={[sd * cupX, -1.3, 0]}>
                <mesh><cylinderGeometry args={[0.24, 0.24, 2.6, 16]} /><meshStandardMaterial color={C.honey} metalness={0.55} roughness={0.25} /></mesh>
                <mesh position={[sd * 0.2, -1.5, 0]}><boxGeometry args={[0.5, 0.4, 0.34]} /><meshStandardMaterial color={C.honey} metalness={0.55} roughness={0.25} /></mesh>
              </group>
            ))}
            <Txt text="Tirzepatide" w={3.6} h={0.78} pos={[0, 0, 0.27]} color={C.ink} bg={null} ready={ready} />
          </group>
        )}
        {[-1, 1].map((sd) => <Ring key={sd} pos={[sd * cupX, -0.95, 0]} p={(t - T.locks) / 0.9} r={2.6} color={C.honey} rot={[Math.PI / 2, 0, 0]} />)}
        {[-1, 1].map((sd) => Array.from({length: 12}, (_, k) => {
          const p = (t - T.locks) / 0.9; if (p <= 0 || p >= 1) return null;
          const a = (k / 12) * Math.PI * 2;
          return <mesh key={sd + '-' + k} position={[sd * cupX + Math.cos(a) * ease(p) * 1.9, -0.9 + Math.sin(a) * ease(p) * 1.9, 0.6]} scale={0.1 * (1 - p)}><sphereGeometry args={[1, 8, 8]} /><meshBasicMaterial color="#fff6c2" /></mesh>;
        }))}
      </group>
    </Canvas>
  );
};

/* ================================================================== 3. APPETITE DIAL + STOMACH TIMER
 * "Those signals play a part in appetite, and in how quickly the stomach empties."
 * cues: signals, appetite, stomach, empties
 */
export const AppetiteScene: React.FC<SceneProps> = ({w, h, t, T, C}) => {
  const ready = useFontReady();
  const pBrain = eob((t - 0.2) / 0.5);
  const pDial = eob((t - (T.appetite - 0.4)) / 0.5);
  const pStom = eob((t - (T.stomach - 0.5)) / 0.55);
  const level = 1 - 0.8 * ease((t - T.empties) / 2.4);
  const sw = t - T.appetite;
  const needle = pDial > 0.3 ? -0.2 + 1.0 * Math.sin(Math.max(0, sw) * 2.4) * Math.exp(-0.18 * Math.max(0, sw)) : -1.2;
  const clockHand = (t - T.empties) * 2.4;
  const drops = Array.from({length: 6}, (_, i) => ({i, p: ((t - T.empties) * 0.9 + i * 0.17) % 1, on: t > T.empties && level > 0.25}));
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} />
      <group rotation={[0.05, Math.sin(t * 0.45) * 0.08, 0]}>
        <Brain pos={[-3.1, 1.9, 0]} s={Math.max(0.001, pBrain)} glow={0.12 + 0.3 * Math.max(0, Math.sin((t - T.signals) * 4)) * (t > T.signals ? 1 : 0)} C={C} />
        {[0, 0.4, 0.8].map((d, i) => <Ring key={i} pos={[-3.1, 1.9, 0]} p={(((t - T.signals - d) % 1.6) + 1.6) % 1.6 / 1.6 * (t > T.signals + d ? 1 : 0)} r={2.4} color={C.honey} />)}
        {/* appetite dial */}
        <group position={[-3.1, -1.7, 0]} scale={Math.max(0.001, pDial)}>
          <mesh rotation={[0, 0, 0]}><torusGeometry args={[1.5, 0.16, 14, 48, Math.PI]} /><meshStandardMaterial color="#f7f1e2" /></mesh>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => { const a = Math.PI * (i / 6); return <mesh key={i} position={[Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0]} rotation={[0, 0, a]}><boxGeometry args={[0.28, 0.06, 0.06]} /><meshStandardMaterial color={C.honey} /></mesh>; })}
          <group rotation={[0, 0, Math.PI / 2 - needle]}><mesh position={[0, 0.7, 0]}><boxGeometry args={[0.1, 1.4, 0.1]} /><meshStandardMaterial color="#d9363e" emissive="#d9363e" emissiveIntensity={0.3} /></mesh></group>
          <mesh><sphereGeometry args={[0.18, 16, 12]} /><meshStandardMaterial color={C.ink} /></mesh>
          <Txt text="Appetite signal" w={3.1} h={0.62} pos={[0, -0.8, 0]} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.28} />
        </group>
        {/* stomach + emptying clock */}
        <StomachMini pos={[2.3, 0.2, 0]} s={Math.max(0.001, pStom) * 1.0} level={level} C={C} />
        {drops.map((d) => d.on && <mesh key={d.i} position={[4.9 + 0.1 * d.i, -0.7 - d.p * 2.4, 0.2]} scale={0.12 * (1 - d.p * 0.5)}><sphereGeometry args={[1, 10, 10]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.3} /></mesh>)}
        <group position={[3.7, 3.3, 0.2]} scale={Math.max(0.001, ease((t - T.empties + 0.2) / 0.4))}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.85, 0.85, 0.14, 40]} /><meshStandardMaterial color="#f7f1e2" /></mesh>
          <mesh position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.85, 0.06, 10, 40]} /><meshStandardMaterial color={C.honey} /></mesh>
          <group rotation={[0, 0, -clockHand]}><mesh position={[0, 0.34, 0.12]}><boxGeometry args={[0.07, 0.68, 0.05]} /><meshStandardMaterial color={C.ink} /></mesh></group>
        </group>
        <Txt text="Stomach emptying" w={3.3} h={0.62} pos={[2.6, -3.5, 0.2]} s={ease((t - T.empties) / 0.3)} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.28} />
      </group>
    </Canvas>
  );
};

/* ================================================================== 4. A PHARMACY PREPARES IT FOR ONE PERSON
 * "Here at Beema Health, we offer a compounded version. That means a licensed pharmacy prepares it for each patient."
 * cues: compounded, pharmacy, prepares, patient
 */
export const CompoundScene: React.FC<SceneProps> = ({w, h, t, T, C}) => {
  const ready = useFontReady();
  const flaskP = eob((t - 0.2) / 0.55);
  const drop = (i: number) => clamp((t - (T.compounded + i * 0.28)) / 0.5);
  const pour = ease((t - T.prepares) / 1.2), pourEnd = ease((t - T.prepares - 1.6) / 0.5);
  const hold = pour * (1 - pourEnd);                       // 0 resting, 1 pouring
  const tilt = -1.5 * hold;
  const flaskPos: V3 = [lerp(-2.9, 0.45, hold), lerp(-2.5, -0.2, hold), 0];
  const flaskLevel = clamp(0.55 + 0.15 * ease((t - T.compounded) / 1.2) - 0.45 * pour);
  const vialFill = ease((t - T.prepares - 0.35) / 1.3);
  const plaque = eob((t - (T.pharmacy - 0.3)) / 0.5);
  const swing = damp(t - (T.pharmacy - 0.1), 2.5, 8) * 0.18;
  const tag = eob((t - T.patient) / 0.5);
  const stir = (t - T.compounded) * 5;
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} />
      <group rotation={[0.08, Math.sin(t * 0.4) * 0.08, 0]}>
        {/* counter */}
        <mesh position={[0, -3.35, 0]}><boxGeometry args={[11, 0.5, 3.2]} /><meshStandardMaterial color="#4a3a2c" roughness={0.7} /></mesh>
        {/* pharmacy sign */}
        <group position={[1.3, 2.7, 0]} rotation={[0, 0, swing]} scale={Math.max(0.001, plaque) * 0.85}>
          <Txt text="Licensed pharmacy" w={5.4} h={0.95} pos={[0, 0, 0]} color="#fff" bg="#2e8a63" border="#fff" ready={ready} radius={0.3} />
          <Txt text="Rx" w={0.95} h={0.95} pos={[-3.2, 0, 0.02]} color="#2e8a63" bg="#fff" ready={ready} radius={0.5} />
        </group>
        {/* flask */}
        <group position={flaskPos} rotation={[0, 0, tilt]} scale={Math.max(0.001, flaskP)}>
          <mesh position={[0, 0, 0]}><latheGeometry args={[[[0.001, 0], [1.25, 0], [1.25, 0.08], [0.95, 0.9], [0.42, 1.8], [0.36, 2.4], [0.5, 2.46]].map(([x, y]) => new THREE.Vector2(x, y)), 40]} /><meshPhysicalMaterial {...Glass} opacity={0.28} /></mesh>
          <mesh position={[0, 0.05 + flaskLevel * 0.55, 0]}><cylinderGeometry args={[Math.max(0.2, 1.2 - flaskLevel * 0.85), 1.2, flaskLevel * 1.1 + 0.05, 32]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.3} transparent opacity={0.85} /></mesh>
          {[C.honey, '#fff6dc', '#f2a9bd'].map((c, i) => { const p = drop(i); return p > 0 && p < 1 ? <mesh key={i} position={[(i - 1) * 0.35, lerp(3.6, 0.9, easeIn(p)), 0]} scale={0.2}><sphereGeometry args={[1, 14, 12]} /><meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.3} /></mesh> : null; })}
          {t > T.compounded && <mesh position={[Math.cos(stir) * 0.35, 0.6, Math.sin(stir) * 0.35]} scale={0.1}><sphereGeometry args={[1, 8, 8]} /><meshBasicMaterial color="#fff" /></mesh>}
        </group>
        {/* pour stream */}
        {hold > 0.7 && (
          <mesh position={[2.9, -1.05, 0.2]} scale={[1, 1.9, 1]}><cylinderGeometry args={[0.07, 0.07, 1, 8]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.5} /></mesh>
        )}
        {/* vial */}
        <group position={[2.9, -2.45, 0.2]}>
          <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.72, 0.72, 1.8, 32]} /><meshPhysicalMaterial {...Glass} opacity={0.3} /></mesh>
          <mesh position={[0, 0.1 + vialFill * 0.7, 0]}><cylinderGeometry args={[0.64, 0.64, 0.1 + vialFill * 1.4, 28]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.35} transparent opacity={0.9} /></mesh>
          <mesh position={[0, 2.0, 0]}><cylinderGeometry args={[0.5, 0.55, 0.45, 24]} /><meshStandardMaterial color="#c9ccd6" metalness={0.7} roughness={0.3} /></mesh>
          <Txt text="Compounded" w={1.35} h={0.5} pos={[0, 1.0, 0.74]} color={C.ink} bg="#fff" ready={ready} radius={0.12} />
          <group position={[0.2, 2.95, 0.5]} rotation={[0, 0, 0.06 + damp(t - T.patient, 4, 12) * 0.2]} scale={Math.max(0.001, tag)}>
            <Txt text="Made for one patient" w={2.5} h={0.7} pos={[0, 0, 0]} color={C.ink} bg={C.honey} border="#fff" ready={ready} radius={0.3} />
          </group>
        </group>
        <Ring pos={[2.9, -1.4, 0.4]} p={(t - T.patient) / 1.0} r={2.4} color={C.honey} rot={[Math.PI / 2, 0, 0]} />
      </group>
    </Canvas>
  );
};

/* ================================================================== 5. THE GAVEL AND THE RED STAMP
 * "To be clear, compounded tirzepatide is not FDA-approved."
 * cues: clear, not, fda-approved
 * An agency-style building (generic columns, no seal or logo) and a gavel that slams a red NOT FDA-APPROVED stamp
 * down onto the product's card. Screen shake, shockwave and sparks on impact.
 */
export const FdaScene: React.FC<SceneProps> = ({w, h, t, T, C, v}) => {
  const ready = useFontReady();
  const cardText = typeof v?.card === 'string' ? v.card : 'Compounded tirzepatide';
  const rise = eob((t - 0.15) / 0.9);
  const card = eob((t - 0.55) / 0.6);
  const hitT = T.not + 0.1;
  const swing = easeIn((t - (hitT - 0.4)) / 0.35);              // gavel falls; reaches the stamp at hitT - 0.05
  const wind = eob((t - 0.9) / 0.6);                            // wind-up before the strike
  const since = t - hitT;
  const impact = since > 0 ? Math.exp(-7 * since) : 0;
  const shake = [Math.sin(since * 90) * 0.2 * impact, Math.cos(since * 77) * 0.14 * impact, 0] as V3;
  const stampDown = ease((t - (hitT - 0.05)) / 0.12);
  const stampY = lerp(-0.4, -2.6, stampDown) + ease((since - 0.6) / 0.6) * 2.0;
  const reb = since > 0.12 ? ease((since - 0.12) / 0.5) : 0;
  const raisedY = 4.0 - (1 - wind) * 1.5;
  const gavelX = lerp(3.1, 0.0, swing) + reb * 1.3;
  const gavelY = lerp(raisedY, stampY + 2.62, swing) + reb * 1.9;
  const gavelRot = lerp(-1.25, -0.5, swing) - reb * 0.55;
  const imprint = eob((since + 0.02) / 0.22);
  const spark = (k: number) => { const p = since / 0.7; if (p <= 0 || p >= 1) return null; const a = (k / 22) * Math.PI * 2, d = ease(p) * (2.0 + (k % 3) * 0.7); return <mesh key={k} position={[Math.cos(a) * d, -2.9 + Math.abs(Math.sin(a)) * d * 0.8 - 1.6 * p * p, 1.5]} scale={0.1 * (1 - p)}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color={k % 2 ? '#ff5a52' : '#fff1cf'} /></mesh>; };
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} flash={0.9 * impact} />
      <group position={[shake[0], shake[1] + 0.3, 0]} scale={0.82 + 0.04 * impact} rotation={[0.04, 0.0, 0]}>
        {/* a generic agency-style building: columns, steps, pediment. No seal, no logo. */}
        <group position={[0, 0.3, -1.4]} scale={[1, Math.max(0.001, rise), 1]}>
          <mesh position={[0, -2.35, 0]}><boxGeometry args={[7.0, 0.32, 2.4]} /><meshStandardMaterial color="#c3c9d8" roughness={0.8} /></mesh>
          <mesh position={[0, -2.05, 0]}><boxGeometry args={[6.4, 0.3, 2.1]} /><meshStandardMaterial color="#d0d5e2" roughness={0.8} /></mesh>
          {[-2.25, -1.35, -0.45, 0.45, 1.35, 2.25].map((x) => <mesh key={x} position={[x, -0.55, 0]}><cylinderGeometry args={[0.26, 0.3, 2.7, 20]} /><meshStandardMaterial color="#e6e9f1" roughness={0.7} /></mesh>)}
          <mesh position={[0, 1.0, 0]}><boxGeometry args={[6.4, 0.55, 2.1]} /><meshStandardMaterial color="#d8dce8" roughness={0.75} /></mesh>
          <mesh position={[0, 1.28, 0]}>
            <extrudeGeometry args={[(() => { const sh = new THREE.Shape(); sh.moveTo(-3.3, 0); sh.lineTo(3.3, 0); sh.lineTo(0, 1.35); sh.closePath(); return sh; })(), {depth: 2.0, bevelEnabled: false}]} />
            <meshStandardMaterial color="#cfd4e2" roughness={0.8} />
          </mesh>
          <Txt text="FDA" w={2.2} h={0.5} pos={[0, 1.0, 1.08]} color="#3b4358" ready={ready} />
        </group>
        {/* the product's card on the desk */}
        <group position={[0, -3.15, 1.2]} rotation={[-0.5, 0, 0]} scale={Math.max(0.001, card)}>
          <mesh><boxGeometry args={[4.0, 2.2, 0.1]} /><meshStandardMaterial color="#fffaf0" roughness={0.6} /></mesh>
          <Txt text={cardText} w={3.6} h={0.55} pos={[0, 0.55, 0.08]} color={C.ink} ready={ready} />
          <Txt text={typeof v?.card_sub === 'string' ? v.card_sub : 'Compounded medication'} w={2.4} h={0.32} pos={[0, 0.15, 0.08]} color="#6a6f80" ready={ready} weight={600} />
          <group position={[0, -0.5, 0.09]} rotation={[0, 0, -0.1]} scale={Math.max(0.001, imprint)}>
            <Txt text="NOT FDA-APPROVED" w={3.6} h={0.95} pos={[0, 0, 0]} color="#d9363e" bg="rgba(255,255,255,0.0)" border="#d9363e" ready={ready} radius={0.12} />
          </group>
        </group>
        {/* the red stamp, driven down by the gavel */}
        <group position={[0, stampY - 0.2, 1.8]}>
          <mesh><boxGeometry args={[3.2, 0.4, 1.6]} /><meshStandardMaterial color="#b82832" roughness={0.45} /></mesh>
          <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.32, 0.4, 1.4, 20]} /><meshStandardMaterial color="#3a2a1e" roughness={0.6} /></mesh>
          <mesh position={[0, 1.7, 0]}><sphereGeometry args={[0.5, 20, 16]} /><meshStandardMaterial color="#3a2a1e" roughness={0.6} /></mesh>
        </group>
        <group position={[gavelX, gavelY, 2.4]} rotation={[0, 0, gavelRot]}>
          <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.58, 0.58, 2.1, 28]} /><meshStandardMaterial color="#8a5a34" roughness={0.45} /></mesh>
          <mesh position={[1.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.62, 0.62, 0.12, 28]} /><meshStandardMaterial color={C.honey} metalness={0.6} roughness={0.3} /></mesh>
          <mesh position={[-1.04, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.62, 0.62, 0.12, 28]} /><meshStandardMaterial color={C.honey} metalness={0.6} roughness={0.3} /></mesh>
          <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[0.15, 0.2, 2.4, 16]} /><meshStandardMaterial color="#8a5a34" roughness={0.45} /></mesh>
        </group>
        {Array.from({length: 22}, (_, k) => spark(k))}
        <Ring pos={[0, -2.85, 1.6]} p={since / 0.7} r={4.0} color="#ff5a52" rot={[Math.PI / 2 - 0.5, 0, 0]} />
      </group>
    </Canvas>
  );
};

/* ================================================================== 6. A PROVIDER REVIEWS THE CLIPBOARD
 * "A licensed provider looks over your health history, then decides if it's appropriate."
 * cues: provider, history, decides
 */
export const ProviderScene: React.FC<SceneProps> = ({w, h, t, T, C}) => {
  const ready = useFontReady();
  const pProv = eob((t - Math.max(0.1, T.provider - 0.7)) / 0.55);
  const pBoard = eob((t - Math.max(0.2, T.provider - 0.2)) / 0.55);
  const rows = ['Health history', 'Current medications', 'Allergies', 'Is it appropriate?'];
  const rowT = (i: number) => T.history + 0.15 + i * 0.55;
  const mag = clamp((t - T.history) / 2.0);
  const decide = eob((t - T.decides) / 0.45);
  const nod = decide > 0 ? damp(t - T.decides, 5, 14) * 0.12 : 0;
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} />
      <group rotation={[0.04, Math.sin(t * 0.45) * 0.08, 0]}>
        {/* provider */}
        <group position={[-3.7, -0.9, 0]} scale={Math.max(0.001, pProv)} rotation={[nod, 0, 0]}>
          <mesh position={[0, -0.5, 0]}><capsuleGeometry args={[0.9, 1.7, 8, 24]} /><meshStandardMaterial color="#f6f7fb" roughness={0.5} /></mesh>
          <mesh position={[0, 1.95, 0]}><sphereGeometry args={[0.72, 32, 24]} /><meshStandardMaterial color="#f0c7a2" roughness={0.6} /></mesh>
          <mesh position={[0, 2.3, -0.05]} scale={[1, 0.6, 1]}><sphereGeometry args={[0.7, 28, 16, 0, Math.PI * 2, 0, Math.PI / 1.7]} /><meshStandardMaterial color="#4a3426" roughness={0.7} /></mesh>
          {[-1, 1].map((sd) => <mesh key={sd} position={[sd * 0.24, 2.05, 0.62]}><sphereGeometry args={[0.07, 12, 10]} /><meshStandardMaterial color="#2b2b33" /></mesh>)}
          <mesh position={[0, 1.88, 0.64]} rotation={[0, 0, Math.PI]}><torusGeometry args={[0.2, 0.03, 8, 20, Math.PI]} /><meshStandardMaterial color="#b3524a" /></mesh>
          {[-1, 1].map((sd) => <mesh key={'arm' + sd} position={[sd * 1.0, -0.35, 0.1]} rotation={[0, 0, sd * 0.25]}><capsuleGeometry args={[0.24, 1.2, 6, 14]} /><meshStandardMaterial color="#eef0f6" roughness={0.5} /></mesh>)}
          <mesh position={[0, 1.25, 0.1]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.55, 0.09, 10, 28]} /><meshStandardMaterial color="#eef0f6" roughness={0.5} /></mesh>
          <Txt text="+" w={0.5} h={0.5} pos={[0.4, -0.15, 0.93]} color="#fff" bg="#2e9d62" ready={ready} radius={0.25} />
          <Txt text="Licensed provider" w={2.7} h={0.55} pos={[0, -2.35, 0.4]} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.26} />
        </group>
        {/* clipboard checklist */}
        <group position={[1.7, 0.25, 0]} rotation={[0, -0.12, 0]} scale={Math.max(0.001, pBoard)}>
          <mesh><boxGeometry args={[4.4, 5.6, 0.18]} /><meshStandardMaterial color={C.honeyDeep ?? '#c98f00'} roughness={0.55} /></mesh>
          <mesh position={[0, 0, 0.1]}><planeGeometry args={[3.9, 5.0]} /><meshStandardMaterial color="#fffdf6" roughness={0.9} /></mesh>
          <mesh position={[0, 2.85, 0.15]}><boxGeometry args={[1.5, 0.4, 0.2]} /><meshStandardMaterial color="#c9ccd6" metalness={0.7} roughness={0.3} /></mesh>
          {rows.map((r, i) => {
            const y = 1.65 - i * 1.05, p = eob((t - rowT(i)) / 0.35);
            return (
              <group key={r} position={[0, y, 0.12]}>
                <mesh position={[-1.55, 0, 0]}><boxGeometry args={[0.46, 0.46, 0.05]} /><meshStandardMaterial color="#e4e6ee" /></mesh>
                <Txt text={r} w={2.5} h={0.42} pos={[0.2, 0, 0.02]} color={C.ink} ready={ready} weight={700} />
                <Txt text="✓" w={0.6} h={0.6} pos={[-1.55, 0.02, 0.07]} s={Math.max(0.001, p)} color="#2e9d62" ready={ready} />
              </group>
            );
          })}
          {/* magnifier sweeping the list */}
          {t > T.history && mag < 1 && (
            <group position={[0.6, lerp(1.9, -1.0, mag), 0.45]} rotation={[0, 0, -0.6]}>
              <mesh><torusGeometry args={[0.46, 0.08, 12, 32]} /><meshStandardMaterial color="#363b4d" metalness={0.5} /></mesh>
              <mesh position={[0, 0, -0.01]}><circleGeometry args={[0.44, 28]} /><meshPhysicalMaterial {...Glass} opacity={0.18} /></mesh>
              <mesh position={[0, -0.85, 0]}><cylinderGeometry args={[0.07, 0.07, 0.8, 10]} /><meshStandardMaterial color="#363b4d" /></mesh>
            </group>
          )}
          <group position={[1.35, -2.4, 0.4]} scale={Math.max(0.001, decide)}>
            <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.7, 0.7, 0.14, 36]} /><meshStandardMaterial color="#2e9d62" emissive="#2e9d62" emissiveIntensity={0.3} /></mesh>
            <Txt text="✓" w={0.9} h={0.9} pos={[0, 0, 0.1]} color="#fff" ready={ready} />
          </group>
          <Txt text="Provider decides" w={2.7} h={0.55} pos={[-0.6, -2.4, 0.45]} s={Math.max(0.001, decide)} color={C.ink} bg={C.honey} border="#fff" ready={ready} radius={0.26} />
        </group>
        <Ring pos={[3.05, -2.15, 0.6]} p={(t - T.decides) / 0.9} r={1.8} color="#2e9d62" />
      </group>
    </Canvas>
  );
};

/* ================================================================== 7. NOT PRESCRIBED = NOT CHARGED
 * "And if you're not prescribed, you won't be charged anything."
 * cues: prescribed, charged
 */
export const NoChargeScene: React.FC<SceneProps> = ({w, h, t, T, C}) => {
  const ready = useFontReady();
  const pad = eob((t - 0.1) / 0.55);
  const x = eob((t - (T.prescribed + 0.1)) / 0.3);
  const spin = ease((t - (T.charged - 0.2)) / 1.4);
  const coin = eob((t - (T.charged - 0.5)) / 0.5);
  const land = clamp((t - T.charged - 1.0) / 0.4);
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} />
      <group rotation={[0.05, Math.sin(t * 0.45) * 0.08, 0]}>
        <group position={[-3.2, 0.2, 0]} rotation={[0, 0.15, -0.06]} scale={Math.max(0.001, pad)}>
          <mesh><boxGeometry args={[3.4, 4.4, 0.14]} /><meshStandardMaterial color="#fffdf6" roughness={0.9} /></mesh>
          <Txt text="Rx" w={1.8} h={1.3} pos={[-0.4, 1.3, 0.09]} color="#2e8a63" ready={ready} />
          {[0.2, -0.35, -0.9, -1.45].map((y) => <mesh key={y} position={[0, y, 0.09]}><boxGeometry args={[2.6, 0.12, 0.02]} /><meshStandardMaterial color="#d9dce6" /></mesh>)}
          <group scale={Math.max(0.001, x)} position={[0, 0, 0.3]}>
            <mesh rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[4.6, 0.3, 0.12]} /><meshStandardMaterial color="#d9363e" emissive="#d9363e" emissiveIntensity={0.3} /></mesh>
            <mesh rotation={[0, 0, -Math.PI / 4]}><boxGeometry args={[4.6, 0.3, 0.12]} /><meshStandardMaterial color="#d9363e" emissive="#d9363e" emissiveIntensity={0.3} /></mesh>
          </group>
          <Txt text="Not prescribed" w={2.9} h={0.62} pos={[0, -2.55, 0.2]} s={Math.max(0.001, x)} color="#fff" bg="#d9363e" ready={ready} radius={0.28} />
        </group>
        <group position={[3.0, 0.3, 0]} scale={Math.max(0.001, coin) * (1 + 0.06 * Math.sin(land * Math.PI))} rotation={[0.1, spin * Math.PI * 6, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.75, 1.75, 0.3, 48]} /><meshStandardMaterial color={C.honey} metalness={0.75} roughness={0.25} emissive={C.honey} emissiveIntensity={0.25 + 0.4 * land} /></mesh>
          <mesh position={[0, 0, 0.16]}><torusGeometry args={[1.45, 0.07, 10, 48]} /><meshStandardMaterial color="#fff1c2" metalness={0.6} /></mesh>
          <Txt text="$0" w={2.2} h={1.5} pos={[0, 0, 0.17]} color={C.ink} ready={ready} />
          <Txt text="$0" w={2.2} h={1.5} pos={[0, 0, -0.17]} rot={[0, Math.PI, 0]} color={C.ink} ready={ready} />
        </group>
        <Txt text="Charged: $0" w={3.0} h={0.7} pos={[3.0, -2.5, 0.3]} s={ease((t - T.charged - 1.0) / 0.35)} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.3} />
        {[0, 0.3, 0.6].map((d, i) => <Ring key={i} pos={[3.0, 0.3, 0]} p={(t - T.charged - 1.0 - d) / 1.0} r={3.2} color={C.honey} />)}
      </group>
    </Canvas>
  );
};

/* ================================================================== 8. WILLPOWER VERSUS BIOLOGY (semaglutide M6)
 * "Willpower is one weight on a balance. Biology adds weight too: hormones, and signals between your gut and your brain."
 * cues: willpower, balance, biology, hormones, signals
 * A balance scale. Willpower drops onto the left pan and tips it; biology's weights (hormones, signals) drop onto the right pan until it levels.
 * It levels, it never tips the other way: the picture claims "both matter", not that biology outweighs willpower.
 */
export const BalanceScene: React.FC<SceneProps> = ({w, h, t, T, C}) => {
  const ready = useFontReady();
  const rise = eob((t - 0.15) / 0.6);
  const step = (c: number) => ease((t - c) / 0.18);
  const L = step(T.willpower), R = 0.5 * step(T.hormones) + 0.5 * step(T.signals);
  const hits: [number, number][] = [[T.willpower, 1], [T.hormones, -0.5], [T.signals, -0.5]];
  const wob = hits.reduce((a, [c, sg]) => a + (t > c ? sg * damp(t - c, 4.5, 15) * 0.1 : 0), 0);
  const th = 0.26 * (L - R) + wob;
  const fallY = (c: number) => lerp(4.2, 0, easeIn(clamp((t - (c - 0.5)) / 0.5)));
  const seen = (c: number) => t > c - 0.5;
  const bio = eob((t - T.biology) / 0.45);
  const pans = [-1, 1].map((sd) => ({sd, x: sd * 3.3 * Math.cos(th), y: 1.0 + sd * 3.3 * Math.sin(th)}));
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} />
      <group rotation={[0.05, Math.sin(t * 0.4) * 0.08, 0]} scale={Math.max(0.001, rise) * 0.92}>
        <mesh position={[0, -1.3, 0]}><cylinderGeometry args={[0.22, 0.3, 4.6, 20]} /><meshStandardMaterial color="#c3c9d8" metalness={0.4} roughness={0.5} /></mesh>
        <mesh position={[0, -3.6, 0]}><boxGeometry args={[3.2, 0.3, 1.6]} /><meshStandardMaterial color="#8d95ad" roughness={0.6} /></mesh>
        <group position={[0, 1.0, 0]} rotation={[0, 0, th]}>
          <mesh><boxGeometry args={[6.9, 0.26, 0.4]} /><meshStandardMaterial color={C.honey} metalness={0.5} roughness={0.3} emissive={C.honey} emissiveIntensity={0.15} /></mesh>
        </group>
        <mesh position={[0, 1.0, 0.1]}><sphereGeometry args={[0.34, 20, 16]} /><meshStandardMaterial color="#fff1cf" metalness={0.5} roughness={0.3} /></mesh>
        {pans.map((p) => (
          <group key={p.sd} position={[p.x, p.y - 2.1, 0]}>
            <mesh position={[0, 1.05, 0]}><cylinderGeometry args={[0.035, 0.035, 2.1, 8]} /><meshStandardMaterial color="#aab1c6" /></mesh>
            <mesh><cylinderGeometry args={[1.45, 1.2, 0.18, 36]} /><meshStandardMaterial color="#e8ebf3" metalness={0.45} roughness={0.35} /></mesh>
            {p.sd < 0 && seen(T.willpower) && (
              <group position={[0, 0.45 + fallY(T.willpower), 0]}>
                <mesh><cylinderGeometry args={[0.6, 0.66, 0.62, 28]} /><meshStandardMaterial color={C.honey} metalness={0.5} roughness={0.3} emissive={C.honey} emissiveIntensity={0.25} /></mesh>
                <Txt text="W" w={0.6} h={0.5} pos={[0, 0, 0.7]} color={C.ink} ready={ready} />
              </group>
            )}
            {p.sd > 0 && seen(T.hormones) && (
              <group position={[0, 0.45 + fallY(T.hormones), 0]}>
                <mesh><boxGeometry args={[2.1, 0.62, 1.0]} /><meshStandardMaterial color="#f2a9bd" roughness={0.45} /></mesh>
                <Txt text="Hormones" w={1.9} h={0.46} pos={[0, 0, 0.52]} color={C.ink} ready={ready} />
              </group>
            )}
            {p.sd > 0 && seen(T.signals) && (
              <group position={[0, 1.08 + fallY(T.signals), 0]}>
                <mesh><boxGeometry args={[2.1, 0.62, 1.0]} /><meshStandardMaterial color="#9fd4ff" roughness={0.45} /></mesh>
                <Txt text="Signals" w={1.9} h={0.46} pos={[0, 0, 0.52]} color={C.ink} ready={ready} />
              </group>
            )}
            <Txt text={p.sd < 0 ? 'Willpower' : 'Biology'} w={2.6} h={0.6} pos={[0, -0.75, 0.3]} s={p.sd < 0 ? Math.max(0.001, eob((t - T.willpower) / 0.4)) : Math.max(0.001, bio)} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.28} />
          </group>
        ))}
        <Ring pos={[pans[0].x, pans[0].y - 1.8, 0.5]} p={(t - T.willpower - 0.4) / 0.9} r={1.6} color={C.honey} rot={[Math.PI / 2, 0, 0]} />
        <Ring pos={[pans[1].x, pans[1].y - 1.8, 0.5]} p={(t - T.signals - 0.4) / 0.9} r={1.6} color={C.honey} rot={[Math.PI / 2, 0, 0]} />
      </group>
    </Canvas>
  );
};

/* ================================================================== 9. HUNGER AS RADIO STATIC (semaglutide M6)
 * "After a meal, your gut broadcasts a fullness signal. Your brain tunes in like a radio, and hunger is part of the static."
 * cues: meal, broadcasts, tunes, radio, static
 * A meal fills the stomach, a tower broadcasts a "Fullness signal" (clean wave), the brain tunes in, a radio appears under it
 * and grey static bars crowd the clean wave. Pure metaphor: not how neurons work, not a claim about any person.
 */
const hash01 = (i: number, t: number) => Math.abs(Math.sin(i * 12.9898 + Math.floor(t * 14) * 78.233) * 43758.5453) % 1;
export const RadioScene: React.FC<SceneProps> = ({w, h, t, T, C}) => {
  const ready = useFontReady();
  const pMeal = eob((t - Math.max(0.1, T.meal - 0.45)) / 0.5);
  const pTower = eob((t - (T.broadcasts - 0.3)) / 0.4);
  const eat = ease((t - T.meal) / 1.0);
  const wave = ease((t - T.broadcasts) / 0.6);
  const travel = ease((t - T.broadcasts - 0.2) / Math.max(0.6, T.tunes - T.broadcasts + 0.1));
  const pBrain = eob((t - (T.tunes - 0.2)) / 0.5);
  const pRadio = eob((t - (T.radio - 0.25)) / 0.5);
  const sweep = t > T.radio ? -0.2 + 0.9 * Math.sin((t - T.radio) * 3.6) * Math.exp(-0.9 * (t - T.radio)) : 0;
  const noiseK = ease((t - T.static) / 0.5);
  const N = 36;
  const arrive = clamp(1 - Math.abs(travel - 1) * 4) * (t > T.tunes - 0.2 ? 1 : 0);
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} />
      <group rotation={[0.04, Math.sin(t * 0.45) * 0.07, 0]}>
        {/* the meal and the stomach */}
        <group position={[-3.6, -1.75, 0.2]} scale={Math.max(0.001, pMeal) * 0.62}>
          <mesh><cylinderGeometry args={[1.25, 1.25, 0.14, 40]} /><meshStandardMaterial color="#f7f1e2" roughness={0.3} /></mesh>
          {[[-0.45, 0.3, 0.1], [0.4, 0.3, -0.2], [0.1, 0.55, 0.35]].map((q, i) => <mesh key={i} position={q as V3}><sphereGeometry args={[0.32, 18, 14]} /><meshStandardMaterial color={i % 2 ? C.honey : '#8bc26a'} roughness={0.5} /></mesh>)}
        </group>
        <StomachMini pos={[-3.5, 0.55, 0]} s={0.6 * Math.max(0.001, pMeal)} level={0.25 + 0.6 * eat} C={C} />
        <Txt text="Gut" w={1.3} h={0.55} pos={[-3.5, 2.0, 0.3]} s={Math.max(0.001, ease((t - T.meal - 0.2) / 0.3))} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.28} />
        {/* the tower that broadcasts */}
        <group position={[-1.45, -0.3, 0]} scale={Math.max(0.001, pTower)}>
          <mesh position={[0, 0.95, 0]}><cylinderGeometry args={[0.07, 0.12, 2.0, 12]} /><meshStandardMaterial color="#c3c9d8" metalness={0.5} roughness={0.4} /></mesh>
          <mesh position={[0, 2.05, 0]}><sphereGeometry args={[0.2, 18, 14]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.5} /></mesh>
        </group>
        {[0, 0.35, 0.7].map((d, i) => <Ring key={i} pos={[-1.45, 1.75, 0.2]} p={(((t - T.broadcasts - d) % 1.5) + 1.5) % 1.5 / 1.5 * (t > T.broadcasts + d ? 1 : 0)} r={1.9} color={C.honey} />)}
        {/* the fullness signal travels to the brain */}
        <Txt text="Fullness signal" w={2.9} h={0.6} pos={[lerp(-1.1, 2.5, travel), lerp(2.2, 1.9, travel) + Math.sin(travel * 9) * 0.12, 0.6]} s={Math.max(0.001, eob((t - T.broadcasts) / 0.3)) * (1 - clamp((travel - 0.88) * 9))} color={C.ink} bg={C.honey} border="#fff" ready={ready} radius={0.3} />
        {/* the brain and its radio */}
        <Brain pos={[2.9, 1.75, 0]} s={0.62 * Math.max(0.001, pBrain)} glow={0.15 + 0.9 * arrive} C={C} />
        <Txt text="Brain" w={1.5} h={0.55} pos={[2.9, 3.0, 0.3]} s={Math.max(0.001, pBrain)} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.28} />
        <group position={[2.9, -0.55, 0.1]} scale={Math.max(0.001, pRadio)}>
          <mesh><boxGeometry args={[3.7, 2.2, 1.0]} /><meshStandardMaterial color="#d9a21b" roughness={0.5} /></mesh>
          <mesh position={[0, 0, 0.51]}><boxGeometry args={[3.4, 1.9, 0.04]} /><meshStandardMaterial color="#f4d58a" roughness={0.6} /></mesh>
          {[-0.7, -0.35, 0, 0.35, 0.7].map((y) => <mesh key={y} position={[-0.7, y, 0.54]}><boxGeometry args={[1.5, 0.08, 0.03]} /><meshStandardMaterial color="#5b4310" /></mesh>)}
          <mesh position={[0.95, 0.05, 0.55]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.55, 0.55, 0.1, 32]} /><meshStandardMaterial color="#fffdf6" /></mesh>
          <group position={[0.95, 0.05, 0.64]} rotation={[0, 0, Math.PI / 2 - sweep]}><mesh position={[0.28, 0, 0]}><boxGeometry args={[0.56, 0.06, 0.04]} /><meshStandardMaterial color="#d9363e" emissive="#d9363e" emissiveIntensity={0.4} /></mesh></group>
          <mesh position={[1.6, 1.6, -0.1]} rotation={[0, 0, -0.4]}><cylinderGeometry args={[0.03, 0.03, 1.8, 8]} /><meshStandardMaterial color="#c3c9d8" metalness={0.6} /></mesh>
        </group>
        {/* the signal wave and the static, as bars */}
        {Array.from({length: N}, (_, i) => {
          const x = -4.2 + i * (8.4 / (N - 1));
          const clean = (0.18 + 0.5 * (0.5 + 0.5 * Math.sin(i * 0.55 - t * 5))) * wave;
          const grey = (0.25 + 1.5 * hash01(i, t)) * noiseK;
          return (
            <group key={i}>
              {noiseK > 0.01 && <mesh position={[x + 0.12, -3.35 + grey / 2, 0.12]}><boxGeometry args={[0.07, Math.max(0.01, grey), 0.1]} /><meshStandardMaterial color="#c6cbdc" emissive="#8a90a6" emissiveIntensity={0.4} /></mesh>}
              {wave > 0.01 && <mesh position={[x, -3.35 + clean / 2, 0.05]}><boxGeometry args={[0.17, Math.max(0.01, clean), 0.1]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.3} /></mesh>}
            </group>
          );
        })}
        <Txt text="Hunger static" w={2.8} h={0.6} pos={[-1.0, -1.05, 0.4]} s={Math.max(0.001, noiseK)} color="#fff" bg="#5b6178" border="#c6cbdc" ready={ready} radius={0.28} />
      </group>
    </Canvas>
  );
};

/* ================================================================== 10. ONE KEY, ONE GLP-1 LOCK (semaglutide M6)
 * "GLP-1 is one of those signals. Semaglutide is a medicine built to act on the GLP-1 receptor, like a key made for one lock."
 * cues: glp-1, semaglutide, receptor, key, lock
 */
export const Glp1KeyScene: React.FC<SceneProps> = ({w, h, t, T, C}) => {
  const ready = useFontReady();
  const lx = 2.5, ly = -1.2;
  const orbP = eob((t - (T['glp-1'] - 0.4)) / 0.5);
  const orbMove = ease((t - T.receptor) / 0.9);
  const keyP = eob((t - (T.semaglutide - 0.4)) / 0.5);
  const lockP = eob((t - (T.receptor - 0.45)) / 0.55);
  const slide = ease((t - (T.key - 0.05)) / 0.95);
  const turn = ease((t - T.lock) / 0.55);
  const open = ease((t - T.lock - 0.25) / 0.5);
  const kx = lerp(-3.5, -1.15, slide), ky = lerp(-0.1 + Math.sin(t * 2.2) * 0.1 * (1 - slide), ly, slide);
  const others = 1 - ease((t - (T.semaglutide - 0.3)) / 0.5);
  const ox = lerp(-3.4, lx, orbMove), oy = lerp(2.3 + Math.sin(t * 2.4) * 0.15, 1.95, orbMove);
  const sp = (t - T.lock) / 0.9;
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} />
      <group rotation={[0.06, Math.sin(t * 0.45) * 0.08, 0]}>
        {/* the lock (the GLP-1 receptor) */}
        <group position={[lx, ly, 0]} scale={Math.max(0.001, lockP)}>
          <mesh><boxGeometry args={[2.7, 2.0, 0.95]} /><meshStandardMaterial color="#8da2c9" metalness={0.45} roughness={0.35} emissive={C.honey} emissiveIntensity={0.55 * turn} /></mesh>
          <mesh position={[0, 0, 0.49]}><boxGeometry args={[2.3, 1.6, 0.04]} /><meshStandardMaterial color="#aebcd8" roughness={0.4} /></mesh>
          <mesh position={[-1.32, 0, 0.1]}><boxGeometry args={[0.1, 0.34, 0.5]} /><meshStandardMaterial color="#1c2030" /></mesh>
          <group position={[0, 1.0 + 0.3 * open, 0]} rotation={[0, 0, -0.35 * open]}>
            <mesh rotation={[0, 0, 0]}><torusGeometry args={[0.8, 0.15, 14, 40, Math.PI]} /><meshStandardMaterial color="#dfe5f2" metalness={0.7} roughness={0.25} /></mesh>
          </group>
        </group>
        <Txt text="GLP-1 receptor" w={3.3} h={0.62} pos={[lx, -3.1, 0.4]} s={Math.max(0.001, lockP)} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.28} />
        {/* the GLP-1 signal */}
        <group position={[ox, oy, 0.4]} scale={Math.max(0.001, orbP)}>
          <mesh><sphereGeometry args={[0.85, 32, 26]} /><meshStandardMaterial color="#fff1cf" roughness={0.25} emissive={C.honey} emissiveIntensity={0.3} /></mesh>
          <Txt text="GLP-1" w={1.5} h={0.6} pos={[0, 0, 0.9]} color={C.ink} ready={ready} />
        </group>
        {/* the other signals drifting past ("one of those signals") */}
        {others > 0.01 && Array.from({length: 7}, (_, i) => {
          const ph = (t * 0.22 + i / 7) % 1, x = lerp(-5.4, 5.4, ph), y = [-0.4, 0.9, -1.8, 1.6, 0.2, -2.6, 2.7][i] + Math.sin(t * 1.4 + i * 2) * 0.2;
          return <mesh key={i} position={[x, y, 0]} scale={0.2 * others * clamp(ph * 8) * clamp((1 - ph) * 8)}><sphereGeometry args={[1, 14, 12]} /><meshStandardMaterial color="#9fd4ff" emissive="#9fd4ff" emissiveIntensity={0.35} /></mesh>;
        })}
        {/* the key (semaglutide) */}
        <group position={[kx, ky, 0.5]} scale={Math.max(0.001, keyP)}>
          <group rotation={[Math.PI / 2 * turn, 0, 0]}>
            <mesh><torusGeometry args={[0.52, 0.15, 14, 36]} /><meshStandardMaterial color={C.honey} metalness={0.6} roughness={0.25} emissive={C.honey} emissiveIntensity={0.2 + 0.6 * turn} /></mesh>
            <mesh position={[1.55, 0, 0]}><boxGeometry args={[2.3, 0.2, 0.2]} /><meshStandardMaterial color={C.honey} metalness={0.6} roughness={0.25} /></mesh>
            {[1.9, 2.4].map((x) => <mesh key={x} position={[x, -0.26, 0]}><boxGeometry args={[0.24, 0.34, 0.2]} /><meshStandardMaterial color={C.honey} metalness={0.6} roughness={0.25} /></mesh>)}
          </group>
        </group>
        <Txt text="Semaglutide" w={3.0} h={0.62} pos={[kx + 0.6, ky + 1.0, 0.7]} s={Math.max(0.001, keyP)} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.28} />
        <Ring pos={[lx, ly, 0.6]} p={sp} r={2.8} color={C.honey} />
        {Array.from({length: 12}, (_, k) => {
          if (sp <= 0 || sp >= 1) return null;
          const a = (k / 12) * Math.PI * 2;
          return <mesh key={k} position={[lx + Math.cos(a) * ease(sp) * 2.2, ly + Math.sin(a) * ease(sp) * 2.0, 0.8]} scale={0.1 * (1 - sp)}><sphereGeometry args={[1, 8, 8]} /><meshBasicMaterial color="#fff6c2" /></mesh>;
        })}
      </group>
    </Canvas>
  );
};

/* ================================================================== 11. APPETITE CENTERS LIGHT UP (semaglutide M6)
 * "That receptor plays a part in how appetite centers in the brain respond."
 * cues: receptor, appetite, brain, respond
 * Illustration only: three glowing spots on a stylised brain, not real anatomy and not a result.
 */
export const CentersScene: React.FC<SceneProps> = ({w, h, t, T, C}) => {
  const ready = useFontReady();
  const pBrain = eob((t - 0.1) / 0.6);
  const pRec = eob((t - Math.max(0.05, T.receptor - 0.25)) / 0.5);
  const pulse = (c: number) => ease((t - c) / 0.4);
  const nodes: V3[] = [[-0.7, 0.4, 1.05], [0.65, 0.15, 1.05], [0.0, 0.62, 0.8]];
  const nodeOn = (i: number) => ease((t - (T.appetite + i * 0.3)) / 0.35);
  const respond = ease((t - T.respond) / 0.6);
  const glow = 0.1 + 0.35 * pulse(T.appetite) + 0.8 * respond;
  const dots = Array.from({length: 5}, (_, i) => ({i, p: (t - T.receptor - 0.25 - i * 0.28) / 1.1}));
  const path = useMemo(() => new THREE.QuadraticBezierCurve3(new THREE.Vector3(-2.8, -0.6, 0.5), new THREE.Vector3(-1.4, 1.6, 0.8), new THREE.Vector3(0.1, 0.9, 1.5)), []);
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} />
      <group rotation={[0.04, Math.sin(t * 0.45) * 0.08, 0]}>
        <group position={[-3.5, -1.0, 0]} rotation={[0, 0, -Math.PI / 2]} scale={Math.max(0.001, pRec) * 0.8}>
          <mesh><latheGeometry args={[CUP, 36]} /><meshPhysicalMaterial color="#8da2c9" roughness={0.3} clearcoat={0.6} side={THREE.DoubleSide} emissive={C.honey} emissiveIntensity={0.7 * (1 - clamp((t - T.receptor - 1.0) / 0.8))} /></mesh>
        </group>
        <Txt text="GLP-1 receptor" w={3.2} h={0.62} pos={[-3.0, -2.7, 0.4]} s={Math.max(0.001, pRec)} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.28} />
        {dots.map((d) => d.p > 0 && d.p < 1 && <mesh key={d.i} position={path.getPoint(ease(d.p)).toArray() as V3} scale={0.17 * (1 - 0.5 * d.p)}><sphereGeometry args={[1, 12, 10]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.6} /></mesh>)}
        <group position={[0.7, 0.5, 0]} scale={1.75 * Math.max(0.001, pBrain)}>
          <Brain pos={[0, 0, 0]} s={1} glow={glow} C={C} />
          {nodes.map((n, i) => {
            const on = nodeOn(i), pu = 1 + 0.35 * respond * Math.sin(t * 6 + i);
            return on > 0.01 ? (
              <mesh key={i} position={n} scale={(0.1 + 0.09 * on) * pu}>
                <sphereGeometry args={[1, 18, 14]} /><meshStandardMaterial color="#fff1cf" emissive={C.honey} emissiveIntensity={0.6 + 1.2 * on} />
              </mesh>
            ) : null;
          })}
        </group>
        <Txt text="Appetite centers" w={3.4} h={0.66} pos={[1.2, -2.85, 0.5]} s={Math.max(0.001, ease((t - T.appetite) / 0.35))} color={C.ink} bg={C.honey} border="#fff" ready={ready} radius={0.3} />
        {[0, 0.35, 0.7].map((d, i) => <Ring key={i} pos={[0.7, 0.6, 0.5]} p={(t - T.respond - d) / 1.2} r={3.8} color={C.honey} />)}
      </group>
    </Canvas>
  );
};

/* ================================================================== 12. A CONVEYOR BELT RUNNING SLOWER (semaglutide M6)
 * "It can also slow how fast the stomach empties, like a conveyor belt running slower."
 * cues: slow, stomach, empties, conveyor, slower
 * The stomach drains onto a belt at a steady speed; at "slower" the belt eases down and the portions bunch up.
 * An illustration of timing, not a result: no volumes, no hours, no numbers.
 */
export const BeltScene: React.FC<SceneProps> = ({w, h, t, T, C}) => {
  const ready = useFontReady();
  const pStom = eob((t - Math.max(0.1, T.stomach - 0.5)) / 0.55);
  const belt = eob((t - (T.conveyor - 0.3)) / 0.5);
  const v1 = 1.5, v2 = 0.4, tau = 0.5;
  const dist = (x: number) => {                      // distance travelled since "empties": steady, then easing to a slow crawl at "slower"
    const a = Math.max(0, x - T.empties), s = Math.max(0, x - T.slower);
    return v1 * (a - s) + v2 * s + (v1 - v2) * tau * (1 - Math.exp(-s / tau));
  };
  const D = dist(t);
  const ratio = t < T.slower ? 1 : (v2 + (v1 - v2) * Math.exp(-(t - T.slower) / tau)) / v1;
  const level = Math.max(0.3, 0.9 - 0.11 * D);
  const slow = ease((t - T.slower) / 0.5);
  const BL = 6.8, IL = 5.9, N = 6, gap = IL / N;
  const items = Array.from({length: N}, (_, i) => {
    const u = (((D * 0.9 + i * gap) % IL) + IL) % IL;
    return {i, x: -1.9 + u, edge: clamp(u / 0.6) * clamp((IL - u) / 0.6)};
  });
  const drops = Array.from({length: 5}, (_, i) => ({i, p: ((t - T.empties) * 0.9 + i * 0.2) % 1, on: t > T.empties && t < T.conveyor + 0.2 && level > 0.3}));
  return (
    <Canvas w={w} h={h}>
      <Lights C={C} />
      <group rotation={[0.05, Math.sin(t * 0.45) * 0.07, 0]}>
        <StomachMini pos={[-3.3, 0.5, 0]} s={0.78 * Math.max(0.001, pStom)} level={level} C={C} />
        <Txt text="Stomach" w={2.2} h={0.58} pos={[-3.5, 2.5, 0.3]} s={Math.max(0.001, ease((t - T.stomach) / 0.3))} color={C.ink} bg="#fff" border={C.honey} ready={ready} radius={0.28} />
        {drops.map((d) => d.on && <mesh key={d.i} position={[-1.9 + d.p * 0.3, -0.6 - d.p * 1.2, 0.2]} scale={0.14 * (1 - d.p * 0.4)}><sphereGeometry args={[1, 10, 10]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.3} /></mesh>)}
        <Txt text="Emptying" w={2.2} h={0.58} pos={[-0.1, 0.3, 0.5]} s={Math.max(0.001, ease((t - T.empties) / 0.3))} color={C.ink} bg={C.honey} border="#fff" ready={ready} radius={0.28} />
        {/* the belt (only once "conveyor" is said) */}
        {belt > 0.02 && (
          <group position={[1.0, -2.0, 0]} scale={[belt, 1, 1]}>
            <mesh><boxGeometry args={[BL, 0.34, 1.4]} /><meshStandardMaterial color="#323951" roughness={0.6} /></mesh>
            {Array.from({length: 16}, (_, i) => { const u = (((D * 0.9 + i * (BL / 16)) % BL) + BL) % BL; return <mesh key={i} position={[-BL / 2 + u, 0.19, 0]}><boxGeometry args={[0.08, 0.04, 1.3]} /><meshStandardMaterial color="#59627f" /></mesh>; })}
            {[-1, 1].map((sd) => <mesh key={sd} position={[sd * BL / 2, 0, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.3, 0.3, 1.5, 24]} /><meshStandardMaterial color="#c3c9d8" metalness={0.5} roughness={0.4} /></mesh>)}
            <mesh position={[0, 0.2, 0.72]}><boxGeometry args={[BL, 0.06, 0.04]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.3} /></mesh>
          </group>
        )}
        {belt > 0.5 && items.map((it) => it.edge > 0.02 && (
          <group key={it.i} position={[it.x, -1.45, 0.1]} scale={it.edge}>
            <mesh><boxGeometry args={[0.72, 0.6, 0.72]} /><meshStandardMaterial color={C.honey} roughness={0.4} emissive={C.honey} emissiveIntensity={0.15} /></mesh>
          </group>
        ))}
        {/* belt speed bar: full at first, eases down at "slower" */}
        {belt > 0.02 && (
          <group position={[-1.9, -3.35, 0.2]} scale={[1, belt, 1]}>
            <mesh position={[1.6, 0, 0]}><boxGeometry args={[3.3, 0.34, 0.1]} /><meshStandardMaterial color="#323951" /></mesh>
            <mesh position={[0.05 + 1.5 * ratio, 0, 0.08]}><boxGeometry args={[Math.max(0.02, 3.0 * ratio), 0.2, 0.1]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.4} /></mesh>
          </group>
        )}
        <Txt text="Running slower" w={3.4} h={0.66} pos={[2.9, -3.35, 0.5]} s={Math.max(0.001, slow)} color="#fff" bg="#5b6178" border="#c6cbdc" ready={ready} radius={0.3} />
      </group>
    </Canvas>
  );
};
