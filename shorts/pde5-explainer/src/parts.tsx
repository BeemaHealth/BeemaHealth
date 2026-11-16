import React from 'react';
import {C, W, H, clamp01, ease, rnd} from './theme';

export const FONT = '-apple-system, "SF Pro Display", "Helvetica Neue", Arial, sans-serif';

export const Backdrop: React.FC<{t: number}> = ({t}) => (
  <g>
    <defs>
      <radialGradient id="bg" cx="50%" cy="38%" r="80%">
        <stop offset="0%" stopColor={C.bg1} />
        <stop offset="100%" stopColor={C.bg0} />
      </radialGradient>
    </defs>
    <rect width={W} height={H} fill="url(#bg)" />
    {Array.from({length: 14}).map((_, i) => {
      const x = (rnd(i, 1) * W + t * (6 + rnd(i, 2) * 10)) % (W + 200) - 100;
      const y = rnd(i, 3) * H + Math.sin(t * 0.4 + i) * 20;
      const r = 20 + rnd(i, 4) * 40;
      return <ellipse key={i} cx={x} cy={y} rx={r} ry={r * 0.7} fill={C.blood} opacity={0.06 + rnd(i, 5) * 0.05} transform={`rotate(${t * 8 + i * 30} ${x} ${y})`} />;
    })}
  </g>
);

export const StepTitle: React.FC<{step?: string; title: string; sub?: string; t: number}> = ({step, title, sub, t}) => {
  const o = ease(t / 0.6);
  return (
    <g opacity={o} transform={`translate(0 ${(1 - o) * 16})`} fontFamily={FONT}>
      {step && <text x={W / 2} y={170} textAnchor="middle" fontSize={34} fontWeight={700} letterSpacing={6} fill={C.dim}>{step}</text>}
      <text x={W / 2} y={246} textAnchor="middle" fontSize={68} fontWeight={800} fill={C.text}>{title}</text>
      {sub && <text x={W / 2} y={300} textAnchor="middle" fontSize={34} fill={C.dim}>{sub}</text>}
    </g>
  );
};

export const Label: React.FC<{x: number; y: number; text: string; color?: string; size?: number; opacity?: number; anchor?: 'start' | 'middle' | 'end'; weight?: number; halo?: boolean}> = ({
  x, y, text, color = C.text, size = 36, opacity = 1, anchor = 'middle', weight = 700, halo = true,
}) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={color} opacity={opacity} fontFamily={FONT} style={{paintOrder: 'stroke'}} stroke={halo ? C.bg0 : 'none'} strokeWidth={6} strokeLinejoin="round">
    {text}
  </text>
);

export const Callout: React.FC<{x: number; y: number; tx: number; ty: number; text: string; color: string; opacity: number; anchor?: 'start' | 'middle' | 'end'}> = ({
  x, y, tx, ty, text, color, opacity, anchor = 'middle',
}) => (
  <g opacity={opacity}>
    <line x1={x} y1={y} x2={tx} y2={ty} stroke={color} strokeWidth={3} strokeDasharray="6 8" />
    <circle cx={x} cy={y} r={7} fill={color} />
    <Label x={tx} y={ty + (ty > y ? 40 : -16)} text={text} color={color} anchor={anchor} />
  </g>
);

export const RBC: React.FC<{x: number; y: number; s?: number; rot?: number; opacity?: number}> = ({x, y, s = 1, rot = 0, opacity = 1}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} opacity={opacity}>
    <ellipse rx={30} ry={20} fill={C.blood} />
    <ellipse rx={14} ry={8} fill={C.bloodDark} opacity={0.7} />
    <ellipse rx={30} ry={20} fill="none" stroke={C.bloodLight} strokeWidth={2} opacity={0.6} />
  </g>
);

/** Cross-section of an artery. relax 0 = tense/narrow, 1 = relaxed/wide. */
export const Artery: React.FC<{cx: number; cy: number; relax: number; t: number; scale?: number; showLabels?: boolean; labelOpacity?: number}> = ({
  cx, cy, relax, t, scale = 1, showLabels = false, labelOpacity = 1,
}) => {
  const r = clamp01(relax);
  const lumen = 55 + (190 - 55) * r;
  const endoT = 14;
  const thick = 150 - 80 * r;
  const inner = lumen + endoT;
  const mid = inner + thick / 2;
  const outer = inner + thick;
  const N = 18;
  const cellW = ((2 * Math.PI * mid) / N) * 0.93;
  const nRbc = Math.round(3 + 11 * r);
  const A = (px: number, py: number) => [cx + px * scale, cy + py * scale] as const;
  const mAng = 0.8, eAng = 0.4;
  const [mx, my] = A(mid * Math.cos(mAng), mid * Math.sin(mAng));
  const [ex, ey] = A(-(lumen + 7) * Math.cos(eAng), (lumen + 7) * Math.sin(eAng));
  return (
    <g>
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <circle r={outer + 24} fill="none" stroke={C.dim} strokeWidth={2} opacity={0.35} strokeDasharray="4 10" />
      {Array.from({length: N}).map((_, i) => {
        const a = (i / N) * 360;
        return (
          <g key={i} transform={`rotate(${a}) translate(${mid} 0)`}>
            <rect x={-thick / 2} y={-cellW / 2} width={thick} height={cellW} rx={Math.min(thick, cellW) * 0.38} fill={i % 2 ? C.muscle : C.muscle2} stroke="#5a1f33" strokeWidth={2.5} />
            <ellipse cx={0} cy={0} rx={Math.max(8, thick * 0.17)} ry={Math.min(cellW * 0.22, 14)} fill={C.nucleus} opacity={0.85} />
          </g>
        );
      })}
      <circle r={lumen + endoT / 2} fill="none" stroke={C.endo} strokeWidth={endoT} />
      <circle r={lumen} fill={C.bloodDark} opacity={0.55} />
      {Array.from({length: nRbc}).map((_, i) => {
        const a = rnd(i, 7) * Math.PI * 2 + t * (0.25 + rnd(i, 8) * 0.3) * (i % 2 ? 1 : -1);
        const rr = Math.sqrt(rnd(i, 9)) * Math.max(0, lumen - 34);
        const fade = clamp01((r * 11 + 3 - i) / 1.5 + (i < 3 ? 1 : 0));
        return <RBC key={i} x={Math.cos(a) * rr} y={Math.sin(a) * rr} rot={rnd(i, 10) * 180 + t * 30} s={lumen < 90 ? 0.7 : 1} opacity={fade} />;
      })}
    </g>
      {showLabels && (
        <g opacity={labelOpacity}>
          <Callout x={cx} y={cy} tx={cx - 190} ty={cy - 520} text="Lumen (blood)" color={C.bloodLight} opacity={1} />
          <Callout x={mx} y={my} tx={cx + 230} ty={cy + 560} text="Smooth muscle" color={C.muscle} opacity={1} />
          <Callout x={ex} y={ey} tx={cx - 250} ty={cy + 560} text="Endothelium" color={C.endo} opacity={1} />
        </g>
      )}
    </g>
  );
};

/** A smooth muscle cell, shown big. Centre at (cx, cy). */
export const MuscleCell: React.FC<{cx: number; cy: number; w?: number; h?: number; glow?: number}> = ({cx, cy, w = 880, h = 900, glow = 0}) => (
  <g transform={`translate(${cx} ${cy})`}>
    <defs>
      <radialGradient id="cellg" cx="50%" cy="45%" r="70%">
        <stop offset="0%" stopColor="#f3a3b0" />
        <stop offset="100%" stopColor="#c4586e" />
      </radialGradient>
    </defs>
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w * 0.34} fill="url(#cellg)" stroke="#5a1f33" strokeWidth={8} />
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={w * 0.34} fill="none" stroke={C.cgmp} strokeWidth={10} opacity={glow * 0.5} />
    <ellipse cx={0} cy={h * 0.3} rx={170} ry={88} fill={C.nucleus} stroke="#5a1f33" strokeWidth={5} />
    <ellipse cx={20} cy={h * 0.3 + 10} rx={34} ry={22} fill="#7c2c46" />
  </g>
);

export const Dot: React.FC<{x: number; y: number; r: number; color: string; opacity?: number; ring?: boolean}> = ({x, y, r, color, opacity = 1, ring}) => (
  <g opacity={opacity}>
    <circle cx={x} cy={y} r={r} fill={ring ? 'none' : color} stroke={ring ? color : 'none'} strokeWidth={ring ? r * 0.38 : 0} />
    {!ring && <circle cx={x - r * 0.3} cy={y - r * 0.3} r={r * 0.3} fill="#fff" opacity={0.35} />}
  </g>
);

/** PDE5 enzyme: a pac-man-like pocket. mouthOpen 0..1. plugged draws drug in the mouth. */
export const Enzyme: React.FC<{x: number; y: number; r?: number; mouth?: number; rot?: number; plugged?: number; dim?: number}> = ({
  x, y, r = 62, mouth = 1, rot = 0, plugged = 0, dim = 0,
}) => {
  const a = (28 * Math.max(0.15, mouth) * Math.PI) / 180;
  const p1 = [Math.cos(a) * r, -Math.sin(a) * r];
  const p2 = [Math.cos(a) * r, Math.sin(a) * r];
  const col = dim > 0 ? '#c27a3c' : C.pde;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={`M0 0 L${p1[0]} ${p1[1]} A${r} ${r} 0 1 0 ${p2[0]} ${p2[1]} Z`} fill={col} stroke="#7a3d00" strokeWidth={4} strokeLinejoin="round" />
      <circle cx={-r * 0.15} cy={-r * 0.35} r={r * 0.09} fill="#3a1b00" />
      {plugged > 0 && (
        <g transform={`translate(${r * 0.75 + (1 - plugged) * 90} 0) scale(${plugged})`}>
          <rect x={-26} y={-16} width={52} height={32} rx={16} fill={C.drug} stroke="#2a5fa8" strokeWidth={3} />
          <rect x={-26} y={-16} width={26} height={32} rx={16} fill="#8cc4ff" opacity={0.7} />
        </g>
      )}
    </g>
  );
};

export const Meter: React.FC<{x: number; y: number; h: number; value: number; label: string}> = ({x, y, h, value, label}) => {
  const v = clamp01(value);
  const col = v > 0.5 ? C.cgmp : v > 0.25 ? C.ca : C.warn;
  return (
    <g fontFamily={FONT}>
      <rect x={x} y={y} width={40} height={h} rx={20} fill="#1b2347" stroke={C.dim} strokeWidth={2} />
      <rect x={x + 4} y={y + 4 + (h - 8) * (1 - v)} width={32} height={(h - 8) * v} rx={16} fill={col} />
      <text x={x + 20} y={y + h + 44} textAnchor="middle" fontSize={26} fontWeight={700} fill={C.dim}>{label}</text>
    </g>
  );
};
