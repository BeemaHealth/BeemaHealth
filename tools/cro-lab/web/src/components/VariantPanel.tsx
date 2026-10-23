import {
  AlertTriangle,
  ArrowLeft,
  ExternalLink,
  FileCode2,
  Pencil,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
} from "recharts";
import { fmtInt, fmtLift, fmtPct } from "@shared/format.ts";
import {
  bySource,
  byDay,
  compareToBaseline,
  observedLift,
  pageDownstream,
  sumRows,
  variantReport,
} from "@shared/metrics.ts";
import { fmtDateKey, fmtDateTime } from "@shared/time.ts";
import { api, ApiError } from "../api.ts";
import { useLab } from "../lab.tsx";
import { StagingDeploy } from "./StagingDeploy.tsx";
import {
  claudeInstruction,
  defaultBaseline,
  metricsUnavailable,
  pageDownNote,
  displayStatus,
  previewUrl,
  stagingPreviewUrl,
  rangeFor,
  today,
} from "../lib.ts";
import {
  Button,
  CopyButton,
  DemoChip,
  Field,
  inputCls,
  EvidenceBadge,
  StatusBadge,
  cx,
} from "../ui.tsx";
import { variantPaths, variantStatus } from "@shared/metrics.ts";
import type { Variant } from "@shared/types.ts";
import {
  Funnel,
  FunnelGraphic,
  PathsPanel,
  TrackingWarning,
} from "./Funnel.tsx";

const Section = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-3 border-t border-line pt-5">
    <h3 className="text-xs font-semibold uppercase tracking-widest text-faint">
      {title}
    </h3>
    {children}
  </section>
);
const Row = ({ k, v }: { k: string; v: string }) => (
  <div>
    <dt className="text-[11px] text-faint">{k}</dt>
    <dd className="text-sm text-soft">
      {v || <span className="text-faint">Not recorded</span>}
    </dd>
  </div>
);

type Draft = {
  name: string;
  hypothesis: string;
  element: string;
  whyTested: string;
  expected: string;
  notes: string;
  parentId: string;
};

function EditDetails({
  pageId,
  variant,
  onDone,
}: {
  pageId: string;
  variant: Variant;
  onDone: () => void;
}) {
  const { state, mode, setState } = useLab();
  const [d, setD] = useState<Draft>({
    name: variant.name,
    hypothesis: variant.hypothesis,
    element: variant.element,
    whyTested: variant.whyTested,
    expected: variant.expected,
    notes: variant.notes,
    parentId: variant.parentId ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const others = state!.data.variants.filter(
    (x) => x.pageId === pageId && x.id !== variant.id,
  );
  const set = (k: keyof Draft) => (e: { target: { value: string } }) =>
    setD((p) => ({ ...p, [k]: e.target.value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!d.name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setState(
        await api.patchVariant(mode, pageId, variant.id, {
          ...d,
          name: d.name.trim(),
          parentId: d.parentId || null,
        }),
      );
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  const area = (k: keyof Draft, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <textarea
        rows={2}
        maxLength={2000}
        value={d[k]}
        onChange={set(k)}
        className={inputCls}
      />
    </Field>
  );

  return (
    <form onSubmit={save} className="space-y-3">
      <Field
        label="Name"
        hint="Display name only. The id and file stay the same."
      >
        <input
          required
          maxLength={2000}
          value={d.name}
          onChange={set("name")}
          className={inputCls}
        />
      </Field>
      {area("hypothesis", "Hypothesis")}
      {area("element", "What changed", "For example: Hero headline")}
      {area("whyTested", "Why it was tested")}
      {area("expected", "Expected outcome")}
      {area("notes", "Notes")}
      <Field label="Baseline / parent">
        <select
          value={d.parentId}
          onChange={set("parentId")}
          className={inputCls}
        >
          <option value="">None (baseline)</option>
          {others.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </Field>
      {error && (
        <p role="alert" className="text-sm text-rose">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={busy}>
          Save details
        </Button>
      </div>
    </form>
  );
}

export function VariantPanel({
  pageId,
  variantId,
  baselineId,
  onClose,
}: {
  pageId: string;
  variantId: string;
  baselineId: string | null;
  onClose: () => void;
}) {
  const { state, rows, paths, downstream, period, mode } = useLab();
  const [windowSel, setWindowSel] = useState<string>("all");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [byCampaign, setByCampaign] = useState(false);
  const [editing, setEditing] = useState(false);
  const pageTitle =
    state!.pages.find((p) => p.id === pageId)?.title ?? "landing page";
  const v = state!.data.variants.find(
    (x) => x.pageId === pageId && x.id === variantId,
  );
  const deps = state!.data.deployments.filter((d) => d.pageId === pageId);
  const windows = deps
    .filter((d) => d.variantId === variantId)
    .sort((a, b) => a.startUtc.localeCompare(b.startUtc));
  const noData = metricsUnavailable(state!, rows);
  const { from, to } = rangeFor("all");
  const wantedRange = rangeFor(period);

  const report = useMemo(
    () =>
      variantReport({
        rows,
        deployments: deps,
        pageId,
        variantId,
        from: period === "all" ? from : wantedRange.from,
        to,
        windowIds: windowSel === "all" ? undefined : [windowSel],
      }),
    [rows, deps, pageId, variantId, period, windowSel],
  );
  const variantPathRows = useMemo(
    () =>
      variantPaths({
        paths,
        deployments: deps,
        pageId,
        variantId,
        from: period === "all" ? from : wantedRange.from,
        to,
        windowIds: windowSel === "all" ? undefined : [windowSel],
      }),
    [paths, deps, pageId, variantId, period, windowSel],
  );
  const filtered = useMemo(
    () =>
      picked.size
        ? report.rows.filter((r) => picked.has(r.sourceMedium))
        : report.rows,
    [report, picked],
  );
  const totals = useMemo(() => sumRows(filtered), [filtered]);
  // Bask events have no source, so they only show when no source is picked.
  const down = useMemo(
    () =>
      picked.size || totals.clickers === null
        ? undefined
        : pageDownstream(downstream, pageId, report.rows),
    [picked, totals.clickers, downstream, pageId, report],
  );
  const sources = useMemo(() => bySource(report.rows), [report]);
  const campaigns = useMemo(() => bySource(filtered, true), [filtered]);
  const daily = useMemo(
    () =>
      byDay(filtered).map((d) => ({
        date: d.date,
        visitors: d.totals.visitors,
        rate: d.totals.rate === null ? null : +(d.totals.rate * 100).toFixed(2),
      })),
    [filtered],
  );

  const baseId = baselineId ?? defaultBaseline(state!, pageId);
  const baseTotals = useMemo(
    () =>
      baseId && baseId !== variantId
        ? variantReport({
            rows,
            deployments: deps,
            pageId,
            variantId: baseId,
            from,
            to,
          }).totals
        : null,
    [rows, deps, pageId, baseId, variantId],
  );
  const evidence = compareToBaseline(totals, baseTotals);
  const lift = observedLift(totals, baseTotals);
  const baseName = state!.data.variants.find(
    (x) => x.pageId === pageId && x.id === baseId,
  )?.name;
  const parent = state!.data.variants.find(
    (x) => x.pageId === pageId && x.id === v?.parentId,
  );

  const notices: string[] = [];
  if (noData)
    notices.push(`No GA4 metrics to show. ${state!.analytics.message}`);
  if (!noData && totals.untrackedDays > 0)
    notices.push(
      totals.trackedDays === 0
        ? "Intake handoff tracking did not exist for any of these days. Rate is unavailable."
        : `${totals.untrackedDays} of ${totals.days} days predate handoff tracking. The rate uses tracked days only.`,
    );
  if (report.ambiguousDays.length && windows.length)
    notices.push(
      `${report.ambiguousDays.length} transition day(s) on this page were excluded because a variant changed mid-day.`,
    );
  if (windows.some((w) => w.endUtc === null) && !noData)
    notices.push(`Today (${today()}) is preliminary and may still change.`);
  if (windows.length > 1 && windowSel === "all")
    notices.push(
      "Multiple windows: users are summed per window and are not globally de-duplicated across windows.",
    );

  return (
    <div className="mx-auto max-w-[1100px] p-6">
      <button
        onClick={onClose}
        className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-sm text-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" />
        Back to {pageTitle}
      </button>
      {!v ? (
        <>
          <h1 className="font-bold">Variant not found</h1>
          <button
            onClick={onClose}
            className="mt-3 cursor-pointer text-sm text-teal"
          >
            Back
          </button>
        </>
      ) : (
        <div className="space-y-5">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{v.name}</h1>
                <StatusBadge
                  status={displayStatus(
                    state!,
                    v.pageId,
                    v.id,
                    variantStatus(state!.data, v),
                  )}
                />
                {mode === "demo" && <DemoChip />}
              </div>
              <p className="num mt-1 text-xs text-faint">{v.id}</p>
            </div>
            <StagingDeploy />
          </header>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-faint">
                Experiment context
              </h3>
              {!editing && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                >
                  <Pencil className="size-3.5" />
                  Edit details
                </Button>
              )}
            </div>
            {editing ? (
              <EditDetails
                pageId={pageId}
                variant={v}
                onDone={() => setEditing(false)}
              />
            ) : (
              <>
                <p className="rounded-lg border border-amber/25 bg-amber/8 p-3 text-sm">
                  {v.hypothesis || "No hypothesis recorded."}
                </p>
                <dl className="grid gap-3 sm:grid-cols-2">
                  <Row k="What changed" v={v.element} />
                  <Row
                    k="Baseline / parent"
                    v={parent ? parent.name : "None (baseline)"}
                  />
                  <Row k="Why it was tested" v={v.whyTested} />
                  <Row k="Expected outcome" v={v.expected} />
                  <Row k="Created" v={fmtDateTime(v.createdAt)} />
                  <Row k="Notes" v={v.notes} />
                </dl>
              </>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={previewUrl(state!, v)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs font-medium hover:bg-raised"
              >
                <ExternalLink className="size-3.5" />
                Preview locally
              </a>
              {state!.staging && (
                <a
                  href={stagingPreviewUrl(state!, v)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line-strong px-2.5 text-xs font-medium hover:bg-raised"
                >
                  <ExternalLink className="size-3.5" />
                  Preview on staging
                </a>
              )}
              <CopyButton text={v.componentPath} label="Copy path" />
              <CopyButton
                text={claudeInstruction(state!, v)}
                label="Copy Claude instruction"
              />
            </div>
            <p className="num flex items-center gap-1.5 text-[11px] text-faint">
              <FileCode2 className="size-3.5" />
              {v.componentPath}
            </p>
          </section>

          <Section title="Activation windows">
            {windows.length === 0 ? (
              <p className="text-sm text-soft">
                This variant has never been confirmed live.
              </p>
            ) : (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Activation window"
              >
                {[
                  { id: "all", label: "All windows" },
                  ...windows.map((w, i) => ({
                    id: w.id,
                    label: `#${i + 1} · ${fmtDateTime(w.startUtc).split(",")[0]} – ${w.endUtc ? fmtDateTime(w.endUtc).split(",")[0] : "now"}`,
                  })),
                ].map((o) => (
                  <button
                    key={o.id}
                    aria-pressed={windowSel === o.id}
                    onClick={() => setWindowSel(o.id)}
                    className={cx(
                      "num cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs transition-colors",
                      windowSel === o.id
                        ? "border-teal bg-teal/10 text-teal"
                        : "border-line-strong text-soft hover:bg-raised",
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
            <ul className="space-y-1 text-xs text-faint">
              {windows.map((w) => (
                <li key={w.id} className="num">
                  {fmtDateTime(w.startUtc)} →{" "}
                  {w.endUtc ? fmtDateTime(w.endUtc) : "live"} ·{" "}
                  {w.confirmed ? "confirmed" : "unconfirmed"}
                  {w.commitSha && ` · ${w.commitSha.slice(0, 7)}`}
                </li>
              ))}
            </ul>
          </Section>

          {!noData && totals.days > 0 && (
            <>
              <Section title="Conversion funnel">
                <div
                  className="flex flex-wrap gap-1.5"
                  role="group"
                  aria-label="Filter by traffic source"
                >
                  {sources.map((s) => {
                    const on = picked.has(s.sourceMedium);
                    return (
                      <button
                        key={s.sourceMedium}
                        aria-pressed={on}
                        onClick={() =>
                          setPicked((p) => {
                            const n = new Set(p);
                            if (on) n.delete(s.sourceMedium);
                            else n.add(s.sourceMedium);
                            return n;
                          })
                        }
                        className={cx(
                          "cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                          on
                            ? "border-teal bg-teal/10 text-teal"
                            : "border-line-strong text-soft hover:bg-raised",
                        )}
                      >
                        {s.sourceMedium}
                      </button>
                    );
                  })}
                  {picked.size > 0 && (
                    <button
                      onClick={() => setPicked(new Set())}
                      className="cursor-pointer text-[11px] text-faint underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Funnel sources={bySource(filtered)} totals={totals} />
              </Section>

              <Section title="Versus baseline">
                {baseTotals && baseName ? (
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg bg-bg p-3">
                      <p className="text-[11px] text-faint">
                        {baseName} (baseline)
                      </p>
                      <p className="num text-lg font-semibold">
                        {fmtPct(baseTotals.rate)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-bg p-3">
                      <p className="text-[11px] text-faint">This variant</p>
                      <p className="num text-lg font-semibold">
                        {fmtPct(totals.rate)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-bg p-3">
                      <p className="text-[11px] text-faint">Observed lift</p>
                      <p
                        className={cx(
                          "num text-lg font-semibold",
                          (lift ?? 0) >= 0 ? "text-teal" : "text-rose",
                        )}
                      >
                        {fmtLift(lift)}
                      </p>
                      <EvidenceBadge e={evidence} />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-soft">
                    This is the baseline, so there is nothing to compare
                    against.
                  </p>
                )}
                {evidence.level === "insufficient" && (
                  <p className="text-xs text-amber">
                    Insufficient data: needs at least 300 tracked visitors and
                    15 handoffs in both variants before any lift is discussed.
                  </p>
                )}
                {(evidence.level === "directional" ||
                  evidence.level === "persuasive") &&
                  "p" in evidence && (
                    <p className="num text-xs text-faint">
                      Two-sided p = {evidence.p.toFixed(3)}. Sequential windows
                      differ in traffic quality, seasonality and ad setup, so
                      this is not proof of cause.
                    </p>
                  )}
              </Section>

              {totals.visitors > 0 && (
                <Section title="Conversion funnel">
                  <TrackingWarning
                    totals={totals}
                    since={state!.analytics.trackingStart}
                  />
                  <FunnelGraphic
                    totals={totals}
                    sources={sources}
                    down={down}
                    downNote={pageDownNote(pageId)}
                  />
                </Section>
              )}

              {!noData && (
                <Section title="Where visitors go after landing">
                  <PathsPanel paths={variantPathRows} />
                </Section>
              )}

              {daily.length > 1 && (
                <Section title="Daily traffic and handoff rate">
                  <div
                    className="h-56"
                    role="img"
                    aria-label="Daily visitors and handoff rate"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={daily}
                        margin={{ left: -12, right: 4, top: 4 }}
                      >
                        <CartesianGrid stroke="#1c2b3e" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickFormatter={fmtDateKey}
                          stroke="#71859b"
                          tick={{ fontSize: 11 }}
                          minTickGap={24}
                        />
                        <YAxis
                          yAxisId="l"
                          stroke="#71859b"
                          tick={{ fontSize: 11 }}
                        />
                        <YAxis
                          yAxisId="r"
                          orientation="right"
                          stroke="#71859b"
                          tick={{ fontSize: 11 }}
                          unit="%"
                        />
                        <Tooltip
                          contentStyle={{
                            background: "#121e2c",
                            border: "1px solid #29405a",
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          labelFormatter={(l) => fmtDateKey(String(l))}
                        />
                        <Bar
                          yAxisId="l"
                          dataKey="visitors"
                          name="Visitors"
                          fill="#2dd4bf"
                          fillOpacity={0.35}
                          radius={[3, 3, 0, 0]}
                        />
                        <Line
                          yAxisId="r"
                          dataKey="rate"
                          name="Handoff rate %"
                          stroke="#f5a524"
                          strokeWidth={2}
                          dot={false}
                          connectNulls={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Section>
              )}

              <Section title="Source and campaign">
                <label className="flex items-center gap-2 text-xs text-soft">
                  <input
                    type="checkbox"
                    checked={byCampaign}
                    onChange={(e) => setByCampaign(e.target.checked)}
                    className="accent-teal"
                  />
                  Split by campaign
                </label>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-xs">
                    <thead className="text-left text-faint">
                      <tr>
                        <th className="py-1.5 font-medium">Source / medium</th>
                        <th className="font-medium">Type</th>
                        <th className="text-right font-medium">Visitors</th>
                        <th className="text-right font-medium">Handoffs</th>
                        <th className="text-right font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(byCampaign ? campaigns : bySource(filtered)).map(
                        (s) => (
                          <tr
                            key={s.sourceMedium + s.campaign}
                            className="border-t border-line/70"
                          >
                            <td className="py-2">
                              <p>{s.sourceMedium}</p>
                              {byCampaign && (
                                <p className="text-[11px] text-faint">
                                  {s.campaign}
                                </p>
                              )}
                            </td>
                            <td className="text-soft">{s.kind}</td>
                            <td className="num text-right">
                              {fmtInt(s.totals.visitors)}
                            </td>
                            <td className="num text-right">
                              {fmtInt(s.totals.clickers)}
                            </td>
                            <td className="num text-right font-semibold">
                              {fmtPct(s.totals.rate)}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-faint">
                  Raw GA4 source / medium. Type comes only from the medium, so
                  Facebook profile-link referrals are never counted as Meta ads.
                </p>
              </Section>
            </>
          )}
          {!noData && totals.days === 0 && (
            <Section title="Metrics">
              <p className="text-sm text-soft">
                {windows.length
                  ? "No measured days in the selected period."
                  : "No traffic yet. Metrics appear after this variant is confirmed live."}
              </p>
            </Section>
          )}

          {notices.length > 0 && (
            <Section title="Data quality">
              <ul className="space-y-1.5">
                {notices.map((n) => (
                  <li key={n} className="flex gap-2 text-xs text-amber">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    {n}
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
