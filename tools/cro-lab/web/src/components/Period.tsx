import { useLab, type Period } from "../lab.tsx";
import { cx } from "../ui.tsx";

const OPTIONS: { v: Period; label: string }[] = [
  { v: "1", label: "24h" },
  { v: "3", label: "3d" },
  { v: "7", label: "7d" },
  { v: "14", label: "14d" },
  { v: "30", label: "30d" },
  { v: "all", label: "All" },
];

export function PeriodSelect() {
  const { period, setPeriod } = useLab();
  return (
    <div
      role="group"
      aria-label="Reporting period"
      className="inline-flex rounded-lg border border-line bg-bg p-0.5 text-xs font-semibold"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.v}
          aria-pressed={period === o.v}
          onClick={() => setPeriod(o.v)}
          className={cx(
            "cursor-pointer rounded-md px-3 py-1.5 transition-colors",
            period === o.v
              ? "bg-raised text-ink"
              : "text-faint hover:text-soft",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
