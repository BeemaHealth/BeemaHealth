import {
  ChevronDown,
  Dumbbell,
  Flame,
  MessageSquare,
  Pencil,
  Scale,
} from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { DoseLog } from "@/lib/api/portal/shots";
import { cn } from "@/lib/utils";
import { formatDateTime } from "../portal-format";
import { doseTitle, formatMetric, type DayMetrics } from "./shots-model";

/** A scheduled or overdue dose with its Add dose action. */
export function ScheduledDoseCard({
  dose,
  productName,
  index = 0,
  onAdd,
}: {
  dose: DoseLog;
  productName: string;
  index?: number;
  onAdd: (dose: DoseLog) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : 0.05 * index, duration: 0.28 }}
      className={cn(
        "list-none rounded-2xl border bg-card p-4 shadow-soft",
        dose.is_overdue ? "border-dashed border-warning/60" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
        <span>{dose.dose_number ? `Dose ${dose.dose_number}` : "Dose"}</span>
        <span className="text-right">
          {dose.is_overdue && (
            <span className="font-semibold text-warning-foreground">
              Overdue ·{" "}
            </span>
          )}
          {formatDateTime(dose.scheduled_at)}
        </span>
      </div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-base font-semibold">
            {doseTitle(dose, productName)}
          </p>
          {dose.injection_site && (
            <p className="text-xs text-muted-foreground">
              {dose.injection_site}
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => onAdd(dose)}
          aria-label={`Add dose scheduled ${formatDateTime(dose.scheduled_at)}`}
        >
          Add dose
        </Button>
      </div>
    </motion.li>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Scale;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <dt className="flex items-center gap-1.5 text-xs font-semibold">
        <Icon className="size-3.5 text-primary" aria-hidden="true" />
        {label}
      </dt>
      <dd className="mt-1 text-sm text-foreground/80">{value}</dd>
    </div>
  );
}

/** A taken or skipped dose in the history, with day metrics and an edit action. */
export function HistoryDoseCard({
  dose,
  productName,
  metrics,
  onEdit,
}: {
  dose: DoseLog;
  productName: string;
  metrics: DayMetrics;
  onEdit: (dose: DoseLog) => void;
}) {
  const [open, setOpen] = useState(true);
  const when = dose.taken_at ?? dose.scheduled_at;
  const bodyId = `dose-body-${dose.id}`;
  const editable = dose.entered_by !== "staff";
  return (
    <li className="list-none rounded-3xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3 text-xs text-muted-foreground">
        <span>{dose.dose_number ? `Dose ${dose.dose_number}` : "Dose"}</span>
        <span>{formatDateTime(when)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="font-display text-base font-semibold">
          {doseTitle(dose, productName)}
          {dose.status === "skipped" && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Skipped
            </span>
          )}
        </p>
        <div className="flex items-center gap-1">
          {editable && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9"
              onClick={() => onEdit(dose)}
              aria-label="Edit dose"
            >
              <Pencil />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9"
            aria-expanded={open}
            aria-controls={bodyId}
            aria-label={open ? "Hide details" : "Show details"}
            onClick={() => setOpen((v) => !v)}
          >
            <ChevronDown
              className={cn(
                "transition-transform motion-reduce:transition-none",
                open && "rotate-180",
              )}
            />
          </Button>
        </div>
      </div>
      <div className="mt-0.5 flex justify-between text-xs text-muted-foreground">
        <span>{dose.injection_site || "Site not recorded"}</span>
        <span>Pain {dose.pain_0_5 ?? "-"}/5</span>
      </div>
      {open && (
        <div id={bodyId} className="mt-3 grid gap-2">
          <dl className="grid grid-cols-3 gap-2">
            <Stat
              icon={Scale}
              label="Weight"
              value={formatMetric(metrics.weight, "weight")}
            />
            <Stat
              icon={Flame}
              label="Calories"
              value={formatMetric(metrics.calories, "calories")}
            />
            <Stat
              icon={Dumbbell}
              label="Exercise"
              value={formatMetric(metrics.exercise, "exercise")}
            />
          </dl>
          <div className="rounded-2xl border border-border bg-background p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold">
              <MessageSquare
                className="size-3.5 text-primary"
                aria-hidden="true"
              />
              Dose notes
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/80">
              {dose.notes || "---"}
            </p>
          </div>
        </div>
      )}
    </li>
  );
}
