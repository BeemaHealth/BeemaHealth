import type { LucideIcon } from "lucide-react";
import type { AccountSectionTone } from "@/components/portal/AccountSectionCard";
import {
  accountSectionNavActiveClass,
  accountSectionNavIconClass,
} from "@/components/portal/AccountSectionCard";
import { getIntakeStepMeta } from "@/lib/intake-portal-ui";
import { INTAKE_STEP_LABELS } from "@/lib/intake-steps";
import { cn } from "@/lib/utils";

export function IntakePortalStepNav({
  step,
  applicableSteps,
  submitting,
  onSelect,
  className,
}: {
  step: number;
  applicableSteps: number[];
  submitting: boolean;
  onSelect: (index: number) => void;
  className?: string;
}) {
  return (
    <nav className={className}>
      <ol className="space-y-1.5">
        {INTAKE_STEP_LABELS.map((label, index) => {
          const applicable = applicableSteps.includes(index);
          const active = step === index;
          const meta = getIntakeStepMeta(index);
          const Icon = meta.icon;

          return (
            <li key={label}>
              <button
                type="button"
                disabled={!applicable || submitting}
                onClick={() => onSelect(index)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm transition-colors",
                  active && accountSectionNavActiveClass(meta.tone),
                  !active && applicable && "text-foreground hover:bg-muted/55",
                  !applicable && "cursor-not-allowed text-muted-foreground/45",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-xl",
                    active
                      ? accountSectionNavIconClass(meta.tone)
                      : applicable
                        ? "bg-muted text-muted-foreground"
                        : "bg-muted/50 text-muted-foreground/50",
                  )}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{label}</span>
                  <span className="block text-xs text-muted-foreground">
                    Step {index + 1}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function IntakePortalStepNavSelect({
  step,
  applicableSteps,
  onSelect,
  className,
}: {
  step: number;
  applicableSteps: number[];
  onSelect: (index: number) => void;
  className?: string;
}) {
  const meta = getIntakeStepMeta(step);
  const Icon = meta.icon;

  return (
    <label className={cn("grid gap-2 text-sm", className)}>
      <span className="font-medium text-foreground">Jump to section</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Icon className="size-4" aria-hidden />
        </span>
        <select
          className="w-full appearance-none rounded-2xl border border-input bg-background py-3 pl-14 pr-4"
          value={step}
          onChange={(e) => onSelect(Number(e.target.value))}
        >
          {INTAKE_STEP_LABELS.map((label, index) =>
            applicableSteps.includes(index) ? (
              <option key={label} value={index}>
                {index + 1}. {label}
              </option>
            ) : null,
          )}
        </select>
      </div>
    </label>
  );
}

export function intakeStepToneFor(step: number): AccountSectionTone {
  return getIntakeStepMeta(step).tone;
}

export function intakeStepIconFor(step: number): LucideIcon {
  return getIntakeStepMeta(step).icon;
}
