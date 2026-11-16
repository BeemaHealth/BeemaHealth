import React from 'react';
import {C, W, H, lerp, ease, seg, clamp01, rnd} from './theme';
import {Artery, Callout, Dot, Enzyme, FONT, Label, Meter, MuscleCell, RBC, StepTitle} from './parts';

type P = {t: number; dur: number};

const CX = 540;
const CY = 1010;
const SGC = {x: 540, y: 880};

/** Longitudinal vessel strip used in the hook and safety scenes. */
const VesselStrip: React.FC<{y: number; half: number; t: number; speed?: number; n?: number}> = ({y, half, t, speed = 150, n = 11}) => (
  <g>
    <rect x={-20} y={y - half - 70} width={W + 40} height={70} rx={30} fill={C.muscle2} stroke="#5a1f33" strokeWidth={4} />
    <rect x={-20} y={y + half} width={W + 40} height={70} rx={30} fill={C.muscle2} stroke="#5a1f33" strokeWidth={4} />
    <rect x={-20} y={y - half - 10} width={W + 40} height={10} fill={C.endo} />
    <rect x={-20} y={y + half} width={W + 40} height={10} fill={C.endo} />
    <rect x={-20} y={y - half} width={W + 40} height={half * 2} fill={C.bloodDark} opacity={0.55} />
    {Array.from({length: n}).map((_, i) => {
      const x = ((rnd(i, 21) * (W + 160) + t * speed * (0.8 + rnd(i, 22) * 0.4)) % (W + 160)) - 80;
      const yy = y + (rnd(i, 23) - 0.5) * (half * 1.5);
      return <RBC key={i} x={x} y={yy} rot={rnd(i, 24) * 40 - 20 + Math.sin(t * 2 + i) * 10} />;
    })}
  </g>
);

export const SceneHook: React.FC<P> = ({t}) => {
  const a = seg(t, 0.2, 0.9);
  const b = seg(t, 1.0, 1.7);
  const c = seg(t, 3.2, 4.0);
  return (
    <g fontFamily={FONT}>
      <VesselStrip y={1180} half={95} t={t} />
      <g opacity={a} transform={`translate(0 ${(1 - a) * 30})`}>
        <text x={W / 2} y={560} textAnchor="middle" fontSize={118} fontWeight={800} fill={C.drug}>Sildenafil</text>
      </g>
      <g opacity={b} transform={`translate(0 ${(1 - b) * 30})`}>
        <text x={W / 2} y={700} textAnchor="middle" fontSize={118} fontWeight={800} fill={C.no}>Tadalafil</text>
      </g>
      <g opacity={c} transform={`translate(0 ${(1 - c) * 24})`}>
        <text x={W / 2} y={830} textAnchor="middle" fontSize={50} fontWeight={600} fill={C.text}>How PDE5 inhibitors work</text>
        <text x={W / 2} y={900} textAnchor="middle" fontSize={36} fill={C.dim}>A short, research-based explainer</text>
      </g>
    </g>
  );
};

export const SceneVessel: React.FC<P> = ({t}) => {
  const breathe = Math.sin(t * 1.4) * 0.03;
  const lo = seg(t, 3, 4);
  return (
    <g>
      <StepTitle step="AT REST" title="Muscle tense, artery narrow" t={t} />
      <Artery cx={CX} cy={1010} relax={Math.max(0, breathe)} t={t} scale={1.55} showLabels labelOpacity={lo} />
    </g>
  );
};

export const SceneSignal: React.FC<P> = ({t}) => {
  const glow = seg(t, 2.6, 3.4) * (0.7 + 0.3 * Math.sin(t * 5));
  const cellGlow = seg(t, 5, 8);
  return (
    <g>
      <StepTitle step="STEP 1" title="Nitric oxide starts the signal" t={t} />
      {/* endothelium neighbour on top */}
      <rect x={70} y={350} width={940} height={130} rx={60} fill={C.endo} stroke="#8a5a45" strokeWidth={5} />
      <Label x={CX} y={432} text="Vessel lining & nerve endings" color="#5a2f1f" size={32} halo={false} />
      <MuscleCell cx={CX} cy={CY + 50} glow={cellGlow} />
      <Label x={CX} y={640} text="Smooth muscle cell" color={C.text} size={32} opacity={seg(t, 0.5, 1.2) * (1 - seg(t, 3.5, 4.2))} />
      {/* sGC */}
      <g transform={`translate(${SGC.x} ${SGC.y})`}>
        <rect x={-110} y={-52} width={220} height={104} rx={50} fill={C.sgc} stroke="#4a3a9a" strokeWidth={5} />
        <rect x={-120} y={-62} width={240} height={124} rx={58} fill="none" stroke="#fff" strokeWidth={6} opacity={glow * 0.6} />
        <text y={14} textAnchor="middle" fontSize={44} fontWeight={800} fill="#fff" fontFamily={FONT}>sGC</text>
      </g>
      {/* NO particles */}
      {Array.from({length: 8}).map((_, i) => {
        const d = 1.1 + i * 0.3;
        const p = clamp01((t - d) / 1.7);
        if (p <= 0) return null;
        const sx = 270 + i * 77;
        const x = lerp(sx, SGC.x + (rnd(i, 3) - 0.5) * 120, ease(p)) + Math.sin(t * 6 + i) * 6;
        const y = lerp(470, SGC.y - 40, ease(p));
        const op = p < 1 ? 1 : Math.max(0, 1 - (t - d - 1.7) * 3);
        return <Dot key={i} x={x} y={y} r={20} color={C.no} opacity={op} />;
      })}
      {/* cGMP */}
      {Array.from({length: 18}).map((_, i) => {
        const sp = 3.8 + i * 0.2;
        const p = ease((t - sp) / 1.3);
        if (t < sp) return null;
        const ang = rnd(i, 5) * Math.PI * 2;
        const rad = 130 + rnd(i, 6) * 190;
        const x = SGC.x + Math.cos(ang) * rad * p + Math.sin(t * 1.3 + i * 2) * 7;
        const y = SGC.y + 70 + Math.sin(ang) * rad * 0.95 * p + Math.cos(t * 1.1 + i) * 7;
        return <Dot key={i} x={x} y={y} r={19} color={C.cgmp} ring />;
      })}
      <Callout x={CX + 60} y={560} tx={CX + 280} ty={540} text="Nitric oxide (NO)" color={C.no} opacity={seg(t, 1.4, 2.2) * (1 - seg(t, 4.5, 5))} />
      <Callout x={SGC.x + 80} y={SGC.y + 30} tx={SGC.x + 290} ty={SGC.y + 90} text="Enzyme makes..." color={C.sgc} opacity={seg(t, 3, 3.8) * (1 - seg(t, 5.2, 5.8))} />
      <Label x={CX} y={1560} text="cGMP: the 'relax' messenger" color={C.cgmp} size={50} opacity={seg(t, 5.2, 6.2)} />
    </g>
  );
};

export const SceneRelax: React.FC<P> = ({t, dur}) => {
  const split = dur * 0.5;
  const cellO = 1 - seg(t, split - 0.4, split + 0.2);
  const artO = seg(t, split - 0.2, split + 0.5);
  const relax = seg(t, split + 0.3, dur - 0.8);
  const ca = (i: number) => {
    const ang = rnd(i, 41) * Math.PI * 2;
    const sx = CX + Math.cos(ang) * (80 + rnd(i, 42) * 170);
    const sy = CY + 50 + Math.sin(ang) * (80 + rnd(i, 42) * 170);
    const ex = CX + Math.cos(ang) * 520;
    const ey = CY + 50 + Math.sin(ang) * 520;
    const st = 1.2 + i * 0.22;
    const p = ease((t - st) / 2.0);
    return {x: lerp(sx, ex, p), y: lerp(sy, ey, p), op: 1 - clamp01((p - 0.7) / 0.3)};
  };
  return (
    <g>
      <g opacity={cellO}>
        <StepTitle step="STEP 2" title="cGMP tells muscle to relax" t={t} />
        <MuscleCell cx={CX} cy={CY + 50} glow={1} />
        {Array.from({length: 14}).map((_, i) => {
          const q = ca(i);
          return <Dot key={'c' + i} x={q.x} y={q.y} r={16} color={C.ca} opacity={q.op} />;
        })}
        {Array.from({length: 14}).map((_, i) => {
          const ang = rnd(i, 51) * Math.PI * 2;
          return <Dot key={'g' + i} x={CX + Math.cos(ang) * (60 + rnd(i, 52) * 300)} y={CY + 30 + Math.sin(ang) * (60 + rnd(i, 52) * 300)} r={17} color={C.cgmp} ring opacity={0.9} />;
        })}
        <Label x={CX} y={1560} text="Calcium drops" color={C.ca} size={52} opacity={seg(t, 1, 1.8)} />
        <Label x={CX} y={1620} text="cGMP activates PKG, which lowers calcium" color={C.dim} size={30} opacity={seg(t, 1.4, 2.2)} weight={500} />
      </g>
      <g opacity={artO}>
        <StepTitle step="STEP 3" title="Artery widens, blood flows in" t={Math.max(0, t - split)} />
        <Artery cx={CX} cy={1010} relax={relax} t={t} scale={1.25} />
        <Label x={CX} y={1640} text="Swelling squeezes exit veins shut" color={C.bloodLight} size={38} opacity={seg(t, dur - 2.6, dur - 1.8)} />
      </g>
    </g>
  );
};

/** Shared layout for the PDE5 scenes. */
const NDOT = 16;
const dotHome = (i: number) => ({
  x: CX + Math.cos(rnd(i, 61) * 6.283) * (80 + rnd(i, 62) * 300),
  y: CY + 0 + Math.sin(rnd(i, 61) * 6.283) * (60 + rnd(i, 62) * 270),
});
const ENZ_HOME = [
  {x: 230, y: 740}, {x: 850, y: 760}, {x: 250, y: 1250}, {x: 840, y: 1230},
];

export const ScenePde5: React.FC<P> = ({t}) => {
  const kill = (i: number) => 2.6 + i * 0.4;
  const alive = Array.from({length: NDOT}).filter((_, i) => t < kill(i)).length;
  const enzPos = (e: number) => {
    const kills = Array.from({length: NDOT}).map((_, i) => i).filter((i) => i % 4 === e);
    let from = ENZ_HOME[e];
    const appear = seg(t, 1.0, 2.0);
    for (const i of kills) {
      const to = dotHome(i);
      const k = kill(i);
      if (t < k + 0.25) {
        const p = ease((t - (k - 1.2)) / 1.0);
        return {x: lerp(from.x, to.x - 70, p), y: lerp(from.y, to.y, p), appear};
      }
      from = {x: to.x - 70, y: to.y};
    }
    return {...from, appear};
  };
  return (
    <g>
      <StepTitle step="THE OFF SWITCH" title="PDE5 destroys cGMP" t={t} />
      <MuscleCell cx={CX} cy={CY + 50} glow={alive / NDOT} />
      {Array.from({length: NDOT}).map((_, i) => {
        const h = dotHome(i);
        const k = kill(i);
        const x = h.x + Math.sin(t * 1.3 + i * 2) * 8;
        const y = h.y + Math.cos(t * 1.1 + i) * 8;
        if (t < k) return <Dot key={i} x={x} y={y} r={19} color={C.cgmp} ring />;
        const p = clamp01((t - k) / 1.4);
        return <Dot key={i} x={x + p * 20} y={y + p * 60} r={12 * (1 - p * 0.4)} color={C.gmp} opacity={1 - p} />;
      })}
      {[0, 1, 2, 3].map((e) => {
        const p = enzPos(e);
        return <Enzyme key={e} x={p.x} y={p.y} mouth={0.55 + 0.45 * Math.abs(Math.sin(t * 3 + e))} r={58} rot={0} dim={0} />;
      })}
      <Meter x={70} y={640} h={620} value={alive / NDOT} label="Signal" />
      <Label x={CX + 40} y={1560} text="PDE5 enzyme" color={C.pde} size={48} opacity={seg(t, 1.2, 2.0)} />
      <Label x={CX + 40} y={1618} text="cGMP becomes inactive 5'-GMP" color={C.dim} size={32} weight={500} opacity={seg(t, 2.6, 3.4)} />
    </g>
  );
};

export const SceneInhibit: React.FC<P> = ({t}) => {
  const plug = (e: number) => seg(t, 1.6 + e * 0.5, 2.6 + e * 0.5);
  const allPlugged = seg(t, 3.8, 4.4);
  const extra = clamp01((t - 4) / 5);
  const n = NDOT + Math.round(extra * 6);
  const signal = 0.55 + 0.4 * extra;
  return (
    <g>
      <StepTitle step="PDE5 INHIBITION" title="The enzyme is blocked" t={t} />
      <MuscleCell cx={CX} cy={CY + 50} glow={signal} />
      {Array.from({length: n}).map((_, i) => {
        const h = dotHome(i);
        const born = i < NDOT ? 0 : 4 + (i - NDOT) * 0.6;
        const o = i < NDOT ? 1 : seg(t, born, born + 0.6);
        return <Dot key={i} x={h.x + Math.sin(t * 1.3 + i * 2) * 8} y={h.y + Math.cos(t * 1.1 + i) * 8} r={19} color={C.cgmp} ring opacity={o} />;
      })}
      {[0, 1, 2, 3].map((e) => (
        <Enzyme key={e} x={ENZ_HOME[e].x + Math.sin(t * 0.8 + e) * 6} y={ENZ_HOME[e].y + Math.cos(t * 0.7 + e) * 6} r={58} mouth={0.55} rot={e % 2 ? 180 : 0} plugged={plug(e)} dim={plug(e)} />
      ))}
      <Meter x={70} y={640} h={620} value={signal} label="Signal" />
      <Label x={CX + 40} y={1560} text="Sildenafil / tadalafil" color={C.drug} size={50} opacity={seg(t, 1.2, 2)} />
      <Label x={CX + 40} y={1618} text="Compete for PDE5's active site. cGMP lasts longer." color={C.dim} size={32} weight={500} opacity={seg(t, 3.8, 4.6) * allPlugged} />
    </g>
  );
};

export const SceneTiming: React.FC<P> = ({t}) => {
  const x0 = 150, x1 = 960, yTop = 760, yBot = 1380, maxH = 36;
  const px = (h: number) => x0 + (h / maxH) * (x1 - x0);
  const py = (lvl: number) => yBot - lvl * (yBot - yTop);
  const path = (half: number) => {
    let d = '';
    for (let h = 0; h <= maxH; h += 0.5) d += `${h === 0 ? 'M' : 'L'}${px(h).toFixed(1)} ${py(Math.pow(0.5, h / half)).toFixed(1)} `;
    return d;
  };
  const reveal = seg(t, 1.8, 8.5);
  const cw = (x1 - x0 + 20) * reveal;
  const mark = (half: number, color: string, name: string, text: string, ty: number, at: number) => {
    const o = seg(t, at, at + 0.6);
    return (
      <g opacity={o}>
        <line x1={px(half)} y1={py(0.5)} x2={px(half)} y2={yBot} stroke={color} strokeWidth={3} strokeDasharray="6 8" />
        <circle cx={px(half)} cy={py(0.5)} r={13} fill={color} stroke={C.bg0} strokeWidth={4} />
        <Label x={px(half) + (half < 8 ? 16 : 0)} y={ty} text={name} color={color} size={36} anchor={half < 8 ? 'start' : 'middle'} />
        <Label x={px(half) + (half < 8 ? 16 : 0)} y={ty + 44} text={text} color={color} size={36} anchor={half < 8 ? 'start' : 'middle'} weight={500} />
      </g>
    );
  };
  return (
    <g fontFamily={FONT}>
      <StepTitle step="THE DIFFERENCE" title="How long each one lasts" t={t} />
      {[0, 12, 24, 36].map((h) => (
        <g key={h}>
          <line x1={px(h)} y1={yTop} x2={px(h)} y2={yBot} stroke={C.dim} strokeWidth={1.5} opacity={0.3} />
          <text x={px(h)} y={yBot + 50} textAnchor="middle" fontSize={30} fill={C.dim}>{h}</text>
        </g>
      ))}
      <text x={(x0 + x1) / 2} y={yBot + 100} textAnchor="middle" fontSize={30} fill={C.dim}>hours after peak level</text>
      <line x1={x0} y1={py(0.5)} x2={x1} y2={py(0.5)} stroke={C.dim} strokeWidth={1.5} strokeDasharray="4 10" opacity={0.6} />
      <text x={x1} y={py(0.5) - 12} textAnchor="end" fontSize={28} fill={C.dim}>half the drug left</text>
      <line x1={x0} y1={yTop} x2={x0} y2={yBot} stroke={C.dim} strokeWidth={3} />
      <line x1={x0} y1={yBot} x2={x1} y2={yBot} stroke={C.dim} strokeWidth={3} />
      <text x={x0 - 20} y={yTop + 10} textAnchor="end" fontSize={26} fill={C.dim}>100%</text>
      <clipPath id="rev"><rect x={x0 - 5} y={yTop - 20} width={cw} height={yBot - yTop + 40} /></clipPath>
      <g clipPath="url(#rev)">
        <path d={path(4)} fill="none" stroke={C.drug} strokeWidth={9} strokeLinecap="round" />
        <path d={path(17.5)} fill="none" stroke={C.no} strokeWidth={9} strokeLinecap="round" />
      </g>
      {mark(4, C.drug, 'Sildenafil', '≈ 4 h', py(0.5) + 70, 3.4)}
      {mark(17.5, C.no, 'Tadalafil', '≈ 17.5 h', py(0.5) + 70, 6.4)}
      <text x={W / 2} y={1700} textAnchor="middle" fontSize={28} fill={C.dim} opacity={seg(t, 8, 9)}>Simplified decay curves for illustration (FDA label half-lives)</text>
    </g>
  );
};

export const SceneSafety: React.FC<P> = ({t, dur}) => {
  const wide = seg(t, 0.6, 3.0);
  const half = lerp(60, 140, wide);
  const bp = lerp(0.8, 0.2, seg(t, 5.2, 8.0));
  const warn = seg(t, 4.4, 5.2);
  const end = seg(t, dur - 3.2, dur - 2.4);
  return (
    <g fontFamily={FONT}>
      <StepTitle step="WORTH KNOWING" title="They widen other vessels too" t={t} />
      <VesselStrip y={640} half={half} t={t} n={10} />
      <g opacity={warn} transform={`translate(0 ${(1 - warn) * 20})`}>
        <g transform="translate(330 1010)">
          <rect x={-70} y={-26} width={140} height={52} rx={26} fill={C.drug} stroke="#2a5fa8" strokeWidth={4} />
          <Label x={0} y={80} text="PDE5 inhibitor" color={C.drug} size={32} />
        </g>
        <Label x={540} y={1022} text="+" color={C.text} size={80} />
        <g transform="translate(750 1010)">
          <rect x={-70} y={-26} width={140} height={52} rx={26} fill={C.ca} stroke="#a07a10" strokeWidth={4} />
          <Label x={0} y={80} text="Nitrate medicine" color={C.ca} size={32} />
        </g>
        <path d="M540 1170 L610 1290 L470 1290 Z" fill={C.warn} stroke={C.bg0} strokeWidth={4} strokeLinejoin="round" />
        <text x={540} y={1272} textAnchor="middle" fontSize={64} fontWeight={800} fill="#fff">!</text>
        <Label x={540} y={1370} text="Blood pressure can drop sharply" color={C.warn} size={44} />
        <Label x={540} y={1426} text="Never combine without medical guidance" color={C.dim} size={30} weight={500} />
      </g>
      <Meter x={60} y={920} h={420} value={warn > 0.5 ? bp : 0.8} label="BP" />
      <g opacity={end} transform={`translate(0 ${(1 - end) * 20})`}>
        <rect x={80} y={1520} width={920} height={250} rx={36} fill="#0b1230" stroke={C.dim} strokeWidth={2} opacity={0.96} />
        <Label x={540} y={1595} text="Same enzyme. Same vessels." color={C.text} size={50} />
        <Label x={540} y={1655} text="Different timing." color={C.no} size={50} />
        <Label x={540} y={1735} text="Educational only. Not medical advice." color={C.dim} size={30} weight={500} />
      </g>
    </g>
  );
};
