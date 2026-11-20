/**
 * Paints the phone screen (a NONFUNCTIONAL mockup, no real patient data) onto a 2D canvas each frame.
 *
 * Screens, in the order the narration reaches them:
 *  1. Get Started picker: copy verbatim from src/components/site/GetStartedModal.tsx (mobile full-screen dialog, 2x2 cards).
 *  2. Bask 'Auth' (account) screen, Beema Health skin: logo header, gold progress bar, serif heading, Google button, email field, dark Continue.
 *  3-4. Bask question screens: pre-header, serif heading, square numbered answer cards, dark full-width Continue.
 * Look from the bask-questionnaire-page-styler skill (palette #14161B / #EEB318 / #6C4800 / #FDF2D0 / #EFE3C2, cream page gradient).
 * Headings on 2-4 are illustrative, not copied from Bask's Headings fields.
 */
export const SW = 720, SH = 1560;
const INK = '#14161B', GOLD = '#EEB318', DEEP = '#6C4800', PALE = '#FDF2D0', RING = '#EFE3C2', TRACK = '#F9EBBE', MUTED = '#55585F';
const SERIF = 'Georgia, "Times New Roman", serif', SANS = 'Figtree, system-ui, sans-serif', DISP = 'Outfit, system-ui, sans-serif';

const cl = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ease = (x: number) => { const c = cl(x); return c * c * (3 - 2 * c); };
const eo = (x: number) => 1 - Math.pow(1 - cl(x), 3);

export type ScreenCues = {first: number; create: number; account: number; complete: number; medical: number; intake: number; online: number};

const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};
const wrap = (g: CanvasRenderingContext2D, text: string, maxW: number): string[] => {
  const out: string[] = []; let line = '';
  for (const w of text.split(' ')) { const t = line ? line + ' ' + w : w; if (g.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
};
const spaced = (g: CanvasRenderingContext2D, text: string, x: number, y: number, sp: number) => {
  let cx = x; for (const ch of text) { g.fillText(ch, cx, y); cx += g.measureText(ch).width + sp; }
};

const statusBar = (g: CanvasRenderingContext2D, dark: boolean) => {
  g.fillStyle = dark ? '#fff' : INK; g.font = `600 34px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('9:41', 66, 58);
  // signal, wifi, battery (generic glyphs)
  for (let i = 0; i < 4; i++) { rr(g, 520 + i * 13, 66 - (i + 1) * 7, 9, (i + 1) * 7, 2); g.fill(); }
  g.beginPath(); g.arc(598, 70, 26, -Math.PI * 0.75, -Math.PI * 0.25); g.lineWidth = 6; g.strokeStyle = g.fillStyle as string; g.stroke();
  g.beginPath(); g.arc(598, 70, 13, -Math.PI * 0.75, -Math.PI * 0.25); g.stroke();
  rr(g, 628, 46, 50, 24, 7); g.lineWidth = 3; g.stroke(); rr(g, 632, 50, 38, 16, 4); g.fill();
  g.fillStyle = '#000'; rr(g, 250, 22, 220, 62, 31); g.fill();                  // dynamic island
};
const homeBar = (g: CanvasRenderingContext2D) => { g.fillStyle = 'rgba(20,22,27,.85)'; rr(g, 240, 1522, 240, 10, 5); g.fill(); };

/* ------------------------------------------------------------------ icons for the four categories (simple strokes, lucide-like) */
const icon = (g: CanvasRenderingContext2D, k: number, x: number, y: number) => {
  g.save(); g.translate(x, y); g.strokeStyle = '#B47F00'; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
  g.beginPath();
  if (k === 0) { g.moveTo(-26, -18); g.lineTo(26, -18); g.moveTo(0, -26); g.lineTo(0, 24); g.moveTo(-14, 24); g.lineTo(14, 24); g.moveTo(-26, -18); g.lineTo(-36, 6); g.lineTo(-16, 6); g.closePath(); g.moveTo(26, -18); g.lineTo(16, 6); g.lineTo(36, 6); g.closePath(); }
  if (k === 1) { g.moveTo(0, 24); g.bezierCurveTo(-40, -2, -30, -36, 0, -16); g.bezierCurveTo(30, -36, 40, -2, 0, 24); g.moveTo(-22, 0); g.lineTo(-8, 0); g.lineTo(-2, -10); g.lineTo(6, 10); g.lineTo(12, 0); g.lineTo(22, 0); }
  if (k === 2) { const st = (cx: number, cy: number, r: number) => { g.moveTo(cx, cy - r); g.quadraticCurveTo(cx, cy, cx + r, cy); g.quadraticCurveTo(cx, cy, cx, cy + r); g.quadraticCurveTo(cx, cy, cx - r, cy); g.quadraticCurveTo(cx, cy, cx, cy - r); }; st(-4, 4, 22); st(20, -18, 9); }
  if (k === 3) { g.moveTo(6, -28); g.lineTo(-20, 4); g.lineTo(2, 4); g.lineTo(-6, 28); g.lineTo(20, -4); g.lineTo(-2, -4); g.closePath(); }
  g.stroke(); g.restore();
};

const picker = (g: CanvasRenderingContext2D, tg: number) => {
  g.fillStyle = '#FFFDF8'; g.fillRect(0, 0, SW, SH);
  statusBar(g, false);
  g.strokeStyle = MUTED; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(636, 142); g.lineTo(662, 168); g.moveTo(662, 142); g.lineTo(636, 168); g.stroke();
  g.fillStyle = INK; g.font = `700 54px ${DISP}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
  wrap(g, 'What are you looking for?', 560).forEach((l, i) => g.fillText(l, SW / 2, 300 + i * 64));
  g.fillStyle = MUTED; g.font = `500 30px ${SANS}`; g.fillText('Choose a category to get started.', SW / 2, 440);
  const labels = ['Weight Loss', 'Sexual Health', 'Hair Loss', 'Wellness'];
  labels.forEach((l, i) => {
    const x = 52 + (i % 2) * 318, y = 500 + Math.floor(i / 2) * 300, k = eo((tg + 0.4 - i * 0.12) / 0.5);
    g.save(); g.globalAlpha = k; g.translate(0, (1 - k) * 30);
    g.shadowColor = 'rgba(20,22,27,.10)'; g.shadowBlur = 24; g.shadowOffsetY = 8;
    g.fillStyle = '#fff'; rr(g, x, y, 298, 276, 30); g.fill(); g.shadowColor = 'transparent';
    g.strokeStyle = '#E8E1CF'; g.lineWidth = 2.5; g.stroke();
    icon(g, i, x + 149, y + 104);
    g.fillStyle = INK; g.font = `600 33px ${SANS}`; g.textAlign = 'center'; g.fillText(l, x + 149, y + 210);
    g.restore();
  });
  homeBar(g);
};

const baskPage = (g: CanvasRenderingContext2D, logo: HTMLImageElement | null, progress: number) => {
  const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, '#FCF7EA'); gr.addColorStop(0.45, '#FDFAF2'); gr.addColorStop(1, '#FDFDFB');
  g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
  g.fillStyle = '#fff'; g.fillRect(0, 96, SW, 110);
  statusBar(g, false);
  g.strokeStyle = INK; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(70, 132); g.lineTo(50, 152); g.lineTo(70, 172); g.stroke();
  if (logo && logo.complete && logo.naturalWidth) { const w = 300, h = (w * logo.naturalHeight) / logo.naturalWidth; g.drawImage(logo, (SW - w) / 2, 151 - h / 2, w, h); }
  g.fillStyle = TRACK; g.fillRect(0, 206, SW, 10);
  g.fillStyle = GOLD; g.fillRect(0, 206, SW * progress, 10);
};
const darkButton = (g: CanvasRenderingContext2D, y: number, label: string, enabled = true) => {
  g.fillStyle = enabled ? INK : '#E9E4D6'; g.fillRect(50, y, SW - 100, 104);
  g.fillStyle = enabled ? '#fff' : '#8A8780'; g.font = `700 33px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, SW / 2, y + 54);
};
const ripple = (g: CanvasRenderingContext2D, x: number, y: number, k: number) => {
  if (k <= 0 || k >= 1) return;
  g.save(); g.beginPath(); g.arc(x, y, 20 + 90 * eo(k), 0, Math.PI * 2); g.fillStyle = `rgba(238,179,24,${0.45 * (1 - k)})`; g.fill();
  g.beginPath(); g.arc(x, y, 26, 0, Math.PI * 2); g.fillStyle = `rgba(255,255,255,${0.5 * (1 - k)})`; g.fill(); g.restore();
};

const auth = (g: CanvasRenderingContext2D, logo: HTMLImageElement | null, tTap: number) => {
  baskPage(g, logo, 0.3);
  g.fillStyle = INK; g.font = `500 66px ${SERIF}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText('Create your account', 50, 350);
  g.fillStyle = '#fff'; g.fillRect(50, 420, SW - 100, 100); g.strokeStyle = '#E3DCCB'; g.lineWidth = 2.5; g.strokeRect(50, 420, SW - 100, 100);
  g.beginPath(); g.arc(150, 470, 18, 0, Math.PI * 2); g.strokeStyle = '#8A8780'; g.lineWidth = 5; g.stroke();
  g.fillStyle = INK; g.font = `600 31px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Continue with Google', SW / 2 + 24, 472);
  g.strokeStyle = '#E3DCCB'; g.lineWidth = 2; g.beginPath(); g.moveTo(50, 590); g.lineTo(320, 590); g.moveTo(400, 590); g.lineTo(SW - 50, 590); g.stroke();
  g.fillStyle = MUTED; g.font = `500 28px ${SANS}`; g.fillText('or', SW / 2, 590);
  g.fillStyle = '#fff'; g.fillRect(50, 650, SW - 100, 100); g.strokeStyle = RING; g.lineWidth = 3; g.strokeRect(50, 650, SW - 100, 100);
  g.fillStyle = '#8A8780'; g.font = `500 31px ${SANS}`; g.textAlign = 'left'; g.fillText('Email address', 80, 701);
  darkButton(g, 800, 'Continue');
  ripple(g, SW / 2, 852, tTap);
  homeBar(g);
};

const question = (g: CanvasRenderingContext2D, logo: HTMLImageElement | null, progress: number, heading: string, sel: number, tTap: number, tCont: number) => {
  baskPage(g, logo, progress);
  g.fillStyle = DEEP; g.font = `600 24px ${SANS}`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; spaced(g, 'MEDICAL HISTORY', 50, 300, 5);
  g.fillStyle = INK; g.font = `500 60px ${SERIF}`;
  const lines = wrap(g, heading, SW - 100); lines.forEach((l, i) => g.fillText(l, 50, 380 + i * 68));
  const y0 = 380 + lines.length * 68 + 40;
  ['Yes', 'No'].forEach((a, i) => {
    const y = y0 + i * 140, on = sel > 0 && i === 1, k = on ? ease(sel) : 0;
    g.fillStyle = k > 0.5 ? PALE : 'rgba(255,255,255,.95)'; g.fillRect(50, y, SW - 100, 116);
    g.strokeStyle = k > 0.5 ? GOLD : RING; g.lineWidth = k > 0.5 ? 4 : 2.5; g.strokeRect(50, y, SW - 100, 116);
    g.fillStyle = k > 0.5 ? GOLD : INK; g.fillRect(76, y + 30, 56, 56);
    g.fillStyle = k > 0.5 ? INK : '#fff'; g.font = `600 28px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), 104, y + 59);
    g.fillStyle = INK; g.font = `500 33px ${SANS}`; g.textAlign = 'left'; g.fillText(a, 162, y + 59);
  });
  ripple(g, 400, y0 + 140 + 58, tTap);
  darkButton(g, 1380, 'Continue', sel > 0.5);
  ripple(g, SW / 2, 1432, tCont);
  homeBar(g);
};

/** Draw the screen state at global time tg. 'lift' (0..1) is the intake being sent: the content dims as the 3D card lifts off. */
export const paintScreen = (g: CanvasRenderingContext2D, tg: number, c: ScreenCues, logo: HTMLImageElement | null) => {
  const pAuth = ease((tg - (c.create - 0.25)) / 0.42);           // picker -> account screen, on "create"
  const pQ1 = ease((tg - (c.complete - 0.12)) / 0.38);           // account -> question 1, on "complete"
  const pQ2 = ease((tg - (c.intake - 0.1)) / 0.36);              // question 1 -> question 2, on "intake"
  const tapAuth = (tg - (c.complete - 0.42)) / 0.5;
  const sel1 = ease((tg - (c.medical - 0.05)) / 0.2), tap1 = (tg - (c.medical - 0.08)) / 0.5, cont1 = (tg - (c.intake - 0.32)) / 0.45;
  const sel2 = ease((tg - (c.online - 0.32)) / 0.2), tap2 = (tg - (c.online - 0.35)) / 0.5;
  const prog2 = 0.8 + 0.2 * ease((tg - c.online) / 0.4);
  const draw = (k: number) => {
    if (k === 0) picker(g, tg);
    if (k === 1) auth(g, logo, tapAuth);
    if (k === 2) question(g, logo, 0.6, 'Are you currently taking any medications?', sel1, tap1, cont1);
    if (k === 3) question(g, logo, prog2, 'Do you have any allergies?', sel2, tap2, -1);
  };
  const push = (from: number, to: number, k: number) => {
    g.save(); g.translate(-SW * 0.3 * k, 0); draw(from); g.fillStyle = `rgba(20,22,27,${0.18 * k})`; g.fillRect(0, 0, SW, SH); g.restore();
    g.save(); g.translate(SW * (1 - k), 0); g.shadowColor = 'rgba(0,0,0,.25)'; g.shadowBlur = 40; g.fillStyle = '#fff'; g.fillRect(0, 0, SW, SH); g.shadowColor = 'transparent'; draw(to); g.restore();
  };
  g.clearRect(0, 0, SW, SH);
  if (pAuth < 1) { if (pAuth <= 0) draw(0); else push(0, 1, pAuth); }
  else if (pQ1 < 1) { if (pQ1 <= 0) draw(1); else push(1, 2, pQ1); }
  else if (pQ2 < 1) { if (pQ2 <= 0) draw(2); else push(2, 3, pQ2); }
  else {
    const lift = ease((tg - (c.online + 0.3)) / 0.6);
    g.save(); g.translate(SW / 2, SH * 0.45); g.scale(1 - 0.05 * lift, 1 - 0.05 * lift); g.translate(-SW / 2, -SH * 0.45); draw(3); g.restore();
    if (lift > 0) { g.fillStyle = `rgba(253,250,242,${0.55 * lift})`; g.fillRect(0, 216, SW, SH - 216); }
  }
};
