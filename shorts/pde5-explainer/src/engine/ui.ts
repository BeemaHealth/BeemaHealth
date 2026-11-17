import {useVideoConfig} from 'remotion';

export type Seg = {id: string; kind: string; text: string; visual: any; screen: string | null; emph: string[]; t0: number; t1: number; end: number};
export type Word = {w: string; t0: number; t1: number; seg: string};
export type ClipProps = {
  id: string; product: string; format: 'organic' | 'ad'; aspect: string; duration: number; audio: string;
  segments: Seg[]; words: Word[];
  endcard: {lines: string[]; disclosures: string[]; safety: string; logo: string; mark: string; photo: string | null; hero?: string; price?: {label: string; amount: number; per: string; fine?: string}};
  brand: {colors: Record<string, string>}; look?: {colors: Record<string, string>; caption: string; palette: string} | null; safeZones: any; seed: string;
};

export const F = {display: 'Outfit, system-ui, sans-serif', body: 'Figtree, system-ui, sans-serif'};
export const PRODUCT_LABEL: Record<string, string> = {tadalafil: 'Tadalafil', sildenafil: 'Sildenafil', 'ed-mints': 'Sildenafil + tadalafil', semaglutide: 'Medication', tirzepatide: 'Medication'};

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const eo3 = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const eob = (t: number) => { const c1 = 1.70158, c3 = c1 + 1, x = clamp(t); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const eio = (t: number) => { const x = clamp(t); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const rnd = (s: number) => { const x = Math.sin(s * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** Layout zones keep every important element out of TikTok/Reels/Shorts UI overlays. */
export const useZones = () => {
  const {width: W, height: H} = useVideoConfig();
  const tall = H / W > 1.5;
  const sq = H / W <= 1.05;
  const top = tall ? 0.118 : sq ? 0.07 : 0.07;
  const visB = tall ? 0.572 : sq ? 0.6 : 0.6;
  const capT = tall ? 0.598 : sq ? 0.64 : 0.64;
  const capB = tall ? 0.772 : sq ? 0.9 : 0.88;
  return {W, H, vt: top * H, vb: visB * H, vh: (visB - top) * H, ct: capT * H, cb: capB * H, ch: (capB - capT) * H, side: tall ? 70 : 60};
};

export type Zones = ReturnType<typeof useZones>;
export const tone = (bg: string, C: Record<string, string>) => bg === 'ink'
  ? {bg: C.ink, fg: '#fff', sub: 'rgba(255,255,255,.72)', card: 'rgba(255,255,255,.08)', line: 'rgba(238,179,24,.55)'}
  : bg === 'honey'
  ? {bg: C.honey, fg: C.onHoney, sub: 'rgba(36,28,12,.72)', card: 'rgba(255,255,255,.55)', line: C.onHoney}
  : {bg: C.cream, fg: C.foreground, sub: 'rgba(20,22,27,.68)', card: '#fff', line: C.honeyDeep};

/** Times (seconds from the start of the segment) when each cue word is SPOKEN. Searches in order, so repeated words
 *  (e.g. "chain" twice) resolve to the next occurrence. Missing cues fall back to a gentle spread. */
export const cueTimes = (words: Word[], segId: string, segT0: number, says: (string | undefined)[]): number[] => {
  const ws = words.filter((w) => w.seg === segId);
  let from = 0;
  const out: number[] = [];
  says.forEach((say) => {
    let t = NaN;
    if (say) {
      for (let j = from; j < ws.length; j++) {
        if (ws[j].w.toLowerCase().replace(/[^a-z0-9'-]/g, '').includes(say.toLowerCase())) { t = ws[j].t0 - segT0; from = j + 1; break; }
      }
    }
    out.push(t);
  });
  return out.map((t, i) => (Number.isNaN(t) ? 0.4 + i * 0.5 : t));
};

/** Time (seconds from segment start) a cue KEY is spoken. Key = a word or a short phrase ("blood vessel"), optionally "#n" for the nth occurrence ("stomach#2").
 *  Returns NaN if it is not in the narration (the validator rejects those storyboards before they are rendered). */
export const cueAt = (words: Word[], segId: string, segT0: number, key: string): number => {
  const [phrase, nth] = key.split('#'); const n = nth ? parseInt(nth, 10) : 1;
  const parts = phrase.toLowerCase().split(/\s+/).filter(Boolean);
  const ws = words.filter((w) => w.seg === segId).map((w) => ({t: w.t0, n: w.w.toLowerCase().replace(/[^a-z0-9'-]/g, '')}));
  let c = 0;
  for (let i = 0; i < ws.length; i++) {
    if (parts.every((p, j) => i + j < ws.length && (j === 0 ? ws[i + j].n.includes(p) : ws[i + j].n === p || ws[i + j].n.includes(p)))) { c++; if (c === n) return ws[i].t - segT0; }
  }
  return NaN;
};
