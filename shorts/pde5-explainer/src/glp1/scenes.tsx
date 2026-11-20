import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, W, lerp, seg, clamp01} from '../theme';
import {Backdrop, Cam, FONT, Label, Meter, StepTitle, Tag} from '../parts';
import {Rig, V3} from '../three3d';
import {Caption, Overlay, Scrim, Stage, win} from '../scenes';
import {
  BRAIN_P, FULL_C, FULL_N, GC, GUT_P, GutBrain, HUNG_C, LCELLS, NeuronNet, OUT_MID, REW_C, RX, RCOL, Receptors, ST_TAG, Stomach, exitTime, mix3, stomachRemaining,
} from './parts3d';

type P = {t: number; dur: number};
const gutCam = (t: number): Cam => ({pos: [Math.sin(t * 0.3) * 0.5, 0.8, 16.5], look: [0, 0.6, 0], fov: 50});
const recCam = (t: number): Cam => ({pos: [Math.sin(t * 0.25) * 0.8, 4.5, 12.5], look: [0, 0.9, 0], fov: 52});
const GLP = GC.glp;

export const SceneHook: React.FC<P> = ({t}) => {
  const cam = gutCam(t);
  const a = seg(t, 0.2, 0.8), b = seg(t, 0.7, 1.3);
  return (
    <>
      <Stage>
        <Rig {...cam} />
        <GutBrain t={t} release={null} glow={0.4} />
      </Stage>
      <Overlay>
        <Scrim />
        <g fontFamily={FONT}>
          <g opacity={a} transform={`translate(0 ${(1 - a) * 24})`}>
            <text x={W / 2} y={225} textAnchor="middle" fontSize={62} fontWeight={800} fill="#fff" stroke="#000" strokeOpacity={0.55} strokeWidth={8} paintOrder="stroke">Why do GLP-1 medications</text>
          </g>
          <g opacity={b} transform={`translate(0 ${(1 - b) * 24})`}>
            <text x={W / 2} y={300} textAnchor="middle" fontSize={62} fontWeight={800} fill={GLP} stroke="#000" strokeOpacity={0.55} strokeWidth={8} paintOrder="stroke">reduce hunger?</text>
          </g>
        </g>
        <Tag cam={cam} p={BRAIN_P} text="Brain" color={C.text} dx={-250} dy={30} o={win(t, 2.6, 6.0)} t={t} />
        <Tag cam={cam} p={GUT_P} text="Gut" color={C.text} dx={-120} dy={190} o={win(t, 3.4, 6.6)} t={t} />
        <Caption main="A signal between gut and brain" color={GLP} o={win(t, 1.4, 7.6)} />
      </Overlay>
    </>
  );
};

export const SceneGut: React.FC<P> = ({t}) => {
  const cam = gutCam(t);
  const rel = 1.6;
  const glow = seg(t, 4.2, 4.9);
  const hormone: V3 = mix3(LCELLS[1], [0, 3.1, 0], clamp01((t - (rel + 0.32)) / 2.6));
  return (
    <>
      <Stage>
        <Rig {...cam} />
        <GutBrain t={t} release={rel} glow={glow} />
      </Stage>
      <Overlay>
        <Scrim />
        <StepTitle step="AFTER A MEAL" title="The gut sends a fullness signal" t={t} />
        <Tag cam={cam} p={LCELLS[0]} text="Gut cells" color={GLP} dx={-230} dy={-90} o={win(t, 1.0, 4.2)} t={t} />
        <Tag cam={cam} p={hormone} text="GLP-1 hormone" color={GLP} dx={-260} dy={-40} o={win(t, 2.8, 5.6) * (t > rel + 0.5 ? 1 : 0)} t={t} />
        <Tag cam={cam} p={BRAIN_P} text="Appetite center" color={GC.full} dx={-250} dy={40} o={seg(t, 4.6, 5.2)} t={t} />
        <Caption main="Gut cells release GLP-1 after a meal" color={GLP} o={win(t, 0.6, 4.0)} />
        <Caption main="It tells the brain: you're full" color={GC.full} o={seg(t, 3.8, 4.4)} />
      </Overlay>
    </>
  );
};

export const SceneBrain: React.FC<P> = ({t}) => {
  const cam: Cam = {pos: [Math.sin(t * 0.2) * 0.8, 1.5, 16], look: [0, 1.9, 0], fov: 52};
  const act = seg(t, 2.4, 4.6);
  return (
    <>
      <Stage>
        <Rig {...cam} />
        <NeuronNet t={t} act={act} />
      </Stage>
      <Overlay>
        <Scrim />
        <StepTitle step="IN THE BRAIN" title="GLP-1 reaches the appetite center" t={t} />
        <Tag cam={cam} p={[FULL_N[0][0], FULL_N[0][1] + 0.5, FULL_N[0][2]]} text="GLP-1" color={GLP} dx={-10} dy={-110} o={win(t, 1.0, 3.0)} t={t} />
        <Tag cam={cam} p={FULL_C} text="Fullness neurons: on" color={GC.full} dx={-40} dy={-190} o={seg(t, 3.0, 3.6)} t={t} />
        <Tag cam={cam} p={HUNG_C} text="Hunger neurons: quiet" color={GC.hunger} dx={30} dy={200} o={seg(t, 4.2, 4.8)} t={t} />
        <Tag cam={cam} p={REW_C} text="Reward circuit: calmer" color={GC.reward} dx={0} dy={190} o={seg(t, 6.6, 7.2)} t={t} />
        <Caption main="Fullness neurons switch on" sub="Hunger neurons quiet down" color={GC.full} o={win(t, 2.6, 6.4)} />
        <Caption main="Reward signals behind cravings turn down" color={GC.reward} o={seg(t, 6.4, 7.0)} />
      </Overlay>
    </>
  );
};

export const SceneStomach: React.FC<P> = ({t}) => {
  const cam: Cam = {pos: [Math.sin(t * 0.25) * 0.6, 1.2, 14], look: [0.2, 1.0, 0], fov: 50};
  const rem = stomachRemaining(t);
  const fullness = 0.3 + 0.6 * (rem / 22) * (rem / 22 > 0.5 ? 1 : 1.1);
  return (
    <>
      <Stage>
        <Rig {...cam} />
        <Stomach t={t} />
      </Stage>
      <Overlay>
        <Scrim />
        <StepTitle step="IN THE STOMACH" title="Food leaves more slowly" t={t} />
        <Meter x={60} y={470} h={480} value={Math.min(1, fullness)} label="Fullness" />
        <Tag cam={cam} p={ST_TAG} text="Stomach" color={C.text} dx={-120} dy={-220} o={win(t, 0.3, 3.0)} t={t} />
        <Tag cam={cam} p={OUT_MID} text="Slower emptying" color={GLP} dx={40} dy={-250} o={seg(t, 3.6, 4.2)} t={t} />
        <Caption main="Normally, food leaves steadily" color={C.text} o={win(t, 0.4, 3.2)} />
        <Caption main="With GLP-1, it leaves slower" sub="Nausea is a common side effect" color={GLP} o={seg(t, 3.2, 3.9)} />
      </Overlay>
    </>
  );
};

export const SceneLasting: React.FC<P> = ({t}) => {
  const x0 = 170, x1 = 900, span = x1 - x0;
  const X = (min: number) => x0 + (Math.log10(min) / 4.4) * span;
  const ticks: [number, string][] = [[1, '1 min'], [60, '1 hour'], [1440, '1 day'], [10080, '1 week']];
  const a = seg(t, 0.8, 2.0), b = seg(t, 2.8, 5.6);
  return (
    <Overlay bg t={t}>
      <g fontFamily={FONT}>
        <StepTitle step="THE CATCH" title="Natural GLP-1 fades fast" t={t} />
        <text x={(x0 + x1) / 2} y={470} textAnchor="middle" fontSize={28} fill={C.dim}>How long the signal lasts (log scale)</text>
        <rect x={x0} y={600} width={Math.max(2, (X(2) - x0) * a)} height={90} rx={20} fill={GLP} opacity={0.95} />
        <Label x={x0} y={575} text="Natural GLP-1" color={GLP} size={36} anchor="start" opacity={seg(t, 0.4, 1.0)} />
        <Label x={X(2) + 24} y={660} text="about 2 minutes" color="#fff" size={34} anchor="start" opacity={a} />
        <rect x={x0} y={850} width={Math.max(2, (X(8640) - x0) * b)} height={90} rx={20} fill={GC.full} opacity={0.95} />
        <Label x={x0} y={825} text="GLP-1 medications" color={GC.full} size={36} anchor="start" opacity={seg(t, 2.4, 3.0)} />
        <Label x={x0 + 24} y={910} text="days: built to last" color="#06210f" size={34} anchor="start" opacity={b} halo={false} />
        <line x1={x0} y1={1000} x2={x1} y2={1000} stroke={C.dim} strokeWidth={3} />
        {ticks.map(([m, l]) => (
          <g key={l}>
            <line x1={X(m)} y1={990} x2={X(m)} y2={1010} stroke={C.dim} strokeWidth={3} />
            <text x={X(m)} y={1050} textAnchor="middle" fontSize={26} fill={C.dim}>{l}</text>
          </g>
        ))}
        <Caption main="Engineered to last, so the signal stays on" color={GC.full} o={seg(t, 5.0, 5.8)} />
      </g>
    </Overlay>
  );
};

type RP = P & {act: [number, number, number]; step: string; title: string; main: string; sub?: string; tags: [string, string, string]; capAt?: number};
const ReceptorScene: React.FC<RP & {children?: React.ReactNode}> = ({t, act, step, title, main, sub, tags, children}) => {
  const cam = recCam(t);
  return (
    <>
      <Stage>
        <Rig {...cam} />
        <Receptors t={t} act={act} />
      </Stage>
      <Overlay>
        <Scrim />
        <StepTitle step={step} title={title} t={t} />
        {RX.map((x, r) => (
          <Tag key={r} cam={cam} p={[x, 1.3, 0.2]} text={tags[r]} color={act[r] > 0.3 ? RCOL[r] : '#8f9ac4'} dx={r === 0 ? 40 : r === 2 ? -40 : 0} dy={r === 0 ? 150 : -300 - (r === 1 ? 70 : 0)} o={seg(t, 0.6 + r * 0.2, 1.2 + r * 0.2)} t={t} size={34} />
        ))}
        {act[0] > 0.1 && <Tag cam={cam} p={[RX[0], 0.3 + 5.5 + (1.95 - 5.5) * Math.min(1, Math.max(0, act[0])), 0.15]} text="Medication molecule" color="#fff" dx={170} dy={-130} o={win(t, 1.0, 4.4)} t={t} size={32} />}
        {children}
        <Caption main={main} sub={sub} color={GLP} o={seg(t, 0.8, 1.4)} />
      </Overlay>
    </>
  );
};

export const SceneType1: React.FC<P> = (p) => (
  <ReceptorScene {...p} act={[seg(p.t, 0.8, 1.8), 0, 0]} step="TYPE 1 OF 3" title="Single agonist: GLP-1" main="Activates one receptor" sub="The GLP-1 receptor" tags={['GLP-1 receptor', 'GIP receptor', 'Glucagon receptor']} />
);
export const SceneType2: React.FC<P> = (p) => (
  <ReceptorScene {...p} act={[1, seg(p.t, 1.6, 2.6), 0]} step="TYPE 2 OF 3" title="Dual agonist: GIP + GLP-1" main="One molecule, two receptors" sub="GIP may add appetite effects and help tolerability" tags={['GLP-1 receptor', 'GIP receptor', 'Glucagon receptor']} />
);
export const SceneType3: React.FC<P> = (p) => {
  const t = p.t;
  const ban = seg(t, 5.0, 5.6);
  return (
    <ReceptorScene {...p} act={[1, 1, seg(t, 2.0, 3.0)]} step="TYPE 3 OF 3" title="Triple agonist: adds glucagon" main="One molecule, three receptors" sub="Glucagon receptor: may increase energy use" tags={['GLP-1 receptor', 'GIP receptor', 'Glucagon receptor']}>
      <g opacity={ban} transform={`translate(0 ${(1 - ban) * 16})`} fontFamily={FONT}>
        <rect x={110} y={340} width={800} height={96} rx={48} fill="#2a1500" stroke={GC.gcg} strokeWidth={5} />
        <text x={510} y={402} textAnchor="middle" fontSize={44} fontWeight={800} fill={GC.gcg}>RESEARCH ONLY - NOT APPROVED</text>
      </g>
    </ReceptorScene>
  );
};

export const SceneBeema: React.FC<P> = ({t}) => {
  const cols = [
    {x: 215, name: 'Type 1', kind: 'Single', targets: ['GLP-1'], status: ['Prescription', 'medications'], beema: ['Compounded', 'only'], col: GC.glp, ok: true},
    {x: 500, name: 'Type 2', kind: 'Dual', targets: ['GIP +', 'GLP-1'], status: ['Prescription', 'medications'], beema: ['Compounded', 'only'], col: GC.gip, ok: true},
    {x: 785, name: 'Type 3', kind: 'Triple', targets: ['GIP + GLP-1', '+ glucagon'], status: ['Research only', 'Not approved'], beema: ['Not offered', 'by Beema Health'], col: GC.gcg, ok: false},
  ];
  const head = seg(t, 0.2, 0.8), status = seg(t, 0.6, 1.2);
  const b3 = seg(t, 1.2, 1.9), b12 = seg(t, 3.6, 4.4);
  const f1 = seg(t, 7.6, 8.3), f2 = seg(t, 10.2, 10.9);
  return (
    <Overlay bg t={t}>
      <g fontFamily={FONT}>
        <StepTitle step="SUMMARY" title="Three types, one big difference" t={t} />
        {cols.map((c, i) => {
          const bo = c.ok ? b12 : b3;
          return (
            <g key={c.name}>
              <rect x={c.x - 130} y={400} width={260} height={720} rx={30} fill="#0b1230" stroke={c.col} strokeWidth={4} opacity={head} />
              <g opacity={head}>
                <text x={c.x} y={462} textAnchor="middle" fontSize={34} fontWeight={800} fill={c.col}>{c.name}</text>
                <text x={c.x} y={508} textAnchor="middle" fontSize={40} fontWeight={800} fill="#fff">{c.kind}</text>
                <text x={c.x} y={575} textAnchor="middle" fontSize={22} fill={C.dim}>ACTIVATES</text>
                {c.targets.map((l, k) => (<text key={k} x={c.x} y={622 + k * 38} textAnchor="middle" fontSize={30} fontWeight={700} fill={c.col}>{l}</text>))}
              </g>
              <g opacity={status}>
                <line x1={c.x - 100} y1={730} x2={c.x + 100} y2={730} stroke={C.dim} strokeWidth={1.5} opacity={0.5} />
                <text x={c.x} y={770} textAnchor="middle" fontSize={22} fill={C.dim}>STATUS</text>
                {c.status.map((l, k) => (<text key={k} x={c.x} y={814 + k * 36} textAnchor="middle" fontSize={c.ok ? 28 : 30} fontWeight={c.ok ? 600 : 800} fill={c.ok ? '#dfe4ff' : GC.gcg}>{l}</text>))}
              </g>
              <g opacity={bo}>
                <line x1={c.x - 100} y1={910} x2={c.x + 100} y2={910} stroke={C.dim} strokeWidth={1.5} opacity={0.5} />
                <text x={c.x} y={950} textAnchor="middle" fontSize={22} fill={C.dim}>AT BEEMA HEALTH</text>
                {c.beema.map((l, k) => (<text key={k} x={c.x} y={998 + k * 36} textAnchor="middle" fontSize={k === 0 ? 32 : 26} fontWeight={k === 0 ? 800 : 600} fill={c.ok ? GC.full : GC.hunger}>{l}</text>))}
              </g>
            </g>
          );
        })}
        <g opacity={f1}>
          <rect x={90} y={1160} width={800} height={190} rx={28} fill="#0b1230" stroke={C.dim} strokeWidth={2} />
          <text x={490} y={1218} textAnchor="middle" fontSize={32} fontWeight={800} fill="#fff">Compounded medications are not FDA-approved.</text>
          <g opacity={f2}>
            <text x={490} y={1272} textAnchor="middle" fontSize={26} fill="#c9d0ee">A licensed provider decides if any treatment is appropriate.</text>
            <text x={490} y={1316} textAnchor="middle" fontSize={26} fill={C.dim}>Educational only. Not medical advice.</text>
          </g>
        </g>
      </g>
    </Overlay>
  );
};
