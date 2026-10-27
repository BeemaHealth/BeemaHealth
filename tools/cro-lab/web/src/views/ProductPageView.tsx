import { ArrowLeft, ExternalLink, FlaskConical } from "lucide-react";
import { fmtInt, fmtPct } from "@shared/format.ts";
import { CANONICAL_ORIGIN } from "@shared/pages.ts";
import {
  bySource,
  downstreamRates,
  pageDownstream,
  sumRows,
} from "@shared/metrics.ts";
import { go, useLab } from "../lab.tsx";
import { PeriodSelect } from "../components/Period.tsx";
import {
  FunnelGraphic,
  PathsPanel,
  TrackingWarning,
} from "../components/Funnel.tsx";
import {
  metricsUnavailable,
  pageDownNote,
  periodLabel,
  rangeFor,
  saveGroup,
} from "../lib.ts";
import { Card, DemoChip, Empty } from "../ui.tsx";

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

/** A tracked page with no variants (home, product pages): one funnel for the whole page. */
export function ProductPageView({ pageId }: { pageId: string }) {
  const { state, rows, paths, downstream, period, mode } = useLab();
  const page = state!.pages.find((p) => p.id === pageId);
  if (!page)
    return (
      <div className="p-6">
        <Empty icon={<FlaskConical />} title="Page not found">
          That page is not tracked.
        </Empty>
      </div>
    );
  const noData = metricsUnavailable(state!, rows);
  const { from, to } = rangeFor(period);
  const inRange = rows.filter(
    (r) => r.pageId === pageId && r.date >= from && r.date <= to,
  );
  const t = sumRows(inRange);
  const down =
    t.clickers === null
      ? undefined
      : pageDownstream(downstream, pageId, inRange);
  const rates = down ? downstreamRates(t, down) : null;
  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <button
        onClick={() => {
          saveGroup("product");
          go();
        }}
        className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-faint hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        All product pages
      </button>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{page.title}</h1>
            {mode === "demo" && <DemoChip />}
          </div>
          <a
            href={CANONICAL_ORIGIN + page.path}
            target="_blank"
            rel="noreferrer"
            className="num mt-1 inline-flex items-center gap-1 text-xs text-faint hover:text-teal"
          >
            {CANONICAL_ORIGIN}
            {page.path}
            <ExternalLink className="size-3" />
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-faint">{periodLabel(period)}</span>
          <PeriodSelect />
        </div>
      </header>
      {noData ? (
        <Card className="p-5 text-sm text-soft">
          No GA4 metrics to show. {state!.analytics.message}
        </Card>
      ) : (
        <Card className="p-5">
          <div className="flex flex-wrap gap-x-10 gap-y-3">
            <Stat label="Visitors" value={fmtInt(t.visitors)} />
            <Stat
              label="Intake handoffs"
              value={t.clickers === null ? "n/a" : fmtInt(t.clickers)}
            />
            <Stat label="Handoff rate" value={fmtPct(t.rate)} />
            <Stat
              label="Bask signups"
              value={down ? fmtInt(down.signups) : "n/a"}
            />
            <Stat
              label="Bask purchases"
              value={down ? fmtInt(down.purchases) : "n/a"}
            />
            <Stat
              label="Signup rate"
              value={rates ? fmtPct(rates.signupOfHandoff) : "n/a"}
              sub={
                rates
                  ? `of handoffs · ${fmtPct(rates.signupOfVisitors)} of visitors`
                  : undefined
              }
            />
            <Stat
              label="Purchase rate"
              value={rates ? fmtPct(rates.purchaseOfSignup) : "n/a"}
              sub={
                rates
                  ? `of signups · ${fmtPct(rates.purchaseOfVisitors)} of visitors`
                  : undefined
              }
            />
          </div>
          {t.visitors > 0 ? (
            <div className="mt-4 border-t border-line pt-4">
              <TrackingWarning
                totals={t}
                since={state!.analytics.trackingStart}
              />
              <FunnelGraphic
                totals={t}
                sources={bySource(inRange)}
                down={down}
                downNote={pageDownNote(pageId)}
              />
              <h3 className="mb-3 mt-6 text-sm font-semibold">
                Where visitors go after landing
              </h3>
              <PathsPanel
                paths={paths.filter(
                  (r) => r.pageId === pageId && r.date >= from && r.date <= to,
                )}
              />
            </div>
          ) : (
            <p className="mt-4 text-sm text-soft">
              No visitors recorded for this page in the selected period.
            </p>
          )}
        </Card>
      )}
      <p className="max-w-3xl text-xs text-faint">
        This page has no variants yet, so the numbers cover everything shown on
        it. Handoffs are intake clicks fired from this page; signups and
        purchases are matched to it by the CTA id on the Bask URL.
      </p>
    </div>
  );
}
