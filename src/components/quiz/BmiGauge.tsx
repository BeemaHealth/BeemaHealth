import { cn } from "@/lib/utils";

const BMI_MIN = 16;
const BMI_MAX = 40;

const SEGMENTS = [
  { min: 16, max: 18.5, label: "Underweight", range: "< 18.5", token: "secondary" as const },
  { min: 18.5, max: 25, label: "Healthy weight", range: "18.5 – 24.9", token: "success" as const },
  { min: 25, max: 30, label: "Overweight", range: "25 – 29.9", token: "warning" as const },
  { min: 30, max: 40, label: "Obesity", range: "≥ 30", token: "destructive" as const },
];

const THRESHOLD_LABELS = [16, 18.5, 25, 30, 40];

const TOKEN_STROKE: Record<(typeof SEGMENTS)[number]["token"], string> = {
  secondary: "stroke-secondary/70",
  success: "stroke-success/80",
  warning: "stroke-warning/90",
  destructive: "stroke-destructive/80",
};

const TOKEN_DOT: Record<(typeof SEGMENTS)[number]["token"], string> = {
  secondary: "bg-secondary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

function bmiToAngle(bmi: number): number {
  const clamped = Math.min(BMI_MAX, Math.max(BMI_MIN, bmi));
  const t = (clamped - BMI_MIN) / (BMI_MAX - BMI_MIN);
  return 180 - t * 180;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy - r * Math.sin(rad),
  };
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`;
}

export function getBmiCategory(bmi: number) {
  return SEGMENTS.find((s) => bmi >= s.min && bmi < s.max) ?? SEGMENTS[SEGMENTS.length - 1];
}

function GaugeMarker({
  cx,
  cy,
  r,
  bmi,
  ringClassName,
  dotClassName,
  label,
}: {
  cx: number;
  cy: number;
  r: number;
  bmi: number;
  ringClassName: string;
  dotClassName: string;
  label: string;
}) {
  const point = polar(cx, cy, r, bmiToAngle(bmi));
  const tagPoint = polar(cx, cy, r - 28, bmiToAngle(bmi));

  return (
    <g aria-label={label}>
      <circle cx={point.x} cy={point.y} r={12} className={cn("fill-background stroke-[3]", ringClassName)} />
      <circle cx={point.x} cy={point.y} r={6.5} className={dotClassName} />
      <text
        x={tagPoint.x}
        y={tagPoint.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground text-[9px] font-semibold sm:text-[10px]"
      >
        {label}
      </text>
    </g>
  );
}

function BmiStatCard({
  title,
  value,
  category,
  variant,
}: {
  title: string;
  value: number;
  category: string;
  variant: "current" | "target";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 px-3 py-3 text-center sm:px-4 sm:py-4",
        variant === "current"
          ? "border-primary bg-primary-soft/50"
          : "border-secondary bg-secondary/10",
      )}
    >
      <p
        className={cn(
          "text-[11px] font-semibold uppercase tracking-wide sm:text-xs",
          variant === "current" ? "text-primary" : "text-secondary",
        )}
      >
        {title}
      </p>
      <p
        className="mt-1 text-3xl font-bold leading-none text-foreground sm:text-4xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">{category}</p>
    </div>
  );
}

export function BmiGauge({
  bmi,
  goalBmi,
  className,
}: {
  bmi: number | null;
  goalBmi?: number | null;
  className?: string;
}) {
  if (bmi == null) return null;

  const category = getBmiCategory(bmi);
  const goalCategory = goalBmi != null ? getBmiCategory(goalBmi) : null;
  const cx = 160;
  const cy = 132;
  const radius = 98;
  const stroke = 14;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-muted/30 px-3 py-4 sm:px-5 sm:py-5",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-sm">
        <svg
          viewBox="0 0 320 168"
          role="img"
          aria-label={`BMI gauge showing current ${bmi}${goalBmi != null ? ` and target ${goalBmi}` : ""}`}
          className="h-auto w-full"
        >
          {SEGMENTS.map((segment) => (
            <path
              key={segment.label}
              d={arcPath(cx, cy, radius, bmiToAngle(segment.min), bmiToAngle(segment.max))}
              fill="none"
              strokeWidth={stroke}
              strokeLinecap="round"
              className={TOKEN_STROKE[segment.token]}
            />
          ))}

          {THRESHOLD_LABELS.map((value) => {
            const point = polar(cx, cy, radius + 16, bmiToAngle(value));
            return (
              <text
                key={value}
                x={point.x}
                y={point.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px] sm:text-[11px]"
              >
                {value}
              </text>
            );
          })}

          {goalBmi != null && (
            <GaugeMarker
              cx={cx}
              cy={cy}
              r={radius}
              bmi={goalBmi}
              ringClassName="stroke-secondary"
              dotClassName="fill-secondary"
              label="Target"
            />
          )}

          <GaugeMarker
            cx={cx}
            cy={cy}
            r={radius}
            bmi={bmi}
            ringClassName="stroke-primary"
            dotClassName="fill-primary"
            label="Current"
          />
        </svg>

        <div
          className={cn(
            "mb-4 grid gap-3",
            goalBmi != null ? "grid-cols-2" : "grid-cols-1",
          )}
        >
          <BmiStatCard
            title="Current BMI"
            value={bmi}
            category={category.label}
            variant="current"
          />
          {goalBmi != null && goalCategory && (
            <BmiStatCard
              title="Target BMI"
              value={goalBmi}
              category={goalCategory.label}
              variant="target"
            />
          )}
        </div>

        <ul className="divide-y divide-border rounded-xl border border-border bg-background/80">
          {SEGMENTS.map((segment) => {
            const isCurrent = segment.label === category.label;
            const isGoal = goalCategory?.label === segment.label;
            return (
              <li
                key={segment.label}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2.5 text-sm sm:px-4",
                  isCurrent && "bg-primary-soft/40",
                  isGoal && !isCurrent && "bg-secondary/10",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("size-2 shrink-0 rounded-full", TOKEN_DOT[segment.token])} aria-hidden />
                  <span className={cn("truncate", (isCurrent || isGoal) && "font-semibold text-foreground")}>
                    {segment.label}
                    {isCurrent && <span className="ml-1 text-xs font-normal text-primary">· current</span>}
                    {isGoal && !isCurrent && <span className="ml-1 text-xs font-normal text-secondary">· target</span>}
                  </span>
                </div>
                <span className="shrink-0 text-muted-foreground">{segment.range}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
