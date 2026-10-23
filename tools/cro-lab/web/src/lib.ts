import type {
  DailyRow,
  PageGroup,
  LabState,
  PageDef,
  TestIdea,
  Variant,
  VariantStatus,
} from "@shared/types.ts";
import {
  attributeDays,
  compareToBaseline,
  observedLift,
  sumRows,
  variantReport,
  variantStatus,
  type DownstreamTotals,
  type Evidence,
  type Totals,
  type VariantReport,
} from "@shared/metrics.ts";
import { SHARED_CTA_NOTE } from "@shared/pages.ts";
import { addDays, denverDate, fmtDateKey } from "@shared/time.ts";
import type { Period } from "./lab.tsx";

/** True when there is no usable GA4 data to show (not connected, signed out, or empty). */
export const metricsUnavailable = (state: LabState, rows: DailyRow[]) =>
  state.analytics.status !== "demo" &&
  state.analytics.status !== "connected" &&
  rows.length === 0;

export const today = () => denverDate(new Date());

export function rangeFor(period: Period): { from: string; to: string } {
  const to = today();
  return {
    from: period === "all" ? "2026-08-01" : addDays(to, -(Number(period) - 1)),
    to,
  };
}

export const periodLabel = (p: Period) => {
  const { from, to } = rangeFor(p);
  const dates =
    from === to ? fmtDateKey(to) : `${fmtDateKey(from)} - ${fmtDateKey(to)}`;
  const name =
    p === "all" ? "All time" : p === "1" ? "Today so far" : `Last ${p} days`;
  return `${name} (${dates})`;
};

export type VariantRow = {
  variant: Variant;
  status: VariantStatus;
  report: VariantReport;
  /** All-time report (every window), used as the baseline comparison. */
  allTime: VariantReport;
  windows: LabState["data"]["deployments"];
  evidence: Evidence;
  lift: number | null;
};

const ALL_FROM = "2026-08-01";

export function pageRows(
  state: LabState,
  rows: DailyRow[],
  pageId: string,
  period: Period,
  baselineId: string | null,
): VariantRow[] {
  const { from, to } = rangeFor(period);
  const deps = state.data.deployments;
  const make = (v: Variant, f: string, t: string) =>
    variantReport({
      rows,
      deployments: deps,
      pageId,
      variantId: v.id,
      from: f,
      to: t,
    });
  const variants = state.data.variants.filter((v) => v.pageId === pageId);
  const reports = new Map(
    variants.map((v) => [
      v.id,
      { range: make(v, from, to), all: make(v, ALL_FROM, to) },
    ]),
  );
  const base = baselineId ? reports.get(baselineId) : undefined;
  return variants.map((v) => {
    const r = reports.get(v.id)!;
    const isBase = v.id === baselineId;
    return {
      variant: v,
      status: variantStatus(state.data, v),
      report: r.range,
      allTime: r.all,
      windows: deps
        .filter((d) => d.pageId === pageId && d.variantId === v.id)
        .sort((a, b) => a.startUtc.localeCompare(b.startUtc)),
      evidence:
        isBase || !base
          ? ({
              level: "none",
              label: isBase ? "Baseline" : "No baseline",
            } as Evidence)
          : compareToBaseline(r.range.totals, base.all.totals),
      lift:
        isBase || !base ? null : observedLift(r.range.totals, base.all.totals),
    };
  });
}

/** Variant metrics use the selected period; the baseline always uses all of its windows. */
/** Default baseline: the control, else the oldest variant. */
export function defaultBaseline(
  state: LabState,
  pageId: string,
): string | null {
  const vs = state.data.variants.filter((v) => v.pageId === pageId);
  return (vs.find((v) => v.parentId === null) ?? vs[0])?.id ?? null;
}

/** One slice of the selected period: a variant's own days, or the switch day. */
export type PeriodSplit = {
  key: string;
  label: string;
  kind: "variant" | "switch";
  totals: Totals;
};

export type PageSummary = {
  page: PageDef;
  live: Variant | null;
  liveSince: string | null;
  totals: Totals | null;
  /** Daily rows behind `totals`, for the source breakdown. */
  rows: DailyRow[];
  /** Whole page for the period, across every variant and the switch day. */
  pageTotals: Totals | null;
  pageRows: DailyRow[];
  /** Period totals per variant (in time order) plus any unattributed switch day. */
  split: PeriodSplit[];
  prev: Variant | null;
  prevTotals: Totals | null;
  evidence: Evidence | null;
  lift: number | null;
  nextTest: TestIdea | null;
  ready: Variant | null;
  warnings: string[];
  variantCount: number;
};

export function summarize(
  state: LabState,
  rows: DailyRow[],
  page: PageDef,
  period: Period,
): PageSummary {
  const { from, to } = rangeFor(period);
  const deps = state.data.deployments
    .filter((d) => d.pageId === page.id && d.confirmed)
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  const liveDep = deps.find((d) => d.endUtc === null) ?? null;
  const vOf = (id: string | undefined) =>
    state.data.variants.find((v) => v.pageId === page.id && v.id === id) ??
    null;
  const live = vOf(liveDep?.variantId);
  const warnings: string[] = [];
  let liveRows: DailyRow[] = [];
  let totals: Totals | null = null,
    prev: Variant | null = null,
    prevTotals: Totals | null = null;
  let evidence: Evidence | null = null,
    lift: number | null = null;
  // Same rule as the total funnel: keep showing the last loaded rows when GA4
  // auth has lapsed (the banner says the data is stale) instead of blanking.
  const nonEmpty = !metricsUnavailable(state, rows);
  if (!page.variants) {
    // Product pages have no variants: the whole page for the period is the data.
    const own = nonEmpty
      ? rows.filter(
          (r) => r.pageId === page.id && r.date >= from && r.date <= to,
        )
      : [];
    const t = own.length ? sumRows(own) : null;
    return {
      page,
      live: null,
      liveSince: null,
      totals: t,
      rows: own,
      pageTotals: t,
      pageRows: own,
      split: [],
      prev: null,
      prevTotals: null,
      evidence: null,
      lift: null,
      nextTest: null,
      ready: null,
      warnings: [],
      variantCount: 0,
    };
  }
  if (!live)
    warnings.push(
      "No confirmed live variant. Record the production activation.",
    );
  if (live && liveDep) {
    if (nonEmpty) {
      const rep = variantReport({
        rows,
        deployments: deps,
        pageId: page.id,
        variantId: live.id,
        from,
        to,
      });
      totals = rep.totals;
      liveRows = rep.rows;
      if (rep.ambiguousDays.length)
        warnings.push(
          `${rep.ambiguousDays.length} transition day excluded from totals.`,
        );
      if (totals.untrackedDays > 0 && totals.trackedDays === 0)
        warnings.push("No intake_handoff tracking in this period.");
      else if (totals.untrackedDays > 0)
        warnings.push(
          `${totals.untrackedDays} days predate handoff tracking; rate uses tracked days only.`,
        );
      const before = [...deps]
        .reverse()
        .find(
          (d) =>
            d.endUtc !== null &&
            d.variantId !== live.id &&
            d.endUtc <= liveDep.startUtc,
        );
      prev = vOf(before?.variantId);
      if (prev) {
        prevTotals = variantReport({
          rows,
          deployments: deps,
          pageId: page.id,
          variantId: prev.id,
          from: ALL_FROM,
          to,
        }).totals;
        evidence = compareToBaseline(totals, prevTotals);
        lift = observedLift(totals, prevTotals);
      }
    }
  }
  const pageRows =
    nonEmpty && deps.length
      ? rows.filter(
          (r) => r.pageId === page.id && r.date >= from && r.date <= to,
        )
      : [];
  const split: PeriodSplit[] = [];
  if (pageRows.length) {
    const attr = attributeDays(deps, from, to);
    const groups = new Map<string, DailyRow[]>();
    for (const r of pageRows) {
      const a = attr.byDate.get(r.date);
      const key = a ? a.variantId : "switch";
      (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
    }
    for (const [key, g] of groups) {
      split.push({
        key,
        label: key === "switch" ? "Switch day" : (vOf(key)?.name ?? key),
        kind: key === "switch" ? "switch" : "variant",
        totals: sumRows(g),
      });
    }
    split.sort((a, b) =>
      a.kind === b.kind ? 0 : a.kind === "variant" ? -1 : 1,
    );
  }
  const readyId = state.data.readyToDeploy[page.id];
  const ready = readyId && readyId !== live?.id ? vOf(readyId) : null;
  const order = {
    Building: 0,
    Planned: 1,
    Idea: 2,
    Live: 9,
    Completed: 9,
  } as const;
  const prio = { High: 0, Medium: 1, Low: 2 } as const;
  const nextTest =
    state.data.tests
      .filter((t) => t.pageId === page.id && order[t.status] < 9)
      .sort(
        (a, b) =>
          order[a.status] - order[b.status] ||
          prio[a.priority] - prio[b.priority],
      )[0] ?? null;
  return {
    page,
    live,
    liveSince: liveDep?.startUtc ?? null,
    totals,
    rows: liveRows,
    pageTotals: pageRows.length ? sumRows(pageRows) : null,
    pageRows,
    split,
    prev,
    prevTotals,
    evidence,
    lift,
    nextTest,
    ready,
    warnings,
    variantCount: state.data.variants.filter((v) => v.pageId === page.id)
      .length,
  };
}

export function claudeInstruction(state: LabState, v: Variant): string {
  const parent = state.data.variants.find(
    (x) => x.pageId === v.pageId && x.id === v.parentId,
  );
  const page = state.pages.find((p) => p.id === v.pageId);
  return [
    `Edit ${v.componentPath} (variant "${v.name}" of ${page?.path}).`,
    v.hypothesis && `Hypothesis: ${v.hypothesis}`,
    v.element && `Change only: ${v.element}.`,
    parent && `Keep everything else identical to ${parent.componentPath}.`,
    "Do not touch tracking, head metadata, or other variants, and do not deploy.",
  ]
    .filter(Boolean)
    .join(" ");
}

export const previewUrl = (state: LabState, v: Variant) => {
  const page = state.pages.find((p) => p.id === v.pageId)!;
  return `${state.devUrl}${page.path}?preview_variant=${encodeURIComponent(v.id)}`;
};

/** Same preview on the deployed staging site (needs a deploy that included the variant). */
export const stagingPreviewUrl = (state: LabState, v: Variant) => {
  const page = state.pages.find((p) => p.id === v.pageId)!;
  return `${state.staging?.url ?? ""}${page.path}?preview_variant=${encodeURIComponent(v.id)}`;
};

/**
 * Caption under a group funnel (all landing pages, or all product pages). The
 * counts are the ones matched to the group's own pages by cta_id; the rest are
 * listed so the numbers reconcile with the whole site.
 */
export function groupDownNote(o: {
  label: string;
  otherLabel: string;
  other: DownstreamTotals;
  unmatched: DownstreamTotals;
}): string {
  const parts = [
    `Signups and purchases are matched to a page by the cta_id on the Bask URL (GTM preview sessions excluded), on days with handoff tracking. This funnel counts the ones from ${o.label}.`,
  ];
  const left = [
    o.other.signups + o.other.purchases > 0 &&
      `${o.other.signups} signups and ${o.other.purchases} purchases came from ${o.otherLabel}`,
    o.unmatched.signups + o.unmatched.purchases > 0 &&
      `${o.unmatched.signups} signups and ${o.unmatched.purchases} purchases had no cta_id from a tracked page (the sitewide footer link, untracked pages, or direct)`,
  ].filter(Boolean);
  if (left.length) parts.push(`Not included here: ${left.join("; ")}.`);
  return parts.join(" ");
}

/** Caption under a page or variant funnel: how Bask events were tied to it. */
export function pageDownNote(pageId: string): string {
  return [
    "Signups and purchases are matched to this page by the cta_id on the Bask URL (GTM preview sessions excluded), on days with handoff tracking.",
    "Any signup that arrives without a cta_id is not counted here.",
    SHARED_CTA_NOTE[pageId],
  ]
    .filter(Boolean)
    .join(" ");
}

export const GROUP_LABEL: Record<PageGroup, string> = {
  landing: "Landing pages",
  product: "Product pages",
};

const GROUP_KEY = "cro.overviewGroup";

/** Which Overview tab was last open; shared so "back" from a page returns to it. */
export function readGroup(): PageGroup {
  try {
    return localStorage.getItem(GROUP_KEY) === "product"
      ? "product"
      : "landing";
  } catch {
    return "landing";
  }
}

export function saveGroup(group: PageGroup): void {
  try {
    localStorage.setItem(GROUP_KEY, group);
  } catch {
    /* preference only */
  }
}

/**
 * Badge for a variant. Live and ready-to-deploy always win; otherwise the
 * variant that last went to staging shows "on staging", and the one the local
 * code serves shows "live locally".
 */
export function displayStatus(
  state: LabState,
  pageId: string,
  variantId: string,
  status: VariantStatus,
): VariantStatus | "testing" | "staging" {
  if (status === "live" || status === "ready") return status;
  if (state.staging?.deployed?.mains[pageId] === variantId) return "staging";
  if (state.mainVariants?.[pageId] === variantId) return "testing";
  return status;
}
