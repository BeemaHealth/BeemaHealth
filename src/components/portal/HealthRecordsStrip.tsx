import {
  Activity,
  Scale,
  Syringe,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import { motion } from "motion/react";
import {
  formatShortDate,
  formatWeight,
  formatWeightChange,
  type HealthRecords,
} from "@/lib/api/portal/home";

type Props = { records: HealthRecords; onOpen: () => void };

/** Compact strip of health record highlights. Links to the Shots history. */
export function HealthRecordsStrip({ records, onOpen }: Props) {
  const weight = formatWeight(records.latest_weight_lbs);
  const change = formatWeightChange(records.weight_change_lbs);
  const empty = records.metric_count === 0 && records.doses_taken === 0;
  const tiles: {
    label: string;
    value: string;
    hint?: string;
    Icon: LucideIcon;
  }[] = [
    {
      label: "Latest weight",
      value: weight || "Not logged",
      hint: formatShortDate(records.latest_weight_on),
      Icon: Scale,
    },
    {
      label: "Change since start",
      value: change || "Not enough data",
      Icon: TrendingDown,
    },
    { label: "Doses taken", value: String(records.doses_taken), Icon: Syringe },
    {
      label: "Entries logged",
      value: String(records.metric_count),
      Icon: Activity,
    },
  ];
  return (
    <section aria-labelledby="health-records-heading">
      <div className="mb-3 flex items-center justify-between">
        <h2
          id="health-records-heading"
          className="font-display text-lg font-semibold"
        >
          Health records
        </h2>
        <button
          type="button"
          onClick={onOpen}
          className="rounded-full px-3 py-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {empty ? "Start logging" : "See history"}
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(({ label, value, hint, Icon }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.05 * i,
              duration: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="rounded-3xl border border-border bg-card p-4 shadow-soft"
          >
            <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </dt>
            <dd className="mt-2 font-display text-xl font-semibold tracking-tight">
              {value}
            </dd>
            {hint && (
              <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
            )}
          </motion.div>
        ))}
      </dl>
    </section>
  );
}
