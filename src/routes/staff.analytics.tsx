import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AccountSectionCard } from "@/components/portal/AccountSectionCard";
import { Button } from "@/components/ui/button";
import {
  fetchStaffCtaPerformance,
  fetchStaffLandingPagePerformance,
  fetchStaffPageViews,
  fetchStaffStepAnalytics,
  fetchStaffTopOfFunnel,
  fetchStaffTrafficSources,
  fetchStaffVersionsList,
  type CtaPerformanceRow,
  type LandingPagePerformanceRow,
  type LandingPageViewRow,
  type PageViewRow,
  type TopOfFunnelStats,
  type TrafficSourceRow,
  type VersionListRow,
  type VersionStepAnalytics,
} from "@/lib/api/client";
import {
  BarChart3,
  ChevronDown,
  Link2,
  Loader2,
  MousePointerClick,
  Search,
  TrendingUp,
  X,
} from "lucide-react";

export const Route = createFileRoute("/staff/analytics")({
  component: StaffAnalyticsPage,
});

type DateRange = "30d" | "60d" | "90d" | "all";
type QType = "qualify" | "intake";

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

function dateRangeParams(range: DateRange): { start?: string; end?: string } {
  if (range === "all") return {};
  const days = range === "30d" ? 30 : range === "60d" ? 60 : 90;
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function dateRangeLabel(range: DateRange) {
  if (range === "all") return "all time";
  const n = range === "30d" ? "30" : range === "60d" ? "60" : "90";
  return `last ${n} days`;
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function intakeSlugFromVersion(v: VersionListRow): string {
  const rules = v.intake_routing_rules ?? [];
  const slugs = [
    ...new Set(rules.map((r) => r.intake_questionnaire_slug).filter(Boolean)),
  ];
  if (slugs.length === 0) return "—";
  if (slugs.length === 1) return slugs[0];
  const defaultRule = rules.find(
    (r) => !r.when_field || r.when_field === "__default__",
  );
  return defaultRule?.intake_questionnaire_slug
    ? `${defaultRule.intake_questionnaire_slug} +${slugs.length - 1}`
    : `${slugs.length} routes`;
}

function StatusBadge({ status }: { status: VersionListRow["status"] }) {
  const cfg = {
    published: { dot: "bg-green-500", text: "Published" },
    draft: { dot: "bg-yellow-400", text: "Draft" },
    archived: { dot: "bg-muted-foreground/40", text: "Archived" },
  }[status] ?? { dot: "bg-muted-foreground/40", text: status };
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={`size-1.5 rounded-full ${cfg.dot}`} />
      <span className="text-muted-foreground">{cfg.text}</span>
    </span>
  );
}

function VersionTable({
  versions,
  qType,
  selectedId,
  onSelect,
}: {
  versions: VersionListRow[];
  qType: QType;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return versions;
    const q = query.toLowerCase();
    return versions.filter(
      (v) =>
        v.version_label.toLowerCase().includes(q) ||
        v.questionnaire_title.toLowerCase().includes(q) ||
        v.questionnaire_slug.toLowerCase().includes(q) ||
        v.cta_ids.some((c) => c.toLowerCase().includes(q)),
    );
  }, [versions, query]);

  return (
    <div>
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Search versions, questionnaires, CTAs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="py-2 pl-3 pr-4 font-medium">Version</th>
              <th className="py-2 pr-4 font-medium">Questionnaire</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              {qType === "qualify" && (
                <>
                  <th className="py-2 pr-4 font-medium">CTAs</th>
                  <th className="py-2 pr-4 font-medium">→ Intake</th>
                </>
              )}
              <th className="py-2 pr-4 font-medium">Sessions</th>
              <th className="py-2 pr-4 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={qType === "qualify" ? 7 : 5}
                  className="py-6 text-center text-muted-foreground"
                >
                  {query
                    ? "No versions match your search."
                    : "No versions yet."}
                </td>
              </tr>
            )}
            {filtered.map((v) => {
              const selected = selectedId === v.version_id;
              return (
                <tr
                  key={v.version_id}
                  onClick={() => onSelect(selected ? null : v.version_id)}
                  className={[
                    "cursor-pointer border-b border-border/60 transition-colors last:border-0",
                    selected
                      ? "bg-primary/8 ring-1 ring-inset ring-primary/30"
                      : "hover:bg-muted/30",
                  ].join(" ")}
                >
                  <td className="py-2.5 pl-3 pr-4">
                    <div className="flex items-center gap-2">
                      {selected ? (
                        <ChevronDown className="size-3.5 shrink-0 text-primary" />
                      ) : (
                        <span className="size-3.5 shrink-0" />
                      )}
                      <span className="font-medium">{v.version_label}</span>
                      {v.is_default_entry && (
                        <span className="rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary">
                          default
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <div className="font-medium">{v.questionnaire_title}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.questionnaire_slug}
                    </div>
                  </td>
                  <td className="py-2.5 pr-4">
                    <StatusBadge status={v.status} />
                  </td>
                  {qType === "qualify" && (
                    <>
                      <td className="py-2.5 pr-4">
                        {v.cta_ids.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {v.cta_ids.map((c) => (
                              <span
                                key={c}
                                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                              >
                                {c}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        {intakeSlugFromVersion(v)}
                      </td>
                    </>
                  )}
                  <td className="py-2.5 pr-4 tabular-nums">
                    {v.sessions > 0 ? (
                      v.sessions.toLocaleString()
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-xs text-muted-foreground">
                    {fmtDate(v.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StepAnalyticsDetail({ data }: { data: VersionStepAnalytics }) {
  return (
    <div className="space-y-5">
      {/* Summary row */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-muted/30 px-4 py-2.5 text-sm">
        <div>
          <span className="text-muted-foreground">Total respondents</span>
          <span className="ml-2 font-semibold tabular-nums">
            {data.total_respondents.toLocaleString()}
          </span>
        </div>
        {data.questionnaire_type === "qualify" && (
          <div>
            <span className="text-muted-foreground">Entry routing</span>
            {data.is_default_entry ? (
              <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                Default — handles all unrouted CTAs
              </span>
            ) : (
              <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                Not default — reached via specific CTA only
              </span>
            )}
          </div>
        )}
        {data.cta_ids.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-muted-foreground">CTAs</span>
            {data.cta_ids.map((c) => (
              <span
                key={c}
                className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {data.steps.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No step data yet for this version.
        </p>
      )}

      {data.steps.map((step) => (
        <div
          key={step.step_key}
          className="overflow-hidden rounded-lg border border-border"
        >
          {/* Step header */}
          <div className="flex flex-wrap items-center gap-3 border-b border-border bg-muted/30 px-4 py-2.5">
            <span className="font-semibold">{step.title || step.step_key}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {step.step_key}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {step.views.toLocaleString()}
                </span>{" "}
                reached
              </span>
              <span className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {step.completions.toLocaleString()}
                </span>{" "}
                completed
              </span>
              {step.dropoff_percent > 0 && (
                <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive/80">
                  {step.dropoff_percent.toFixed(1)}% dropped off
                </span>
              )}
              {step.stopped_sessions > 0 && (
                <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-orange-600 dark:text-orange-400">
                  {step.stopped_sessions} stopped here
                </span>
              )}
            </div>
          </div>

          {/* Drop-off progress bar */}
          {step.dropoff_percent > 0 && (
            <div className="h-1 overflow-hidden bg-muted">
              <div
                className="h-full bg-destructive/50"
                style={{ width: `${Math.min(100, step.dropoff_percent)}%` }}
              />
            </div>
          )}

          {/* Fields */}
          {step.fields.length > 0 ? (
            <div className="divide-y divide-border/60 px-4 py-1">
              {step.fields.map((field) => (
                <div key={field.field_key} className="py-3">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="text-sm font-medium">
                      {field.label || field.field_key}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {field.total_answers > 0
                        ? `${field.total_answers.toLocaleString()} responses`
                        : "No responses yet"}
                    </span>
                  </div>
                  {field.answer_distribution.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">
                      Free-text field — no responses recorded yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {field.answer_distribution.map((ans) => (
                        <div key={ans.value}>
                          <div className="mb-0.5 flex justify-between text-xs">
                            <span className="mr-2 truncate text-foreground/80">
                              {ans.label || ans.value}
                            </span>
                            <span className="shrink-0 tabular-nums text-muted-foreground">
                              {ans.count.toLocaleString()}{" "}
                              {field.total_answers > 0 &&
                                `(${ans.pct.toFixed(1)}%)`}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                            {ans.count > 0 && (
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${Math.min(100, ans.pct)}%` }}
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-2.5 text-xs text-muted-foreground">
              No question fields on this step.
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StaffAnalyticsPage() {
  const [range, setRange] = useState<DateRange>("30d");
  const [qType, setQType] = useState<QType>("qualify");
  const [versionId, setVersionId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<VersionListRow | null>(
    null,
  );
  const [stepAnalytics, setStepAnalytics] =
    useState<VersionStepAnalytics | null>(null);
  const [stepLoading, setStepLoading] = useState(false);

  const detailRef = useRef<HTMLDivElement>(null);

  const [versionsList, setVersionsList] = useState<VersionListRow[]>([]);
  const [sources, setSources] = useState<TrafficSourceRow[]>([]);
  const [ctas, setCtas] = useState<CtaPerformanceRow[]>([]);
  const [lpPerf, setLpPerf] = useState<LandingPagePerformanceRow[]>([]);
  const [pageViews, setPageViews] = useState<PageViewRow[]>([]);
  const [landingPageViews, setLandingPageViews] = useState<
    LandingPageViewRow[]
  >([]);
  const [topFunnel, setTopFunnel] = useState<TopOfFunnelStats | null>(null);

  const rangeParams = useMemo(() => dateRangeParams(range), [range]);

  function handleTypeChange(t: QType) {
    setQType(t);
    setVersionId(null);
    setSelectedVersion(null);
    setStepAnalytics(null);
  }

  function handleRangeChange(r: DateRange) {
    setRange(r);
    setVersionId(null);
    setSelectedVersion(null);
    setStepAnalytics(null);
  }

  function handleVersionSelect(id: string | null) {
    setVersionId(id);
    setSelectedVersion(
      id ? (versionsList.find((v) => v.version_id === id) ?? null) : null,
    );
    if (!id) {
      setStepAnalytics(null);
    } else {
      // Scroll to detail panel after React has rendered it
      requestAnimationFrame(() => {
        detailRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    }
  }

  // Versions list
  useEffect(() => {
    void fetchStaffVersionsList(qType, rangeParams).then((r) =>
      setVersionsList(r.versions),
    );
  }, [qType, range, rangeParams]);

  // Step analytics — load when a version is selected
  useEffect(() => {
    if (!versionId) return;
    setStepLoading(true);
    setStepAnalytics(null);
    void fetchStaffStepAnalytics(versionId, rangeParams)
      .then(setStepAnalytics)
      .catch(() => setStepAnalytics(null))
      .finally(() => setStepLoading(false));
  }, [versionId, range, rangeParams]);

  // Global stats
  useEffect(() => {
    void fetchStaffTopOfFunnel(rangeParams).then(setTopFunnel);
    void fetchStaffTrafficSources(rangeParams).then((r) =>
      setSources(r.sources),
    );
    void fetchStaffCtaPerformance(rangeParams).then((r) => setCtas(r.ctas));
    void fetchStaffLandingPagePerformance(rangeParams).then((r) =>
      setLpPerf(r.landing_pages),
    );
    void fetchStaffPageViews(rangeParams).then((r) => {
      setPageViews(r.page_views);
      setLandingPageViews(r.landing_page_views);
    });
  }, [range, rangeParams]);

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

  const landingPageViewTotals = landingPageViews.reduce<
    Record<string, { name: string; count: number }>
  >((acc, row) => {
    const existing = acc[row.slug];
    if (existing) {
      existing.count += row.count;
    } else {
      acc[row.slug] = { name: row.name, count: row.count };
    }
    return acc;
  }, {});
  const sortedLandingPageViews = Object.entries(landingPageViewTotals).sort(
    ([, a], [, b]) => b.count - a.count,
  );

  const label = dateRangeLabel(range);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header + date range */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Traffic, page views, CTA performance, and funnel drop-off.
          </p>
        </div>
        <div className="flex gap-1.5">
          {(["30d", "60d", "90d", "all"] as DateRange[]).map((r) => (
            <Button
              key={r}
              variant={range === r ? "default" : "outline"}
              size="sm"
              onClick={() => handleRangeChange(r)}
            >
              {r === "all" ? "All time" : r}
            </Button>
          ))}
        </div>
      </div>

      {/* Top-of-funnel */}
      {topFunnel && (
        <AccountSectionCard
          tone="primary"
          title={`Top-of-funnel conversion (${label})`}
          icon={TrendingUp}
        >
          <p className="mb-4 text-xs text-muted-foreground">
            Home page sessions → qualify → account. "Abandoned at home" =
            visited home, never started qualify, inactive &gt;2 h.
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

      {/* CTA performance */}
      {ctas.length > 0 && (
        <AccountSectionCard
          tone="contact"
          title={`CTA entry performance (${label})`}
          icon={MousePointerClick}
        >
          <p className="mb-3 text-xs text-muted-foreground">
            Which call-to-action buttons drove funnel sessions and account
            creations. Each qualify version claims specific CTA ids — sessions
            started via that CTA load its questionnaire version.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">CTA</th>
                  <th className="py-2 pr-4">Sessions</th>
                  <th className="py-2 pr-4">Accounts</th>
                  <th className="py-2">Conv %</th>
                </tr>
              </thead>
              <tbody>
                {ctas.map((row) => (
                  <tr key={row.cta_id} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono font-medium">
                      {row.cta_id}
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

      {/* Page views */}
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
                      style={{
                        width: `${Math.round((count / max) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AccountSectionCard>

      {/* Landing page views */}
      <AccountSectionCard
        tone="shipping"
        title={`Landing page views (${label})`}
        icon={Link2}
      >
        {sortedLandingPageViews.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No landing page view data yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sortedLandingPageViews.map(([slug, { name, count }]) => {
              const max = sortedLandingPageViews[0][1].count;
              return (
                <div key={slug}>
                  <div className="flex justify-between text-sm">
                    <div>
                      <span className="font-medium">{name}</span>
                      <span className="ml-2 font-mono text-xs text-muted-foreground">
                        {slug}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {count.toLocaleString()}
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary"
                      style={{
                        width: `${Math.round((count / max) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </AccountSectionCard>

      {/* Traffic sources */}
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

      {/* Landing page performance */}
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

      {/* Funnel drop-off — version picker */}
      <AccountSectionCard
        tone="orders"
        title="Funnel drop-off"
        icon={BarChart3}
      >
        {/* Qualify / Intake tab strip */}
        <div className="mb-4 flex items-center gap-1 border-b border-border pb-3">
          {(["qualify", "intake"] as QType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              className={[
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                qType === t
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              ].join(" ")}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">
            {versionsList.length} version
            {versionsList.length !== 1 ? "s" : ""} · {label}
          </span>
        </div>

        <VersionTable
          versions={versionsList}
          qType={qType}
          selectedId={versionId}
          onSelect={handleVersionSelect}
        />

        <p className="mt-2 text-xs text-muted-foreground">
          Click a row to view per-step analytics — questions answered, answer
          distributions, and drop-off.
        </p>
      </AccountSectionCard>

      {/* Step analytics detail — shown when version is selected */}
      {selectedVersion && (
        <div ref={detailRef}>
          {/* Selection banner */}
          <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold">
                {selectedVersion.version_label}
              </span>
              <span className="text-muted-foreground">
                {selectedVersion.questionnaire_title}
              </span>
              <StatusBadge status={selectedVersion.status} />
              {qType === "qualify" &&
                (selectedVersion.is_default_entry ? (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                    Default entry — handles unrouted CTAs
                  </span>
                ) : (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    Not default — CTA-routed only
                  </span>
                ))}
            </div>
            <button
              onClick={() => handleVersionSelect(null)}
              className="rounded p-1 hover:bg-primary/10"
            >
              <X className="size-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Step analytics content */}
          <AccountSectionCard
            tone="primary"
            title={`Step analytics — ${selectedVersion.version_label} (${label})`}
            icon={BarChart3}
          >
            {stepLoading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading step analytics…
              </div>
            ) : stepAnalytics ? (
              <StepAnalyticsDetail data={stepAnalytics} />
            ) : (
              <p className="py-4 text-sm text-muted-foreground">
                No data found for this version.
              </p>
            )}
          </AccountSectionCard>
        </div>
      )}
    </div>
  );
}
