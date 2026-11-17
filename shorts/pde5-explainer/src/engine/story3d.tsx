import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {clamp, eob} from './ui';

/**
 * Narration-driven 3D explainer scenes. Every step is keyed to a CUE: the second a particular word is spoken
 * (see cueTimes in ui.ts). Nothing here is a real molecular structure: these are ILLUSTRATIONS, and the
 * visual that hosts them always shows "Illustration, not the actual structure".
 */
export type Cues = Record<string, number>;
type Pal = Record<string, string>;

const ease = (x: number) => { const c = clamp(x); return c * c * (3 - 2 * c); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const UP = new THREE.Vector3(0, 1, 0);
const CREAM = '#fff1cf';
const DIM = '#6b6250';

/** Helix path (DNA-like twist, single strand). */
const helix = (i: number, n: number, r = 1.2, step = 0.3, tw = 0.62) => new THREE.Vector3(Math.cos(i * tw) * r, (i - (n - 1) / 2) * step, Math.sin(i * tw) * r);

const Bead: React.FC<{p: THREE.Vector3; r: number; color: string; o?: number; glow?: number; s?: number}> = ({p, r, color, o = 1, glow = 0.1, s = 1}) => {
  if (o <= 0.01 || s <= 0.001) return null;
  return (
    <mesh position={p} scale={s}>
      <sphereGeometry args={[r, 28, 28]} />
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.3} emissive={color} emissiveIntensity={glow} transparent opacity={o} />
    </mesh>
  );
};

const Bond: React.FC<{a: THREE.Vector3; b: THREE.Vector3; k: number; o?: number; r?: number}> = ({a, b, k, o = 1, r = 0.06}) => {
  if (k <= 0.01 || o <= 0.01) return null;
  const dir = b.clone().sub(a), len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
  return (
    <mesh position={a.clone().add(b).multiplyScalar(0.5)} quaternion={q} scale={[1, len * k, 1]}>
      <cylinderGeometry args={[r, r, 1, 10]} />
      <meshStandardMaterial color="#b88a14" metalness={0.3} roughness={0.5} transparent opacity={o} />
    </mesh>
  );
};

const Lights: React.FC<{C: Pal}> = ({C}) => (
  <>
    <ambientLight intensity={0.95} />
    <directionalLight position={[3, 6, 9]} intensity={2.2} color="#fff4d6" />
    <pointLight position={[-4, -2, 6]} intensity={35} color={C.honey} />
  </>
);

/* ------------------------------------------------------------------ BUILD
 * "a peptide ... amino acids linked together ... lab-made ... fifteen"
 * cues: peptide, amino, linked, lab, fifteen
 */
export const BuildScene: React.FC<{w: number; h: number; t: number; T: Cues; n: number; C: Pal}> = ({w, h, t, T, n, C}) => {
  const scatter = useMemo(() => {
    const r = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
    return Array.from({length: n}, (_, i) => new THREE.Vector3((r(i, 1) - 0.5) * 6.4, (r(i, 2) - 0.5) * 5.8, (r(i, 3) - 0.5) * 3.2));
  }, [n]);
  const target = useMemo(() => Array.from({length: n}, (_, i) => helix(i, n, 1.15, 0.36)), [n]);
  const count = Math.floor(clamp((t - T.fifteen) / 1.5) * n + 0.0001);
  const spin = t * 0.45;
  const pos = (i: number) => {
    const lk = ease((t - T.linked - i * 0.05) / 0.8);
    const float = new THREE.Vector3(Math.sin(t * 0.9 + i) * 0.18, Math.cos(t * 0.7 + i * 1.7) * 0.18, Math.sin(t * 0.6 + i * 2.3) * 0.12).multiplyScalar(1 - lk);
    return scatter[i].clone().lerp(target[i], lk).add(float);
  };
  const P = Array.from({length: n}, (_, i) => pos(i));
  return (
    <ThreeCanvas width={Math.round(w)} height={Math.round(h)} camera={{fov: 40, position: [0, 0, 11.5]}} gl={{antialias: true, alpha: true}}>
      <Lights C={C} />
      <group rotation={[0.25, spin, 0.08]}>
        {P.map((p, i) => {
          const appear = eob((t - T.amino - i * 0.06) / 0.35);
          const lit = i < count;
          const pulse = lit && i === count - 1 ? 1 + 0.35 * Math.sin(clamp((t - T.fifteen) / 1.5 * n - i) * Math.PI) : 1;
          return <Bead key={i} p={p} r={0.34} color={lit ? C.honey : CREAM} s={Math.max(0.001, appear) * pulse} glow={lit ? 0.45 : 0.08} />;
        })}
        {P.slice(0, -1).map((p, i) => {
          const k = ease((t - T.linked - 0.45 - i * 0.05) / 0.3);
          return <Bond key={i} a={p} b={P[i + 1]} k={k} />;
        })}
      </group>
    </ThreeCanvas>
  );
};

/* ------------------------------------------------------------------ ORIGIN
 * "Start with the human stomach. The fluid in there has a protein, a long chain of amino acids.
 *  And BPC-157 is based on one short piece of that chain."
 * cues: stomach, fluid, protein, long, based, short, chain
 */
const MINI = 8;
const MINI_AT: [number, number, number][] = [[-0.45, 0.55, 0.15], [0.5, 0.1, -0.2], [-0.25, -0.7, 0.2], [0.55, -0.55, 0.1]];
const CHOSEN = 1;
const PROT_N = 36;
const SEG_A = 11, SEG_B = 25; // 15 beads (11..25) are "the short piece"

export const OriginScene: React.FC<{w: number; h: number; t: number; T: Cues; C: Pal}> = ({w, h, t, T, C}) => {
  const pStom = ease((t - 0.15) / 1.0);
  const pFluid = ease((t - T.fluid + 0.15) / 1.1);
  const pProt = ease((t - T.fluid - 0.4) / 0.8);
  const pZoom = ease((t - T.protein + 0.1) / 1.5);
  const cross = ease((t - T.protein - 1.0) / 0.55);
  const pLong = ease((t - T.long) / 1.6);
  const pPiece = ease((t - T.short) / 0.8);
  const pOut = ease((t - T.piece) / 1.4);
  const wo = (1 - cross);                       // opacity of the floating proteins in the stomach world
  const sf = wo * (1 - ease((t - T.protein + 0.35) / 0.6)); // shell + fluid fade first, so no big translucent edge fills the frame while zooming
  const worldS = lerp(1.75, 4.8, pZoom);
  const ch = new THREE.Vector3(...MINI_AT[CHOSEN]);
  const stomachRot: [number, number, number] = [0.1, Math.sin(t * 0.35) * 0.3, 0];
  const eso = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, 1.3, 0), new THREE.Vector3(0.45, 2.0, 0), new THREE.Vector3(0.3, 2.7, 0)]), 24, 0.2, 16, false), []);
  const duo = useMemo(() => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(1.0, -1.1, 0), new THREE.Vector3(1.7, -1.6, 0), new THREE.Vector3(2.4, -1.2, 0), new THREE.Vector3(2.6, -0.5, 0)]), 28, 0.17, 16, false), []);
  const shell = {color: '#f4b19c', transparent: true, roughness: 0.15, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false} as const;

  const mini = (k: number) => Array.from({length: MINI}, (_, i) => helix(i, MINI, 0.1, 0.085, 0.9));
  const protPts = useMemo(() => Array.from({length: PROT_N}, (_, i) => helix(i, PROT_N, 1.15, 0.26, 0.62)), []);
  const visN = 10 + (PROT_N - 10) * pLong;
  const sx = lerp(1, 1.35, pOut);
  const mid = protPts[Math.round((SEG_A + SEG_B) / 2)];

  return (
    <ThreeCanvas width={Math.round(w)} height={Math.round(h)} camera={{fov: 40, position: [0, 0, 12]}} gl={{antialias: true, alpha: true}}>
      <Lights C={C} />
      {/* stomach world, zooms toward the chosen protein */}
      {wo > 0.01 && (
        <group scale={worldS * Math.max(0.001, pStom)} position={[-ch.x * worldS, -ch.y * worldS, -ch.z * worldS]} rotation={stomachRot}>
          {/* body, lower pouch, esophagus and outlet: an illustration, not anatomy */}
          <mesh rotation={[0, 0, -0.5]} scale={[1.35, 1.7, 1.0]}>
            <sphereGeometry args={[1, 48, 36]} />
            <meshPhysicalMaterial {...shell} opacity={0.42 * sf} />
          </mesh>
          <mesh position={[0.75, -1.05, 0]} rotation={[0, 0, -0.9]} scale={[0.95, 0.7, 0.72]}>
            <sphereGeometry args={[1, 36, 28]} />
            <meshPhysicalMaterial {...shell} opacity={0.42 * sf} />
          </mesh>
          <mesh rotation={[0, 0, -0.5]} scale={[1.42, 1.78, 1.06]}>
            <sphereGeometry args={[1, 40, 30]} />
            <meshBasicMaterial color="#ffe3d6" transparent opacity={0.18 * sf} side={THREE.BackSide} depthWrite={false} />
          </mesh>
          <mesh geometry={eso}><meshPhysicalMaterial {...shell} opacity={0.45 * sf} /></mesh>
          <mesh geometry={duo}><meshPhysicalMaterial {...shell} opacity={0.45 * sf} /></mesh>
          {/* fluid */}
          <mesh rotation={[0, 0, -0.5]} scale={[1.2, 1.5, 0.88].map((v) => v * (0.15 + 0.85 * pFluid) * (1 + 0.012 * Math.sin(t * 2.4))) as [number, number, number]}>
            <sphereGeometry args={[1, 40, 30]} />
            <meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.25} transparent opacity={0.5 * sf * Math.max(0.05, pFluid)} roughness={0.25} depthWrite={false} />
          </mesh>
          {pFluid > 0.2 && Array.from({length: 9}, (_, i) => (
            <Bead key={'b' + i} p={new THREE.Vector3(Math.sin(i * 5.1) * 0.75, ((t * 0.3 + i * 0.37) % 1) * 1.7 - 0.85, Math.cos(i * 3.3) * 0.4)} r={0.05 + (i % 3) * 0.02} color="#fff6dc" o={0.55 * pFluid * sf} glow={0.2} />
          ))}
          {/* free-floating protein chains in the fluid */}
          {MINI_AT.map((m, k) => {
            const pts = mini(k);
            const drift = new THREE.Vector3(Math.sin(t * 0.8 + k * 2) * 0.05, Math.cos(t * 0.7 + k) * 0.05, 0);
            return (
              <group key={k} position={new THREE.Vector3(...m).add(drift)} rotation={[0, t * 0.9 + k, 0.4 * k]} scale={Math.max(0.001, pProt)}>
                {pts.map((p, i) => <Bead key={i} p={p} r={0.045} color={k === CHOSEN ? C.honey : CREAM} o={wo} glow={k === CHOSEN ? 0.4 : 0.1} />)}
                {pts.slice(0, -1).map((p, i) => <Bond key={'k' + i} a={p} b={pts[i + 1]} k={1} o={wo} r={0.014} />)}
              </group>
            );
          })}
        </group>
      )}
      {/* the zoomed-in protein: a long chain, one short piece highlighted, then that piece on its own */}
      {cross > 0.01 && (
        <group scale={0.62 * sx} position={[0, -0.45 - (mid.y) * 0.62 * sx * pOut, 0]} rotation={[0.2, t * 0.5, 0.05]}>
          {protPts.map((p, i) => {
            const inSeg = i >= SEG_A && i <= SEG_B;
            const appear = i < 10 ? 1 : clamp(visN - i + 1);
            const hl = inSeg ? pPiece : 0;
            const dimmed = !inSeg ? lerp(1, 0.18, pPiece) : 1;
            const gone = !inSeg ? 1 - pOut : 1;
            const sc = appear * gone * (1 + 0.3 * hl);
            return <Bead key={i} p={p} r={0.3} color={inSeg && pPiece > 0.3 ? C.honey : CREAM} o={cross * dimmed * Math.max(0.0, gone)} s={Math.max(0.001, sc)} glow={0.1 + 0.5 * hl} />;
          })}
          {protPts.slice(0, -1).map((p, i) => {
            const inSeg = i >= SEG_A && i < SEG_B;
            const appear = i + 1 < 10 ? 1 : clamp(visN - i - 1);
            const gone = inSeg ? 1 : 1 - pOut;
            return <Bond key={'p' + i} a={p} b={protPts[i + 1]} k={appear * gone} o={cross * (inSeg ? 1 : lerp(1, 0.18, pPiece)) * gone} r={0.055} />;
          })}
        </group>
      )}
    </ThreeCanvas>
  );
};
