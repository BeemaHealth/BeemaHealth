import React from 'react';
import {AbsoluteFill} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {C, W, H, lerp, ease, seg, clamp01, rnd} from './theme';
import {Backdrop, FONT, Label, Meter, StepTitle, Tag, Cam} from './parts';
import {CGMP3, Ca3, CellStage, Drug3, ENDO, Halo, NO3, Network, NET_TARGET, NET_TRUNK_MID, PDE3, Rig, SGC3, Tunnel, V3, cellCam, inCell, tunnelLumen, tunnelWallR} from './three3d';

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
/** soft dark gradient so text stays readable over 3D (top title zone + mid caption zone) */
const Scrim: React.FC<{mid?: boolean; cap?: boolean}> = ({mid, cap}) => (
  <g>
    <defs>
      <linearGradient id="scT" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0.7" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
      <linearGradient id="scM" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="0.5" stopColor="#000" stopOpacity="0.55" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
      <linearGradient id="scC" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#000" stopOpacity="0.65" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
    </defs>
    <rect x={0} y={0} width={W} height={380} fill="url(#scT)" />
    {mid && <rect x={0} y={480} width={W} height={560} fill="url(#scM)" />}
    {cap && <rect x={0} y={1120} width={W} height={300} fill="url(#scM)" />}
  </g>
);
/** two-line caption, kept inside TikTok's safe area (above y=1380) */
const Caption: React.FC<{main: string; sub?: string; color: string; o: number}> = ({main, sub, color, o}) => (
  <g opacity={o}>
    <Label x={W / 2 - 20} y={1290} text={main} color={color} size={46} />
    {sub && <Label x={W / 2 - 20} y={1345} text={sub} color="#c9d0ee" size={30} weight={500} />}
  </g>
);
const win = (t: number, a: number, b: number, fade = 0.4) => seg(t, a, a + fade) * (1 - seg(t, b - fade, b));

type Cm = Cam;
const NDOT = 16;
const home = (i: number): V3 => inCell(i, 61);
/** enzymes live inside the cell, away from the nucleus */
const ENZ_HOME: V3[] = [[-1.9, 1.7, -0.6], [2.0, 1.4, 0.7], [-1.6, 0.2, 1.5], [1.7, 0.3, -1.3]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const norm = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const mix = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const jig = (i: number, t: number, k = 0.07): V3 => [Math.sin(t * 1.3 + i * 2) * k, Math.cos(t * 1.1 + i) * k, Math.sin(t * 0.9 + i * 3) * k];
const CELL_TAG: V3 = [-2.6, -0.8, 1.2];

export const SceneHook: React.FC<P> = ({t}) => {
  const a = seg(t, 0.2, 0.8), b = seg(t, 0.8, 1.4), c = seg(t, 2.4, 3.0);
  const z = 3 - t * 3.6;
  return (
    <>
      <Stage>
        <Rig pos={[Math.sin(t * 0.7) * 0.25, Math.cos(t * 0.5) * 0.2, z]} look={[Math.sin(t * 0.4) * 0.6, 0.1, z - 8]} fov={62} roll={Math.sin(t * 0.3) * 0.06} />
        <Tunnel relax={0.8} t={t} rings={40} zStart={4} flow={2.2} nRbc={40} />
      </Stage>
      <Overlay>
        <Scrim mid />
        <g fontFamily={FONT}>
          <g opacity={a} transform={`translate(0 ${(1 - a) * 30})`}><text x={W / 2 - 20} y={600} textAnchor="middle" fontSize={118} fontWeight={800} fill="#fff" stroke="#000" strokeOpacity={0.4} strokeWidth={8} paintOrder="stroke">Sildenafil</text></g>
          <g opacity={b} transform={`translate(0 ${(1 - b) * 30})`}><text x={W / 2 - 20} y={735} textAnchor="middle" fontSize={118} fontWeight={800} fill={C.no} stroke="#000" strokeOpacity={0.4} strokeWidth={8} paintOrder="stroke">Tadalafil</text></g>
          <g opacity={c} transform={`translate(0 ${(1 - c) * 24})`}>
            <text x={W / 2 - 20} y={850} textAnchor="middle" fontSize={50} fontWeight={600} fill={C.text}>How PDE5 inhibitors work</text>
          </g>
        </g>
      </Overlay>
    </>
  );
};

export const SceneVessel: React.FC<P> = ({t, dur}) => {
  const TA = 4.6;
  const aO = 1 - seg(t, TA - 0.5, TA);
  const bO = seg(t, TA - 0.6, TA - 0.1);
  const k = ease(t / TA);
  const camA: Cm = {
    pos: mix([0, 36, 9], [NET_TARGET[0], 2.6, NET_TARGET[2] + 2.2], ease(k * k)) as V3,
    look: mix([0, 0, 0], NET_TARGET, k) as V3,
    fov: lerp(50, 52, k),
  };
  const tb = Math.max(0, t - TA + 0.6);
  const relax = Math.max(0, Math.sin(tb * 1.4) * 0.03);
  const camB: Cm = {pos: [Math.sin(tb * 0.5) * 0.12, Math.cos(tb * 0.4) * 0.1, lerp(6.2, 4.2, ease(tb / 1.2)) - tb * 0.1], look: [0, 0, -7], fov: 58, roll: Math.sin(tb * 0.2) * 0.04};
  const wall = tunnelWallR(relax);
  return (
    <>
      {t < TA && (
        <AbsoluteFill style={{opacity: aO}}>
          <Stage>
            <Rig {...camA} />
            <Network t={t} />
          </Stage>
          <Overlay>
            <Scrim />
            <StepTitle step="THE BLOOD SUPPLY" title="A network of small arteries" t={t} />
            <Tag cam={camA} p={NET_TRUNK_MID} text="Arteries carry blood" color={C.bloodLight} dx={-120} dy={-300} o={win(t, 0.4, 2.8)} t={t} />
            <Tag cam={camA} p={NET_TARGET} text="Zooming into one" color={C.ca} dx={-80} dy={-260} o={win(t, 2.2, TA)} t={t} />
          </Overlay>
        </AbsoluteFill>
      )}
      {t > TA - 0.7 && (
        <AbsoluteFill style={{opacity: bO}}>
          <Stage>
            <Rig {...camB} />
            <Tunnel relax={relax} t={t} rings={20} zStart={2.5} flow={1.1} nRbc={26} />
          </Stage>
          <Overlay>
            <Scrim mid />
            <StepTitle step="AT REST" title="Muscle tense, artery narrow" t={tb} />
            <Tag cam={camB} p={[0, 0, -7]} text="Blood (the lumen)" color={C.bloodLight} dx={-30} dy={-330} o={seg(t, TA + 1.0, TA + 1.5)} t={t} />
            <Tag cam={camB} p={[Math.cos(2.2) * (tunnelLumen(relax) + 0.05), Math.sin(2.2) * (tunnelLumen(relax) + 0.05), -3]} text="Inner lining" color={C.endo} dx={-130} dy={-250} o={seg(t, TA + 2.6, TA + 3.1)} t={t} />
            <Tag cam={camB} p={[Math.cos(0.5) * wall, Math.sin(0.5) * wall, -6]} text="Smooth muscle wall" color={C.muscle} dx={-40} dy={330} o={seg(t, TA + 4.2, TA + 4.7)} t={t} />
          </Overlay>
        </AbsoluteFill>
      )}
    </>
  );
};

export const SceneSignal: React.FC<P> = ({t}) => {
  const cam = cellCam(t);
  const SG: V3 = [0, 0.7, 0];
  const glow = seg(t, 2.8, 3.5) * (0.75 + 0.25 * Math.sin(t * 5));
  const no = (i: number) => {
    const d = 1.0 + i * 0.28;
    const p = clamp01((t - d) / 1.9);
    const s0 = add(ENDO[i % 3], [(rnd(i, 3) - 0.5) * 1.6, -0.5, (rnd(i, 4) - 0.5) * 1.2]);
    const tg = add(SG, [(rnd(i, 5) - 0.5) * 1.4, 0.2, (rnd(i, 6) - 0.5) * 1.4]);
    return {p, pos: add(mix(s0, tg, ease(p)), jig(i, t, 0.1)), op: p < 1 ? 1 : Math.max(0, 1 - (t - d - 1.9) * 3)};
  };
  const cg = (i: number) => {
    const sp = 4.0 + i * 0.18;
    const p = ease((t - sp) / 1.3);
    return {on: t >= sp, pos: add(mix(SG, inCell(i, 71), p), jig(i, t))};
  };
  const n2 = no(2), c3 = cg(3);
  return (
    <>
      <Stage>
        <Rig {...cam} />
        <CellStage t={t} glow={glow} />
        <SGC3 p={SG} glow={glow} t={t} />
        <Halo p={SG} r={1.9} color={C.sgc} o={win(t, 3.0, 5.4)} t={t} />
        {Array.from({length: 8}).map((_, i) => {
          const s = no(i);
          return s.p > 0 ? <NO3 key={i} p={s.pos} opacity={s.op} /> : null;
        })}
        {Array.from({length: 18}).map((_, i) => {
          const s = cg(i);
          return s.on ? <CGMP3 key={i} p={s.pos} s={0.42} spin={t * 0.6 + i} /> : null;
        })}
      </Stage>
      <Overlay>
        <Scrim cap />
        <StepTitle step="STEP 1" title="Nitric oxide starts the signal" t={t} />
        <Tag cam={cam} p={ENDO[1]} text="Vessel lining" color={C.endo} dx={-220} dy={-30} o={win(t, 0.3, 3.0)} t={t} />
        <Tag cam={cam} p={CELL_TAG} text="Muscle cell" color={C.muscle} dx={-70} dy={180} o={win(t, 0.9, 3.4)} t={t} />
        <Tag cam={cam} p={n2.pos} text="Nitric oxide (NO)" color={C.no} dx={-250} dy={-50} o={win(t, 1.6, 3.8) * (n2.p > 0 && n2.p < 1 ? 1 : 0)} t={t} />
        <Tag cam={cam} p={SG} text="sGC enzyme" color={C.sgc} dx={260} dy={-120} o={win(t, 3.4, 5.6)} t={t} />
        <Tag cam={cam} p={c3.pos} text="cGMP messenger" color={C.cgmp} dx={-120} dy={220} o={seg(t, 5.4, 6.0) * (c3.on ? 1 : 0)} t={t} />
        <Caption main="Nitric oxide (NO) enters the muscle cell" color={C.no} o={win(t, 1.0, 3.3)} />
        <Caption main="It switches on the enzyme sGC" color={C.sgc} o={win(t, 3.2, 5.5)} />
        <Caption main="sGC makes cGMP, the 'relax' messenger" color={C.cgmp} o={seg(t, 5.4, 6.0)} />
      </Overlay>
    </>
  );
};

export const SceneRelax: React.FC<P> = ({t, dur}) => {
  const split = dur * 0.5;
  const cellO = 1 - seg(t, split - 0.4, split + 0.1);
  const artO = seg(t, split - 0.3, split + 0.3);
  const relax = seg(t, split + 0.2, dur - 0.5);
  const tt = Math.max(0, t - split);
  const cam = cellCam(t, 0.2);
  const ca = (i: number) => {
    const sp = inCell(i, 91, 0.7);
    const dir = norm([sp[0] / 3.1, (sp[1] - 0.5) / 2.6, sp[2] / 2.6]);
    const p = ease((t - (0.5 + i * 0.12)) / 1.8);
    return {pos: add(sp, dir, p * 4.8), o: 1 - clamp01((p - 0.7) / 0.3)};
  };
  const ca0 = ca(2);
  const camB: Cm = {pos: [Math.sin(tt * 0.4) * 0.15, Math.cos(tt * 0.3) * 0.12, 4.4 - tt * 0.08], look: [0, 0, -7], fov: 58, roll: Math.sin(tt * 0.2) * 0.04};
  const lum = tunnelLumen(relax);
  return (
    <>
      {t < split + 0.3 && (
        <AbsoluteFill style={{opacity: cellO}}>
          <Stage>
            <Rig {...cam} />
            <CellStage t={t} glow={1} len={lerp(0.94, 1.06, seg(t, 0.8, split))} />
            {Array.from({length: 14}).map((_, i) => (
              <CGMP3 key={'g' + i} p={add(inCell(i, 81), jig(i, t))} s={0.42} spin={t * 0.5 + i} />
            ))}
            {Array.from({length: 14}).map((_, i) => {
              const q = ca(i);
              return <Ca3 key={'c' + i} p={q.pos} opacity={q.o} />;
            })}
          </Stage>
          <Overlay>
            <Scrim cap />
            <StepTitle step="STEP 2" title="cGMP tells muscle to relax" t={t} />
            <Tag cam={cam} p={add(inCell(0, 81), jig(0, t))} text="cGMP" color={C.cgmp} dx={-200} dy={250} o={win(t, 0.2, 2.2)} t={t} />
            <Tag cam={cam} p={ca0.pos} text="Calcium (Ca2+)" color={C.ca} dx={150} dy={300} o={win(t, 1.0, split) * ca0.o} t={t} />
            <Caption main="Calcium leaves the muscle cell" sub="Less calcium means the muscle relaxes" color={C.ca} o={seg(t, 0.8, 1.3)} />
          </Overlay>
        </AbsoluteFill>
      )}
      {t > split - 0.4 && (
        <AbsoluteFill style={{opacity: artO}}>
          <Stage>
            <Rig {...camB} />
            <Tunnel relax={relax} t={t} rings={20} zStart={2.5} flow={1.4} nRbc={34} />
          </Stage>
          <Overlay>
            <Scrim cap />
            <StepTitle step="STEP 3" title="Artery widens, blood flows in" t={tt} />
            <Tag cam={camB} p={[Math.cos(0.5) * tunnelWallR(relax), Math.sin(0.5) * tunnelWallR(relax), -9]} text="Relaxed muscle" color={C.muscle} dx={-60} dy={300} o={seg(t, split + 1.2, split + 1.7)} t={t} />
            <Caption main="More blood flows through" color={C.bloodLight} o={seg(t, split + 1.4, split + 2)} />
          </Overlay>
        </AbsoluteFill>
      )}
    </>
  );
};

const enzymeState = (t: number, kill: (i: number) => number) => {
  const stand = (i: number, e: number): V3 => add(home(i), norm(sub(ENZ_HOME[e], home(i))), 1.1);
  return (e: number) => {
    const ks = Array.from({length: NDOT}).map((_, i) => i).filter((i) => i % 4 === e);
    let from = ENZ_HOME[e];
    let face: V3 = sub(home(ks[0]), from);
    for (const i of ks) {
      const to = stand(i, e);
      const k = kill(i);
      if (t < k + 0.25) {
        const p = ease((t - (k - 0.9)) / 0.8);
        return {pos: add(mix(from, to, p), jig(e, t, 0.08)), face: sub(home(i), mix(from, to, p))};
      }
      from = to;
      face = sub(home(i), to);
    }
    return {pos: add(from, jig(e, t, 0.08)), face};
  };
};

export const ScenePde5: React.FC<P> = ({t}) => {
  const cam = cellCam(t, -0.1);
  const kill = (i: number) => 2.0 + i * 0.27;
  const alive = Array.from({length: NDOT}).filter((_, i) => t < kill(i)).length;
  const enz = enzymeState(t, kill);
  const e0 = enz(0);
  const gmp = add(home(1), jig(1, t));
  const dead = add(home(0), [0.2, -0.5, 0], 1);
  return (
    <>
      <Stage>
        <Rig {...cam} />
        <CellStage t={t} glow={alive / NDOT} showEndo={false} />
        {Array.from({length: NDOT}).map((_, i) => {
          const k = kill(i);
          const h = add(home(i), jig(i, t));
          if (t < k) return <CGMP3 key={i} p={h} s={0.42} spin={t * 0.5 + i} />;
          const p = clamp01((t - k) / 1.2);
          return <CGMP3 key={i} p={add(h, [0.2, -0.5, 0], p)} s={0.42 * (1 - p * 0.4)} color={C.gmp} opacity={1 - p * 0.8} spin={t * 0.3} />;
        })}
        {[0, 1, 2, 3].map((e) => {
          const s = enz(e);
          return <PDE3 key={e} p={s.pos} yaw={Math.atan2(-s.face[2], s.face[0])} t={t} seed={e + 1} />;
        })}
      </Stage>
      <Overlay>
        <Scrim cap />
        <StepTitle step="THE OFF SWITCH" title="PDE5 destroys cGMP" t={t} />
        <Meter x={60} y={520} h={520} value={alive / NDOT} label="Signal" />
        <Tag cam={cam} p={e0.pos} text="PDE5 enzyme" color={C.pde} dx={-210} dy={-190} o={win(t, 0.5, 4.8)} t={t} />
        <Tag cam={cam} p={gmp} text="cGMP" color={C.cgmp} dx={230} dy={-190} o={win(t, 0.9, 2.1) * (t < kill(1) ? 1 : 0)} t={t} />
        <Tag cam={cam} p={dead} text="Inactive 5'-GMP" color={C.gmp} dx={-160} dy={-200} o={win(t, kill(0) + 0.3, kill(0) + 2.4) * 1} t={t} />
        <Caption main="PDE5 breaks cGMP into inactive pieces" sub="The relaxation signal fades" color={C.pde} o={seg(t, 1.2, 1.8)} />
      </Overlay>
    </>
  );
};

export const SceneInhibit: React.FC<P> = ({t}) => {
  const cam = cellCam(t, -0.1);
  const extra = clamp01((t - 4.5) / 4);
  const n = NDOT + Math.round(extra * 6);
  const signal = 0.55 + 0.4 * extra;
  const dock = (e: number) => 1.2 + e * 0.55;
  const plug = (e: number) => seg(t, dock(e) + 1.4, dock(e) + 2.0);
  const out = (e: number): V3 => norm([ENZ_HOME[e][0], 0.15, ENZ_HOME[e][2]]);
  const yaw = (e: number) => Math.atan2(-out(e)[2], out(e)[0]);
  const drugAt = (e: number): V3 => {
    const o = out(e);
    const pos = add(ENZ_HOME[e], jig(e, t, 0.06));
    const dockP = add(pos, o, 1.15);
    const far = add(pos, o, 6.5);
    return mix(far, dockP, ease((t - dock(e)) / 1.5));
  };
  const d0 = drugAt(0);
  const p0 = add(ENZ_HOME[0], jig(0, t, 0.06));
  return (
    <>
      <Stage>
        <Rig {...cam} />
        <CellStage t={t} glow={signal} showEndo={false} />
        {Array.from({length: n}).map((_, i) => {
          const born = i < NDOT ? 0 : 4.5 + (i - NDOT) * 0.55;
          const o = i < NDOT ? 1 : seg(t, born, born + 0.6);
          return <CGMP3 key={i} p={add(home(i), jig(i, t))} spin={t * 0.5 + i} opacity={o} s={0.42 * (0.4 + 0.6 * o)} />;
        })}
        {[0, 1, 2, 3].map((e) => (
          <group key={e}>
            <PDE3 p={add(ENZ_HOME[e], jig(e, t, 0.06))} yaw={yaw(e)} t={t} seed={e + 1} plugged={plug(e)} />
            {t > dock(e) - 0.2 && <Drug3 p={drugAt(e)} rot={yaw(e)} />}
            <Halo p={drugAt(e)} r={0.9} color={C.drug} o={t > dock(e) ? 1 - plug(e) * 0.6 : 0} t={t} />
          </group>
        ))}
      </Stage>
      <Overlay>
        <Scrim cap />
        <StepTitle step="PDE5 INHIBITION" title="The enzyme is blocked" t={t} />
        <Meter x={60} y={520} h={520} value={signal} label="Signal" />
        <Tag cam={cam} p={d0} text="Inhibitor molecule" color={C.drug} dx={-230} dy={-210} o={win(t, 1.0, 3.6)} t={t} />
        <Tag cam={cam} p={p0} text="Blocked PDE5" color={C.pde} dx={-200} dy={-220} o={seg(t, 3.7, 4.2)} t={t} />
        <Caption main="Sildenafil / tadalafil (blue)" sub="Fit into PDE5's active site and block it" color={C.drug} o={seg(t, 0.8, 1.4)} />
        <Caption main="" color={C.cgmp} o={0} />
      </Overlay>
    </>
  );
};

export const SceneTiming: React.FC<P> = ({t}) => (
  <Overlay bg t={t}>
    <TimingChart t={t} />
  </Overlay>
);
const TimingChart: React.FC<{t: number}> = ({t}) => {
  const x0 = 150, x1 = 960, yTop = 520, yBot = 1130, maxH = 36;
  const px = (h: number) => x0 + (h / maxH) * (x1 - x0);
  const py = (lvl: number) => yBot - lvl * (yBot - yTop);
  const path = (half: number) => {
    let d = '';
    for (let h = 0; h <= maxH; h += 0.5) d += `${h === 0 ? 'M' : 'L'}${px(h).toFixed(1)} ${py(Math.pow(0.5, h / half)).toFixed(1)} `;
    return d;
  };
  const reveal = seg(t, 1.4, 7.2);
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
      <rect x={x0 - 60} y={yTop - 50} width={0} height={0} />
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
      {mark(4, C.drug, 'Sildenafil', '≈ 4 h', py(0.5) + 70, 2.6)}
      {mark(17.5, C.no, 'Tadalafil', '≈ 17.5 h', py(0.5) + 70, 5.2)}
      <text x={W / 2} y={1310} textAnchor="middle" fontSize={28} fill={C.dim} opacity={seg(t, 7.2, 8.2)}>Simplified decay curves for illustration (FDA label half-lives)</text>
    </g>
  );
};

export const SceneSafety: React.FC<P> = ({t, dur}) => {
  const wide = seg(t, 0.6, 3.0);
  const bp = lerp(0.8, 0.2, seg(t, 4.6, 7.0));
  const warn = seg(t, 3.8, 4.5);
  const end = seg(t, dur - 3.0, dur - 2.4);
  const cam: Cm = {pos: [Math.sin(t * 0.4) * 0.15, Math.cos(t * 0.35) * 0.12, 4.0 - t * 0.12], look: [0, 0, -7], fov: 60, roll: Math.sin(t * 0.25) * 0.05};
  const lum = tunnelLumen(lerp(0.2, 1, wide));
  return (
    <>
      <Stage>
        <Rig {...cam} />
        <Tunnel relax={lerp(0.2, 1, wide)} t={t} rings={20} zStart={2.5} flow={1.5} nRbc={34} />
      </Stage>
      <Overlay>
        <Scrim mid />
        <g fontFamily={FONT}>
          <StepTitle step="WORTH KNOWING" title="They relax other vessels too" t={t} />
          <g opacity={warn} transform={`translate(0 ${(1 - warn) * 20})`}>
            <g transform="translate(330 640)">
              <rect x={-80} y={-28} width={160} height={56} rx={28} fill={C.drug} stroke="#2a5fa8" strokeWidth={4} />
              <Label x={0} y={90} text="PDE5 inhibitor" color={C.drug} size={34} />
            </g>
            <Label x={520} y={656} text="+" color={C.text} size={80} />
            <g transform="translate(720 640)">
              <rect x={-80} y={-28} width={160} height={56} rx={28} fill={C.ca} stroke="#a07a10" strokeWidth={4} />
              <Label x={0} y={90} text="Nitrate medicine" color={C.ca} size={34} />
            </g>
            <path d="M520 800 L590 920 L450 920 Z" fill={C.warn} stroke="#000" strokeWidth={4} strokeLinejoin="round" />
            <text x={520} y={902} textAnchor="middle" fontSize={64} fontWeight={800} fill="#fff">!</text>
            <Label x={520} y={1000} text="Blood pressure can drop sharply" color={C.warn} size={42} />
            <Label x={520} y={1056} text="Never combine without medical guidance" color="#dfe4ff" size={30} weight={500} />
          </g>
          <Meter x={60} y={560} h={400} value={warn > 0.5 ? bp : 0.8} label="BP" />
          <g opacity={end} transform={`translate(0 ${(1 - end) * 20})`}>
            <rect x={90} y={1110} width={800} height={230} rx={36} fill="#0b1230" stroke={C.dim} strokeWidth={2} opacity={0.96} />
            <Label x={490} y={1180} text="Same enzyme. Same vessels." color={C.text} size={46} />
            <Label x={490} y={1240} text="Different timing." color={C.no} size={46} />
            <Label x={490} y={1305} text="Educational only. Not medical advice." color={C.dim} size={28} weight={500} />
          </g>
        </g>
      </Overlay>
    </>
  );
};
