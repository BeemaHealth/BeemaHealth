import { fmtInt, fmtPct } from "@shared/format.ts";
import {
  pathSummary,
  type DownstreamTotals,
  type SourceRow,
  type Totals,
} from "@shared/metrics.ts";
import type { PathRow } from "@shared/types.ts";
import { cx } from "../ui.tsx";

const KIND_COLOR: Record<string, string> = {
  "Paid search": "bg-teal",
  "Paid social": "bg-sky",
  "Organic search": "bg-[#86efac]",
  "Referral / social": "bg-[#c4b5fd]",
  Direct: "bg-soft",
  Other: "bg-faint",
};

/** Traffic source -> landing visitors -> unique intake handoff users. */
export function Funnel({
  sources,
  totals,
}: {
  sources: SourceRow[];
  totals: Totals;
}) {
  const max = Math.max(1, ...sources.map((s) => s.totals.visitors));
  const tracked = totals.clickers !== null;
  return (
    <div
      className="space-y-3"
      role="img"
      aria-label={`Funnel: ${totals.visitors} visitors, ${tracked ? totals.clickers : "no tracked"} handoffs`}
    >
      <div className="space-y-1.5">
        {sources.map((s) => (
          <div
            key={s.sourceMedium}
            className="grid grid-cols-[minmax(0,9.5rem)_1fr_auto] items-center gap-3 text-xs"
          >
            <span className="truncate text-soft" title={s.sourceMedium}>
              {s.sourceMedium}
            </span>
            <div className="h-5 rounded bg-bg">
              <div
                className={cx(
                  "h-full rounded transition-all duration-500",
                  KIND_COLOR[s.kind],
                )}
                style={{ width: `${(s.totals.visitors / max) * 100}%` }}
              />
            </div>
            <span className="num w-14 text-right">
              {fmtInt(s.totals.visitors)}
            </span>
          </div>
        ))}
      </div>

      <div className="relative pl-3 before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-line-strong">
        <Stage
          label="Landing visitors"
          value={fmtInt(totals.visitors)}
          pct={1}
          tone="bg-teal/80"
          note="100% of measured traffic"
        />
        {tracked ? (
          <Stage
            label="Unique intake handoff users"
            value={fmtInt(totals.clickers)}
            pct={Math.max(0.02, totals.rate ?? 0)}
            tone="bg-amber"
            note={`${fmtPct(totals.rate)} continue to Bask intake · ${fmtPct(totals.rate === null ? null : 1 - totals.rate)} drop off${totals.untrackedDays ? ` (tracked days only, ${totals.trackedDays} of ${totals.days})` : ""}`}
          />
        ) : (
          <div className="mt-2 rounded-lg border border-dashed border-line-strong p-3 text-xs text-soft">
            Handoff tracking did not exist for these dates. The rate is
            unavailable, not zero.
          </div>
        )}
      </div>
    </div>
  );
}

function Stage({
  label,
  value,
  pct,
  tone,
  note,
}: {
  label: string;
  value: string;
  pct: number;
  tone: string;
  note: string;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="num text-lg font-semibold">{value}</span>
      </div>
      <div className="mt-1 h-3 rounded bg-bg">
        <div
          className={cx("h-full rounded transition-all duration-700", tone)}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-faint">{note}</p>
    </div>
  );
}

/**
 * A literal funnel: landing visitors narrow to unique intake handoff users,
 * which flow into Bask intake. Widths are proportional to the counts, with a
 * minimum so the numbers stay readable.
 */
export function FunnelGraphic({
  totals,
  sources = [],
  down,
  downNote,
}: {
  totals: Totals;
  sources?: SourceRow[];
  /** Bask signups and purchases; adds the stages below the handoff. */
  down?: DownstreamTotals;
  /** Caption under the diagram explaining what `down` covers. */
  downNote?: string;
}) {
  const tracked = totals.clickers !== null;
  const W = 640;
  const full = 600;
  const rate = tracked && totals.trackedVisitors > 0 ? (totals.rate ?? 0) : 0;
  const midW = tracked ? Math.max(150, full * rate) : full;
  const spoutW = Math.max(90, midW * 0.55);
  const cx0 = W / 2;
  const x = (w: number) => [cx0 - w / 2, cx0 + w / 2];
  const [tl, tr] = x(full);
  const [ml, mr] = x(midW);
  const [sl, sr] = x(spoutW);
  const H1 = 170;
  const H2 = 96;
  const gap = 4;
  const y2 = H1 + gap;
  // Top 4 sources feed in from above; the rest are grouped.
  const ranked = [...sources]
    .filter((r) => r.totals.visitors > 0)
    .sort((a, b) => b.totals.visitors - a.totals.visitors);
  const shown = ranked.slice(0, 4).map((r) => ({
    label: r.sourceMedium,
    n: r.totals.visitors,
  }));
  const rest = ranked.slice(4);
  if (rest.length)
    shown.push({
      label: `${rest.length} other ${rest.length === 1 ? "source" : "sources"}`,
      n: rest.reduce((t, r) => t + r.totals.visitors, 0),
    });
  const TOP = shown.length ? 104 : 0;
  const pillW = 118;
  const pillH = 46;
  const trim = (t: string) => (t.length > 17 ? `${t.slice(0, 16)}…` : t);
  const drop = tracked ? totals.trackedVisitors - (totals.clickers ?? 0) : 0;
  // Bask stages continue the same funnel: each shape starts as wide as the
  // one above ends. Counts sit inside, names beside, so narrow stages stay
  // readable. Widths taper; the numbers carry the real values (signups can
  // exceed handoffs, so widths are not proportional).
  const showDown = tracked && down !== undefined;
  const H3 = 72;
  const baskGap = 22; // room for the "Bask takes over" marker
  const y3 = y2 + H2 + baskGap;
  const y4 = y3 + H3 + gap;
  const w3 = Math.max(76, spoutW * 0.78);
  const w4 = Math.max(60, w3 * 0.72);
  const [s3l, s3r] = x(w3);
  const [s4l, s4r] = x(w4);
  const bodyH = showDown ? y4 + H3 + 8 : y2 + H2 + 44;
  const labelX = (w: number) => cx0 + w / 2 + 18;
  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${TOP + bodyH}`}
        className="mx-auto w-full max-w-[720px]"
        role="img"
        aria-label={`Funnel: ${totals.visitors} landing visitors${tracked ? `, ${totals.clickers} intake handoffs, ${fmtPct(totals.rate)} rate` : ", handoffs not tracked for this period"}${showDown ? `, ${down.signups} Bask signups, ${down.purchases} Bask purchases` : ""}`}
      >
        {shown.map((r, i) => {
          const px = ((i + 0.5) / shown.length) * W;
          const tx = tl + ((i + 0.5) / shown.length) * (tr - tl);
          const share = r.n / Math.max(1, totals.visitors);
          return (
            <g key={r.label}>
              <path
                d={`M${px},${pillH} C${px},${TOP - 24} ${tx},${TOP - 40} ${tx},${TOP}`}
                className="stroke-teal/45"
                fill="none"
                strokeWidth={Math.max(1.5, share * 14)}
                strokeLinecap="round"
              />
              <rect
                x={px - pillW / 2}
                y={0}
                width={pillW}
                height={pillH}
                rx={10}
                className="fill-raised stroke-line-strong"
              />
              <text
                x={px}
                y={18}
                textAnchor="middle"
                className="fill-soft text-[11px]"
              >
                {trim(r.label)}
              </text>
              <text
                x={px}
                y={36}
                textAnchor="middle"
                className="num fill-ink text-[15px] font-semibold"
              >
                {fmtInt(r.n)}
              </text>
            </g>
          );
        })}
        <g transform={`translate(0,${TOP})`}>
          <polygon
            points={`${tl},0 ${tr},0 ${mr},${H1} ${ml},${H1}`}
            className="fill-teal/70"
          />
          <text
            x={cx0}
            y={H1 / 2 - 10}
            textAnchor="middle"
            className="num fill-bg text-[40px] font-bold"
          >
            {fmtInt(totals.visitors)}
          </text>
          <text
            x={cx0}
            y={H1 / 2 + 16}
            textAnchor="middle"
            className="fill-bg text-[14px] font-semibold"
          >
            Landing page visitors
          </text>
          {tracked ? (
            <>
              <polygon
                points={`${ml},${y2} ${mr},${y2} ${sr},${y2 + H2} ${sl},${y2 + H2}`}
                className="fill-amber"
              />
              <text
                x={cx0}
                y={y2 + H2 / 2 + 11}
                textAnchor="middle"
                className="num fill-bg text-[32px] font-bold"
              >
                {fmtInt(totals.clickers)}
              </text>
              <text
                x={labelX(midW)}
                y={y2 + H2 / 2 + 5}
                className="fill-ink text-[13px] font-semibold"
              >
                Intake handoffs ({fmtPct(totals.rate)})
              </text>
              {!showDown && (
                <>
                  <path
                    d={`M${cx0},${y2 + H2 + 6} v14 m-7,-7 l7,7 l7,-7`}
                    className="stroke-amber"
                    fill="none"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <text
                    x={cx0}
                    y={y2 + H2 + 40}
                    textAnchor="middle"
                    className="fill-soft text-[13px] font-medium"
                  >
                    To Bask intake
                  </text>
                </>
              )}
              {showDown && (
                <>
                  <line
                    x1={cx0 - spoutW / 2 - 10}
                    x2={labelX(spoutW) + 120}
                    y1={y2 + H2 + baskGap / 2}
                    y2={y2 + H2 + baskGap / 2}
                    className="stroke-line-strong"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={labelX(spoutW)}
                    y={y2 + H2 + baskGap / 2 - 4}
                    className="fill-soft text-[11px]"
                  >
                    Bask intake starts here
                  </text>
                  <polygon
                    points={`${sl},${y3} ${sr},${y3} ${s3r},${y3 + H3} ${s3l},${y3 + H3}`}
                    className="fill-sky"
                  />
                  <text
                    x={cx0}
                    y={y3 + H3 / 2 + 10}
                    textAnchor="middle"
                    className="num fill-bg text-[28px] font-bold"
                  >
                    {fmtInt(down.signups)}
                  </text>
                  <text
                    x={labelX(spoutW)}
                    y={y3 + H3 / 2 + 5}
                    className="fill-ink text-[13px] font-semibold"
                  >
                    Bask signups
                  </text>
                  <polygon
                    points={`${s3l},${y4} ${s3r},${y4} ${s4r},${y4 + H3} ${s4l},${y4 + H3}`}
                    className="fill-teal"
                  />
                  <text
                    x={cx0}
                    y={y4 + H3 / 2 + 10}
                    textAnchor="middle"
                    className="num fill-bg text-[28px] font-bold"
                  >
                    {fmtInt(down.purchases)}
                  </text>
                  <text
                    x={labelX(w3)}
                    y={y4 + H3 / 2 + 5}
                    className="fill-ink text-[13px] font-semibold"
                  >
                    Bask purchases
                  </text>
                </>
              )}
              {drop > 0 && (
                <text
                  x={tr}
                  y={H1 + 4}
                  textAnchor="end"
                  className="num fill-soft text-[12px]"
                >
                  {fmtInt(drop)} did not continue
                </text>
              )}
            </>
          ) : (
            <text
              x={cx0}
              y={y2 + 40}
              textAnchor="middle"
              className="fill-soft text-[13px]"
            >
              Handoff tracking did not exist for these dates.
            </text>
          )}
        </g>
      </svg>
      {showDown && downNote && (
        <p className="mt-1 text-center text-[11px] text-faint">{downNote}</p>
      )}
      {tracked && totals.untrackedDays > 0 && (
        <p className="mt-1 text-center text-[11px] text-faint">
          Handoffs and rate use tracked days only ({totals.trackedDays} of{" "}
          {totals.days} days, {fmtInt(totals.trackedVisitors)} visitors).
        </p>
      )}
    </div>
  );
}

/** Small funnel for page cards: sources feed in, visitors narrow to handoffs. */
export function MiniFunnel({
  totals,
  sources = [],
  down,
}: {
  totals: Totals;
  sources?: SourceRow[];
  /** Bask signups and purchases for this page; adds stages under the handoff. */
  down?: DownstreamTotals;
}) {
  const tracked = totals.clickers !== null;
  const W = 320;
  const full = 300;
  const rate = tracked && totals.trackedVisitors > 0 ? (totals.rate ?? 0) : 0;
  const midW = tracked ? Math.max(90, full * rate) : full;
  const cx0 = W / 2;
  const edge = (w: number) => [cx0 - w / 2, cx0 + w / 2];
  const [tl, tr] = edge(full);
  const [ml, mr] = edge(midW);
  const [sl, sr] = edge(Math.max(56, midW * 0.6));
  const ranked = [...sources]
    .filter((r) => r.totals.visitors > 0)
    .sort((a, b) => b.totals.visitors - a.totals.visitors);
  const shown = ranked.slice(0, 3).map((r) => ({
    label: r.sourceMedium,
    n: r.totals.visitors,
  }));
  const rest = ranked.slice(3);
  if (rest.length)
    shown.push({
      label: `${rest.length} other`,
      n: rest.reduce((t, r) => t + r.totals.visitors, 0),
    });
  const pillW = 74;
  const pillH = 30;
  const TOP = shown.length ? 52 : 0;
  const H1 = 54;
  const H2 = 42;
  const trim = (t: string) => (t.length > 13 ? `${t.slice(0, 12)}…` : t);
  // Bask stages continue the taper; names sit beside the shapes.
  const showDown = tracked && down !== undefined;
  const H3 = 34;
  const y2 = H1 + 4;
  const y3 = y2 + H2 + 4;
  const y4 = y3 + H3 + 3;
  const spoutW = Math.max(56, midW * 0.6);
  const w3 = Math.max(44, spoutW * 0.8);
  const w4 = Math.max(36, w3 * 0.75);
  const [s3l, s3r] = edge(w3);
  const [s4l, s4r] = edge(w4);
  const labelX = (w: number) => cx0 + w / 2 + 10;
  const bodyH = tracked ? (showDown ? y4 + H3 : H1 + H2 + 4) : H1;
  return (
    <svg
      viewBox={`0 0 ${W} ${TOP + bodyH}`}
      className="w-full"
      role="img"
      aria-label={`${totals.visitors} visitors${tracked ? `, ${totals.clickers} handoffs` : ", handoffs not tracked"}${showDown ? `, ${down.signups} Bask signups, ${down.purchases} Bask purchases` : ""}`}
    >
      {shown.map((r, i) => {
        const px = ((i + 0.5) / shown.length) * W;
        const tx = tl + ((i + 0.5) / shown.length) * (tr - tl);
        const share = r.n / Math.max(1, totals.visitors);
        return (
          <g key={r.label}>
            <path
              d={`M${px},${pillH} C${px},${TOP - 10} ${tx},${TOP - 18} ${tx},${TOP}`}
              className="stroke-teal/45"
              fill="none"
              strokeWidth={Math.max(1, share * 8)}
              strokeLinecap="round"
            />
            <rect
              x={px - pillW / 2}
              y={0}
              width={pillW}
              height={pillH}
              rx={6}
              className="fill-raised stroke-line-strong"
            />
            <text
              x={px}
              y={12}
              textAnchor="middle"
              className="fill-soft text-[8px]"
            >
              {trim(r.label)}
            </text>
            <text
              x={px}
              y={25}
              textAnchor="middle"
              className="num fill-ink text-[11px] font-semibold"
            >
              {fmtInt(r.n)}
            </text>
          </g>
        );
      })}
      <g transform={`translate(0,${TOP})`}>
        <polygon
          points={`${tl},0 ${tr},0 ${mr},${H1} ${ml},${H1}`}
          className="fill-teal/70"
        />
        <text
          x={cx0}
          y={H1 / 2 + 7}
          textAnchor="middle"
          className="num fill-bg text-[20px] font-bold"
        >
          {fmtInt(totals.visitors)}
        </text>
        {tracked && (
          <>
            <polygon
              points={`${ml},${H1 + 4} ${mr},${H1 + 4} ${sr},${H1 + H2 + 4} ${sl},${H1 + H2 + 4}`}
              className="fill-amber"
            />
            <text
              x={cx0}
              y={H1 + 4 + H2 / 2 + 6}
              textAnchor="middle"
              className="num fill-bg text-[17px] font-bold"
            >
              {fmtInt(totals.clickers)}
            </text>
            {showDown && (
              <>
                <text
                  x={labelX(midW)}
                  y={y2 + H2 / 2 + 3}
                  className="fill-soft text-[9px]"
                >
                  Handoffs
                </text>
                <polygon
                  points={`${sl},${y3} ${sr},${y3} ${s3r},${y3 + H3} ${s3l},${y3 + H3}`}
                  className="fill-sky"
                />
                <text
                  x={cx0}
                  y={y3 + H3 / 2 + 5}
                  textAnchor="middle"
                  className="num fill-bg text-[14px] font-bold"
                >
                  {fmtInt(down.signups)}
                </text>
                <text
                  x={labelX(spoutW)}
                  y={y3 + H3 / 2 + 3}
                  className="fill-soft text-[9px]"
                >
                  Bask signups
                </text>
                <polygon
                  points={`${s3l},${y4} ${s3r},${y4} ${s4r},${y4 + H3} ${s4l},${y4 + H3}`}
                  className="fill-teal"
                />
                <text
                  x={cx0}
                  y={y4 + H3 / 2 + 5}
                  textAnchor="middle"
                  className="num fill-bg text-[14px] font-bold"
                >
                  {fmtInt(down.purchases)}
                </text>
                <text
                  x={labelX(w3)}
                  y={y4 + H3 / 2 + 3}
                  className="fill-soft text-[9px]"
                >
                  Bask purchases
                </text>
              </>
            )}
          </>
        )}
      </g>
    </svg>
  );
}

/**
 * Where people go after landing: sessions that started on the page(s), the
 * other pages they viewed, and how many reached intake from each. A session
 * that views several pages appears in several rows.
 */
export function PathsPanel({ paths }: { paths: PathRow[] }) {
  const sum = pathSummary(paths);
  if (sum.landed === 0 && sum.destinations.length === 0)
    return (
      <p className="text-xs text-soft">
        No page-path data for this period yet.
      </p>
    );
  const max = Math.max(1, ...sum.destinations.map((d) => d.sessions));
  const elsewhere = sum.destinations.reduce((t, d) => t + d.sessions, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <PathStat label="Landed on the page" value={fmtInt(sum.landed)} />
        <PathStat
          label="Went straight to intake"
          value={sum.direct === null ? "n/a" : fmtInt(sum.direct)}
          note="handoff fired on the landing page"
          tone="text-amber"
        />
        <PathStat
          label="Viewed another page"
          value={fmtInt(elsewhere)}
          note="rows below can overlap"
        />
      </div>
      {sum.destinations.length > 0 && (
        <div className="space-y-2">
          {sum.destinations.map((d) => {
            const lost =
              d.handoffs === null ? null : Math.max(0, d.sessions - d.handoffs);
            return (
              <div key={d.label} className="text-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium" title={d.label}>
                    {d.label}
                  </span>
                  <span className="num shrink-0 text-soft">
                    {fmtInt(d.sessions)} sessions
                  </span>
                </div>
                <div className="mt-1 h-2.5 rounded bg-bg">
                  <div
                    className="h-full rounded bg-teal/70 transition-all duration-500"
                    style={{ width: `${(d.sessions / max) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-faint">
                  {d.handoffs === null
                    ? "Handoff tracking did not exist for these dates."
                    : `${fmtInt(d.handoffs)} went on to intake from here · ${fmtInt(lost)} did not`}
                </p>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-[11px] text-faint">
        Counts sessions that landed on this page. "To intake" means the intake
        handoff fired while the visitor was on that page. "Did not" means they
        viewed it but no handoff fired there; they may still have continued from
        another page.
      </p>
    </div>
  );
}

function PathStat({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-lg bg-bg p-3">
      <p className="text-[11px] text-soft">{label}</p>
      <p className={cx("num text-xl font-semibold", tone)}>{value}</p>
      {note && <p className="text-[10px] text-faint">{note}</p>}
    </div>
  );
}
