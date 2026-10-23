// Pure metric logic: deployment windows, day attribution, funnel, evidence.
// Used by the web UI today and by the GA4 cache layer in Phase C.
import type {
  DailyRow,
  DownstreamRow,
  PathRow,
  Deployment,
  Variant,
  VariantStatus,
  LabData,
} from "./types.ts";
import { pagePathFor } from "./pages.ts";
import {
  addDays,
  denverDate,
  denverDayEndMs,
  denverDayStartMs,
  eachDate,
} from "./time.ts";

/** Minimum evidence before a lift is called anything but Insufficient Data. */
export const MIN_VISITORS = 300;
export const MIN_CLICKERS = 15;

export const isLiveWindow = (d: Deployment) => d.confirmed && d.endUtc === null;

export function liveDeployment(
  deps: Deployment[],
  pageId: string,
): Deployment | null {
  return deps.find((d) => d.pageId === pageId && isLiveWindow(d)) ?? null;
}

export function variantStatus(data: LabData, v: Variant): VariantStatus {
  const live = data.deployments.some(
    (d) => d.variantId === v.id && d.pageId === v.pageId && isLiveWindow(d),
  );
  if (live) return "live";
  const wasLive = data.deployments.some(
    (d) =>
      d.variantId === v.id &&
      d.pageId === v.pageId &&
      d.confirmed &&
      d.endUtc !== null,
  );
  return v.status === "draft" && wasLive ? "retired" : v.status;
}

/** Problems preventing a set of confirmed windows for one page (empty = valid). */
export function validateWindows(deps: Deployment[]): string[] {
  const problems: string[] = [];
  const conf = deps
    .filter((d) => d.confirmed)
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  for (const d of conf) {
    if (d.endUtc !== null && d.endUtc <= d.startUtc)
      problems.push(`${d.id}: end must be after start`);
  }
  for (let i = 1; i < conf.length; i++) {
    const prev = conf[i - 1];
    if (prev.endUtc === null || prev.endUtc > conf[i].startUtc) {
      problems.push(`${prev.id} overlaps ${conf[i].id}`);
    }
  }
  return problems;
}

export type DayAttribution = {
  /** date -> variantId, only for days fully served by exactly one variant. */
  byDate: Map<string, { variantId: string; deploymentId: string }>;
  /** Days touched by a transition (partial coverage); excluded from totals. */
  ambiguous: Set<string>;
};

/**
 * Whole Denver days fully inside one confirmed window are attributed. Days
 * where a window starts or ends mid-day are ambiguous and excluded, never
 * silently given to either variant.
 */
export function attributeDays(
  deps: Deployment[],
  from: string,
  to: string,
  nowMs = Date.now(),
): DayAttribution {
  const byDate: DayAttribution["byDate"] = new Map();
  const ambiguous = new Set<string>();
  const conf = deps.filter((d) => d.confirmed);
  for (const date of eachDate(from, to)) {
    const s = denverDayStartMs(date);
    const e = denverDayEndMs(date);
    const touching = conf.filter((d) => {
      const ws = Date.parse(d.startUtc);
      const we = d.endUtc ? Date.parse(d.endUtc) : Infinity;
      return ws < e && we > s;
    });
    if (touching.length === 0) continue;
    const full = touching.filter(
      (d) =>
        Date.parse(d.startUtc) <= s &&
        (d.endUtc ? Date.parse(d.endUtc) : Infinity) >= e,
    );
    if (touching.length === 1 && full.length === 1) {
      byDate.set(date, {
        variantId: full[0].variantId,
        deploymentId: full[0].id,
      });
    } else if (
      touching.length === 1 &&
      !touching[0].endUtc &&
      s <= nowMs &&
      nowMs < e &&
      Date.parse(touching[0].startUtc) <= s
    ) {
      // Today, still live: preliminary but attributable.
      byDate.set(date, {
        variantId: touching[0].variantId,
        deploymentId: touching[0].id,
      });
    } else {
      ambiguous.add(date);
    }
  }
  return { byDate, ambiguous };
}

export type Totals = {
  visitors: number;
  sessions: number;
  /** Visitors on days where handoff tracking existed. */
  trackedVisitors: number;
  clickers: number | null;
  rate: number | null;
  trackedDays: number;
  untrackedDays: number;
  days: number;
};

export function sumRows(rows: DailyRow[]): Totals {
  let visitors = 0,
    sessions = 0,
    tracked = 0,
    clickers = 0;
  const dates = new Set<string>(),
    trackedDates = new Set<string>();
  for (const r of rows) {
    visitors += r.users;
    sessions += r.sessions;
    dates.add(r.date);
    if (r.handoffUsers !== null) {
      tracked += r.users;
      clickers += r.handoffUsers;
      trackedDates.add(r.date);
    }
  }
  const hasTracking = trackedDates.size > 0;
  return {
    visitors,
    sessions,
    trackedVisitors: tracked,
    clickers: hasTracking ? clickers : null,
    rate: hasTracking && tracked > 0 ? clickers / tracked : null,
    trackedDays: trackedDates.size,
    untrackedDays: dates.size - trackedDates.size,
    days: dates.size,
  };
}

export type VariantReport = {
  variantId: string;
  totals: Totals;
  rows: DailyRow[];
  ambiguousDays: string[];
  /** Deployment ids included. */
  windows: string[];
};

/** Rows for one variant across the chosen windows (all confirmed windows when none given). */
export function variantReport(opts: {
  rows: DailyRow[];
  deployments: Deployment[];
  pageId: string;
  variantId: string;
  from: string;
  to: string;
  windowIds?: string[];
  nowMs?: number;
}): VariantReport {
  const pageDeps = opts.deployments.filter((d) => d.pageId === opts.pageId);
  const attr = attributeDays(pageDeps, opts.from, opts.to, opts.nowMs);
  const rows = opts.rows.filter((r) => {
    if (r.pageId !== opts.pageId) return false;
    const a = attr.byDate.get(r.date);
    if (!a || a.variantId !== opts.variantId) return false;
    return !opts.windowIds || opts.windowIds.includes(a.deploymentId);
  });
  const windows = [
    ...new Set(
      [...attr.byDate.values()]
        .filter((a) => a.variantId === opts.variantId)
        .map((a) => a.deploymentId),
    ),
  ];
  const ambiguousDays = [...attr.ambiguous];
  return {
    variantId: opts.variantId,
    totals: sumRows(rows),
    rows,
    ambiguousDays,
    windows,
  };
}

// ---- Funnel / sources -----------------------------------------------------

export type SourceKind =
  | "Paid search"
  | "Paid social"
  | "Organic search"
  | "Referral / social"
  | "Direct"
  | "Other";

/** Classified strictly from GA4 medium. Facebook referral traffic is never "paid". */
export function sourceKind(sourceMedium: string): SourceKind {
  const [source = "", medium = ""] = sourceMedium
    .split(" / ")
    .map((s) => s.trim().toLowerCase());
  if (medium === "(none)" && source === "(direct)") return "Direct";
  if (["cpc", "ppc", "paidsearch"].includes(medium)) return "Paid search";
  if (["paid_social", "paidsocial", "paid-social", "cpm"].includes(medium))
    return "Paid social";
  if (medium === "organic") return "Organic search";
  if (["referral", "social", "(none)"].includes(medium))
    return "Referral / social";
  return "Other";
}

export type SourceRow = {
  sourceMedium: string;
  campaign: string;
  kind: SourceKind;
  totals: Totals;
};

export function bySource(rows: DailyRow[], withCampaign = false): SourceRow[] {
  const groups = new Map<string, DailyRow[]>();
  for (const r of rows) {
    const k = withCampaign
      ? `${r.sourceMedium}||${r.campaign}`
      : r.sourceMedium;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(r);
  }
  return [...groups.entries()]
    .map(([k, g]) => ({
      sourceMedium: g[0].sourceMedium,
      campaign: withCampaign ? g[0].campaign : "",
      kind: sourceKind(g[0].sourceMedium),
      totals: sumRows(g),
    }))
    .sort((a, b) => b.totals.visitors - a.totals.visitors);
}

export function byDay(rows: DailyRow[]): { date: string; totals: Totals }[] {
  const groups = new Map<string, DailyRow[]>();
  for (const r of rows)
    (groups.get(r.date) ?? groups.set(r.date, []).get(r.date)!).push(r);
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, g]) => ({ date, totals: sumRows(g) }));
}

// ---- Evidence --------------------------------------------------------------

export type Evidence =
  | { level: "none"; label: string }
  | { level: "insufficient"; label: string }
  | { level: "directional"; label: string; lift: number; p: number }
  | { level: "persuasive"; label: string; lift: number; p: number };

const erf = (x: number) => {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) *
      t +
      0.254829592) *
      t *
      Math.exp(-x * x);
  return x >= 0 ? y : -y;
};
const normCdf = (z: number) => 0.5 * (1 + erf(z / Math.SQRT2));

/** Two-sided two-proportion z-test p-value. */
export function twoProportionP(
  x1: number,
  n1: number,
  x2: number,
  n2: number,
): number {
  const p = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  if (se === 0) return 1;
  const z = (x1 / n1 - x2 / n2) / se;
  return 2 * (1 - normCdf(Math.abs(z)));
}

/**
 * Observed lift is not proof. Sequential (non-randomized) comparisons also
 * differ in traffic mix, seasonality and ad settings, so even "persuasive"
 * means only that the gap is unlikely to be noise alone.
 */
export function compareToBaseline(v: Totals, base: Totals | null): Evidence {
  if (v.clickers === null || v.rate === null)
    return { level: "none", label: "No tracking" };
  if (!base || base.clickers === null || base.rate === null)
    return { level: "none", label: "No baseline" };
  if (
    v.trackedVisitors < MIN_VISITORS ||
    base.trackedVisitors < MIN_VISITORS ||
    v.clickers < MIN_CLICKERS ||
    base.clickers < MIN_CLICKERS
  ) {
    return { level: "insufficient", label: "Insufficient data" };
  }
  const lift = base.rate === 0 ? 0 : v.rate / base.rate - 1;
  const p = twoProportionP(
    v.clickers,
    v.trackedVisitors,
    base.clickers,
    base.trackedVisitors,
  );
  return p < 0.05
    ? { level: "persuasive", label: "Statistically persuasive", lift, p }
    : { level: "directional", label: "Directional only", lift, p };
}

export const observedLift = (v: Totals, base: Totals | null): number | null =>
  v.rate !== null && base?.rate ? v.rate / base.rate - 1 : null;

export function defaultRange(
  days: number,
  today = denverDate(new Date()),
): { from: string; to: string } {
  return { from: addDays(today, -(days - 1)), to: today };
}

// ---- Paths after landing --------------------------------------------------

export type PathDestination = {
  label: string;
  /** Sessions that landed on the page and also viewed this destination. */
  sessions: number;
  /** Of those, sessions that fired intake_handoff while on the destination. */
  handoffs: number | null;
  /** Number of distinct pages folded into this row. */
  pages: number;
};

export type PathSummary = {
  /** Sessions that viewed their own landing page (about the landing count). */
  landed: number;
  /** Handoffs fired straight from the landing page. null = not tracked. */
  direct: number | null;
  destinations: PathDestination[];
};

/** Learn articles and the home page fold into one row each. */
export function pathGroup(page: string): string {
  if (page === "/") return "Home page";
  if (page.startsWith("/learn/")) return "Learn articles";
  return page;
}

const addNullable = (a: number | null, b: number | null) =>
  a === null ? b : b === null ? a : a + b;

/**
 * Summarizes path rows (already filtered to the wanted pages and dates).
 * Destination rows overlap: one session that views two pages is in both.
 */
export function pathSummary(paths: PathRow[], maxShown = 6): PathSummary {
  let landed = 0;
  let direct: number | null = null;
  const groups = new Map<string, PathDestination>();
  for (const r of paths) {
    if (r.page === pagePathFor(r.pageId)) {
      landed += r.sessionsViewed;
      direct = addNullable(direct, r.handoffSessions);
      continue;
    }
    const label = pathGroup(r.page);
    const g = groups.get(label) ?? {
      label,
      sessions: 0,
      handoffs: null,
      pages: 0,
    };
    g.sessions += r.sessionsViewed;
    g.handoffs = addNullable(g.handoffs, r.handoffSessions);
    g.pages += 1;
    groups.set(label, g);
  }
  const ranked = [...groups.values()]
    .filter((g) => g.sessions > 0 || (g.handoffs ?? 0) > 0)
    .sort((a, b) => b.sessions - a.sessions);
  const shown = ranked.slice(0, maxShown);
  const rest = ranked.slice(maxShown);
  if (rest.length)
    shown.push({
      label: `${rest.length} other pages`,
      sessions: rest.reduce((t, g) => t + g.sessions, 0),
      handoffs: rest.reduce<number | null>(
        (t, g) => addNullable(t, g.handoffs),
        null,
      ),
      pages: rest.reduce((t, g) => t + g.pages, 0),
    });
  return { landed, direct, destinations: shown };
}

/** Path rows for one variant, using the same whole-day attribution as variantReport. */
export function variantPaths(opts: {
  paths: PathRow[];
  deployments: Deployment[];
  pageId: string;
  variantId: string;
  from: string;
  to: string;
  windowIds?: string[];
  nowMs?: number;
}): PathRow[] {
  const pageDeps = opts.deployments.filter((d) => d.pageId === opts.pageId);
  const attr = attributeDays(pageDeps, opts.from, opts.to, opts.nowMs);
  return opts.paths.filter((r) => {
    if (r.pageId !== opts.pageId) return false;
    const a = attr.byDate.get(r.date);
    if (!a || a.variantId !== opts.variantId) return false;
    return !opts.windowIds || opts.windowIds.includes(a.deploymentId);
  });
}

export type DownstreamTotals = {
  /** Unique users who fired the Bask signup event. */
  signups: number;
  /** Unique users who fired the Bask purchase event. */
  purchases: number;
};

/**
 * Sums sitewide Bask events (already filtered to the wanted dates). Unique
 * users per day are added across days, the same way the landing funnel adds
 * daily users, so a person active on two days counts twice in both.
 */
export function downstreamTotals(rows: DownstreamRow[]): DownstreamTotals {
  let signups = 0;
  let purchases = 0;
  for (const r of rows) {
    if (r.event === "signup") signups += r.users;
    else purchases += r.users;
  }
  return { signups, purchases };
}

/**
 * Bask signups and purchases tied to one page, on the days of `rows` that have
 * handoff tracking (handoff tracking is newer than the signup tag, so older
 * days would inflate the ratio). `rows` are the landing rows being summarized,
 * so a variant's windows, period and attribution carry over automatically.
 */
export function pageDownstream(
  down: DownstreamRow[],
  pageId: string,
  rows: DailyRow[],
): DownstreamTotals {
  const dates = new Set<string>();
  for (const r of rows) if (r.handoffUsers !== null) dates.add(r.date);
  return downstreamTotals(
    down.filter((r) => r.pageId === pageId && dates.has(r.date)),
  );
}
