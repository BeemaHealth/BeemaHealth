import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles,
} from "lucide-react";
import { fmtInt, fmtLift, fmtPct } from "@shared/format.ts";
import { fmtDay } from "@shared/time.ts";
import { go, useLab, type Period } from "../lab.tsx";
import { PeriodSelect } from "../components/Period.tsx";
import {
  FunnelGraphic,
  MiniFunnel,
  PathsPanel,
  TrackingWarning,
} from "../components/Funnel.tsx";
import {
  bySource,
  downstreamTotals,
  pageDownstream,
  sumRows,
} from "@shared/metrics.ts";
import {
  metricsUnavailable,
  groupDownNote,
  GROUP_LABEL,
  periodLabel,
  rangeFor,
  readGroup,
  saveGroup,
  summarize,
} from "../lib.ts";
import { Card, DemoChip, EvidenceBadge, cx } from "../ui.tsx";
import type { PageSummary } from "../lib.ts";
import type { PageGroup } from "@shared/types.ts";

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-faint">
        {label}
      </p>
      <p className="num text-xl font-semibold">{value}</p>
      {sub && <p className="text-[11px] text-faint">{sub}</p>}
    </div>
  );
}

function PageCard({
  s,
  i,
  showFunnel,
}: {
  s: PageSummary;
  i: number;
  showFunnel: boolean;
}) {
  const { state, mode, rows, downstream } = useLab();
  const a = state!.analytics;
  const noData = metricsUnavailable(state!, rows);
  // When other variants (or the switch day) fall inside the period, show the
  // whole page for the period instead of only the live variant's own days.
  const mixed = s.split.some(
    (x) => x.key !== s.live?.id && x.totals.visitors > 0,
  );
  const t = mixed ? s.pageTotals : s.totals;
  const funnelRows = mixed ? s.pageRows : s.rows;
  const down =
    t && t.clickers !== null
      ? pageDownstream(downstream, s.page.id, funnelRows)
      : undefined;
  const up = (s.lift ?? 0) >= 0;
  return (
    <button
      onClick={() => go("page", s.page.id)}
      style={{ animationDelay: `${i * 40}ms` }}
      className="rise group flex cursor-pointer flex-col gap-4 rounded-xl border border-line bg-surface/80 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-teal/40 hover:bg-surface"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{s.page.title}</p>
          <p className="num text-xs text-faint">{s.page.path}</p>
        </div>
        <div className="flex items-center gap-2">
          {mode === "demo" && <DemoChip />}
          <ArrowRight className="size-4 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-teal" />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-bg/60 p-3">
        {!s.page.variants ? (
          <p className="text-sm text-soft">
            Tracked page. No variants yet, so these numbers cover the whole
            page.
          </p>
        ) : s.live ? (
          <>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="pulse-dot size-2 rounded-full bg-amber" />
              {s.live.name}
              <span className="num text-xs font-normal text-faint">
                {s.live.id}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-soft">
              {s.live.hypothesis || "No hypothesis recorded."}
            </p>
            {s.liveSince && (
              <p className="mt-1 text-[11px] text-faint">
                Live since {fmtDay(s.liveSince)}
              </p>
            )}
          </>
        ) : (
          <p className="flex items-center gap-2 text-sm text-soft">
            <AlertTriangle className="size-4 text-amber" />
            No confirmed live variant
          </p>
        )}
      </div>

      {showFunnel && !noData && t && t.visitors > 0 && (
        <MiniFunnel totals={t} sources={bySource(funnelRows)} down={down} />
      )}
      {mixed && (
        <div className="space-y-1.5 rounded-lg border border-line bg-bg/60 p-3 text-xs">
          <p className="text-[11px] font-medium uppercase tracking-wide text-faint">
            This period, by variant
          </p>
          {s.split.map((x) => (
            <div
              key={x.key}
              className="flex items-baseline justify-between gap-2"
            >
              <span
                className={cx(
                  "truncate",
                  x.kind === "switch" ? "text-faint" : "text-ink",
                )}
                title={x.label}
              >
                {x.label}
                {x.key === s.live?.id ? " (live)" : ""}
              </span>
              <span className="num shrink-0 text-soft">
                {fmtInt(x.totals.visitors)} visitors ·{" "}
                {x.totals.clickers === null ? "n/a" : fmtInt(x.totals.clickers)}{" "}
                handoffs · {fmtPct(x.totals.rate)}
              </span>
            </div>
          ))}
          {s.split.some((x) => x.kind === "switch") && (
            <p className="text-[11px] text-faint">
              The switch day is shown here but not credited to either variant.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat
          label={mixed ? "Page visitors" : "Visitors"}
          value={noData || !t ? "n/a" : fmtInt(t.visitors)}
        />
        <Stat
          label="Handoffs"
          value={noData || !t ? "n/a" : fmtInt(t.clickers)}
        />
        <Stat label="Rate" value={noData || !t ? "n/a" : fmtPct(t.rate)} />
      </div>

      {s.page.variants && (
        <div className="min-h-9 text-xs">
          {s.prev && s.lift !== null && s.evidence ? (
            <div className="flex items-center gap-2">
              <span
                className={cx(
                  "num inline-flex items-center gap-0.5 font-semibold",
                  up ? "text-teal" : "text-rose",
                )}
              >
                {up ? (
                  <ArrowUpRight className="size-3.5" />
                ) : (
                  <ArrowDownRight className="size-3.5" />
                )}
                {fmtLift(s.lift)}
              </span>
              <span className="text-faint">vs {s.prev.name}</span>
              <span className="text-faint">·</span>
              <EvidenceBadge e={s.evidence} />
            </div>
          ) : (
            <p className="text-faint">
              {noData
                ? "Metrics unavailable. See the banner above."
                : "No comparable previous variant."}
            </p>
          )}
        </div>
      )}

      {s.page.variants && (
        <div className="mt-auto space-y-1.5 border-t border-line pt-3 text-xs">
          {s.warnings.slice(0, 2).map((w) => (
            <p key={w} className="flex items-start gap-1.5 text-amber">
              <AlertTriangle className="mt-0.5 size-3 shrink-0" />
              {w}
            </p>
          ))}
          {s.ready && (
            <p className="flex items-center gap-1.5 text-teal">
              <Sparkles className="size-3" />
              {s.ready.name} is ready to deploy (not live)
            </p>
          )}
          <p className="flex items-center gap-1.5 text-soft">
            <FlaskConical className="size-3 shrink-0 text-faint" />
            <span className="truncate">
              {s.nextTest ? `Next: ${s.nextTest.hypothesis}` : "No test queued"}
            </span>
          </p>
          <p className="flex items-center gap-1.5 text-faint">
            <Layers className="size-3" />
            {s.variantCount} {s.variantCount === 1 ? "variant" : "variants"} ·{" "}
            {a.refreshedAt ? "refreshed just now" : "never refreshed"}
          </p>
        </div>
      )}
    </button>
  );
}

const FUNNEL_KEY = "cro.overviewFunnel";
const CARD_FUNNEL_KEY = "cro.cardFunnels";
const readHidden = (key: string) => {
  try {
    return localStorage.getItem(key) === "hidden";
  } catch {
    return false;
  }
};
const saveHidden = (key: string, hidden: boolean) => {
  try {
    localStorage.setItem(key, hidden ? "hidden" : "shown");
  } catch {
    /* preference only */
  }
};

function Totals({ period, group }: { period: Period; group: PageGroup }) {
  const { state, rows, paths, downstream } = useLab();
  const [hidden, setHidden] = useState(() => readHidden(FUNNEL_KEY));
  if (!state) return null;
  if (metricsUnavailable(state, rows)) return null;
  const label = GROUP_LABEL[group];
  const otherGroup: PageGroup = group === "landing" ? "product" : "landing";
  const idsOf = (g: PageGroup) =>
    new Set(state.pages.filter((p) => p.group === g).map((p) => p.id));
  const ids = idsOf(group);
  const otherIds = idsOf(otherGroup);
  const { from, to } = rangeFor(period);
  const inRange = rows.filter(
    (r) => ids.has(r.pageId) && r.date >= from && r.date <= to,
  );
  const t = sumRows(inRange);
  // Compare signups to handoffs on the same days: handoff tracking is newer
  // than the signup tag, so older days would inflate the ratio.
  const trackedDates = new Set(
    inRange.filter((r) => r.handoffUsers !== null).map((r) => r.date),
  );
  const periodDown = downstream.filter(
    (r) =>
      r.date >= from &&
      r.date <= to &&
      (t.clickers === null || trackedDates.has(r.date)),
  );
  // Only events tied to this group's pages by cta_id count here, so the
  // funnel equals the sum of its page cards.
  const down = downstreamTotals(
    periodDown.filter((r) => r.pageId !== null && ids.has(r.pageId)),
  );
  const other = downstreamTotals(
    periodDown.filter((r) => r.pageId !== null && otherIds.has(r.pageId)),
  );
  const unmatched = downstreamTotals(
    periodDown.filter((r) => r.pageId === null),
  );
  const toggle = () => {
    const next = !hidden;
    setHidden(next);
    saveHidden(FUNNEL_KEY, next);
  };
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-x-10 gap-y-3">
          <Stat
            label={`All ${label.toLowerCase()}: visitors`}
            value={fmtInt(t.visitors)}
          />
          <Stat
            label="Intake handoffs"
            value={t.clickers === null ? "n/a" : fmtInt(t.clickers)}
          />
          <Stat label="Handoff rate" value={fmtPct(t.rate)} />
          <Stat
            label="Bask signups"
            value={fmtInt(down.signups)}
            sub="matched by cta_id"
          />
        </div>
        <button
          onClick={toggle}
          aria-expanded={!hidden}
          className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs font-medium hover:bg-raised"
        >
          {hidden ? (
            <ChevronDown className="size-3.5" />
          ) : (
            <ChevronUp className="size-3.5" />
          )}
          {hidden ? "Show total funnel" : "Hide total funnel"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-faint">
        Visitors are the sum of daily users across these pages.{" "}
        {t.clickers === null
          ? "No handoff tracking in this period."
          : t.untrackedDays > 0
            ? `Handoffs and rate use the ${t.trackedDays} tracked ${t.trackedDays === 1 ? "day" : "days"} only.`
            : ""}
      </p>
      {!hidden && t.visitors > 0 && (
        <div className="mt-4 border-t border-line pt-4">
          <TrackingWarning totals={t} since={state.analytics.trackingStart} />
          <FunnelGraphic
            totals={t}
            sources={bySource(inRange)}
            down={down}
            downNote={groupDownNote({
              label: label.toLowerCase(),
              otherLabel: GROUP_LABEL[otherGroup].toLowerCase(),
              other,
              unmatched,
            })}
          />
          <h3 className="mb-3 mt-6 text-sm font-semibold">
            Where visitors go after landing
          </h3>
          <PathsPanel
            paths={paths.filter(
              (r) => ids.has(r.pageId) && r.date >= from && r.date <= to,
            )}
          />
        </div>
      )}
    </Card>
  );
}

const GROUP_BLURB: Record<PageGroup, string> = {
  landing:
    "SEO and ads traffic to a landing page variant to a Bask intake handoff. One live variant per page. Comparisons are sequential, so treat lifts as observations, not proof.",
  product:
    "Visitors to the home page and product pages, who continues to Bask intake, and the Bask signups matched to each page by CTA id. These pages have no variants yet, so each number covers the whole page.",
};

export function Overview() {
  const { state, rows, period } = useLab();
  const [cardsHidden, setCardsHidden] = useState(() =>
    readHidden(CARD_FUNNEL_KEY),
  );
  const [group, setGroupState] = useState<PageGroup>(readGroup);
  if (!state) return null;
  const setGroup = (g: PageGroup) => {
    setGroupState(g);
    saveGroup(g);
  };
  const summaries = state.pages
    .filter((p) => p.group === group)
    .map((p) => summarize(state, rows, p, period));
  const markets = ["Houston", "Boston"] as const;
  const count = (g: PageGroup) =>
    state.pages.filter((p) => p.group === g).length;
  const cards = (list: PageSummary[]) => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {list.map((s, i) => (
        <PageCard key={s.page.id} s={s} i={i} showFunnel={!cardsHidden} />
      ))}
    </div>
  );
  return (
    <div className="mx-auto max-w-[1400px] space-y-8 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {GROUP_LABEL[group]}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-soft">
            {GROUP_BLURB[group]}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-faint">{periodLabel(period)}</span>
          <button
            onClick={() => {
              setCardsHidden(!cardsHidden);
              saveHidden(CARD_FUNNEL_KEY, !cardsHidden);
            }}
            aria-pressed={!cardsHidden}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs font-medium hover:bg-raised"
          >
            {cardsHidden ? "Show page funnels" : "Hide page funnels"}
          </button>
          <PeriodSelect />
        </div>
      </header>
      <div
        role="tablist"
        aria-label="Page group"
        className="inline-grid grid-cols-2 rounded-lg border border-line bg-bg p-0.5 text-sm font-semibold"
      >
        {(["landing", "product"] as const).map((g) => (
          <button
            key={g}
            role="tab"
            aria-selected={group === g}
            onClick={() => setGroup(g)}
            className={cx(
              "cursor-pointer rounded-md px-4 py-1.5 transition-colors",
              group === g ? "bg-raised text-ink" : "text-faint hover:text-soft",
            )}
          >
            {GROUP_LABEL[g]}
            <span className="num ml-1.5 text-xs font-normal text-faint">
              {count(g)}
            </span>
          </button>
        ))}
      </div>
      <Totals period={period} group={group} />
      {group === "landing" ? (
        markets.map((m) => (
          <section key={m} aria-labelledby={`h-${m}`}>
            <h2
              id={`h-${m}`}
              className="mb-3 text-xs font-semibold uppercase tracking-widest text-faint"
            >
              {m}
            </h2>
            {cards(summaries.filter((s) => s.page.market === m))}
          </section>
        ))
      ) : (
        <section aria-labelledby="h-product">
          <h2
            id="h-product"
            className="mb-3 text-xs font-semibold uppercase tracking-widest text-faint"
          >
            Home page and product pages
          </h2>
          {cards(summaries)}
        </section>
      )}
      <Card className="p-4 text-xs text-soft">
        <p>
          <b className="text-ink">Handoff rate</b> = unique intake handoff users
          / unique page users, over days with verified handoff tracking only.
          Days that predate tracking are never counted as zero.
          {group === "landing" &&
            " Transition days when a variant changed mid-day are excluded."}
        </p>
      </Card>
    </div>
  );
}
