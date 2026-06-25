import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import {
  fetchStaffDropoffAnalytics,
  fetchStaffFunnelAnalytics,
  fetchStaffLandingPagePerformance,
  fetchStaffPageViews,
  fetchStaffTrafficSources,
  type FunnelAnalyticsStep,
  type LandingPagePerformanceRow,
  type PageViewRow,
  type TrafficSourceRow,
} from "@/lib/api/client";
import { BarChart3, Link2, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/staff/analytics")({
  component: StaffAnalyticsPage,
});

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function StaffAnalyticsPage() {
  const [slug, setSlug] = useState<"qualify" | "intake">("qualify");
  const [funnel, setFunnel] = useState<FunnelAnalyticsStep[]>([]);
  const [dropoff, setDropoff] = useState<FunnelAnalyticsStep[]>([]);
  const [sources, setSources] = useState<TrafficSourceRow[]>([]);
  const [lpPerf, setLpPerf] = useState<LandingPagePerformanceRow[]>([]);
  const [pageViews, setPageViews] = useState<PageViewRow[]>([]);

  useEffect(() => {
    void Promise.all([
      fetchStaffFunnelAnalytics({ questionnaire_slug: slug }),
      fetchStaffDropoffAnalytics(slug),
    ]).then(([f, d]) => {
      setFunnel(f.steps);
      setDropoff(d.steps);
    });
  }, [slug]);

  useEffect(() => {
    void fetchStaffTrafficSources().then((r) => setSources(r.sources));
    void fetchStaffLandingPagePerformance().then((r) => setLpPerf(r.landing_pages));
    void fetchStaffPageViews().then((r) => setPageViews(r.page_views));
  }, []);

  // Aggregate page views by page name (sum across days)
  const pageViewTotals = pageViews.reduce<Record<string, number>>((acc, row) => {
    acc[row.page] = (acc[row.page] ?? 0) + row.count;
    return acc;
  }, {});
  const sortedPageViews = Object.entries(pageViewTotals).sort(([, a], [, b]) => b - a);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Traffic sources, page views, and funnel performance.
        </p>
      </div>

      {/* ── Page views ────────────────────────────────────────── */}
      <AccountSectionCard tone="contact" title="Page views (last 30 days)" icon={TrendingUp}>
        {sortedPageViews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No page view data yet.</p>
        ) : (
          <div className="space-y-2">
            {sortedPageViews.map(([page, count]) => {
              const max = sortedPageViews[0][1];
              return (
                <div key={page}>
                  <div className="flex justify-between text-sm">
                    <span className="font-mono font-medium">{page}</span>
                    <span className="text-muted-foreground">{count.toLocaleString()}</span>
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
      <AccountSectionCard tone="orders" title="Traffic sources (last 30 days)" icon={TrendingUp}>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">No traffic source data yet.</p>
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
                    <td className="py-2 pr-4 font-medium">{row.utm_source || "(direct)"}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{row.utm_medium || "—"}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{row.utm_campaign || "—"}</td>
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
        <AccountSectionCard tone="primary" title="Landing page performance" icon={Link2}>
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
                  <tr key={row.landing_page_slug} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono font-medium">{row.landing_page_slug}</td>
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

      {/* ── Funnel step analytics ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">Funnel drop-off</h2>
        <div className="flex gap-2">
          <Button
            variant={slug === "qualify" ? "default" : "outline"}
            size="sm"
            onClick={() => setSlug("qualify")}
          >
            Qualify
          </Button>
          <Button
            variant={slug === "intake" ? "default" : "outline"}
            size="sm"
            onClick={() => setSlug("intake")}
          >
            Intake
          </Button>
        </div>
      </div>

      <AccountSectionCard tone="orders" title="Step funnel" icon={BarChart3}>
        {funnel.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Step</th>
                  <th className="py-2 pr-4">Views</th>
                  <th className="py-2 pr-4">Completions</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((row) => (
                  <tr key={row.step_key} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-medium">{row.step_key}</td>
                    <td className="py-2 pr-4">{row.views}</td>
                    <td className="py-2 pr-4">{row.completions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AccountSectionCard>

      <AccountSectionCard tone="primary" title="Drop-off by step" icon={BarChart3}>
        {dropoff.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drop-off data yet.</p>
        ) : (
          <div className="space-y-3">
            {dropoff.map((row) => (
              <div key={row.step_key}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{row.step_key}</span>
                  <span className="text-muted-foreground">
                    {row.dropoff_percent ?? 0}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, row.dropoff_percent ?? 0)}%` }}
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
