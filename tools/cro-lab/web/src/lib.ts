import type {
  DailyRow,
  LabState,
  PageDef,
  TestIdea,
  Variant,
  VariantStatus,
} from "@shared/types.ts";
import {
  compareToBaseline,
  observedLift,
  variantReport,
  variantStatus,
  type Evidence,
  type Totals,
  type VariantReport,
} from "@shared/metrics.ts";
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

export type PageSummary = {
  page: PageDef;
  live: Variant | null;
  liveSince: string | null;
  totals: Totals | null;
  /** Daily rows behind `totals`, for the source breakdown. */
  rows: DailyRow[];
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
  const nonEmpty =
    state.analytics.status === "demo" || state.analytics.status === "connected";
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
