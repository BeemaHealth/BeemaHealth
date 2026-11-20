import React from 'react';
import * as THREE from 'three';
import {ease, clamp01, lerp, rnd} from '../theme';
import {G, Inst, Instanced, Mesh, V3, blobGeo, vol} from '../three3d';

export const GC = {glp: '#ffc94d', gip: '#4cc3ff', gcg: '#ff8a4c', full: '#7ee081', hunger: '#ff6b6b', reward: '#c58bff', food: '#ff9f43', off: '#59608a'} as const;

export const add3 = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const mix3 = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
const curve = (pts: V3[]) => new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])));
const at = (c: THREE.CatmullRomCurve3, u: number): V3 => {
  const p = c.getPoint(clamp01(u));
  return [p.x, p.y, p.z];
};
const seg01 = (t: number, a: number, b: number) => ease((t - a) / (b - a));
const S = (x: number, y: number, z: number) => [x, y, z] as unknown as number;

const Glow: React.FC<{p: V3; r?: number; color?: string; o?: number}> = ({p, r = 0.2, color = GC.glp, o = 1}) => (
  <group position={p} scale={o}>
    <Mesh g={G.sphLo} s={r} color={color} ei={1.1} />
    <mesh geometry={G.sphLo} scale={r * 2.2}>
      <meshBasicMaterial color={color} transparent opacity={0.16} depthWrite={false} />
    </mesh>
  </group>
);

/* ---------- gut, blood vessel, brain ---------- */
const GUT = curve([[-3.2, -0.3, 0], [-1.6, -1.2, 0], [0, -0.3, 0], [1.6, -1.2, 0], [3.2, -0.3, 0]]);
const GUT_GEO = new THREE.TubeGeometry(GUT, 80, 0.5, 14, false);
const VESSEL_PTS: V3[] = [[0.2, 0.3, 0], [-0.9, 1.1, 0.3], [0.9, 2.1, -0.2], [0, 3.1, 0]];
const VESSEL_GEO = new THREE.TubeGeometry(curve(VESSEL_PTS), 50, 0.2, 12, false);
export const LCELLS: V3[] = [0.3, 0.5, 0.7].map((u) => {
  const o = at(GUT, u);
  return [o[0], o[1] + 0.52, o[2]] as V3;
});
const PATHS = LCELLS.map((top) => curve([top, [top[0] * 0.4, 0.35, 0], ...VESSEL_PTS]));
const PATH_GEO = PATHS.map((p) => new THREE.TubeGeometry(p, 40, 0.08, 8, false));
const brainGeo = (() => {
  const g = new THREE.SphereGeometry(1, 96, 64);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 9 + v.y * 4) * Math.cos(v.y * 8 + v.z * 5) + 0.6 * Math.sin(v.z * 10 + v.x * 3);
    v.multiplyScalar(1 + 0.045 * n);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
})();
export const BRAIN_P: V3 = [0, 4.2, 0];
export const GUT_P: V3 = [-2.2, -0.8, 0];

export const GutBrain: React.FC<{t: number; release: number | null; glow: number; food?: boolean}> = ({t, release, glow, food = true}) => {
  const N = 12;
  const parts: {p: V3; o: number}[] = [];
  for (let i = 0; i < N; i++) {
    const c = i % 3;
    const u = release === null ? (i / N + t * 0.22) % 1 : (t - (release + i * 0.32)) / 2.6;
    if (u <= 0 || u > 1.02) continue;
    parts.push({p: at(PATHS[c], u), o: u > 0.95 ? Math.max(0, 1 - (u - 0.95) * 14) : 1});
  }
  const relOn = release === null ? 1 : seg01(t, release - 0.2, release + 0.6);
  return (
    <>
      <color attach="background" args={['#070a1c']} />
      <fog attach="fog" args={['#070a1c', 18, 48]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 6, 8]} intensity={2.2} />
      <pointLight position={[0, 3.6, 3]} intensity={10 + glow * 40} color="#ffe9a8" distance={9} />
      <mesh geometry={GUT_GEO}>
        <meshStandardMaterial color="#e89aa8" transparent opacity={0.5} roughness={0.4} emissive="#7a3a50" emissiveIntensity={0.35} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {food &&
        Array.from({length: 9}).map((_, i) => {
          const q = at(GUT, (i / 9 + t * 0.05) % 1);
          return <Mesh key={i} g={G.sphLo} p={[q[0], q[1] + Math.sin(t * 2 + i) * 0.08, q[2] + (rnd(i, 2) - 0.5) * 0.3]} s={0.17} color={GC.food} ei={0.5} />;
        })}
      {LCELLS.map((p, i) => (
        <Mesh key={i} g={blobGeo(50 + i, 0.15)} p={p} s={S(0.34, 0.26, 0.34)} color={GC.glp} ei={0.25 + relOn * (0.5 + 0.4 * Math.sin(t * 5 + i))} rough={0.4} />
      ))}
      <mesh geometry={VESSEL_GEO}>
        <meshStandardMaterial color="#c2394f" emissive="#5a0c20" emissiveIntensity={0.5} transparent opacity={0.8} roughness={0.4} />
      </mesh>
      {PATH_GEO.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#c2394f" emissive="#5a0c20" emissiveIntensity={0.4} transparent opacity={0.7} roughness={0.4} />
        </mesh>
      ))}
      {parts.map((q, i) => (
        <Glow key={i} p={q.p} o={q.o} />
      ))}
      <group position={BRAIN_P} rotation={[0, 0.25 * Math.sin(t * 0.4), 0]}>
        <Mesh g={brainGeo} p={[-0.72, 0.15, 0]} s={S(1.25, 1.0, 1.1)} color="#e9a3b8" emissive="#7a3a50" ei={0.25} rough={0.5} />
        <Mesh g={brainGeo} p={[0.72, 0.15, 0]} s={S(1.25, 1.0, 1.1)} color="#e9a3b8" emissive="#7a3a50" ei={0.25} rough={0.5} />
        <Mesh g={G.capsule} p={[0, -1.0, -0.15]} s={S(0.35, 0.55, 0.35)} color="#d98aa0" ei={0.15} />
        <Mesh g={G.sphLo} p={[0, -0.35, 0.5]} s={0.3 + 0.12 * glow} color={GC.full} ei={0.2 + glow * 1.2} />
        <Mesh g={G.sphLo} p={[0, -0.35, 0.5]} s={0.7 + 0.2 * Math.sin(t * 5) * glow} color={GC.full} ei={1} opacity={0.22 * glow} />
      </group>
    </>
  );
};

/* ---------- neuron network (hypothalamus + reward) ---------- */
export const FULL_C: V3 = [-2.2, 4.3, 0];
export const HUNG_C: V3 = [2.2, 4.3, 0];
export const REW_C: V3 = [0, 1.3, 0];
const nodes = (c: V3, salt: number, n: number, R: number): V3[] => Array.from({length: n}).map((_, i) => add3(c, vol(i, salt, R)));
export const FULL_N = nodes(FULL_C, 201, 8, 1.5);
export const HUNG_N = nodes(HUNG_C, 301, 8, 1.5);
export const REW_N = nodes(REW_C, 401, 7, 1.7);

const edgeInst = (a: V3, b: V3, r: number): Inst => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const L = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return {p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2], s: [r, L, r], r: [e.x, e.y, e.z]};
};
const pairs = (n: number): [number, number][] => Array.from({length: n}).flatMap((_, i) => [[i, (i + 1) % n], [i, (i + 3) % n]] as [number, number][]);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 8);
const EDGES = (list: V3[]) => pairs(list.length).map(([a, b]) => ({a: list[a], b: list[b], inst: edgeInst(list[a], list[b], 0.035)}));
const FULL_E = EDGES(FULL_N), HUNG_E = EDGES(HUNG_N), REW_E = EDGES(REW_N);
const CROSS_I = [0, 2, 4, 6].map((k) => edgeInst(FULL_N[k], HUNG_N[k], 0.03));

export const NeuronNet: React.FC<{t: number; act: number}> = ({t, act}) => {
  const grp = (list: V3[], edges: {a: V3; b: V3; inst: Inst}[], color: string, level: number, k: number) => (
    <>
      <Instanced items={edges.map((e) => e.inst)} max={edges.length} geometry={CYL}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.12 + level * 0.5} roughness={0.5} />
      </Instanced>
      {list.map((p, i) => (
        <Mesh key={i} g={blobGeo(60 + i + k, 0.12)} p={p} s={0.36 * (0.8 + 0.2 * level)} color={color} ei={0.1 + level * 1.0} rough={0.4} />
      ))}
      {level > 0.3 &&
        edges.map((e, i) => (
          <Mesh key={'p' + i} g={G.sphLo} p={mix3(e.a, e.b, (t * 0.7 + i * 0.37) % 1)} s={0.07 * level} color="#ffffff" ei={1} />
        ))}
    </>
  );
  return (
    <>
      <color attach="background" args={['#070a1c']} />
      <fog attach="fog" args={['#070a1c', 18, 48]} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 6, 8]} intensity={2} />
      {grp(FULL_N, FULL_E, GC.full, 0.25 + 0.75 * act, 0)}
      {grp(HUNG_N, HUNG_E, GC.hunger, 1 - 0.85 * act, 10)}
      {grp(REW_N, REW_E, GC.reward, 1 - 0.8 * act, 20)}
      <Instanced items={CROSS_I} max={4} geometry={CYL}>
        <meshStandardMaterial color="#9aa3d6" emissive="#9aa3d6" emissiveIntensity={0.15} roughness={0.6} />
      </Instanced>
      {FULL_N.slice(0, 6).map((n, i) => {
        const d = 0.8 + i * 0.28;
        if (t < d) return null;
        const start: V3 = [n[0] + (rnd(i, 3) - 0.5) * 2, 7.5, n[2] + 1];
        return <Glow key={i} p={mix3(start, [n[0], n[1] + 0.38, n[2] + 0.1], ease((t - d) / 1.4))} r={0.16} />;
      })}
    </>
  );
};

/* ---------- stomach ---------- */
const ST_C: V3 = [-1.3, 1.7, 0];
const OUT = curve([[-0.2, 0.7, 0], [1.1, 0.2, 0], [2.0, -0.5, 0], [3.3, -0.6, 0]]);
const OUT_GEO = new THREE.TubeGeometry(OUT, 40, 0.24, 10, false);
export const OUT_MID: V3 = [1.1, 0.2, 0];
export const ST_TAG: V3 = [-1.3, 2.2, 0.8];
export const exitTime = (i: number) => (i < 11 ? 0.6 + i * 0.2 : 3.1 + (i - 11) * 0.7);
export const stomachRemaining = (t: number) => Array.from({length: 22}).filter((_, i) => t < exitTime(i) + 0.4).length;
export const Stomach: React.FC<{t: number}> = ({t}) => (
  <>
    <color attach="background" args={['#070a1c']} />
    <fog attach="fog" args={['#070a1c', 18, 48]} />
    <ambientLight intensity={0.9} />
    <directionalLight position={[3, 6, 8]} intensity={2.2} />
    <mesh geometry={blobGeo(40, 0.1)} position={ST_C} scale={[1.75, 2.0, 1.3]} rotation={[0, 0, -0.35]}>
      <meshPhysicalMaterial color="#f0a0b0" transparent opacity={0.3} roughness={0.3} emissive="#8a3a52" emissiveIntensity={0.4} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    <mesh geometry={OUT_GEO}>
      <meshStandardMaterial color="#e89aa8" transparent opacity={0.45} roughness={0.4} emissive="#7a3a50" emissiveIntensity={0.3} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    {Array.from({length: 22}).map((_, i) => {
      const te = exitTime(i);
      const v = vol(i, 5, 1);
      const home = add3(ST_C, [v[0] * 1.2, v[1] * 1.4 - 0.1, v[2] * 0.8]);
      const sw: V3 = [Math.sin(t * 0.9 + i) * 0.12, Math.cos(t * 0.8 + i * 2) * 0.12, 0];
      const p = (t - te) / 1.8;
      if (p <= 0) return <Mesh key={i} g={G.sphLo} p={add3(home, sw)} s={0.2} color={GC.food} ei={0.5} />;
      if (p > 1.15) return null;
      return <Mesh key={i} g={G.sphLo} p={at(OUT, p)} s={0.2 * (1 - clamp01((p - 0.95) / 0.2))} color={GC.food} ei={0.5} />;
    })}
    {t > 3.1 &&
      Array.from({length: 5}).map((_, i) => {
        const a = t * 1.6 + (i / 5) * Math.PI * 2;
        return <Glow key={i} p={[OUT_MID[0] + Math.cos(a) * 0.55, OUT_MID[1] + Math.sin(a) * 0.55, 0.1]} r={0.15} o={seg01(t, 3.1, 3.8)} />;
      })}
  </>
);

/* ---------- receptors on a cell membrane ---------- */
export const RX = [-2.6, 0, 2.6];
export const RCOL = [GC.glp, GC.gip, GC.gcg];
export const Receptors: React.FC<{t: number; act: [number, number, number]}> = ({t, act}) => (
  <>
    <color attach="background" args={['#070a1c']} />
    <fog attach="fog" args={['#070a1c', 16, 44]} />
    <ambientLight intensity={0.9} />
    <directionalLight position={[3, 7, 8]} intensity={2.2} />
    <mesh geometry={G.sph} position={[0, -1.7, 0]} scale={[4.6, 2.5, 2.4]}>
      <meshStandardMaterial color="#c4586e" transparent opacity={0.28} roughness={0.5} emissive="#6a2a40" emissiveIntensity={0.4} depthWrite={false} />
    </mesh>
    <mesh geometry={G.sph} position={[0, 0.1, 0]} scale={[4.7, 0.34, 2.5]}>
      <meshStandardMaterial color="#f3a3b0" roughness={0.35} emissive="#8a3a52" emissiveIntensity={0.35} />
    </mesh>
    {RX.map((x, r) => {
      const a = act[r];
      const col = a > 0.02 ? RCOL[r] : GC.off;
      const ei = 0.12 + 0.9 * a;
      const lig = ease(a);
      return (
        <group key={r} position={[x, 0.3, 0]}>
          <Mesh g={blobGeo(70 + r, 0.18)} p={[0, 0.65, 0]} s={S(0.6, 0.95, 0.6)} color={col} ei={ei} rough={0.35} />
          <Mesh g={blobGeo(75 + r, 0.2)} p={[0, 1.4, 0]} s={0.5} color={col} ei={ei} rough={0.35} />
          <Mesh g={G.sph} p={[0, 1.75, 0.15]} s={0.2} color="#1a0a20" emissive="#000000" ei={0} rough={1} />
          {a > 0.02 && (
            <group position={[0, lerp(5.5, 1.95, lig) + 0.08 * Math.sin(t * 3 + r), 0.15]} rotation={[0, 0, 0.2]}>
              <Mesh g={G.capsule} s={S(0.36, 0.55, 0.36)} color={col} ei={1.0} rough={0.25} />
              <mesh geometry={G.sphLo} scale={0.75}>
                <meshBasicMaterial color={col} transparent opacity={0.16 * lig} depthWrite={false} />
              </mesh>
            </group>
          )}
          {a > 0.5 &&
            [0, 1, 2].map((k) => {
              const u = (t * 0.7 + k / 3) % 1;
              return <Mesh key={k} g={G.torus} p={[0, -0.7 - u * 2.4, 0]} s={0.42} r={[Math.PI / 2, 0, 0]} color={RCOL[r]} ei={0.9} opacity={(1 - u) * 0.9 * a} />;
            })}
        </group>
      );
    })}
  </>
);
