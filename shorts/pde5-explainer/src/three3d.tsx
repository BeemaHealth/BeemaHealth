import React, {useLayoutEffect, useRef} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {C, lerp, rnd} from './theme';

export type V3 = [number, number, number];

export const Rig: React.FC<{pos: V3; look: V3; fov?: number; roll?: number}> = ({pos, look, fov = 45, roll = 0}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(look[0], look[1], look[2]);
    camera.fov = fov;
    camera.near = 0.05;
    camera.far = 120;
    camera.updateProjectionMatrix();
  });
  return null;
};

/* ---------- shared geometry ---------- */
const makeRbc = () => {
  const y = (r: number) => 0.5 * Math.sqrt(Math.max(0, 1 - r * r)) * (0.2072 + 2.0026 * r * r - 1.1228 * r ** 4);
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 18; i++) pts.push(new THREE.Vector2(i / 18, -y(i / 18)));
  for (let i = 18; i >= 0; i--) pts.push(new THREE.Vector2(i / 18, y(i / 18)));
  return new THREE.LatheGeometry(pts, 40);
};
export const G = {
  rbc: makeRbc(),
  sph: new THREE.SphereGeometry(1, 32, 24),
  sphLo: new THREE.SphereGeometry(1, 14, 10),
  torus: new THREE.TorusGeometry(1, 0.28, 14, 36),
  capsule: new THREE.CapsuleGeometry(0.5, 1, 6, 14),
};

const blobCache = new Map<string, THREE.BufferGeometry>();
export const blobGeo = (seed: number, amp = 0.22) => {
  const key = `${seed}:${amp}`;
  const hit = blobCache.get(key);
  if (hit) return hit;
  const g = new THREE.SphereGeometry(1, 64, 44);
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n =
      Math.sin(v.x * 2.1 + seed) * Math.cos(v.y * 2.3 + seed * 1.7) +
      0.8 * Math.sin(v.z * 2.7 + seed * 0.6) +
      0.3 * Math.sin((v.x + v.y + v.z) * 4 + seed);
    v.multiplyScalar(1 + amp * n * 0.5);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  blobCache.set(key, g);
  return g;
};

/* ---------- instancing ---------- */
export type Inst = {p: V3; s?: number | V3; r?: V3; c?: string};
export const Instanced: React.FC<{items: Inst[]; max: number; geometry: THREE.BufferGeometry; colors?: boolean; children: React.ReactNode}> = ({
  items, max, geometry, colors, children,
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const d = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < max; i++) {
      const it = items[i];
      if (!it) {
        d.position.set(0, 0, 0);
        d.scale.set(0, 0, 0);
        d.rotation.set(0, 0, 0);
      } else {
        d.position.set(it.p[0], it.p[1], it.p[2]);
        const s = it.s ?? 1;
        if (Array.isArray(s)) d.scale.set(s[0], s[1], s[2]);
        else d.scale.setScalar(s);
        const r = it.r ?? [0, 0, 0];
        d.rotation.set(r[0], r[1], r[2]);
      }
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      if (colors) m.setColorAt(i, col.set(it?.c ?? '#ffffff'));
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geometry, undefined as unknown as THREE.Material, max]} frustumCulled={false}>
      {children}
    </instancedMesh>
  );
};

/* ---------- artery tunnel (inside view of a vessel wall) ---------- */
export const tunnelLumen = (relax: number) => lerp(0.95, 2.7, relax);
export const tunnelWallR = (relax: number) => tunnelLumen(relax) + 0.1 + lerp(1.15, 0.6, relax) / 2;

export const Tunnel: React.FC<{relax: number; t: number; rings?: number; spacing?: number; zStart?: number; flow?: number; nRbc?: number}> = ({
  relax, t, rings = 18, spacing = 1.0, zStart = 2, flow = 1.6, nRbc = 30,
}) => {
  const M = 24;
  const lumen = tunnelLumen(relax);
  const thick = lerp(1.15, 0.6, relax);
  const R = lumen + 0.1 + thick / 2;
  const len = (2 * Math.PI * R) / M;
  const cells: Inst[] = [];
  for (let k = 0; k < rings; k++) {
    for (let j = 0; j < M; j++) {
      const a = ((j + (k % 2) * 0.5) / M) * Math.PI * 2;
      const jit = rnd(k * 40 + j, 3);
      cells.push({
        p: [Math.cos(a) * R, Math.sin(a) * R, zStart - k * spacing],
        s: [thick * (0.9 + jit * 0.2), (len / 2) * 1.12, spacing * 0.92],
        r: [0, 0, a],
        c: (j + k) % 2 ? C.muscle : C.muscle2,
      });
    }
  }
  const zMin = zStart - rings * spacing;
  const L = rings * spacing;
  const rbcs: Inst[] = [];
  const visible = Math.round(lerp(Math.min(10, nRbc), nRbc, relax));
  for (let i = 0; i < visible; i++) {
    const span = L - 3;
    const z = zMin + ((rnd(i, 1) * span + t * flow * (0.8 + rnd(i, 2) * 0.4)) % span);
    const near = Math.max(0, Math.min(1, (zStart - 3 - z) / 2.5 + 0.2));
    const a = rnd(i, 4) * Math.PI * 2 + t * 0.15 * (i % 2 ? 1 : -1);
    const rad = Math.sqrt(rnd(i, 5)) * Math.max(0, lumen - 0.45) * 0.9;
    rbcs.push({
      p: [Math.cos(a) * rad, Math.sin(a) * rad, z],
      s: lerp(0.3, 0.42, relax) * near,
      r: [Math.PI / 2 + 0.5 * Math.sin(t * 1.3 + i), 0.45 * Math.cos(t * 0.9 + i * 2), t * 0.7 + i],
    });
  }
  return (
    <>
      <color attach="background" args={['#1a0510']} />
      <fog attach="fog" args={['#1a0510', 4, 24]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 3, 5]} intensity={0.9} />
      <pointLight position={[0, 0, zStart + 1.5]} intensity={34} distance={30} color="#ffd9c8" />
      <Instanced items={cells} max={rings * M} geometry={G.capsule} colors>
        <meshStandardMaterial roughness={0.5} metalness={0.05} />
      </Instanced>
      <mesh scale={[lumen + 0.05, lumen + 0.05, 1]} position={[0, 0, zStart - L / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[1, 1, L + 4, 56, 1, true]} />
        <meshStandardMaterial color={C.endo} emissive="#7a3a2a" emissiveIntensity={0.5} side={THREE.BackSide} transparent opacity={0.55} roughness={0.35} />
      </mesh>
      <Instanced items={rbcs} max={nRbc} geometry={G.rbc}>
        <meshStandardMaterial color={C.blood} emissive="#5a0a18" emissiveIntensity={0.55} roughness={0.4} side={THREE.DoubleSide} />
      </Instanced>
    </>
  );
};

/* ---------- molecular parts ---------- */
const Mesh: React.FC<{g: THREE.BufferGeometry; p?: V3; s?: number | V3; r?: V3; color: string; emissive?: string; ei?: number; opacity?: number; rough?: number}> = ({
  g, p = [0, 0, 0], s = 1, r = [0, 0, 0], color, emissive, ei = 0, opacity = 1, rough = 0.45,
}) => (
  <mesh geometry={g} position={p} scale={s as number} rotation={r}>
    <meshStandardMaterial color={color} emissive={emissive ?? color} emissiveIntensity={ei} roughness={rough} transparent={opacity < 1} opacity={opacity} />
  </mesh>
);

export const NO3: React.FC<{p: V3; opacity?: number}> = ({p, opacity = 1}) => (
  <group position={p} scale={opacity}>
    <Mesh g={G.sphLo} s={0.2} color={C.no} ei={1.1} />
    <Mesh g={G.sphLo} s={0.42} color={C.no} ei={1} opacity={0.18} />
  </group>
);
export const CGMP3: React.FC<{p: V3; s?: number; color?: string; spin?: number; opacity?: number}> = ({p, s = 0.34, color = C.cgmp, spin = 0, opacity = 1}) => (
  <group position={p} rotation={[spin, spin * 0.7, 0]}>
    <Mesh g={G.torus} s={s} color={color} ei={color === C.cgmp ? 0.7 : 0.05} opacity={opacity} />
  </group>
);
export const Ca3: React.FC<{p: V3; opacity?: number}> = ({p, opacity = 1}) => (
  <group position={p} scale={opacity}>
    <Mesh g={G.sphLo} s={0.17} color={C.ca} ei={0.7} />
  </group>
);
export const SGC3: React.FC<{p: V3; glow: number; t: number}> = ({p, glow, t}) => (
  <group position={p} rotation={[0, t * 0.15, 0]}>
    <Mesh g={blobGeo(2, 0.25)} s={0.95} color={C.sgc} ei={0.25 + glow * 0.9} rough={0.35} />
    <Mesh g={blobGeo(5, 0.3)} p={[0.95, 0.3, 0.1]} s={0.7} color={C.sgc} ei={0.25 + glow * 0.9} rough={0.35} />
    <Mesh g={blobGeo(9, 0.3)} p={[-0.85, -0.25, 0.3]} s={0.65} color="#8f72f0" ei={0.2 + glow * 0.9} rough={0.35} />
  </group>
);
/** PDE5: lumpy protein with a visible dark substrate pocket on local +x. */
export const PDE3: React.FC<{p: V3; yaw: number; plugged?: number; t: number; seed?: number; size?: number}> = ({p, yaw, plugged = 0, t, seed = 1, size = 0.6}) => {
  const col = plugged > 0.5 ? '#b5733a' : C.pde;
  return (
    <group position={p} rotation={[0.2 * Math.sin(t * 0.8 + seed), yaw, 0]} scale={size}>
      <Mesh g={blobGeo(seed + 11, 0.28)} s={0.95} color={col} ei={0.18} rough={0.35} />
      <Mesh g={blobGeo(seed + 23, 0.3)} p={[-0.7, 0.45, 0]} s={0.6} color={col} ei={0.18} rough={0.35} />
      <Mesh g={G.sph} p={[0.78, 0, 0]} s={0.4} color="#2b1200" emissive="#000000" ei={0} rough={1} />
    </group>
  );
};
/** Inhibitor molecule docking into the PDE5 pocket (local frame of enzyme). */
export const Drug3: React.FC<{p: V3; rot?: number}> = ({p, rot = 0}) => (
  <group position={p} rotation={[0, rot, Math.PI / 2]}>
    <Mesh g={G.capsule} s={[0.36, 0.52, 0.36]} color={C.drug} ei={1.0} rough={0.25} />
    <Mesh g={G.sphLo} s={0.8} color={C.drug} ei={1} opacity={0.14} />
  </group>
);

/* ---------- whole-cell view ---------- */
export const vol = (i: number, salt: number, R: number): V3 => {
  const u = rnd(i, salt), v = rnd(i, salt + 1), w = rnd(i, salt + 2);
  const th = Math.acos(2 * v - 1), ph = 2 * Math.PI * w, r = R * Math.cbrt(u);
  return [r * Math.sin(th) * Math.cos(ph), r * Math.cos(th), r * Math.sin(th) * Math.sin(ph)];
};
export const CELL_R: V3 = [3.1, 2.6, 2.6];
/** point inside the muscle cell (above the nucleus), i in any range */
export const inCell = (i: number, salt: number, k = 0.8): V3 => {
  const v = vol(i, salt, 1);
  return [v[0] * CELL_R[0] * k, v[1] * CELL_R[1] * k * 0.75 + 0.55, v[2] * CELL_R[2] * k];
};
export const ENDO: V3[] = [[-2.6, 3.95, 0.2], [0.1, 4.1, 0.5], [2.7, 3.95, -0.4]];

export const Halo: React.FC<{p: V3; r: number; color: string; o: number; t: number}> = ({p, r, color, o, t}) =>
  o < 0.02 ? null : (
    <mesh position={p} scale={r * (1 + 0.12 * Math.sin(t * 6))} geometry={G.sphLo}>
      <meshBasicMaterial color={color} transparent opacity={0.22 * o} depthWrite={false} />
    </mesh>
  );

const BOKEH: Inst[] = Array.from({length: 70}).map((_, i) => {
  const v = vol(i, 95, 1);
  const k = 9 + rnd(i, 7) * 8;
  return {p: [v[0] * k, v[1] * k, v[2] * k] as V3, s: 0.05 + rnd(i, 8) * 0.12, c: i % 2 ? '#3d5aa8' : '#7a4a8a'};
});

export const CellStage: React.FC<{t: number; glow?: number; len?: number; showEndo?: boolean}> = ({t, glow = 0, len = 1, showEndo = true}) => {
  const sx = CELL_R[0] * len, sy = CELL_R[1] / Math.sqrt(len), sz = CELL_R[2] / Math.sqrt(len);
  return (
    <>
      <color attach="background" args={['#070a1c']} />
      <fog attach="fog" args={['#070a1c', 16, 46]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[4, 8, 7]} intensity={2.3} />
      <pointLight position={[0, 0.5, 0]} intensity={18 + glow * 30} color="#bfffd0" distance={10} />
      {/* membrane: translucent shell + soft rim */}
      <mesh geometry={G.sph} scale={[sx, sy, sz]}>
        <meshPhysicalMaterial color="#f3a3b0" transparent opacity={0.17} roughness={0.25} side={THREE.DoubleSide} depthWrite={false} emissive="#a04a63" emissiveIntensity={0.35} />
      </mesh>
      <mesh geometry={G.sph} scale={[sx * 1.025, sy * 1.025, sz * 1.025]}>
        <meshBasicMaterial color="#ffb3c4" transparent opacity={0.16} side={THREE.BackSide} depthWrite={false} />
      </mesh>
      {/* nucleus */}
      <mesh geometry={blobGeo(4, 0.1)} position={[0, -1.35, 0]} scale={[1.45, 0.85, 0.95]}>
        <meshStandardMaterial color="#7a3f8c" roughness={0.6} emissive="#3a1a4a" emissiveIntensity={0.4} />
      </mesh>
      {/* neighbouring vessel-lining cells */}
      {showEndo &&
        ENDO.map((p, i) => (
          <mesh key={i} geometry={blobGeo(30 + i, 0.12)} position={p} scale={[1.45, 0.62, 1.3]}>
            <meshStandardMaterial color={C.endo} roughness={0.5} emissive="#7a3a2a" emissiveIntensity={0.35} />
          </mesh>
        ))}
    </>
  );
};

export const cellCam = (t: number, a0 = 0): {pos: V3; look: V3; fov: number} => {
  const a = a0 + 0.5 * Math.sin(0.22 * t + 0.6);
  const rad = 15.5 - Math.min(t, 10) * 0.1;
  return {pos: [Math.sin(a) * rad, 2.6 + 0.4 * Math.sin(t * 0.3), Math.cos(a) * rad], look: [0, -0.2, 0], fov: 52};
};

/* ---------- bird's-eye artery network ---------- */
type Seg = {curve: THREE.CatmullRomCurve3; r: number};
const buildNet = () => {
  const segs: Seg[] = [];
  const mk = (pts: V3[], r: number) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((q) => new THREE.Vector3(q[0], q[1], q[2])));
    segs.push({curve, r});
    return curve;
  };
  const trunk = mk([[0.3, 0, 14], [1.0, 0, 7], [-0.7, 0, 1], [0.6, 0, -6], [0, 0, -14]], 0.42);
  for (let k = 0; k < 6; k++) {
    const u = 0.12 + k * 0.15;
    const o = trunk.getPoint(u);
    const side = k % 2 ? 1 : -1;
    const len = 6 + rnd(k, 2) * 2;
    const mid: V3 = [o.x + side * len * 0.45, 0, o.z - 1.2 - rnd(k, 3)];
    const end: V3 = [o.x + side * len, 0, o.z - 3 + (rnd(k, 4) - 0.5) * 3];
    const b = mk([[o.x, 0, o.z], mid, end], 0.24);
    for (let j = 0; j < 2; j++) {
      const q = b.getPoint(j === 0 ? 0.55 : 1);
      const dz = j === 0 ? 3.5 : -3.2;
      mk([[q.x, 0, q.z], [q.x + side * 1.4, 0, q.z + dz * 0.5], [q.x + side * (2.4 + rnd(k * 2 + j, 5)), 0, q.z + dz]], 0.13);
    }
  }
  return segs;
};
const NET = buildNet();
const NET_GEO = NET.map((s) => new THREE.TubeGeometry(s.curve, 56, s.r, 12, false));
/** the highlighted small artery we "zoom into" */
export const NET_TARGET: V3 = (() => {
  const c = NET[NET.length - 2].curve.getPoint(1);
  return [c.x, 0, c.z] as V3;
})();
export const NET_TRUNK_MID: V3 = [0.2, 0, 0];

export const Network: React.FC<{t: number}> = ({t}) => {
  const flow: Inst[] = [];
  NET.forEach((s, si) => {
    const n = s.r > 0.3 ? 16 : s.r > 0.2 ? 9 : 5;
    for (let i = 0; i < n; i++) {
      const u = (rnd(i + si * 50, 1) + t * (0.05 + 0.03 * rnd(si, 3))) % 1;
      const q = s.curve.getPoint(u);
      flow.push({p: [q.x, q.y + 0.02, q.z], s: s.r * 0.55, r: [Math.PI / 2, 0, t + i]});
    }
  });
  return (
    <>
      <color attach="background" args={['#070b18']} />
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 12, 4]} intensity={2.2} />
      {NET_GEO.map((g, i) => (
        <mesh key={i} geometry={g}>
          <meshStandardMaterial color="#b83048" emissive="#5a0c20" emissiveIntensity={0.55} roughness={0.4} transparent opacity={0.82} />
        </mesh>
      ))}
      <Instanced items={flow} max={flow.length} geometry={G.rbc}>
        <meshStandardMaterial color="#ff8a9a" emissive="#ff4060" emissiveIntensity={0.7} roughness={0.4} side={THREE.DoubleSide} />
      </Instanced>
    </>
  );
};
