import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  CloudUpload,
  Copy,
  ExternalLink,
  Eye,
  FlaskConical,
  Crown,
  Plus,
  Rocket,
  Undo2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { fmtInt, fmtLift, fmtPct } from "@shared/format.ts";
import { fmtDay } from "@shared/time.ts";
import { CANONICAL_ORIGIN } from "@shared/pages.ts";
import { api, ApiError } from "../api.ts";
import { go, useLab } from "../lab.tsx";
import { PeriodSelect } from "../components/Period.tsx";
import { CreateVariantDialog } from "../components/CreateVariant.tsx";
import { MakeMainDialog } from "../components/MakeMain.tsx";
import { StagingDeploy } from "../components/StagingDeploy.tsx";
import { VariantPanel } from "../components/VariantPanel.tsx";
import { ProductPageView } from "./ProductPageView.tsx";
import {
  defaultBaseline,
  displayStatus,
  metricsUnavailable,
  pageRows,
  previewUrl,
  stagingPreviewUrl,
  saveGroup,
  summarize,
  type VariantRow,
} from "../lib.ts";
import {
  Button,
  Card,
  DemoChip,
  Empty,
  EvidenceBadge,
  IconButton,
  StatusBadge,
  cx,
} from "../ui.tsx";

type SortKey = "name" | "status" | "visitors" | "clickers" | "rate" | "lift";
const STATUS_ORDER = {
  live: 0,
  ready: 1,
  draft: 2,
  retired: 3,
  paused: 4,
  archived: 5,
} as const;

export function PageView({
  pageId,
  variantId,
}: {
  pageId: string;
  variantId?: string;
}) {
  const { state, rows, period, mode, setState } = useLab();
  const [create, setCreate] = useState<string | null>(null);
  const [mainFor, setMainFor] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "status",
    dir: 1,
  });
  const [baseline, setBaseline] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const page = state!.pages.find((p) => p.id === pageId);
  const baselineId =
    baseline ?? (page ? defaultBaseline(state!, pageId) : null);
  const table = useMemo(
    () => (page ? pageRows(state!, rows, pageId, period, baselineId) : []),
    [state, rows, pageId, period, baselineId, page],
  );
  if (!page)
    return (
      <div className="p-6">
        <Empty icon={<FlaskConical />} title="Page not found">
          That landing page is not tracked.
        </Empty>
      </div>
    );

  if (!page.variants) return <ProductPageView pageId={pageId} />;
  const summary = summarize(state!, rows, page, period);
  const mainId = state!.mainVariants?.[pageId] ?? null;
  const noData = metricsUnavailable(state!, rows);
  const val = (r: VariantRow, k: SortKey): number | string => {
    switch (k) {
      case "name":
        return r.variant.name.toLowerCase();
      case "status":
        return STATUS_ORDER[r.status];
      case "visitors":
        return r.report.totals.visitors;
      case "clickers":
        return r.report.totals.clickers ?? -1;
      case "rate":
        return r.report.totals.rate ?? -1;
      case "lift":
        return r.lift ?? -999;
    }
  };
  const sorted = [...table].sort((a, b) => {
    const x = val(a, sort.key),
      y = val(b, sort.key);
    return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
  });
  const leader = [...table]
    .filter(
      (r) =>
        r.allTime.totals.rate !== null && r.allTime.totals.trackedVisitors > 0,
    )
    .sort((a, b) => b.allTime.totals.rate! - a.allTime.totals.rate!)[0];

  async function mutate(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      setState(await api.state(mode));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Action failed");
    }
  }
  const head = (key: SortKey, label: string, right = false) => (
    <th
      scope="col"
      aria-sort={
        sort.key === key
          ? sort.dir === 1
            ? "ascending"
            : "descending"
          : "none"
      }
      className={cx("px-3 py-2.5 font-semibold", right && "text-right")}
    >
      <button
        onClick={() =>
          setSort((s) => ({
            key,
            dir:
              s.key === key
                ? s.dir === 1
                  ? -1
                  : 1
                : key === "name" || key === "status"
                  ? 1
                  : -1,
          }))
        }
        className={cx(
          "inline-flex cursor-pointer items-center gap-1 uppercase tracking-wide hover:text-ink",
          right && "flex-row-reverse",
        )}
      >
        {label}
        {sort.key === key ? (
          sort.dir === 1 ? (
            <ArrowUp className="size-3 text-teal" />
          ) : (
            <ArrowDown className="size-3 text-teal" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </button>
    </th>
  );

  if (variantId)
    return (
      <VariantPanel
        pageId={pageId}
        variantId={variantId}
        baselineId={baselineId}
        onClose={() => go("page", pageId)}
      />
    );

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <button
        onClick={() => {
          saveGroup("landing");
          go();
        }}
        className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-faint hover:text-ink"
      >
        <ArrowLeft className="size-3.5" />
        All landing pages
      </button>

      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {page.title}
              </h1>
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
          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelect />
            <Button
              variant="outline"
              disabled={!leader}
              title={
                leader
                  ? "Observed leader by handoff rate. Not a proven winner."
                  : "No variant has tracked data yet"
              }
              onClick={() => leader && setCreate(leader.variant.id)}
            >
              <Copy className="size-4" />
              Duplicate leader
            </Button>
            <StagingDeploy />
            <Button
              variant="primary"
              onClick={() =>
                setCreate(
                  summary.live?.id ?? baselineId ?? table[0]?.variant.id ?? "",
                )
              }
            >
              <Plus className="size-4" />
              Create variant
            </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Card className="p-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-faint">
              Live variant
            </p>
            {summary.live ? (
              <p className="mt-1 flex items-center gap-2 font-semibold">
                <span className="pulse-dot size-2 rounded-full bg-amber" />
                {summary.live.name}
                <span className="num text-xs font-normal text-faint">
                  since {fmtDay(summary.liveSince!)}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-amber">None confirmed</p>
            )}
            {mainId && mainId !== summary.live?.id && (
              <div className="mt-2 space-y-1.5 text-xs text-soft">
                <p>
                  Local site serves{" "}
                  <span className="font-semibold text-ink">
                    {state!.data.variants.find(
                      (v) => v.pageId === pageId && v.id === mainId,
                    )?.name ?? mainId}
                  </span>
                  {summary.live
                    ? ". Not live in production until you deploy."
                    : ". No go-live time recorded yet, so it has no metrics."}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMainFor(mainId)}
                >
                  <Rocket className="size-3.5" />
                  Set go-live time
                </Button>
              </div>
            )}
          </Card>
          <Card className="p-4 md:col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-faint">
              Current hypothesis
            </p>
            <p className="mt-1 text-sm text-soft">
              {summary.live?.hypothesis || "No active experiment recorded."}
            </p>
            {summary.live?.element && summary.live.element !== "None" && (
              <p className="mt-1 text-xs text-amber">
                Changing: {summary.live.element}
              </p>
            )}
          </Card>
        </div>
        {summary.warnings.map((w) => (
          <p key={w} role="status" className="text-xs text-amber">
            {w}
          </p>
        ))}
        {error && (
          <p role="alert" className="text-sm text-rose">
            {error}
          </p>
        )}
      </header>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="font-semibold">
            Variants{" "}
            <span className="num ml-1 text-xs font-normal text-faint">
              {table.length}
            </span>
          </h2>
          <label className="flex items-center gap-2 text-xs text-faint">
            Compare against
            <select
              value={baselineId ?? ""}
              onChange={(e) => setBaseline(e.target.value)}
              className="rounded-md border border-line-strong bg-bg px-2 py-1 text-xs text-ink"
            >
              {table.map((r) => (
                <option key={r.variant.id} value={r.variant.id}>
                  {r.variant.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b border-line text-left text-[11px] text-faint">
              <tr>
                {head("name", "Variant")}
                {head("status", "Status")}
                <th
                  scope="col"
                  className="px-3 py-2.5 font-semibold uppercase tracking-wide"
                >
                  What changed
                </th>
                <th
                  scope="col"
                  className="px-3 py-2.5 font-semibold uppercase tracking-wide"
                >
                  Live dates
                </th>
                {head("visitors", "Visitors", true)}
                {head("clickers", "Handoffs", true)}
                {head("rate", "Rate", true)}
                {head("lift", "vs baseline", true)}
                <th
                  scope="col"
                  className="px-3 py-2.5 text-right font-semibold uppercase tracking-wide"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const t = r.report.totals;
                const inRange = t.days > 0;
                const v = r.variant;
                return (
                  <tr
                    key={v.id}
                    onClick={() => go("page", pageId, v.id)}
                    className={cx(
                      "cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-raised/50",
                      r.status === "archived" && "opacity-60",
                    )}
                  >
                    <td className="px-3 py-3">
                      <p className="font-semibold">{v.name}</p>
                      <p className="num text-[11px] text-faint">{v.id}</p>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge
                        status={displayStatus(state!, pageId, v.id, r.status)}
                      />
                    </td>
                    <td className="max-w-64 px-3 py-3">
                      <p className="truncate text-soft" title={v.hypothesis}>
                        {v.element && v.element !== "None"
                          ? v.element
                          : "Baseline"}
                      </p>
                      <p className="truncate text-[11px] text-faint">
                        {v.hypothesis}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs text-soft">
                      {r.windows.length === 0 ? (
                        <span className="text-faint">Never live</span>
                      ) : (
                        r.windows.map((w) => (
                          <p key={w.id} className="num whitespace-nowrap">
                            {fmtDay(w.startUtc)} –{" "}
                            {w.endUtc ? fmtDay(w.endUtc) : "now"}
                            {!w.confirmed && " (unconfirmed)"}
                          </p>
                        ))
                      )}
                    </td>
                    <td className="num px-3 py-3 text-right">
                      {noData ? (
                        "n/a"
                      ) : inRange ? (
                        fmtInt(t.visitors)
                      ) : (
                        <span className="text-faint">–</span>
                      )}
                    </td>
                    <td className="num px-3 py-3 text-right">
                      {noData ? (
                        "n/a"
                      ) : inRange ? (
                        fmtInt(t.clickers)
                      ) : (
                        <span className="text-faint">–</span>
                      )}
                    </td>
                    <td className="num px-3 py-3 text-right font-semibold">
                      {noData ? (
                        "n/a"
                      ) : inRange ? (
                        fmtPct(t.rate)
                      ) : (
                        <span className="font-normal text-faint">–</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {inRange && !noData ? (
                        <>
                          <p
                            className={cx(
                              "num font-semibold",
                              (r.lift ?? 0) >= 0 ? "text-teal" : "text-rose",
                            )}
                          >
                            {fmtLift(r.lift)}
                          </p>
                          <EvidenceBadge e={r.evidence} />
                        </>
                      ) : (
                        <span className="text-xs text-faint">
                          {noData ? "n/a" : "Not live in range"}
                        </span>
                      )}
                    </td>
                    <td
                      className="px-3 py-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-end">
                        <IconButton
                          label="Duplicate"
                          onClick={() => setCreate(v.id)}
                        >
                          <Copy className="size-4" />
                        </IconButton>
                        <a
                          href={previewUrl(state!, v)}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`Preview ${v.name} locally`}
                          title="Preview locally"
                          className="inline-flex size-8 items-center justify-center rounded-lg text-faint hover:bg-raised hover:text-ink"
                        >
                          <Eye className="size-4" />
                        </a>
                        {state!.staging && (
                          <a
                            href={stagingPreviewUrl(state!, v)}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Preview ${v.name} on staging`}
                            title="Preview on staging (after a staging deploy that includes it)"
                            className="inline-flex size-8 items-center justify-center rounded-lg text-faint hover:bg-raised hover:text-ink"
                          >
                            <CloudUpload className="size-4" />
                          </a>
                        )}
                        {mode === "live" && mainId !== v.id && (
                          <IconButton
                            label="Make main locally"
                            disabled={r.status === "archived"}
                            onClick={() => setMainFor(v.id)}
                          >
                            <Crown className="size-4" />
                          </IconButton>
                        )}
                        {r.status === "ready" ? (
                          <IconButton
                            label="Unmark ready to deploy"
                            onClick={() =>
                              mutate(() =>
                                api.patchVariant(mode, pageId, v.id, {
                                  status: "draft",
                                }),
                              )
                            }
                          >
                            <Undo2 className="size-4 text-teal" />
                          </IconButton>
                        ) : (
                          <IconButton
                            label="Mark ready to deploy (not live)"
                            disabled={
                              r.status === "live" || r.status === "archived"
                            }
                            onClick={() =>
                              mutate(() =>
                                api.patchVariant(mode, pageId, v.id, {
                                  status: "ready",
                                }),
                              )
                            }
                          >
                            <Rocket className="size-4" />
                          </IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="max-w-3xl text-xs text-faint">
        Variants are compared sequentially, not randomized. Traffic mix,
        seasonality and ad settings changed between windows, so a lift here is
        an observation, not proof of cause. Transition days are excluded from
        totals.
      </p>

      {create !== null && (
        <CreateVariantDialog
          pageId={pageId}
          baseId={create}
          onClose={() => setCreate(null)}
        />
      )}
      {mainFor !== null && (
        <MakeMainDialog
          pageId={pageId}
          variantId={mainFor}
          onClose={() => setMainFor(null)}
        />
      )}
    </div>
  );
}
