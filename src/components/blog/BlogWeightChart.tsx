import { useId } from "react";
import { ChevronDown } from "lucide-react";
import type { BlogChart } from "@/content/blog/types";

const W = 560;
const H = 340;
const PAD = { left: 52, right: 28, top: 28, bottom: 44 };
const DAY_MS = 86_400_000;

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

function utc(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function shortDate(iso: string): string {
  const d = new Date(utc(iso));
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/**
 * Server-rendered SVG line chart. No client JS or chart library, so the
 * markup is in the static HTML, has fixed proportions (no layout shift),
 * and carries its own text alternative. Colors come from theme tokens.
 */
function ChartSvg({ chart }: { chart: BlogChart }) {
  const uid = useId().replace(/:/g, "");
  const gradientId = `${uid}-area`;
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  const first = chart.points[0];
  const last = chart.points[chart.points.length - 1];
  if (!first || !last) return null;

  const t0 = utc(first[0]);
  const t1 = utc(last[0]);
  const values = chart.points.map(([, v]) => v);
  const yMin = Math.floor((Math.min(...values) - 5) / 10) * 10;
  const yMax = Math.ceil((Math.max(...values) + 5) / 10) * 10;

  const x = (iso: string) =>
    PAD.left + ((utc(iso) - t0) / (t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    PAD.top + ((yMax - v) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);

  const line = chart.points
    .map(
      ([d, v], i) =>
        `${i === 0 ? "M" : "L"}${x(d).toFixed(1)} ${y(v).toFixed(1)}`,
    )
    .join(" ");
  const baseline = y(yMin).toFixed(1);
  const area = `${line} L${x(last[0]).toFixed(1)} ${baseline} L${x(first[0]).toFixed(1)} ${baseline} Z`;

  const yTicks: number[] = [];
  for (let v = yMin + 20; v <= yMax; v += 20) yTicks.push(v);

  const weeks = Math.round((t1 - t0) / (7 * DAY_MS));
  const change = first[1] - last[1];
  const description = `Line chart of ${weeks + 1} weekly weigh-ins from ${shortDate(first[0])} to ${shortDate(last[0])}. Weight started at ${first[1].toFixed(1)} ${chart.unit} and was ${last[1].toFixed(1)} ${chart.unit} at the most recent weigh-in, a difference of ${change.toFixed(1)} ${chart.unit} over about ${weeks} weeks.`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-labelledby={`${titleId} ${descId}`}
      className="h-auto w-full text-muted-foreground"
    >
      <title id={titleId}>{chart.title}</title>
      <desc id={descId}>{description}</desc>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            stroke="var(--border)"
            strokeDasharray="3 5"
          />
          <text
            x={PAD.left - 10}
            y={y(v)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="15"
            fill="currentColor"
          >
            {v}
          </text>
        </g>
      ))}
      <text
        x={PAD.left - 10}
        y={PAD.top - 12}
        textAnchor="end"
        fontSize="13"
        fill="currentColor"
      >
        {chart.unit}
      </text>

      <text
        x={x(first[0])}
        y={H - 14}
        textAnchor="start"
        fontSize="15"
        fill="currentColor"
      >
        {shortDate(first[0])}
      </text>
      <text
        x={x(last[0])}
        y={H - 14}
        textAnchor="end"
        fontSize="15"
        fill="currentColor"
      >
        {shortDate(last[0])}
      </text>

      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {chart.points.map(([d, v]) => (
        <circle
          key={d}
          cx={x(d)}
          cy={y(v)}
          r="4"
          fill="var(--foreground)"
          fillOpacity="0"
        >
          <title>{`${shortDate(d)}: ${v.toFixed(1)} ${chart.unit}`}</title>
        </circle>
      ))}

      <circle
        cx={x(first[0])}
        cy={y(first[1])}
        r="6"
        fill="var(--card)"
        stroke="var(--foreground)"
        strokeWidth="2.5"
      />
      <circle
        cx={x(last[0])}
        cy={y(last[1])}
        r="7"
        fill="var(--primary)"
        stroke="var(--foreground)"
        strokeWidth="2.5"
      />
      <text
        x={x(first[0]) + 14}
        y={y(first[1]) - 6}
        fontSize="16"
        fontWeight="600"
        fill="var(--foreground)"
      >
        {first[1].toFixed(1)} {chart.unit}
      </text>
      <text
        x={x(last[0])}
        y={y(last[1]) + 32}
        textAnchor="end"
        fontSize="16"
        fontWeight="600"
        fill="var(--foreground)"
      >
        {last[1].toFixed(1)} {chart.unit}
      </text>
    </svg>
  );
}

/**
 * Native <details> dropdown: the chart and its caption are always in the
 * HTML (indexable, works without JS), but collapsed until opened.
 */
export function BlogWeightChart({ chart }: { chart: BlogChart }) {
  const first = chart.points[0];
  const last = chart.points[chart.points.length - 1];
  if (!first || !last) return null;

  return (
    <details className="group my-8 rounded-2xl border border-border bg-card px-5 shadow-soft">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium text-foreground marker:content-none md:text-lg [&::-webkit-details-marker]:hidden">
        See Charlie&apos;s progress over time
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
        />
      </summary>
      <figure className="pb-5">
        <ChartSvg chart={chart} />
        <figcaption className="mt-4 space-y-2 text-sm leading-relaxed text-muted-foreground">
          <p>
            Charlie&apos;s weekly weigh-ins, {shortDate(first[0])} to{" "}
            {shortDate(last[0])}.
          </p>
          <p className="font-medium text-foreground">
            This is one person&apos;s result and is not typical. Individual
            results vary, and this chart is not a prediction of what you will
            experience.
          </p>
        </figcaption>
      </figure>
    </details>
  );
}
