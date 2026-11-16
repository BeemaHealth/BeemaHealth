import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {C, W, H, lerp, ease, seg, clamp01, rnd} from './theme';
import {Backdrop, FONT, Label, Meter, StepTitle} from './parts';
import {CGMP3, Ca3, CellEnv, Drug3, NO3, PDE3, Rig, SGC3, Tunnel, V3, cellCam, vol} from './three3d';

type P = {t: number; dur: number};

const Stage: React.FC<{children: React.ReactNode}> = ({children}) => (
  <AbsoluteFill>
    <ThreeCanvas width={W} height={H} camera={{fov: 45, position: [0, 0, 10]}} gl={{antialias: true}}>
      {children}
    </ThreeCanvas>
  </AbsoluteFill>
);
const Overlay: React.FC<{children: React.ReactNode; bg?: boolean; t?: number}> = ({children, bg, t = 0}) => (
  <AbsoluteFill>
    <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} style={{display: 'block'}}>
      {bg && <Backdrop t={t} />}
      {children}
    </svg>
  </AbsoluteFill>
);
/** soft dark gradient so text stays readable over 3D */
const Scrim: React.FC<{top?: boolean; bottom?: boolean; mid?: boolean}> = ({top, bottom, mid}) => (
  <g>
    <defs>
      <linearGradient id="scT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0.65" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
       <linearGradient id="scM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="0.5" stopColor="#000" stopOpacity="0.55" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
      <linearGradient id="scB" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#000" stopOpacity="0.7" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
    </defs>
    {top && <rect x={0} y={0} width={W} height={420} fill="url(#scT)" />}
    {mid && <rect x={0} y={480} width={W} height={560} fill="url(#scM)" />}
    {bottom && <rect x={0} y={H - 520} width={W} height={520} fill="url(#scB)" />}
  </g>
);
const win = (t: number, a: number, b: number, fade = 0.5) => seg(t, a, a + fade) * (1 - seg(t, b - fade, b));

const NDOT = 16;
const home = (i: number): V3 => vol(i, 61, 2.9);
const ENZ_HOME: V3[] = [[-2.5, 1.4, -0.8], [2.6, 1.6, 0.6], [-2.2, -1.5, 1.8], [2.4, -1.6, -1.4]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const mix = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const jig = (i: number, t: number, k = 0.07): V3 => [Math.sin(t * 1.3 + i * 2) * k, Math.cos(t * 1.1 + i) * k, Math.sin(t * 0.9 + i * 3) * k];

export const SceneHook: React.FC<P> = ({t}) => {
  const a = seg(t, 0.3, 1.0), b = seg(t, 1.1, 1.8), c = seg(t, 3.0, 3.8);
  const z = 3 - t * 3.4;
  return (
    <>
      <Stage>
        <Rig pos={[Math.sin(t * 0.7) * 0.25, Math.cos(t * 0.5) * 0.2, z]} look={[Math.sin(t * 0.4) * 0.6, 0.1, z - 8]} fov={62} roll={Math.sin(t * 0.3) * 0.06} />
        <Tunnel relax={0.8} t={t} rings={40} zStart={4} flow={2.2} nRbc={40} />
      </Stage>
      <Overlay>
        <Scrim top bottom mid />
        <g fontFamily={FONT}>
          <g opacity={a} transform={`translate(0 ${(1 - a) * 30})`}><text x={W / 2} y={620} textAnchor="middle" fontSize={124} fontWeight={800} fill="#fff" stroke="#000" strokeOpacity={0.4} strokeWidth={8} paintOrder="stroke">Sildenafil</text></g>
          <g opacity={b} transform={`translate(0 ${(1 - b) * 30})`}><text x={W / 2} y={760} textAnchor="middle" fontSize={124} fontWeight={800} fill={C.no} stroke="#000" strokeOpacity={0.4} strokeWidth={8} paintOrder="stroke">Tadalafil</text></g>
          <g opacity={c} transform={`translate(0 ${(1 - c) * 24})`}>
            <text x={W / 2} y={890} textAnchor="middle" fontSize={52} fontWeight={600} fill={C.text}>How PDE5 inhibitors work</text>
            <text x={W / 2} y={950} textAnchor="middle" fontSize={34} fill={C.dim}>A research-based explainer</text>
          </g>
        </g>
      </Overlay>
    </>
  );
};

export const SceneVessel: React.FC<P> = ({t}) => {
  const relax = Math.max(0, Math.sin(t * 1.4) * 0.03);
  const chips: [string, string, number][] = [['Blood (lumen)', C.bloodLight, 2.6], ['Endothelium', C.endo, 4.2], ['Smooth muscle', C.muscle, 5.8]];
  return (
    <>
      <Stage>
        <Rig pos={[Math.sin(t * 0.5) * 0.12, Math.cos(t * 0.4) * 0.1, 4.2 - t * 0.14]} look={[0, 0, -7]} fov={58} roll={Math.sin(t * 0.2) * 0.04} />
        <Tunnel relax={relax} t={t} rings={20} zStart={2.5} flow={1.1} nRbc={26} />
      </Stage>
      <Overlay>
        <Scrim top bottom />
        <StepTitle step="AT REST" title="Muscle tense, artery narrow" t={t} />
        {chips.map(([txt, col, at], i) => (
          <g key={txt} opacity={seg(t, at, at + 0.6)}>
            <circle cx={180} cy={1560 + i * 64} r={13} fill={col} />
            <Label x={215} y={1572 + i * 64} text={txt} color={col} size={40} anchor="start" />
          </g>
        ))}
      </Overlay>
    </>
  );
};

export const SceneSignal: React.FC<P> = ({t}) => {
  const cam = cellCam(t, 0.4);
  const glow = seg(t, 2.8, 3.6) * (0.75 + 0.25 * Math.sin(t * 5));
  const SG: V3 = [0, 0, 0];
  return (
    <>
      <Stage>
        <Rig {...cam} fov={58} />
        <CellEnv t={t} glow={glow} />
        <SGC3 p={SG} glow={glow} t={t} />
        {Array.from({length: 8}).map((_, i) => {
          const d = 1.0 + i * 0.3;
          const p = clamp01((t - d) / 1.9);
          if (p <= 0) return null;
          const s0: V3 = [(rnd(i, 3) - 0.5) * 6, 7.5, (rnd(i, 4) - 0.5) * 6];
          const tgt: V3 = [(rnd(i, 5) - 0.5) * 1.2, 0.3, (rnd(i, 6) - 0.5) * 1.2];
          const pos = add(mix(s0, tgt, ease(p)), jig(i, t, 0.12));
          const op = p < 1 ? 1 : Math.max(0, 1 - (t - d - 1.9) * 3);
          return <NO3 key={i} p={pos} opacity={op} />;
        })}
        {Array.from({length: 18}).map((_, i) => {
          const sp = 4.0 + i * 0.2;
          if (t < sp) return null;
          const p = ease((t - sp) / 1.4);
          const tgt = vol(i, 71, 2.9);
          return <CGMP3 key={i} p={add(mix(SG, tgt, p), jig(i, t))} spin={t * 0.6 + i} />;
        })}
      </Stage>
      <Overlay>
        <Scrim top bottom />
        <StepTitle step="STEP 1" title="Nitric oxide starts the signal" t={t} />
        <Label x={W / 2} y={1590} text="Nitric oxide (NO) enters the muscle cell" color={C.no} size={44} opacity={win(t, 1.0, 3.2)} />
        <Label x={W / 2} y={1590} text="It switches on the enzyme sGC" color={C.sgc} size={44} opacity={win(t, 3.0, 5.2)} />
        <Label x={W / 2} y={1590} text="sGC makes cGMP, the 'relax' messenger" color={C.cgmp} size={44} opacity={seg(t, 5.0, 5.8)} />
      </Overlay>
    </>
  );
};

export const SceneRelax: React.FC<P> = ({t, dur}) => {
  const split = dur * 0.5;
  const cellO = 1 - seg(t, split - 0.4, split + 0.2);
  const artO = seg(t, split - 0.2, split + 0.5);
  const relax = seg(t, split + 0.3, dur - 0.8);
  const tt = Math.max(0, t - split);
  const cam = cellCam(t, 1.8);
  return (
    <>
      {t < split + 0.3 && (
        <AbsoluteFill style={{opacity: cellO}}>
          <Stage>
            <Rig {...cam} fov={58} />
            <CellEnv t={t} glow={1} />
            {Array.from({length: 14}).map((_, i) => (
              <CGMP3 key={'g' + i} p={add(vol(i, 81, 2.9), jig(i, t))} spin={t * 0.5 + i} />
            ))}
            {Array.from({length: 16}).map((_, i) => {
              const sp = vol(i, 91, 2.6);
              const dir = norm(sp);
              const st = 1.0 + i * 0.2;
              const p = ease((t - st) / 2.4);
              return <Ca3 key={'c' + i} p={add(sp, dir, p * 9)} opacity={1 - clamp01((p - 0.65) / 0.35)} />;
            })}
          </Stage>
          <Overlay>
            <Scrim top bottom />
            <StepTitle step="STEP 2" title="cGMP tells muscle to relax" t={t} />
            <Label x={W / 2} y={1590} text="Calcium drops inside the cell" color={C.ca} size={46} opacity={seg(t, 1, 1.8)} />
            <Label x={W / 2} y={1650} text="cGMP activates PKG, which lowers calcium" color={C.dim} size={30} weight={500} opacity={seg(t, 1.5, 2.3)} />
          </Overlay>
        </AbsoluteFill>
      )}
      {t > split - 0.3 && (
        <AbsoluteFill style={{opacity: artO}}>
          <Stage>
            <Rig pos={[Math.sin(tt * 0.4) * 0.15, Math.cos(tt * 0.3) * 0.12, 4.6 - tt * 0.1]} look={[0, 0, -7]} fov={58} roll={Math.sin(tt * 0.2) * 0.04} />
            <Tunnel relax={relax} t={t} rings={20} zStart={2.5} flow={1.4} nRbc={34} />
          </Stage>
          <Overlay>
            <Scrim top bottom />
            <StepTitle step="STEP 3" title="Artery widens, blood flows in" t={tt} />
            <Label x={W / 2} y={1620} text="Swelling squeezes the exit veins shut" color={C.bloodLight} size={40} opacity={seg(t, dur - 2.8, dur - 2.0)} />
          </Overlay>
        </AbsoluteFill>
      )}
    </>
  );
};

export const ScenePde5: React.FC<P> = ({t}) => {
  const cam = cellCam(t, 0.9);
  const kill = (i: number) => 2.6 + i * 0.4;
  const alive = Array.from({length: NDOT}).filter((_, i) => t < kill(i)).length;
  const stand = (i: number, e: number): V3 => add(home(i), norm(sub(ENZ_HOME[e], home(i))), 1.2);
  const enz = (e: number) => {
    const ks = Array.from({length: NDOT}).map((_, i) => i).filter((i) => i % 4 === e);
    let from = ENZ_HOME[e];
    let face: V3 = sub(home(ks[0]), from);
    for (const i of ks) {
      const to = stand(i, e);
      const k = kill(i);
      if (t < k + 0.25) {
        const p = ease((t - (k - 1.3)) / 1.1);
        return {pos: add(mix(from, to, p), jig(e, t, 0.1)), face: sub(home(i), mix(from, to, p))};
      }
      from = to;
      face = sub(home(i), to);
    }
    return {pos: add(from, jig(e, t, 0.1)), face};
  };
  return (
    <>
      <Stage>
        <Rig {...cam} fov={58} />
        <CellEnv t={t} glow={alive / NDOT} />
        {Array.from({length: NDOT}).map((_, i) => {
          const k = kill(i);
          const h = add(home(i), jig(i, t));
          if (t < k) return <CGMP3 key={i} p={h} spin={t * 0.5 + i} />;
          const p = clamp01((t - k) / 1.4);
          return <CGMP3 key={i} p={add(h, [0.2, -0.5, 0], p)} s={0.34 * (1 - p * 0.4)} color={C.gmp} opacity={1 - p} spin={t * 0.3} />;
        })}
        {[0, 1, 2, 3].map((e) => {
          const s = enz(e);
          return <PDE3 key={e} p={s.pos} yaw={Math.atan2(-s.face[2], s.face[0])} t={t} seed={e + 1} />;
        })}
      </Stage>
      <Overlay>
        <Scrim top bottom />
        <StepTitle step="THE OFF SWITCH" title="PDE5 destroys cGMP" t={t} />
        <Meter x={70} y={640} h={620} value={alive / NDOT} label="Signal" />
        <Label x={W / 2} y={1590} text="PDE5 enzyme" color={C.pde} size={48} opacity={seg(t, 1.0, 1.8)} />
        <Label x={W / 2} y={1650} text="Breaks cGMP into inactive 5'-GMP" color={C.dim} size={32} weight={500} opacity={seg(t, 2.6, 3.4)} />
      </Overlay>
    </>
  );
};

export const SceneInhibit: React.FC<P> = ({t}) => {
  const cam = cellCam(t, 0.9);
  const extra = clamp01((t - 4) / 5);
  const n = NDOT + Math.round(extra * 6);
  const signal = 0.55 + 0.4 * extra;
  const plug = (e: number) => seg(t, 1.6 + e * 0.5, 2.8 + e * 0.5);
  const yaw = (e: number) => Math.atan2(-(0 - ENZ_HOME[e][2]), 0 - ENZ_HOME[e][0]);
  return (
    <>
      <Stage>
        <Rig {...cam} fov={58} />
        <CellEnv t={t} glow={signal} />
        {Array.from({length: n}).map((_, i) => {
          const born = i < NDOT ? 0 : 4 + (i - NDOT) * 0.6;
          const o = i < NDOT ? 1 : seg(t, born, born + 0.6);
          return <CGMP3 key={i} p={add(home(i), jig(i, t))} spin={t * 0.5 + i} opacity={o} s={0.34 * (0.4 + 0.6 * o)} />;
        })}
        {[0, 1, 2, 3].map((e) => {
          const y = yaw(e);
          const pos = add(ENZ_HOME[e], jig(e, t, 0.08));
          const pocket: V3 = [Math.cos(y) * 0.62, 0, -Math.sin(y) * 0.62];
          const far: V3 = [Math.cos(y) * 3.6 + (rnd(e, 2) - 0.5) * 1.5, 1.2, -Math.sin(y) * 3.6 + 1.0];
          const dp = ease(plug(e));
          return (
            <group key={e}>
              <PDE3 p={pos} yaw={y} t={t} seed={e + 1} plugged={plug(e)} />
              {t > 1.4 + e * 0.5 && <Drug3 p={add(pos, mix(far, pocket, dp))} rot={y} />}
            </group>
          );
        })}
      </Stage>
      <Overlay>
        <Scrim top bottom />
        <StepTitle step="PDE5 INHIBITION" title="The enzyme is blocked" t={t} />
        <Meter x={70} y={640} h={620} value={signal} label="Signal" />
        <Label x={W / 2} y={1590} text="Sildenafil / tadalafil" color={C.drug} size={50} opacity={seg(t, 1.2, 2)} />
        <Label x={W / 2} y={1650} text="Compete for PDE5's active site. cGMP lasts longer." color={C.dim} size={32} weight={500} opacity={seg(t, 3.8, 4.6)} />
      </Overlay>
    </>
  );
};

export const SceneTiming: React.FC<P> = ({t}) => {
  return (<Overlay bg><TimingChart t={t} /></Overlay>);
};
const TimingChart: React.FC<{t: number}> = ({t}) => {
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
  const wide = seg(t, 0.6, 3.2);
  const bp = lerp(0.8, 0.2, seg(t, 5.2, 8.0));
  const warn = seg(t, 4.4, 5.2);
  const end = seg(t, dur - 3.2, dur - 2.4);
  return (
    <>
      <Stage>
        <Rig pos={[Math.sin(t * 0.4) * 0.15, Math.cos(t * 0.35) * 0.12, 4.0 - t * 0.12]} look={[0, 0, -7]} fov={60} roll={Math.sin(t * 0.25) * 0.05} />
        <Tunnel relax={lerp(0.2, 1, wide)} t={t} rings={20} zStart={2.5} flow={1.5} nRbc={34} />
      </Stage>
      <Overlay>
        <Scrim top bottom />
        <g fontFamily={FONT}>
          <StepTitle step="WORTH KNOWING" title="They widen other vessels too" t={t} />
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
            <path d="M540 1170 L610 1290 L470 1290 Z" fill={C.warn} stroke="#000" strokeWidth={4} strokeLinejoin="round" />
            <text x={540} y={1272} textAnchor="middle" fontSize={64} fontWeight={800} fill="#fff">!</text>
            <Label x={540} y={1370} text="Blood pressure can drop sharply" color={C.warn} size={44} />
            <Label x={540} y={1426} text="Never combine without medical guidance" color="#c9d0ee" size={30} weight={500} />
          </g>
          <Meter x={60} y={920} h={420} value={warn > 0.5 ? bp : 0.8} label="BP" />
          <g opacity={end} transform={`translate(0 ${(1 - end) * 20})`}>
            <rect x={80} y={1520} width={920} height={250} rx={36} fill="#0b1230" stroke={C.dim} strokeWidth={2} opacity={0.96} />
            <Label x={540} y={1595} text="Same enzyme. Same vessels." color={C.text} size={50} />
            <Label x={540} y={1655} text="Different timing." color={C.no} size={50} />
            <Label x={540} y={1735} text="Educational only. Not medical advice." color={C.dim} size={30} weight={500} />
          </g>
        </g>
      </Overlay>
    </>
  );
};
