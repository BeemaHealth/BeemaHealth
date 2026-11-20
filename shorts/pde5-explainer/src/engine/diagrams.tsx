import React from 'react';
import {clamp, eo3, eio, rnd, F, PRODUCT_LABEL, tone} from './ui';

type D = {t: number; dur: number; stage: string; C: Record<string, string>; product: string; cont: boolean; w: number; h: number};
const hexPts = (cx: number, cy: number, r: number) => Array.from({length: 6}, (_, i) => `${cx + r * Math.cos(Math.PI / 3 * i + Math.PI / 6)},${cy + r * Math.sin(Math.PI / 3 * i + Math.PI / 6)}`).join(' ');

const Tag: React.FC<{x: number; y: number; tx: number; ty: number; text: string; o: number; C: Record<string, string>; anchor?: 'start' | 'end' | 'middle'; dark?: boolean}> = ({x, y, tx, ty, text, o, C, anchor = 'middle', dark = true}) => {
  const tw = text.length * 17 + 56;
  return (
  <g opacity={o}>
    <line x1={x} y1={y} x2={tx} y2={ty} stroke={C.honey} strokeWidth={3} />
    <circle cx={x} cy={y} r={7} fill={C.honey} />
    <rect x={tx - tw / 2} y={ty - 34} width={tw} height={56} rx={28} fill={dark ? C.honey : C.ink} />
    <text x={tx} y={ty + 6} textAnchor="middle" fontFamily={F.display} fontWeight={800} fontSize={30} fill={dark ? C.onHoney : '#fff'}>{text}</text>
  </g>
  );
};

/** PDE5 flow: a vessel wall with a signal (cGMP), the PDE5 enzyme clearing it, then an inhibitor plugging the enzyme. */
export const Pde5Flow: React.FC<D> = ({t, dur, stage, C, product, cont}) => {
  const W = 1000, H = 760, p = clamp(t / Math.max(0.1, dur));
  const blocked = stage === 'blocked';
  const widen = blocked ? eio(clamp((p - 0.35) / 0.5)) : 0;
  const gap = 150 + widen * 130;                      // lumen height
  const cy = H / 2;
  const intro = cont ? 1 : eo3(t / 0.5);
  const dots = 7;
  const drug = PRODUCT_LABEL[product] ?? 'Inhibitor';
  const dotsAlive = (i: number) => blocked ? 1 : 1 - eio(clamp((p - 0.12 - i * 0.07) / 0.3)) * 0.92;
  const enzymeX = (i: number) => 120 + ((i * 190 + t * (blocked ? 8 : 50)) % 780);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{opacity: intro}}>
      {/* vessel muscle walls */}
      {[-1, 1].map((s) => {
        const y = cy + s * (gap / 2 + 70);
        return <g key={s}>
          <rect x={30} y={y - 70} width={940} height={140} rx={70} fill="rgba(238,179,24,0.10)" stroke="rgba(238,179,24,0.5)" strokeWidth={4} />
          {Array.from({length: dots}).map((_, i) => {
            const x = 110 + i * 130 + (s > 0 ? 40 : 0), a = dotsAlive(i + (s > 0 ? 3 : 0));
            return <polygon key={i} points={hexPts(x, y, 24)} fill={C.honey} opacity={0.25 + 0.75 * a} transform={`translate(0 ${Math.sin(t * 2 + i) * 4})`} />;
          })}
          {[0, 1, 2].map((i) => {
            const x = enzymeX(i + (s > 0 ? 3 : 0)); const yy = y + Math.sin(t * 1.6 + i * 2 + (s > 0 ? 1 : 0)) * 14;
            return <g key={'e' + i} transform={`translate(${x} ${yy})`} opacity={blocked ? 0.95 : 1}>
              <rect x={-34} y={-30} width={68} height={60} rx={20} fill={blocked ? '#6b7080' : '#fff'} />
              <path d="M -10 -30 L 0 -8 L 10 -30 Z" fill={C.ink} opacity={0.75} />
              {blocked && (
                <g transform={`translate(0 ${-46 + (1 - eo3((p - 0.1 - i * 0.08) / 0.2)) * -30})`} opacity={eo3((p - 0.1 - i * 0.08) / 0.2)}>
                  <rect x={-34} y={-18} width={68} height={36} rx={18} fill={C.honey} stroke={C.ink} strokeWidth={3} />
                  <line x1={0} y1={-18} x2={0} y2={18} stroke={C.ink} strokeWidth={3} />
                </g>
              )}
            </g>;
          })}
        </g>;
      })}
      {/* lumen with blood cells */}
      <rect x={30} y={cy - gap / 2} width={940} height={gap} fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.25)" strokeWidth={3} strokeDasharray="14 10" />
      {Array.from({length: 9}).map((_, i) => {
        const sp = blocked ? 130 : 55;
        const x = ((i * 120 + t * sp) % 1000) - 20, y = cy + (rnd(i * 3.1) - 0.5) * (gap - 70);
        return <ellipse key={i} cx={x} cy={y} rx={34} ry={22} fill="#f2f0e8" opacity={0.92} />;
      })}
      {/* labels */}
      <Tag x={110 + 3 * 130} y={cy - gap / 2 - 70} tx={230} ty={cy - gap / 2 - 175} text="cGMP signal" o={eo3((t - 0.4) / 0.4) * 0.98} C={C} />
      {!blocked && <Tag x={enzymeX(1)} y={cy + gap / 2 + 70} tx={760} ty={cy + gap / 2 + 205} text="PDE5 enzyme" o={eo3((t - 0.9) / 0.4)} C={C} />}
      {blocked && <Tag x={enzymeX(1)} y={cy + gap / 2 + 40} tx={640} ty={cy + gap / 2 + 205} text={`${drug} blocks PDE5`} o={eo3((t - 0.6) / 0.4)} C={C} anchor="middle" />}
      <g opacity={eo3((p - 0.55) / 0.2)}>
        {blocked && <text x={500} y={cy + 8} textAnchor="middle" fontFamily={F.display} fontWeight={800} fontSize={40} fill={C.ink}>Vessel can widen</text>}
      </g>
    </svg>
  );
};

/** Gut-to-brain hormone signalling for GLP-1 education. Stages: signal | dual | single | stomach. */
export const GutBrain: React.FC<D> = ({t, dur, stage, C, cont}) => {
  const W = 1000, H = 760, p = clamp(t / Math.max(0.1, dur));
  const intro = cont ? 1 : eo3(t / 0.5);
  const dual = stage === 'dual';
  const glow = eio(clamp((p - 0.25) / 0.4));
  const fill = stage === 'stomach' ? 0.85 - 0.35 * p : 0.8;
  const stream = (n: number, col: string, off: number) => Array.from({length: n}).map((_, i) => {
    const k = ((t * 0.32 + i / n + off) % 1);
    const x = 500 + Math.sin(k * 7 + off * 10) * 24 + off * 120, y = 560 - k * 330;
    return <circle key={col + i} cx={x} cy={y} r={11} fill={col} opacity={Math.sin(k * Math.PI) * (stage === 'stomach' ? 0.35 : 1)} />;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{opacity: intro}}>
      <defs><radialGradient id="bg"><stop offset="0" stopColor={C.honey} stopOpacity={0.55 * glow} /><stop offset="1" stopColor={C.honey} stopOpacity={0} /></radialGradient></defs>
      <circle cx={500} cy={150} r={230} fill="url(#bg)" />
      {/* brain */}
      <g transform="translate(500 140)">
        <path d="M -150 20 C -190 -40 -140 -110 -70 -100 C -40 -140 40 -140 70 -100 C 140 -110 190 -40 150 20 C 170 70 110 110 60 90 C 30 120 -30 120 -60 90 C -110 110 -170 70 -150 20 Z" fill="#fff" stroke={C.honey} strokeWidth={6} />
        <path d="M -90 -40 C -60 -60 -30 -30 0 -50 M 20 -70 C 50 -50 70 -30 100 -45 M -100 40 C -60 20 -30 50 10 25 M 40 50 C 70 30 100 55 120 35" fill="none" stroke="#c9ccd4" strokeWidth={5} strokeLinecap="round" />
      </g>
      {/* pathway */}
      <line x1={500} y1={290} x2={500} y2={560} stroke="rgba(255,255,255,.18)" strokeWidth={14} strokeLinecap="round" />
      {stream(dual ? 4 : 6, C.honey, 0)}
      {dual && stream(4, '#ffffff', 0.5)}
      {/* stomach */}
      <g transform="translate(500 620)">
        <path d="M -150 -10 C -150 -70 -40 -80 20 -60 C 90 -40 160 20 120 70 C 80 120 -60 110 -120 80 C -150 60 -150 20 -150 -10 Z" fill="rgba(255,255,255,.12)" stroke="#fff" strokeWidth={6} />
        <clipPath id="sc"><path d="M -150 -10 C -150 -70 -40 -80 20 -60 C 90 -40 160 20 120 70 C 80 120 -60 110 -120 80 C -150 60 -150 20 -150 -10 Z" /></clipPath>
        <rect x={-160} y={110 - fill * 190} width={320} height={190} fill={C.honey} opacity={0.55} clipPath="url(#sc)" />
      </g>
      {/* labels */}
      {stage === 'signal' && <><Tag x={500} y={430} tx={790} ty={400} text="Gut hormone" o={eo3((t - 0.5) / 0.4)} C={C} /><Tag x={640} y={130} tx={800} ty={90} text="Fullness signal" o={eo3((t - 1.2) / 0.4)} C={C} /></>}
      {stage === 'dual' && <><Tag x={470} y={430} tx={200} ty={400} text="GLP-1" o={eo3((t - 0.5) / 0.4)} C={C} /><Tag x={535} y={470} tx={790} ty={470} text="GIP" o={eo3((t - 0.9) / 0.4)} C={C} /></>}
      {stage === 'single' && <><Tag x={500} y={430} tx={200} ty={410} text="GLP-1 signal" o={eo3((t - 0.4) / 0.4)} C={C} /><Tag x={650} y={120} tx={800} ty={70} text="GLP-1 receptor" o={eo3((t - 1.2) / 0.4)} C={C} /></>}
      {stage === 'stomach' && <><Tag x={640} y={130} tx={800} ty={80} text="Appetite centers" o={eo3((t - 0.5) / 0.4)} C={C} /><Tag x={600} y={640} tx={800} ty={730} text="Slower emptying" o={eo3((t - 1.0) / 0.4)} C={C} /></>}
    </svg>
  );
};
