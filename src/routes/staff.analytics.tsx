import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import {
  fetchStaffDropoffAnalytics,
  fetchStaffFunnelAnalytics,
  fetchStaffLandingPagePerformance,
  fetchStaffPageViews,
  fetchStaffTopOfFunnel,
  fetchStaffTrafficSources,
  fetchStaffVersionStats,
  type FunnelAnalyticsStep,
  type LandingPagePerformanceRow,
  type PageViewRow,
  type TopOfFunnelStats,
  type TrafficSourceRow,
  type VersionStatRow,
} from "@/lib/api/client";
import { BarChart3, Link2, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/staff/analytics")({
  component: StaffAnalyticsPage,
});

type DateRange = "30d" | "60d" | "90d" | "all";

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function dateRangeParams(range: DateRange): { start?: string; end?: string } {
  if (range === "all") return {};
  const days = range === "30d" ? 30 : range === "60d" ? 60 : 90;
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

function dateRangeLabel(range: DateRange) {
  if (range === "all") return "all time";
  return `last ${range === "30d" ? "30" : range === "60d" ? "60" : "90"} days`;
}

function StaffAnalyticsPage() {
  const [slug, setSlug] = useState<"qualify" | "intake">("qualify");
  const [range, setRange] = useState<DateRange>("30d");
  const [versionId, setVersionId] = useState<string | null>(null);

  const [funnel, setFunnel] = useState<FunnelAnalyticsStep[]>([]);
  const [dropoff, setDropoff] = useState<FunnelAnalyticsStep[]>([]);
  const [versions, setVersions] = useState<VersionStatRow[]>([]);
  const [sources, setSources] = useState<TrafficSourceRow[]>([]);
  const [lpPerf, setLpPerf] = useState<LandingPagePerformanceRow[]>([]);
  const [pageViews, setPageViews] = useState<PageViewRow[]>([]);
  const [topFunnel, setTopFunnel] = useState<TopOfFunnelStats | null>(null);

  const rangeParams = useMemo(() => dateRangeParams(range), [range]);

  // Re-fetch funnel, dropoff, and version stats when slug, range, or version filter changes
  useEffect(() => {
    const params = { questionnaire_slug: slug, ...rangeParams };
    void Promise.all([
      fetchStaffFunnelAnalytics({
        ...params,
        version_id: versionId ?? undefined,
      }),
      fetchStaffDropoffAnalytics({
        ...params,
        version_id: versionId ?? undefined,
      }),
      fetchStaffVersionStats(slug, rangeParams),
    ]).then(([f, d, v]) => {
      setFunnel(f.steps);
      setDropoff(d.steps);
      setVersions(v.versions);
    });
  }, [slug, range, versionId, rangeParams]);

  // Re-fetch global stats when date range changes
  useEffect(() => {
    void fetchStaffTopOfFunnel(rangeParams).then(setTopFunnel);
    void fetchStaffTrafficSources(rangeParams).then((r) =>
      setSources(r.sources),
    );
    void fetchStaffLandingPagePerformance(rangeParams).then((r) =>
      setLpPerf(r.landing_pages),
    );
    void fetchStaffPageViews(rangeParams).then((r) =>
      setPageViews(r.page_views),
    );
  }, [range, rangeParams]);

  // Aggregate page views by page name (sum across days)
  const pageViewTotals = pageViews.reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.page] = (acc[row.page] ?? 0) + row.count;
      return acc;
    },
    {},
  );
  const sortedPageViews = Object.entries(pageViewTotals).sort(
    ([, a], [, b]) => b - a,
  );

  const label = dateRangeLabel(range);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Traffic sources, page views, and funnel performance.
          </p>
        </div>
        {/* ── Date range picker ───────────────────────────────── */}
        <div className="flex gap-1.5">
          {(["30d", "60d", "90d", "all"] as DateRange[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setRange(r);
                setVersionId(null);
              }}
            >
              {r === "all" ? "All time" : r}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Top-of-funnel conversion ──────────────────────────── */}
      {topFunnel && (
        <AccountSectionCard
          tone="primary"
          title={`Top-of-funnel conversion (${label})`}
          icon={TrendingUp}
        >
          <p className="mb-4 text-xs text-muted-foreground">
            Home page sessions that created a funnel session. "Abandoned at
            home" = visited home but never started qualify, inactive &gt;2 h.
          </p>
          <div className="space-y-3">
            {[
              {
                label: "Home page sessions",
                value: topFunnel.home_sessions,
                p: 100,
              },
              {
                label: "Started qualify",
                value: topFunnel.started_qualify,
                p: topFunnel.home_to_qualify_rate,
              },
              {
                label: "Created account",
                value: topFunnel.accounts_created,
                p: topFunnel.home_to_account_rate,
              },
            ].map(({ label: lbl, value, p }) => (
              <div key={lbl}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{lbl}</span>
                  <span className="text-muted-foreground">
                    {value.toLocaleString()}
                    {p < 100 ? ` (${p}%)` : ""}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, p)}%` }}
                  />
                </div>
              </div>
            ))}
            {topFunnel.abandoned_at_home > 0 && (
              <p className="pt-1 text-xs text-destructive/70">
                {topFunnel.abandoned_at_home} session
                {topFunnel.abandoned_at_home !== 1 ? "s" : ""} abandoned at the
                home page without starting the funnel.
              </p>
            )}
          </div>
        </AccountSectionCard>
      )}

      {/* ── Page views ────────────────────────────────────────── */}
      <AccountSectionCard
        tone="contact"
        title={`Page views (${label})`}
        icon={TrendingUp}
      >
        {sortedPageViews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No page view data yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedPageViews.map(([page, count]) => {
              const max = sortedPageViews[0][1];
              return (
                <div key={page}>
                  <div className="flex justify-between text-sm">
                    <span className="font-mono font-medium">{page}</span>
                    <span className="text-muted-foreground">
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${Math.round((count / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AccountSectionCard>

      {/* ── Traffic sources ───────────────────────────────────── */}
      <AccountSectionCard
        tone="orders"
        title={`Traffic sources (${label})`}
        icon={TrendingUp}
      >
        <p className="mb-3 text-xs text-muted-foreground">
          "(direct)" = no UTM parameters — typed URL, bookmarks, or non-tagged
          links.
        </p>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No traffic source data yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Source</th>
                  <th className="py-2 pr-4">Medium</th>
                  <th className="py-2 pr-4">Campaign</th>
                  <th className="py-2 pr-4">Sessions</th>
                  <th className="py-2 pr-4">Accounts</th>
                  <th className="py-2">Conv %</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((row, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium">{row.utm_source}</td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {row.utm_medium || "—"}
                    </td>
                    <td className="py-2 pr-4 text-muted-foreground">
                      {row.utm_campaign || "—"}
                    </td>
                    <td className="py-2 pr-4">{row.sessions}</td>
                    <td className="py-2 pr-4">{row.accounts_created}</td>
                    <td className="py-2">{pct(row.conversion_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AccountSectionCard>

      {/* ── Landing page performance ──────────────────────────── */}
      {lpPerf.length > 0 && (
        <AccountSectionCard
          tone="primary"
          title="Landing page performance"
          icon={Link2}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Landing page</th>
                  <th className="py-2 pr-4">Sessions</th>
                  <th className="py-2 pr-4">Accounts</th>
                  <th className="py-2">Conv %</th>
                </tr>
              </thead>
              <tbody>
                {lpPerf.map((row) => (
                  <tr
                    key={row.landing_page_slug}
                    className="border-b border-border/60"
                  >
                    <td className="py-2 pr-4 font-mono font-medium">
                      {row.landing_page_slug}
                    </td>
                    <td className="py-2 pr-4">{row.sessions}</td>
                    <td className="py-2 pr-4">{row.accounts_created}</td>
                    <td className="py-2">{pct(row.conversion_rate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AccountSectionCard>
      )}

      {/* ── Funnel section header + controls ─────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">
          Funnel drop-off
        </h2>
        <div className="flex gap-2">
          {(["qualify", "intake"] as const).map((s) => (
            <Button
              key={s}
              variant={slug === s ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setSlug(s);
                setVersionId(null);
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* ── Version breakdown ─────────────────────────────────── */}
      {versions.length > 0 && (
        <AccountSectionCard
          tone="contact"
          title={`${slug.charAt(0).toUpperCase() + slug.slice(1)} versions in use (${label})`}
          icon={BarChart3}
        >
          <p className="mb-3 text-xs text-muted-foreground">
            Click a version to filter the funnel below. Active filter is
            highlighted. Click again to clear.
          </p>
          <div className="flex flex-wrap gap-2">
            {versions.map((v) => {
              const active = versionId === v.version_id;
              return (
                <button
                  key={v.version_id}
                  onClick={() => setVersionId(active ? null : v.version_id)}
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground",
                  ].join(" ")}
                >
                  {v.version_label}
                  <span className="ml-1.5 opacity-70">
                    {v.sessions} session{v.sessions !== 1 ? "s" : ""}
                  </span>
                  {v.status !== "published" && (
                    <span className="ml-1 opacity-50">({v.status})</span>
                  )}
                </button>
              );
            })}
          </div>
          {versionId && (
            <button
              className="mt-3 text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => setVersionId(null)}
            >
              Clear version filter
            </button>
          )}
        </AccountSectionCard>
      )}

      {/* ── Step funnel table ─────────────────────────────────── */}
      <AccountSectionCard
        tone="orders"
        title={`Step funnel — unique sessions (${label}${versionId ? ", filtered" : ""})`}
        icon={BarChart3}
      >
        <p className="mb-3 text-xs text-muted-foreground">
          Each row counts distinct funnel sessions or users — not raw event
          counts. Going back and forward does not inflate numbers.
        </p>
        {funnel.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No events recorded yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Step</th>
                  <th className="py-2 pr-4">Reached</th>
                  <th className="py-2 pr-4">Completed</th>
                  <th className="py-2">Dropped off</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((row) => {
                  const droppedOff = (row.views ?? 0) - (row.completions ?? 0);
                  return (
                    <tr
                      key={row.step_key}
                      className="border-b border-border/60"
                    >
                      <td className="py-2 pr-4 font-medium">{row.step_key}</td>
                      <td className="py-2 pr-4">{row.views}</td>
                      <td className="py-2 pr-4">{row.completions}</td>
                      <td className="py-2 text-destructive/80">
                        {droppedOff > 0 ? droppedOff : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AccountSectionCard>

      {/* ── Drop-off by step ──────────────────────────────────── */}
      <AccountSectionCard
        tone="primary"
        title={`Drop-off by step (${label}${versionId ? ", filtered" : ""})`}
        icon={BarChart3}
      >
        <p className="mb-3 text-xs text-muted-foreground">
          Drop-off % = sessions that reached a step but never completed it.
          "Stopped here" = sessions whose last recorded activity was at that
          step (inactive &gt;2 h).
        </p>
        {dropoff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drop-off data yet.</p>
        ) : (
          <div className="space-y-3">
            {dropoff.map((row) => (
              <div key={row.step_key}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{row.step_key}</span>
                  <div className="flex gap-3 text-muted-foreground">
                    {(row.stopped_sessions ?? 0) > 0 && (
                      <span className="text-destructive/70">
                        {row.stopped_sessions} stopped
                      </span>
                    )}
                    <span>{row.dropoff_percent ?? 0}% drop-off</span>
                  </div>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(100, row.dropoff_percent ?? 0)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </AccountSectionCard>
    </div>
  );
}
