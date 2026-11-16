import React from 'react';
import {W, lerp, seg} from '../theme';
import {FONT, Label} from '../parts';
import {Rig} from '../three3d';
import {Overlay, Stage} from '../scenes';
import {AC, AdLights, Chair, IconDoc, IconPackage, IconProvider, Motes, Phone, Tablet} from './parts3d';

type P = {t: number; dur: number};
const cam = (t: number) => ({pos: [Math.sin(t * 0.3) * 0.4, 1.2, 11] as [number, number, number], look: [0, 0.2, 0] as [number, number, number], fov: 45});

const T: React.FC<{x: number; y: number; text: string; size: number; fill?: string; w?: number; anchor?: 'start' | 'middle' | 'end'; o?: number}> = ({x, y, text, size, fill = '#fff', w = 700, anchor = 'middle', o = 1}) => (
  <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={w} fill={fill} opacity={o} fontFamily={FONT}>{text}</text>
);
const wrap = (s: string, max: number) => {
  const out: string[] = [];
  let cur = '';
  for (const w of s.split(' ')) {
    if ((cur + ' ' + w).trim().length > max) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  return out;
};

export const AdHook: React.FC<P> = ({t}) => {
  const c = cam(t);
  const rise = lerp(-5, 0.45, seg(t, 1.2, 2.3));
  const a = seg(t, 0.15, 0.6), b = seg(t, 0.4, 0.9), sub = seg(t, 2.0, 2.6);
  return (
    <>
      <Stage>
        <Rig {...c} />
        <AdLights glow={seg(t, 2, 3)} />
        <Motes t={t} />
        {[-2.2, -1.1, 0, 1.1, 2.2].map((x, i) => {
          const k = seg(t, 1.0 + i * 0.1, 1.9 + i * 0.1);
          return <Chair key={i} p={[x * 0.9, -0.55 - k * 3, 0]} r={[0.15, 0.35, k * 1.6 * (i % 2 ? 1 : -1)]} s={1.05} o={1 - k} />;
        })}
        <Phone p={[0, rise, 0]} r={[0, Math.sin(t * 0.9) * 0.3, 0]} t={t} s={0.65} glow={seg(t, 1.8, 2.6)} />
      </Stage>
      <Overlay>
        <g opacity={a} transform={`translate(0 ${(1 - a) * 24})`}>
          <T x={W / 2 - 20} y={420} text="Skip the" size={112} w={800} />
        </g>
        <g opacity={b} transform={`translate(0 ${(1 - b) * 24})`}>
          <T x={W / 2 - 20} y={540} text="waiting room." size={112} w={800} fill={AC.amber} />
        </g>
        <g opacity={sub}>
          <T x={W / 2 - 20} y={1175} text="Sildenafil  ·  Tadalafil" size={58} w={800} />
          <T x={W / 2 - 20} y={1228} text="Prescription ED medication, online" size={32} w={500} fill={AC.dim} />
        </g>
      </Overlay>
    </>
  );
};

export const AdSteps: React.FC<P> = ({t}) => {
  const c = {pos: [0, 0, 11] as [number, number, number], look: [0, 0, 0] as [number, number, number], fov: 45};
  const steps = [
    {y: 1.9, label: 'Complete a secure health questionnaire', at: 0.3},
    {y: 0.5, label: 'A licensed provider reviews it', at: 2.1},
    {y: -0.9, label: 'If appropriate, a licensed pharmacy ships it', at: 4.0},
  ];
  return (
    <>
      <Stage>
        <Rig {...c} />
        <AdLights />
        <Motes t={t} />
        <group scale={seg(t, 0.2, 0.8)}><IconDoc p={[-1.75, steps[0].y, 0]} s={0.7} t={t} /></group>
        <group scale={seg(t, 2.0, 2.6)}><IconProvider p={[-1.75, steps[1].y, 0]} s={0.7} t={t} /></group>
        <group scale={seg(t, 3.9, 4.5)}><IconPackage p={[-1.75, steps[2].y, 0]} s={0.7} t={t} /></group>
      </Stage>
      <Overlay>
        <g fontFamily={FONT}>
          <T x={W / 2 - 20} y={260} text="How it works" size={62} w={800} o={seg(t, 0, 0.5)} />
          {steps.map((s, i) => {
            const o = seg(t, s.at, s.at + 0.6);
            const py = 960 - s.y * 210;
            return (
              <g key={i} opacity={o} transform={`translate(${(1 - o) * 30} 0)`}>
                <circle cx={330} cy={py} r={30} fill={AC.amber} />
                <text x={330} y={py + 13} textAnchor="middle" fontSize={38} fontWeight={800} fill="#2a1700">{i + 1}</text>
                {wrap(s.label, 24).map((l, k) => <text key={k} x={385} y={py - 6 + k * 42} fontSize={36} fontWeight={700} fill="#fff">{l}</text>)}
              </g>
            );
          })}
        </g>
      </Overlay>
    </>
  );
};

const Card: React.FC<{y: number; h: number; o: number; children: React.ReactNode}> = ({y, h, o, children}) => (
  <g opacity={o} transform={`translate(0 ${(1 - o) * 30})`}>
    <rect x={235} y={y} width={695} height={h} rx={34} fill={AC.card} fillOpacity={0.9} stroke="#2a4468" strokeWidth={3} />
    {children}
  </g>
);
const Row: React.FC<{y: number; dose: string; a: string; an: string; b: string; bn: string}> = ({y, dose, a, an, b, bn}) => (
  <g fontFamily={FONT}>
    <text x={265} y={y} fontSize={28} fontWeight={700} fill="#fff">{dose}</text>
    <text x={440} y={y} fontSize={32} fontWeight={800} fill={AC.amber}>{a}<tspan fontSize={22} fontWeight={500} fill={AC.dim} dx={8}>{an}</tspan></text>
    <text x={685} y={y} fontSize={32} fontWeight={800} fill={AC.amber}>{b}<tspan fontSize={22} fontWeight={500} fill={AC.dim} dx={8}>{bn}</tspan></text>
  </g>
);

export const AdPrice: React.FC<P> = ({t}) => {
  const c = {pos: [0, 0, 11] as [number, number, number], look: [0, 0, 0] as [number, number, number], fov: 45};
  const o1 = seg(t, 1.0, 1.6), o2 = seg(t, 7.0, 7.6), of = seg(t, 1.2, 1.8);
  return (
    <>
      <Stage>
        <Rig {...c} />
        <AdLights />
        <Motes t={t} />
        <Tablet p={[-2.2, 2.15, 0]} r={[1.0, t * 0.9, 0.2]} s={0.5} />
        <Tablet p={[-2.2, -0.3, 0]} r={[1.0, -t * 0.9, 0.2]} s={0.5} />
      </Stage>
      <Overlay>
        <g fontFamily={FONT}>
          <T x={W / 2 - 20} y={265} text="Prices, up front" size={62} w={800} o={seg(t, 0, 0.5)} />
          <Card y={380} h={390} o={o1}>
            <T x={265} y={448} text="TADALAFIL" size={40} w={800} anchor="start" />
            <T x={905} y={448} text="from $89/mo" size={40} w={800} anchor="end" fill={AC.amber} />
            <text x={265} y={500} fontSize={22} fill={AC.dim}>DOSE</text>
            <text x={440} y={500} fontSize={22} fill={AC.dim}>1 MONTH</text>
            <text x={685} y={500} fontSize={22} fill={AC.dim}>3 MONTHS</text>
            <Row y={552} dose="5 mg" a="$89" an="30 tabs" b="$149" bn="90 tabs" />
            <Row y={612} dose="10 mg" a="$99" an="16 tabs" b="$159" bn="48 tabs" />
            <Row y={672} dose="20 mg" a="$149" an="16 tabs" b="$249" bn="48 tabs" />
            <text x={265} y={735} fontSize={24} fill={AC.dim}>5 mg 3-month plan: under $50 a month</text>
          </Card>
          <Card y={800} h={290} o={o2}>
            <T x={265} y={866} text="SILDENAFIL" size={40} w={800} anchor="start" />
            <T x={905} y={866} text="from $89/mo" size={40} w={800} anchor="end" fill={AC.amber} />
            <text x={265} y={918} fontSize={22} fill={AC.dim}>DOSE</text>
            <text x={440} y={918} fontSize={22} fill={AC.dim}>1 MONTH</text>
            <text x={685} y={918} fontSize={22} fill={AC.dim}>3 MONTHS</text>
            <Row y={970} dose="50/100 mg" a="$89" an="16 tabs" b="$129" bn="48 tabs" />
            <text x={265} y={1040} fontSize={24} fill={AC.dim}>3-month plan: $43 a month</text>
          </Card>
          <g opacity={of}>
            <T x={W / 2 - 20} y={1140} text="Doctor visit and shipping included. Cash-pay." size={26} w={600} />
            <T x={W / 2 - 20} y={1178} text="3-month plans are billed every 3 months." size={26} w={500} fill={AC.dim} />
          </g>
        </g>
      </Overlay>
    </>
  );
};

export const AdTrust: React.FC<P> = ({t}) => {
  const c = cam(t);
  const items = [['FDA-approved generic medications', 0.6], ['Dispensed by a licensed pharmacy', 2.0], ['Prescribing is never guaranteed', 3.9], ['A licensed provider decides', 5.9]] as const;
  return (
    <>
      <Stage>
        <Rig {...c} />
        <AdLights />
        <Motes t={t} />
        <Tablet p={[-1.0, 1.9, 0]} r={[0.9, t * 0.8, 0.1]} s={0.85} />
        <Tablet p={[1.1, 1.7, -0.5]} r={[0.9, -t * 0.7, -0.1]} s={0.85} />
      </Stage>
      <Overlay>
        <g fontFamily={FONT}>
          {items.map(([l, at], i) => {
            const o = seg(t, at, at + 0.5);
            return (
              <g key={l} opacity={o} transform={`translate(${(1 - o) * 30} 0)`}>
                <circle cx={150} cy={800 + i * 105} r={26} fill={AC.teal} />
                <path d={`M138 ${800 + i * 105} l9 10 l17 -20`} fill="none" stroke="#06241f" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
                <text x={200} y={812 + i * 105} fontSize={38} fontWeight={700} fill="#fff">{l}</text>
              </g>
            );
          })}
        </g>
      </Overlay>
    </>
  );
};

export const AdIsi: React.FC<P> = ({t}) => {
  const c = cam(t);
  const blocks: {h: string; col: string; body: string; at: number}[] = [
    {h: 'Do not take with', col: AC.warn, body: 'Nitrates (often used for chest pain) or riociguat. The combination can cause a dangerous drop in blood pressure.', at: 1.0},
    {h: 'Get medical help right away', col: AC.amber, body: 'for an erection lasting more than 4 hours, or sudden loss of vision or hearing.', at: 9.6},
    {h: 'Common side effects', col: AC.blue, body: 'Headache, flushing, upset stomach, stuffy nose, back or muscle pain.', at: 16.0},
    {h: 'Tell your provider', col: AC.teal, body: 'about your health conditions and all medicines you take. Sexual activity carries a cardiac risk.', at: 18.8},
  ];
  let y = 440;
  return (
    <>
      <Stage>
        <Rig {...c} />
        <AdLights />
        <Motes t={t} n={12} />
      </Stage>
      <Overlay>
        <g fontFamily={FONT}>
          <T x={W / 2 - 20} y={265} text="Important Safety Information" size={50} w={800} fill={AC.amber} o={seg(t, 0, 0.5)} />
          {blocks.map((b, i) => {
            const lines = wrap(b.body, 40);
            const h = 80 + lines.length * 40;
            const top = y;
            y += h + 26;
            const o = seg(t, b.at, b.at + 0.5);
            return (
              <g key={i} opacity={o} transform={`translate(0 ${(1 - o) * 20})`}>
                <rect x={60} y={top} width={870} height={h} rx={26} fill={AC.card} fillOpacity={0.92} stroke={b.col} strokeWidth={3} />
                <text x={96} y={top + 52} fontSize={34} fontWeight={800} fill={b.col}>{b.h}</text>
                {lines.map((l, k) => <text key={k} x={96} y={top + 96 + k * 40} fontSize={30} fontWeight={500} fill="#e8eefc">{l}</text>)}
              </g>
            );
          })}
        </g>
      </Overlay>
    </>
  );
};

export const AdClose: React.FC<P> = ({t}) => {
  const c = cam(t);
  const lines = [
    'Prescription required. For adult men 18 and older.',
    'A licensed provider decides if treatment is appropriate;',
    'prescribing is never guaranteed. Cash-pay.',
    'Available in all 50 states. Sildenafil and tadalafil',
    'are FDA-approved generic medications.',
  ];
  return (
    <>
      <Stage>
        <Rig {...c} />
        <AdLights glow={0.6} />
        <Motes t={t} />
        <Phone p={[0, 2.1, 0]} r={[0, Math.sin(t * 0.8) * 0.35, 0]} s={0.5} t={t} />
      </Stage>
      <Overlay>
        <g fontFamily={FONT}>
          <g opacity={seg(t, 0.2, 0.8)}>
            <T x={W / 2 - 20} y={800} text="Beema Health" size={92} w={800} />
            <T x={W / 2 - 20} y={880} text="beemahealth.com" size={50} w={700} fill={AC.amber} />
          </g>
          <g opacity={seg(t, 0.8, 1.4)}>
            <rect x={W / 2 - 20 - 220} y={920} width={440} height={80} rx={40} fill={AC.amber} />
            <T x={W / 2 - 20} y={973} text="Learn more" size={38} w={800} fill="#2a1700" />
          </g>
          <g opacity={seg(t, 1.4, 2.0)}>
            {lines.map((l, i) => <T key={i} x={W / 2 - 20} y={1075 + i * 34} text={l} size={25} w={500} fill={AC.dim} />)}
          </g>
        </g>
      </Overlay>
    </>
  );
};
