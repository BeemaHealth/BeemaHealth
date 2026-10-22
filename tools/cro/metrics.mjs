// Browser-safe metric helpers shared by the dashboard UI and tests.
export const MIN_VISITORS = 100;

/** Intake handoff rate = unique clickers / unique visitors. Null when it cannot be known. */
export function handoffRate(visitors, clickers) {
  if (!visitors) return null;
  return Math.min(1, clickers / visitors);
}

/** 95% Wilson score interval for x successes in n trials. */
export function wilson(x, n, z = 1.96) {
  if (!n) return null;
  const p = x / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { low: Math.max(0, c - h), high: Math.min(1, c + h) };
}

function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

/** Two-sided two-proportion z-test. Returns { diff, p } or null with too little data. */
export function compareRates(x1, n1, x2, n2) {
  if (!n1 || !n2) return null;
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pool = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pool * (1 - pool) * (1 / n1 + 1 / n2));
  if (!se) return { diff: p2 - p1, p: 1 };
  const z = (p2 - p1) / se;
  return { diff: p2 - p1, p: Math.min(1, 2 * (1 - normCdf(Math.abs(z)))) };
}

/**
 * Warnings that must travel with a number so a missing signal never reads as 0%.
 * `ctx`: { trackingVerified, dimensionsRegistered }.
 */
export function variantWarnings({ visitors, clickers }, ctx) {
  const w = [];
  if (!ctx.dimensionsRegistered) {
    // Visitor counts are unknown, so traffic-based warnings would be misleading.
    w.push("custom-dimensions-missing");
    return w;
  }
  if (!ctx.trackingVerified) w.push("handoff-unverified");
  if (visitors === 0) w.push("no-exposures");
  else if (visitors < MIN_VISITORS) w.push("low-traffic");
  if (clickers > visitors) w.push("clickers-exceed-visitors");
  return w;
}

/** Days on which two variants both had exposures, as a share of the shorter run. */
export function concurrencyShare(daysA, daysB) {
  const a = new Set(daysA);
  const b = new Set(daysB);
  const both = [...a].filter((d) => b.has(d)).length;
  const shorter = Math.min(a.size, b.size);
  return shorter ? both / shorter : 0;
}
