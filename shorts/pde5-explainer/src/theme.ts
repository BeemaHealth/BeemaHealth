export const W = 1080;
export const H = 1920;
export const FPS = 30;

export const C = {
  bg0: '#070b18',
  bg1: '#12183a',
  text: '#eef2ff',
  dim: '#8f9ac4',
  blood: '#d63c52',
  bloodDark: '#7d1426',
  bloodLight: '#f06a7d',
  muscle: '#e58a99',
  muscle2: '#d9707f',
  nucleus: '#a24560',
  endo: '#f5c2a8',
  no: '#4fe0d0',
  cgmp: '#7ee081',
  gmp: '#7b8299',
  sgc: '#a58bff',
  pde: '#ff9f43',
  drug: '#5aa9ff',
  ca: '#ffd166',
  warn: '#ff5d5d',
} as const;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
export const ease = (t: number) => {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
/** progress of t within [a,b], eased */
export const seg = (t: number, a: number, b: number) => ease((t - a) / (b - a));
/** deterministic 0..1 hash */
export const rnd = (i: number, salt = 0) => {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
