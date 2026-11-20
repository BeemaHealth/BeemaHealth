import React from 'react';
import * as THREE from 'three';
import {clamp01, ease, lerp, rnd} from '../theme';
import {G, Mesh, V3} from '../three3d';

export const AC = {bg: '#06121f', amber: '#ffb347', teal: '#35d0ba', blue: '#4cc3ff', warn: '#ff5d5d', card: '#08142a', dim: '#9fb0cf'} as const;
const BOX = new THREE.BoxGeometry(1, 1, 1);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 48);
const S = (x: number, y: number, z: number) => [x, y, z] as unknown as number;

export const AdLights: React.FC<{glow?: number}> = ({glow = 0}) => (
  <>
    <color attach="background" args={[AC.bg]} />
    <fog attach="fog" args={[AC.bg, 14, 40]} />
    <ambientLight intensity={0.8} />
    <directionalLight position={[3, 8, 8]} intensity={2.4} />
    <pointLight position={[0, 2, 5]} intensity={14 + glow * 20} color="#9fe8ff" distance={14} />
    <mesh position={[0, -2.2, 0]} scale={S(40, 0.1, 40)} geometry={BOX}>
      <meshStandardMaterial color="#0c1c30" roughness={0.6} />
    </mesh>
  </>
);

/** plain white round tablet (deliberately not a branded colour or shape) */
export const Tablet: React.FC<{p: V3; r?: V3; s?: number}> = ({p, r = [0, 0, 0], s = 1}) => (
  <group position={p} rotation={r} scale={s}>
    <mesh geometry={CYL} scale={S(1, 0.2, 1)}>
      <meshStandardMaterial color="#f4f6fa" roughness={0.35} />
    </mesh>
    <mesh geometry={BOX} position={[0, 0.205, 0]} scale={S(1.7, 0.02, 0.06)}>
      <meshStandardMaterial color="#c9d0dc" roughness={0.6} />
    </mesh>
  </group>
);

export const Chair: React.FC<{p: V3; r?: V3; s?: number; o?: number}> = ({p, r = [0, 0, 0], s = 1, o = 1}) => (
  <group position={p} rotation={r} scale={s * o}>
    <mesh geometry={BOX} position={[0, 0.55, 0]} scale={S(0.95, 0.14, 0.9)}>
      <meshStandardMaterial color="#8a96b0" roughness={0.6} />
    </mesh>
    <mesh geometry={BOX} position={[0, 1.15, -0.4]} scale={S(0.95, 1.0, 0.12)}>
      <meshStandardMaterial color="#8a96b0" roughness={0.6} />
    </mesh>
    {[[-0.4, 0.3], [0.4, 0.3], [-0.4, -0.3], [0.4, -0.3]].map(([x, z], i) => (
      <mesh key={i} geometry={BOX} position={[x, 0.24, z]} scale={S(0.08, 0.5, 0.08)}>
        <meshStandardMaterial color="#5c6680" roughness={0.5} />
      </mesh>
    ))}
  </group>
);

export const Phone: React.FC<{p: V3; r?: V3; s?: number; t: number; glow?: number}> = ({p, r = [0, 0, 0], s = 1, t, glow = 1}) => (
  <group position={p} rotation={r} scale={s}>
    <mesh geometry={BOX} scale={S(1.9, 3.7, 0.2)}>
      <meshStandardMaterial color="#1a2236" roughness={0.35} metalness={0.4} />
    </mesh>
    <mesh geometry={BOX} position={[0, 0, 0.11]} scale={S(1.72, 3.5, 0.02)}>
      <meshStandardMaterial color="#123a63" emissive="#2a8fd0" emissiveIntensity={0.5 * glow} roughness={0.3} />
    </mesh>
    {[1.1, 0.5, -0.1].map((y, i) => (
      <mesh key={i} geometry={BOX} position={[-0.1 + (i === 2 ? 0.2 : 0), y, 0.125]} scale={S(1.2 - i * 0.2, 0.16, 0.01)}>
        <meshStandardMaterial color="#cfe9ff" emissive="#cfe9ff" emissiveIntensity={0.6 * glow} />
      </mesh>
    ))}
    <mesh geometry={BOX} position={[0, -1.15, 0.125]} scale={S(1.2, 0.42, 0.01)}>
      <meshStandardMaterial color={AC.teal} emissive={AC.teal} emissiveIntensity={0.7 * glow + 0.2 * Math.sin(t * 4)} />
    </mesh>
  </group>
);

export const IconDoc: React.FC<{p: V3; s?: number; t: number}> = ({p, s = 1, t}) => (
  <group position={p} rotation={[0, Math.sin(t * 1.2) * 0.4, 0]} scale={s}>
    <mesh geometry={BOX} scale={S(0.9, 1.2, 0.08)}>
      <meshStandardMaterial color="#f4f6fa" roughness={0.5} />
    </mesh>
    {[0.35, 0.1, -0.15].map((y, i) => (
      <mesh key={i} geometry={BOX} position={[0, y, 0.05]} scale={S(0.6 - i * 0.08, 0.07, 0.02)}>
        <meshStandardMaterial color={AC.blue} emissive={AC.blue} emissiveIntensity={0.5} />
      </mesh>
    ))}
    <mesh geometry={G.sphLo} position={[0.2, -0.42, 0.06]} scale={0.1}>
      <meshStandardMaterial color={AC.teal} emissive={AC.teal} emissiveIntensity={0.8} />
    </mesh>
  </group>
);
export const IconProvider: React.FC<{p: V3; s?: number; t: number}> = ({p, s = 1, t}) => (
  <group position={p} rotation={[0, Math.sin(t * 1.2) * 0.4, 0]} scale={s}>
    <mesh geometry={G.sph} position={[0, 0.5, 0]} scale={0.3}>
      <meshStandardMaterial color="#f0c9a8" roughness={0.6} />
    </mesh>
    <mesh geometry={G.capsule} position={[0, -0.2, 0]} scale={S(0.75, 0.62, 0.45)}>
      <meshStandardMaterial color="#f4f6fa" roughness={0.5} />
    </mesh>
    <mesh geometry={BOX} position={[0.18, -0.05, 0.25]} scale={S(0.22, 0.06, 0.02)}>
      <meshStandardMaterial color={AC.warn} emissive={AC.warn} emissiveIntensity={0.5} />
    </mesh>
    <mesh geometry={BOX} position={[0.18, -0.05, 0.25]} scale={S(0.06, 0.22, 0.02)}>
      <meshStandardMaterial color={AC.warn} emissive={AC.warn} emissiveIntensity={0.5} />
    </mesh>
  </group>
);
export const IconPackage: React.FC<{p: V3; s?: number; t: number}> = ({p, s = 1, t}) => (
  <group position={p} rotation={[0.25, t * 0.9, 0]} scale={s}>
    <mesh geometry={BOX} scale={S(1.0, 0.8, 1.0)}>
      <meshStandardMaterial color="#c89b5e" roughness={0.7} />
    </mesh>
    <mesh geometry={BOX} position={[0, 0.405, 0]} scale={S(0.22, 0.02, 1.02)}>
      <meshStandardMaterial color="#e8cfa2" roughness={0.6} />
    </mesh>
  </group>
);

/** gentle floating particles for depth */
export const Motes: React.FC<{t: number; n?: number}> = ({t, n = 26}) => (
  <>
    {Array.from({length: n}).map((_, i) => (
      <Mesh key={i} g={G.sphLo} p={[(rnd(i, 1) - 0.5) * 9, ((rnd(i, 2) * 12 + t * 0.35 * (0.4 + rnd(i, 3))) % 12) - 3, -2 - rnd(i, 4) * 6]} s={0.05 + rnd(i, 5) * 0.08} color="#7fb8e8" ei={0.5} />
    ))}
  </>
);
export const lerpV = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
export {clamp01, ease};
