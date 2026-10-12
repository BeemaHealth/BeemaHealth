import { AlertCircle, ChevronRight, CreditCard } from "lucide-react";
import { motion } from "motion/react";
import {
  treatmentCardState,
  type ActionItem,
  type TreatmentSummary,
} from "@/lib/api/portal/home";
import { STATUS_BADGE_STYLES } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

type Props = {
  treatment: TreatmentSummary;
  items: ActionItem[];
  index?: number;
  onOpen: (treatment: TreatmentSummary) => void;
};

function doseLine(t: TreatmentSummary): string {
  const strength = t.prescribed_strength_mg ?? t.requested_strength_mg;
  if (strength) return `${Number(strength)} mg`;
  return t.requested_dose_label;
}

/** One My Treatments card, with payment error and action required states. */
export function TreatmentCard({ treatment, items, index = 0, onOpen }: Props) {
  const state = treatmentCardState(treatment, items);
  const tone = STATUS_BADGE_STYLES[state.tone];
  const dose = doseLine(treatment);
  return (
    <motion.li
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{
        delay: 0.06 * index,
        duration: 0.32,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="list-none"
    >
      <button
        type="button"
        onClick={() => onOpen(treatment)}
        className={cn(
          "flex w-full flex-col gap-4 rounded-3xl border bg-card p-5 text-left shadow-soft transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          state.needsAction ? "border-warning/50" : "border-border",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate font-display text-lg font-semibold">
              {treatment.product_name}
            </h3>
            {treatment.plan_name && (
              <p className="truncate text-sm text-muted-foreground">
                {treatment.plan_name}
              </p>
            )}
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
              tone.badge,
            )}
          >
            <span
              className={cn("size-1.5 rounded-full", tone.dot)}
              aria-hidden="true"
            />
            {treatment.status_label}
          </span>
        </div>
        {dose && (
          <p className="text-sm">
            <span className="text-muted-foreground">Dose </span>
            <span className="font-medium">{dose}</span>
            {treatment.dose_changed_by_doctor && (
              <span className="ml-2 text-xs text-muted-foreground">
                (adjusted by your provider)
              </span>
            )}
          </p>
        )}
        {state.callout && (
          <p
            className={cn(
              "flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-medium",
              state.paymentIssue
                ? "bg-destructive/10 text-destructive"
                : "bg-warning/15 text-foreground",
            )}
          >
            {state.paymentIssue ? (
              <CreditCard className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            )}
            {state.callout}
          </p>
        )}
        <span className="inline-flex items-center text-sm font-medium text-muted-foreground">
          View details{" "}
          <ChevronRight className="ml-0.5 size-4" aria-hidden="true" />
        </span>
      </button>
    </motion.li>
  );
}
