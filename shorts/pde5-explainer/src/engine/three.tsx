import React, {useMemo} from 'react';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {clamp, eob} from './ui';

/** Extruded pointy-top hexagon prism (the Beema honeycomb, in real 3D). */
const hexGeo = (() => {
  const s = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + Math.PI / 6;
    const x = Math.cos(a) * 0.9, y = Math.sin(a) * 0.9;
    if (i) s.lineTo(x, y); else s.moveTo(x, y);
  }
  s.closePath();
  return new THREE.ExtrudeGeometry(s, {depth: 1, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1});
})();

/** Camera poses. Every cut and every scene picks a different one so the "camera" keeps moving. */
export const POSES = [
  {rx: -1.0, ry: 0.0, rz: 0.0, x: 0, y: -1.0, z: 0},
  {rx: -0.78, ry: 0.42, rz: 0.12, x: 0.8, y: -0.4, z: 0.6},
  {rx: -1.12, ry: -0.38, rz: -0.14, x: -0.8, y: -1.4, z: 0.2},
  {rx: -0.62, ry: -0.2, rz: 0.3, x: 0.2, y: 0.2, z: 1.0},
  {rx: -0.95, ry: 0.55, rz: -0.28, x: -0.4, y: -0.8, z: 0.4},
  {rx: -0.7, ry: 0.0, rz: 0.0, x: 0, y: 0, z: 1.4},
];

const PALETTE = (bg: string, C: Record<string, string>) =>
  bg === 'ink'
    ? {base: '#1a1d25', accent: C.honey, emissive: 0.55, light: 1.5, ambient: 0.55}
    : bg === 'honey'
    ? {base: '#d79a05', accent: '#fff0bd', emissive: 0.0, light: 1.5, ambient: 0.8}
    : {base: '#f2e1ac', accent: C.honey, emissive: 0.15, light: 1.3, ambient: 0.95};

const mixP = (a: typeof POSES[number], b: typeof POSES[number], k: number) => ({
  rx: a.rx + (b.rx - a.rx) * k, ry: a.ry + (b.ry - a.ry) * k, rz: a.rz + (b.rz - a.rz) * k,
  x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, z: a.z + (b.z - a.z) * k,
});
const smooth = (k: number) => { const x = clamp(k); return x * x * (3 - 2 * x); };

/* ------------------------------------------------------------------ alternative 3D backdrops, chosen per beat to match the topic */
export const THEMES = ['honeycomb', 'tunnel', 'orbits', 'grid', 'bubbles'];
const ThemeScene: React.FC<{w: number; h: number; theme: string; t: number; C: Record<string, string>}> = ({w, h, theme, t, C}) => {
  const rnd = (i: number, k: number) => { const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  return (
    <ThreeCanvas width={Math.round(w)} height={Math.round(h)} camera={{fov: 55, position: [0, 0, 8]}} gl={{antialias: true}}>
      <fog attach="fog" args={[C.ink, 8, 38]} />
      <ambientLight intensity={0.8} />
      <pointLight position={[0, 0, 6]} intensity={80} color={C.honey} />
      <pointLight position={[-6, 5, 4]} intensity={40} color="#ffffff" />
      {theme === 'tunnel' && Array.from({length: 16}, (_, i) => {
        const z = -((i * 2.6 + t * 5) % 41.6) + 4;                                            // rings stream toward the camera
        return <mesh key={i} position={[0, 0, z]} rotation={[0, 0, i * 0.4]}><torusGeometry args={[4.2 + (i % 3) * 0.5, 0.07, 10, 56]} /><meshStandardMaterial color={i % 2 ? C.honey : '#8a6a10'} emissive={C.honey} emissiveIntensity={i % 2 ? 0.7 : 0.15} transparent opacity={0.85} /></mesh>;
      })}
      {theme === 'tunnel' && Array.from({length: 40}, (_, i) => { const a = rnd(i, 1) * 6.28, r = 2.5 + rnd(i, 2) * 3, z = -((rnd(i, 3) * 40 + t * 9) % 40) + 4; return <mesh key={'p' + i} position={[Math.cos(a) * r, Math.sin(a) * r, z]} scale={[0.05, 0.05, 0.9]}><boxGeometry args={[1, 1, 1]} /><meshBasicMaterial color={C.honeyLight} transparent opacity={0.5} /></mesh>; })}
      {theme === 'orbits' && (
        <group rotation={[0.5, t * 0.08, 0.2]}>
          <mesh><sphereGeometry args={[1.6, 32, 24]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.25} transparent opacity={0.16} /></mesh>
          {[2.8, 4.2, 5.6].map((r, k) => <mesh key={k} rotation={[Math.PI / 2 + k * 0.35, k * 0.5, 0]}><torusGeometry args={[r, 0.025, 8, 90]} /><meshBasicMaterial color={C.honey} transparent opacity={0.45} /></mesh>)}
          {Array.from({length: 22}, (_, i) => { const r = [2.8, 4.2, 5.6][i % 3], a = t * (0.5 - (i % 3) * 0.12) + i * 1.3; return <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r * Math.cos((i % 3) * 0.35), Math.sin(a) * r * Math.sin((i % 3) * 0.35)]}><sphereGeometry args={[0.14 + (i % 4) * 0.05, 14, 12]} /><meshStandardMaterial color={i % 3 ? C.honeyLight : C.honey} emissive={C.honey} emissiveIntensity={0.5} /></mesh>; })}
        </group>
      )}
      {theme === 'grid' && (
        <group rotation={[-1.05, 0, 0]} position={[0, -3.2, -6]}>
          <gridHelper args={[60, 60, C.honey, C.honeyDeep]} position={[0, 0, (t * 1.6) % 1]} />
          {Array.from({length: 10}, (_, i) => <mesh key={i} position={[(i - 4.5) * 5, 0.4, -((i * 7 + t * 2) % 40) + 10]}><boxGeometry args={[0.15, 0.15 + rnd(i, 5) * 2.2, 0.15]} /><meshStandardMaterial color={C.honey} emissive={C.honey} emissiveIntensity={0.6} /></mesh>)}
        </group>
      )}
      {theme === 'bubbles' && Array.from({length: 46}, (_, i) => {
        const r = 0.15 + rnd(i, 1) * 0.55, x = (rnd(i, 2) - 0.5) * 16 + Math.sin(t * 0.6 + i) * 0.5, y = ((rnd(i, 3) * 16 + t * (0.8 + rnd(i, 4) * 1.4)) % 16) - 8, z = -rnd(i, 5) * 14;
        return <mesh key={i} position={[x, y, z]}><sphereGeometry args={[r, 20, 16]} /><meshPhysicalMaterial color={i % 4 ? C.honeyLight : C.honey} transparent opacity={0.28} roughness={0.1} clearcoat={1} emissive={C.honey} emissiveIntensity={0.15} /></mesh>;
      })}
    </ThreeCanvas>
  );
};

/** Full-frame 3D honeycomb that the camera flies through. The pose EASES from the previous cut's pose to this one
 *  (`blend` 0..1) so a "cut" is a smooth camera move, never a jump. `u` is progress through the whole scene. */
export const Scene3D: React.FC<{w: number; h: number; bg: string; t: number; pose: number; prevPose: number; blend: number; u: number; C: Record<string, string>; theme?: string}> = ({w, h, bg, t, pose, prevPose, blend, u, C, theme}) => {
  if (theme && theme !== 'honeycomb') return <ThemeScene w={w} h={h} theme={theme} t={t} C={C} />;
  const P = PALETTE(bg, C);
  const pz = mixP(POSES[prevPose % POSES.length], POSES[pose % POSES.length], smooth(blend));
  const cells = useMemo(() => {
    const out: {x: number; y: number; k: number; acc: boolean}[] = [];
    const dx = Math.sqrt(3);
    for (let row = -9; row <= 9; row++) for (let col = -7; col <= 7; col++) {
      const x = col * dx + (row % 2 ? dx / 2 : 0), y = row * 1.5;
      const k = Math.abs(Math.sin(row * 12.9 + col * 78.2) * 43758.5453) % 1;
      out.push({x, y, k, acc: k > 0.88});
    }
    return out;
  }, []);
  // foreground shards drift past the camera for parallax
  const shards = useMemo(() => Array.from({length: 9}, (_, i) => ({x: (Math.abs(Math.sin(i * 91.3) * 977) % 1) * 14 - 7, y: (Math.abs(Math.sin(i * 47.7) * 733) % 1) * 18 - 9, z: 3 + (i % 3) * 1.4, s: 0.35 + (i % 4) * 0.12, sp: 0.18 + (i % 5) * 0.06})), []);
  return (
    <ThreeCanvas width={Math.round(w)} height={Math.round(h)} camera={{fov: 52, position: [0, 0, 13]}} gl={{antialias: true}}>
      <fog attach="fog" args={[bg === 'ink' ? C.ink : bg === 'honey' ? '#c98f00' : '#f7edc8', 12, 30]} />
      <ambientLight intensity={P.ambient} />
      <directionalLight position={[4, 7, 9]} intensity={P.light} color="#fff4d6" />
      <pointLight position={[-5, 3, 5]} intensity={bg === 'ink' ? 60 : 20} color={C.honey} />
      <pointLight position={[5, -4, 4]} intensity={bg === 'ink' ? 45 : 12} color="#ffffff" />
      <group position={[pz.x + Math.sin(t * 0.15) * 0.25, pz.y + u * 0.5, pz.z + u * 0.8]} rotation={[pz.rx + Math.sin(t * 0.12) * 0.02, pz.ry + Math.sin(t * 0.15) * 0.04, pz.rz + Math.sin(t * 0.1) * 0.02]}>
        {cells.map((c, i) => {
          const wave = Math.sin(t * 0.7 + c.x * 0.6 + c.y * 0.5) + 0.5 * Math.sin(t * 0.4 - c.x * 0.3 + c.y * 0.8);
          const hgt = 0.4 + c.k * 1.3 + (wave * 0.35 + 0.5) * 1.1;
          const pulse = c.acc ? 0.6 + 0.4 * Math.sin(t * 1.2 + i) : 0;
          return (
            <mesh key={i} geometry={hexGeo} position={[c.x, c.y, -hgt]} scale={[1, 1, hgt]}>
              <meshStandardMaterial color={c.acc ? P.accent : P.base} metalness={0.35} roughness={0.42} emissive={c.acc ? P.accent : '#000'} emissiveIntensity={c.acc ? P.emissive * (0.6 + pulse) : 0} />
            </mesh>
          );
        })}
      </group>
      {shards.map((sh, i) => (
        <mesh key={'s' + i} geometry={hexGeo} position={[sh.x + Math.sin(t * sh.sp + i) * 0.8, ((sh.y + t * sh.sp * 1.4 + 9) % 18) - 9, sh.z]} rotation={[t * sh.sp * 0.9 + i, t * sh.sp * 0.6, i]} scale={[sh.s, sh.s, sh.s * 0.5]}>
          <meshStandardMaterial color={C.honey} metalness={0.5} roughness={0.25} emissive={C.honey} emissiveIntensity={0.35} transparent opacity={0.85} />
        </mesh>
      ))}
    </ThreeCanvas>
  );
};

/** Stylised chain of `n` spheres on a helix. It is an ILLUSTRATION of "a chain of N units", not a real molecular structure. */
export const Chain3D: React.FC<{w: number; h: number; t: number; n: number; C: Record<string, string>}> = ({w, h, t, n, C}) => {
  const pts = useMemo(() => Array.from({length: n}, (_, i) => new THREE.Vector3(Math.cos(i * 0.8) * 1.25, (i - (n - 1) / 2) * 0.4, Math.sin(i * 0.8) * 1.25)), [n]);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  return (
    <ThreeCanvas width={Math.round(w)} height={Math.round(h)} camera={{fov: 40, position: [Math.sin(t * 0.7) * 0.8, Math.cos(t * 0.5) * 0.4, 10.8]}} gl={{antialias: true, alpha: true}}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[3, 5, 8]} intensity={2.2} color="#fff4d6" />
      <pointLight position={[-4, -2, 5]} intensity={30} color={C.honey} />
      <group rotation={[0.35 + Math.sin(t * 0.8) * 0.12, t * 1.15 + 0.5, 0.15 + Math.sin(t * 0.6) * 0.08]} scale={1.05}>
        {pts.map((p, i) => {
          const k = eob((t - 0.25 - i * 0.11) / 0.3);
          const next = pts[i + 1];
          const bond = next ? (() => {
            const mid = p.clone().add(next).multiplyScalar(0.5), dir = next.clone().sub(p), len = dir.length();
            const q = new THREE.Quaternion().setFromUnitVectors(up, dir.normalize());
            return {mid, q, len};
          })() : null;
          const kb = clamp((t - 0.35 - i * 0.11) / 0.25);
          return (
            <group key={i}>
              <mesh position={p} scale={Math.max(0.001, k) * (1 + 0.12 * Math.sin(t * 4 - i * 0.7))}>
                <sphereGeometry args={[0.34, 32, 32]} />
                <meshStandardMaterial color={i % 2 ? '#fff6dc' : C.honey} metalness={0.2} roughness={0.28} emissive={C.honey} emissiveIntensity={i % 2 ? 0.05 : 0.35} />
              </mesh>
              {bond && (
                <mesh position={bond.mid} quaternion={bond.q} scale={[kb, bond.len * kb, kb]}>
                  <cylinderGeometry args={[0.07, 0.07, 1, 12]} />
                  <meshStandardMaterial color="#9a7410" metalness={0.3} roughness={0.5} />
                </mesh>
              )}
            </group>
          );
        })}
      </group>
    </ThreeCanvas>
  );
};
