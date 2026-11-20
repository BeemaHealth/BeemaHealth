import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, Img, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import '@fontsource/outfit/700.css';
import '@fontsource/outfit/800.css';
import '@fontsource/figtree/600.css';
import {FPS, W, H, clamp01, ease, rnd} from '../theme';

/**
 * Black Friday paid ad, 16 s, 9:16, readable with the sound off.
 * Brand tokens from shorts/engine/brand.json only. Safe zones: top 230, bottom 400, left 70, right 150.
 * Price and product are props-in-code below so Matt can change them in one place.
 * Offer per Matt: $200 off, $591 total (from $791) on the 3-month compounded tirzepatide plan only.
 */
/** Slowed 1.6x from the original 10 s cut: every scene runs on a stretched clock (BASE frames of design time). */
const BASE = 300, SLOW = 1.6;
export const TOTAL = Math.round(BASE * SLOW);

const B = {honey: '#EEB318', honeyDeep: '#D6A21E', honeyLight: '#F4C855', cream: '#F9EBBE', creamSoft: '#FDF2D0', ink: '#121419', onHoney: '#241C0C', white: '#FFFFFF'};
const DISPLAY = 'Outfit, sans-serif', BODY = 'Figtree, sans-serif';
const GOLD = `linear-gradient(180deg, ${B.honeyLight} 0%, ${B.honey} 48%, ${B.honeyDeep} 100%)`;
const Z = {top: 230, left: 70, right: 150};
const CONTENT_W = W - Z.left - Z.right; // 860
const PRICE = '$591';
const CODE = 'BeemaHealth200offTirz3M'; // per Matt: $200 off the 3-month tirzepatide plan only, $591 total. A code IS required at checkout.
const FINE = '$591 total for the 3-month compounded tirzepatide plan ($200 off $791) with code BeemaHealth200offTirz3M. Valid on the 3-month plan only, not on 1-month plans. Not combinable with the new-patient starter pack. Once per patient. Compounded tirzepatide is not FDA-approved. Rx only. Prescribing is never guaranteed. Adults 18+.';

const pop = (x: number) => { const v = clamp01(x), c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2); };
const span = (f: number, a: number, b: number) => ease((f - a) / (b - a));
/** scene opacity: fade in over `i` frames after start, fade out over `o` frames before end */
const win = (f: number, s: number, e: number, i = 6, o = 6) => clamp01((f - s) / i) * clamp01((e - f) / o);

const GoldText: React.FC<{size: number; style?: React.CSSProperties; children: React.ReactNode}> = ({size, style, children}) => (
  <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: size, lineHeight: 0.95, letterSpacing: -2, background: GOLD, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 6px 0 rgba(0,0,0,.55))', ...style}}>{children}</div>
);

const Check: React.FC<{size: number; p: number; fill?: boolean}> = ({size, p, fill = true}) => (
  <svg width={size} height={size} viewBox="0 0 48 48" style={{display: 'block'}}>
    {fill && <circle cx="24" cy="24" r="24" fill={B.honey} />}
    <path d="M13 25 L21 33 L36 16" fill="none" stroke={B.onHoney} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="42" strokeDashoffset={42 * (1 - clamp01(p))} />
  </svg>
);

const Backdrop: React.FC<{f: number}> = ({f}) => {
  const t = f / FPS;
  return (
    <AbsoluteFill style={{background: B.ink}}>
      <AbsoluteFill style={{background: `radial-gradient(ellipse 80% 45% at ${50 + Math.sin(t * 0.7) * 8}% ${28 + t * 1.2}%, ${B.honey}33 0%, ${B.honey}00 70%)`}} />
      {Array.from({length: 26}, (_, i) => {
        const x = rnd(i, 1) * W, sp = 28 + rnd(i, 2) * 60, y = (H + 100 - ((t * sp + rnd(i, 3) * H) % (H + 200)));
        const s = 4 + rnd(i, 4) * 7;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: s, height: s, borderRadius: s, background: B.honeyLight, opacity: 0.12 + rnd(i, 5) * 0.28, filter: 'blur(1px)'}} />;
      })}
    </AbsoluteFill>
  );
};

/** 0-1.5 s: the slam. */
const Slam: React.FC<{f: number}> = ({f}) => {
  const o = win(f, 0, 46, 1, 6);
  const line = (word: string, start: number) => {
    const k = clamp01((f - start) / 7);
    const scale = k < 1 ? 2.6 - 1.6 * ease(k) : 1;
    const shake = f >= start + 6 && f < start + 14 ? Math.sin((f - start) * 3.1) * (14 - (f - start)) * 0.9 : 0;
    return <div style={{opacity: f < start ? 0 : clamp01(k * 2.5), transform: `translate(${shake}px, ${-shake * 0.6}px) scale(${scale})`, filter: k < 1 ? 'blur(' + (1 - k) * 10 + 'px)' : undefined}}><GoldText size={word === 'BLACK' ? 236 : 208}>{word}</GoldText></div>;
  };
  const flash = clamp01(1 - Math.abs(f - 8) / 5) * 0.45;
  const sub = span(f, 22, 32);
  return (
    <AbsoluteFill style={{opacity: o, transform: `scale(${1 - 0.06 * span(f, 40, 46)})`}}>
      <AbsoluteFill style={{background: '#fff', opacity: flash, mixBlendMode: 'soft-light'}} />
      <div style={{position: 'absolute', left: Z.left, width: CONTENT_W, top: 660, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6}}>
        {line('BLACK', -4)}
        {line('FRIDAY', 3)}
        <div style={{marginTop: 30, fontFamily: BODY, fontWeight: 600, fontSize: 62, color: B.cream, opacity: sub, transform: `translateY(${(1 - sub) * 20}px)`, letterSpacing: 1}}>at Beema Health</div>
      </div>
    </AbsoluteFill>
  );
};

/** Persistent small tag so the offer stays anchored after the slam. */
const Tag: React.FC<{f: number}> = ({f}) => {
  const o = win(f, 42, 262, 8, 8);
  return <div style={{position: 'absolute', top: Z.top + 10, left: Z.left, width: CONTENT_W, display: 'flex', justifyContent: 'center', opacity: o}}>
    <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 40, letterSpacing: 8, color: B.honey, border: `3px solid ${B.honey}`, borderRadius: 60, padding: '10px 34px'}}>BLACK FRIDAY</div>
  </div>;
};

/** 1.5-4 s: price + vial with push-in and light sweep. */
const Vial: React.FC<{f: number}> = ({f}) => {
  const s = 45, e = 120, o = win(f, s, e, 8, 8);
  const k = (f - s) / (e - s);
  const scale = 0.9 + 0.2 * ease(k);
  const rise = (1 - span(f, s, s + 14)) * 90;
  const sweepX = -60 + 180 * span(f, s + 18, s + 58);
  const p = pop((f - s - 4) / 14);
  const sub = span(f, s + 12, s + 22);
  const VW = 500, VH = 625;
  const src = staticFile('engine/products/compounded-tirzepatide-vial.webp');
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: Z.left, width: CONTENT_W, top: 345, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{transform: `scale(${p})`}}><GoldText size={240}>{PRICE}</GoldText></div>
        <div style={{marginTop: 14, fontFamily: DISPLAY, fontWeight: 700, fontSize: 50, lineHeight: 1.14, textAlign: 'center', color: '#fff', opacity: sub, transform: `translateY(${(1 - sub) * 18}px)`}}>for the 3-month tirzepatide plan<br /><span style={{color: B.honeyLight}}>$200 off with code</span></div>
      </div>
      <div style={{position: 'absolute', left: Z.left + (CONTENT_W - VW) / 2, top: 760, width: VW, height: VH, transform: `translateY(${rise}px) scale(${scale})`, filter: `drop-shadow(0 40px 60px rgba(0,0,0,.6)) drop-shadow(0 0 70px ${B.honey}40)`}}>
        <Img src={src} style={{width: VW, height: VH, display: 'block'}} />
        <div style={{position: 'absolute', inset: 0, WebkitMaskImage: `url(${src})`, maskImage: `url(${src})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', background: 'linear-gradient(105deg, rgba(255,255,255,0) 38%, rgba(255,246,214,.95) 50%, rgba(255,255,255,0) 62%)', backgroundSize: '300% 100%', backgroundPosition: `${sweepX}% 0`, mixBlendMode: 'screen'}} />
      </div>
    </AbsoluteFill>
  );
};

/** 4-6.5 s: checkout on a phone, discount badge pops. */
const Checkout: React.FC<{f: number}> = ({f}) => {
  const s = 120, e = 195, o = win(f, s, e, 8, 8);
  const rise = (1 - span(f, s, s + 14)) * 140;
  const badge = pop((f - 146) / 12);
  const typed = CODE.slice(0, Math.max(0, Math.min(CODE.length, Math.floor((f - 128) * 0.7))));
  const txt = span(f, s + 4, s + 14);
  const row = (label: string, val: React.ReactNode, bold = false) => (
    <div style={{display: 'flex', justifyContent: 'space-between', fontFamily: BODY, fontWeight: 600, fontSize: bold ? 38 : 30, color: bold ? B.ink : '#4a4d55', padding: '14px 0'}}><span>{label}</span><span style={{fontFamily: bold ? DISPLAY : BODY, fontWeight: bold ? 800 : 600}}>{val}</span></div>
  );
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: Z.left, width: CONTENT_W, top: 345, textAlign: 'center', opacity: txt, transform: `translateY(${(1 - txt) * 18}px)`}}>
        <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 64, lineHeight: 1, color: '#fff'}}>Use code</div>
        <div style={{display: 'inline-block', marginTop: 14, fontFamily: DISPLAY, fontWeight: 800, fontSize: 54, lineHeight: 1, color: B.onHoney, background: GOLD, borderRadius: 28, padding: '18px 30px 22px', boxShadow: `0 10px 0 ${B.honeyDeep}`}}>{CODE}</div>
        <div style={{marginTop: 22, fontFamily: BODY, fontWeight: 600, fontSize: 44, lineHeight: 1.1, color: B.cream}}>at checkout. 3-month plan only.</div>
      </div>
      <div style={{position: 'absolute', left: Z.left + (CONTENT_W - 560) / 2, top: 705 + rise, width: 560, height: 680, borderRadius: 64, background: '#0b0c10', border: `10px solid #2a2d35`, boxShadow: `0 40px 90px rgba(0,0,0,.65), 0 0 80px ${B.honey}33`, overflow: 'hidden'}}>
        <div style={{position: 'absolute', top: 14, left: '50%', width: 150, height: 34, borderRadius: 20, background: '#000', transform: 'translateX(-50%)'}} />
        <div style={{position: 'absolute', inset: 0, background: B.creamSoft, padding: '64px 36px 28px'}}>
          <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 44, color: B.ink, marginBottom: 14}}>Checkout</div>
          <div style={{height: 3, background: `${B.honey}`, opacity: 0.6, marginBottom: 10}} />
          {row('Tirzepatide, 3-month plan', '')}
          {row('Subtotal', f >= 150 ? <s style={{opacity: 0.5}}>$791.00</s> : '$791.00')}
          <div style={{margin: '14px 0', padding: '16px 18px', borderRadius: 22, background: B.white, border: `3px dashed ${B.honeyDeep}55`, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, minHeight: 92}}>
            <span style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 27, color: typed ? B.ink : '#9a9a9a', letterSpacing: 0, whiteSpace: 'nowrap'}}>{typed || 'Enter code'}{typed && typed.length < CODE.length ? '|' : ''}</span>
            <div style={{transform: `scale(${badge})`, opacity: badge > 0.02 ? 1 : 0, display: 'flex', alignItems: 'center', gap: 10, background: GOLD, color: B.onHoney, fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, whiteSpace: 'nowrap', borderRadius: 50, padding: '10px 18px 10px 12px', boxShadow: `0 8px 24px ${B.honey}88`}}>
              <Check size={32} p={clamp01((f - 152) / 8)} fill={false} />Discount applied
            </div>
          </div>
          <div style={{height: 3, background: '#d9d2bc', margin: '8px 0'}} />
          {row('3-month total', f >= 150 ? `${PRICE}.00` : '$791.00', true)}
          <div style={{marginTop: 18, height: 84, borderRadius: 50, background: B.ink, color: '#fff', fontFamily: DISPLAY, fontWeight: 800, fontSize: 36, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>Place order</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** 6.5-8.5 s: three quick checks. */
const Checks: React.FC<{f: number}> = ({f}) => {
  const s = 195, e = 255, o = win(f, s, e, 6, 8);
  const items = ['Online visit', 'Licensed provider', 'Shipped to your door'];
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: Z.left, width: CONTENT_W, top: 640, display: 'flex', flexDirection: 'column', gap: 70, alignItems: 'flex-start', paddingLeft: 30}}>
        {items.map((t, i) => {
          const st = s + 3 + i * 15, k = pop((f - st) / 10), c = (f - st - 3) / 9;
          return (
            <div key={t} style={{display: 'flex', alignItems: 'center', gap: 34, opacity: f < st ? 0 : 1, transform: `translateX(${(1 - clamp01((f - st) / 8)) * -60}px) scale(${0.9 + 0.1 * k})`}}>
              <Check size={118} p={c} />
              <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 72, color: '#fff', letterSpacing: -1}}>{t}</div>
            </div>
          );
        })}
      </div>
      <div style={{position: 'absolute', left: Z.left, width: CONTENT_W, top: 1240, textAlign: 'center', opacity: span(f, s + 40, s + 52), fontFamily: DISPLAY, fontWeight: 700, fontSize: 44, color: B.honey}}>{PRICE} total for 3 months</div>
    </AbsoluteFill>
  );
};

/** 8.5-10 s: logo on a white card, Get Started button. */
const End: React.FC<{f: number}> = ({f}) => {
  const s = 255, o = clamp01((f - s) / 6);
  const card = pop((f - s) / 12), btn = pop((f - s - 8) / 12), line = span(f, s + 16, s + 26);
  const pulse = f > s + 20 ? 1 + 0.025 * Math.sin((f - s - 20) * 0.5) : 1;
  return (
    <AbsoluteFill style={{opacity: o}}>
      <div style={{position: 'absolute', left: Z.left, width: CONTENT_W, top: 330, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{width: 500, height: 500, borderRadius: 56, background: '#fff', boxShadow: `0 30px 80px rgba(0,0,0,.5), 0 0 90px ${B.honey}44`, transform: `scale(${card})`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
          <Img src={staticFile('engine/brand/stacked.png')} style={{width: 480, height: 480}} />
        </div>
        <div style={{marginTop: 60, transform: `scale(${btn * pulse})`, background: GOLD, color: B.onHoney, fontFamily: DISPLAY, fontWeight: 800, fontSize: 80, borderRadius: 100, padding: '30px 96px', boxShadow: `0 16px 0 ${B.honeyDeep}, 0 30px 60px rgba(0,0,0,.5)`}}>Get Started</div>
        <div style={{marginTop: 70, textAlign: 'center', opacity: line, transform: `translateY(${(1 - line) * 14}px)`}}>
          <div style={{fontFamily: DISPLAY, fontWeight: 700, fontSize: 54, color: '#fff'}}>Limited time</div>
          <div style={{marginTop: 10, fontFamily: BODY, fontWeight: 600, fontSize: 44, color: B.cream}}>Rx only, if eligible. Adults 18+.</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Fine: React.FC<{f: number}> = ({f}) => (
  <div style={{position: 'absolute', left: Z.left, width: CONTENT_W, top: 1418, textAlign: 'center', fontFamily: BODY, fontWeight: 600, fontSize: 26, lineHeight: 1.28, color: '#d8d3c0', opacity: win(f, 46, BASE, 8, 1) * 0.92}}>{FINE}</div>
);

export const BlackFridayShort: React.FC = () => {
  const f = useCurrentFrame() / SLOW;
  const [h] = useState(() => delayRender('fonts'));
  useEffect(() => { Promise.all([document.fonts.load('800 60px Outfit'), document.fonts.load('700 40px Outfit'), document.fonts.load('600 30px Figtree')]).then(() => continueRender(h)).catch(() => continueRender(h)); }, [h]);
  return (
    <AbsoluteFill style={{width: W, height: H}}>
      <Backdrop f={f} />
      <Slam f={f} />
      <Tag f={f} />
      <Vial f={f} />
      <Checkout f={f} />
      <Checks f={f} />
      <End f={f} />
      <Fine f={f} />
      <Audio src={staticFile('engine/tmp/bf-tirz.wav')} />
    </AbsoluteFill>
  );
};
