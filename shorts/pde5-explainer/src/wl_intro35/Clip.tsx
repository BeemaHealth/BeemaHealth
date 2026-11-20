import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/figtree/600.css';
import {ClipProps, F, clamp, eo3} from '../engine/ui';
import {Wl35World, cuesOf} from './World';

/** Composition for the weight-loss intro Story (2026-11-19 brief). 3D world underneath, kinetic headlines that mirror the narration,
 *  the compounded notice from the first product mention on, and a brand end card. Every overlay is keyed to a spoken word. */
export type Wl35Props = ClipProps & {notice: string[]; url: string};

const INK = '#121419', HONEY = '#EEB318', HONEY_DEEP = '#D6A21E', CREAM = '#FDF2D0';

/** A headline that rises in (and out) between two times. Lines can appear on their own cue. */
const Head: React.FC<{T: number; t0: number; t1: number; lines: {text: string; at?: number; color?: string}[]; size?: number; top: number}> = ({T, t0, t1, lines, size = 80, top}) => {
  const out = eo3((T - t1) / 0.2);
  if (T < t0 - 0.05 || out >= 1) return null;
  return (
    <div style={{position: 'absolute', left: 70, right: 70, top, opacity: 1 - out, transform: `translateY(${-out * 18}px)`}}>
      {lines.map((l, i) => {
        const a = l.at ?? t0, k = a <= 0.001 ? 1 : eo3((T - a - 0.12) / 0.36);
        if (k <= 0) return null;
        return (
          <div key={i} style={{fontFamily: F.display, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: -1.5, color: l.color ?? INK, opacity: k, filter: `blur(${(1 - k) * 8}px)`, transform: `translateY(${(1 - k) * 26}px)`}}>
            {l.text}
          </div>
        );
      })}
    </div>
  );
};

const Notice: React.FC<{T: number; t0: number; t1: number; lines: string[]}> = ({T, t0, t1, lines}) => {
  const k = eo3((T - t0) / 0.4) * (1 - eo3((T - t1) / 0.3));
  if (k <= 0.01) return null;
  return (
    <div style={{position: 'absolute', left: 60, right: 60, top: 1392, opacity: k, background: 'rgba(18,20,25,.80)', borderRadius: 26, padding: '16px 26px', border: `2px solid ${HONEY}66`}}>
      <div style={{fontFamily: F.body, fontWeight: 600, fontSize: 29, lineHeight: 1.28, color: '#fff', textAlign: 'center'}}>{lines.join(' ')}</div>
    </div>
  );
};

const Tagline: React.FC<{T: number; t0: number; t1: number; text: string}> = ({T, t0, t1, text}) => {
  const k = eo3((T - t0) / 0.35) * (1 - eo3((T - t1) / 0.25));
  if (k <= 0.01) return null;
  return <div style={{position: 'absolute', right: 150, top: 452, opacity: k * 0.9, fontFamily: F.body, fontWeight: 600, fontSize: 26, letterSpacing: 2, textTransform: 'uppercase', color: INK, background: 'rgba(253,242,208,.85)', padding: '6px 16px', borderRadius: 999}}>{text}</div>;
};

const Sub: React.FC<{T: number; t0: number; t1: number; text: string}> = ({T, t0, t1, text}) => {
  const k = eo3((T - t0) / 0.35) * (1 - eo3((T - t1) / 0.3));
  if (k <= 0.01) return null;
  return (
    <div style={{position: 'absolute', left: 90, right: 90, top: 1250, display: 'flex', justifyContent: 'center', opacity: k, transform: `translateY(${(1 - k) * 16}px)`}}>
      <div style={{background: CREAM, color: INK, fontFamily: F.display, fontWeight: 700, fontSize: 36, lineHeight: 1.2, padding: '14px 28px', borderRadius: 999, textAlign: 'center', boxShadow: '0 12px 30px rgba(60,40,10,.18)'}}>{text}</div>
    </div>
  );
};

const EndCard: React.FC<{T: number; t0: number; tUrl: number; url: string; notice: string[]; logo: string}> = ({T, t0, tUrl, url, notice, logo}) => {
  const k = eo3((T - t0) / 0.6);
  if (k <= 0.01) return null;
  const kl = eo3((T - t0 - 0.15) / 0.55), ku = eo3((T - tUrl + 0.1) / 0.45);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: `linear-gradient(180deg, rgba(18,20,25,.70) 0%, rgba(18,20,25,.86) 55%, rgba(18,20,25,.92) 100%)`, opacity: k}} />
      <div style={{position: 'absolute', left: (1080 - 380) / 2, top: 270, width: 380, height: 380, background: '#fff', borderRadius: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 24px 60px rgba(0,0,0,.45)', opacity: kl, transform: `translateY(${(1 - kl) * 30}px) scale(${0.92 + 0.08 * kl})`}}>
        <Img src={staticFile(logo)} style={{width: '90%', height: '90%', objectFit: 'contain'}} />
      </div>
      <div style={{position: 'absolute', left: 70, right: 70, top: 712, textAlign: 'center', opacity: kl}}>
        <div style={{fontFamily: F.display, fontWeight: 800, fontSize: 66, lineHeight: 1.06, letterSpacing: -1.2, color: '#fff'}}>Explore your weight-loss options</div>
        <div style={{display: 'inline-block', marginTop: 34, background: HONEY, color: '#241C0C', fontFamily: F.display, fontWeight: 800, fontSize: 52, padding: '18px 44px', borderRadius: 999, opacity: ku, transform: `scale(${0.9 + 0.1 * ku})`, boxShadow: `0 0 ${40 * ku}px ${HONEY}66`}}>{url}</div>
      </div>
      <div style={{position: 'absolute', left: 80, right: 80, top: 1080, textAlign: 'center', fontFamily: F.body, fontWeight: 600, color: 'rgba(255,255,255,.94)', opacity: eo3((T - t0 - 0.2) / 0.5)}}>
        <div style={{fontSize: 34, lineHeight: 1.3}}>{notice.join(' ')}</div>
        <div style={{fontSize: 30, lineHeight: 1.3, marginTop: 18, color: 'rgba(255,255,255,.8)'}}>Prescription required. Prescribing is never guaranteed.</div>
        <div style={{fontSize: 30, lineHeight: 1.3, color: 'rgba(255,255,255,.8)'}}>You won't be charged if you aren't prescribed.</div>
      </div>
    </AbsoluteFill>
  );
};

export const Wl35Clip: React.FC<Wl35Props> = (props) => {
  const frame = useCurrentFrame(), {fps, width, height} = useVideoConfig(), T = frame / fps;
  const c = useMemo(() => cuesOf(props.words, props.segments), [props.words, props.segments]);
  const top = 240;
  return (
    <AbsoluteFill style={{background: '#e9d9b8'}}>
      <Audio src={staticFile(props.audio)} />
      <Wl35World w={width} h={height} tg={T} words={props.words} segs={props.segments} end={props.duration} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 55%, rgba(60,38,12,.28) 100%)'}} />
      {/* soft scrim so headlines stay legible over any part of the room */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(253,242,208,.88) 0%, rgba(253,242,208,.55) 22%, rgba(253,242,208,0) 34%)', opacity: 1 - clamp((T - c.cta) / 0.6)}} />
      <Head T={T} t0={0} t1={c.b1} top={top} lines={[{text: 'Weight-loss care.'}, {text: 'Without the waiting room.', at: c.without, color: HONEY_DEEP}]} size={88} />
      <Head T={T} t0={c.two - 0.1} t1={c.b2} top={top} lines={[{text: 'Two treatment'}, {text: 'categories', color: HONEY_DEEP}]} />
      <Sub T={T} t0={c.evaln - 0.6} t1={c.b2} text="Considered for weight management only after a clinical evaluation" />
      <Head T={T} t0={c.b2} t1={c.b3} top={top} lines={[{text: 'How it works'}]} />
      <Head T={T} t0={c.phone - 0.25} t1={c.ships - 0.1} top={top} lines={[{text: 'All from'}, {text: 'your phone', color: HONEY_DEEP}]} />
      <Head T={T} t0={c.ships - 0.1} t1={c.transp - 0.1} top={top} lines={[{text: 'Ships to your door,'}, {text: 'if prescribed', color: HONEY_DEEP}]} />
      <Head T={T} t0={c.transp - 0.1} t1={c.cta} top={top} size={72} lines={[{text: 'Transparent cash-pay pricing.'}, {text: 'No separate membership fee.', at: c.member - 0.5, color: HONEY_DEEP}]} />
      <Tagline T={T} t0={c.sema - 0.2} t1={c.b2} text="Illustration" />
      <Notice T={T} t0={c.sema - 0.3} t1={c.cta} lines={props.notice} />
      <EndCard T={T} t0={c.cta} tUrl={c.explore} url={props.url} notice={props.notice} logo={props.endcard.logo} />
    </AbsoluteFill>
  );
};
