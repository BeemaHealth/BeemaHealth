import { useState } from "react";
import { cn } from "@/lib/utils";
import { inputCls } from "@/components/quiz/quiz-primitives";
import {
  INTAKE_STEP_LABELS,
  snapshotRowsForStep,
  snapshotStepTitle,
} from "@/lib/intake-submission-display";
import type { IntakeSubmissionSnapshot } from "@/lib/types/mvp";

export function IntakeSubmissionViewer({
  snapshot,
  version,
}: {
  snapshot: IntakeSubmissionSnapshot;
  version?: number;
}) {
  const [step, setStep] = useState(0);
  const rows = snapshotRowsForStep(step, snapshot);
  const submittedAt = snapshot.meta?.submitted_at
    ? new Date(snapshot.meta.submitted_at).toLocaleDateString()
    : null;

  return (
    <div className="space-y-4 pb-1">
      <div className="rounded-xl bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        {version != null && (
          <span className="font-medium text-foreground">
            Intake version {version}
          </span>
        )}
        {submittedAt && (
          <span>
            {version != null ? " · " : ""}
            Submitted {submittedAt}
          </span>
        )}
      </div>

      <label className="grid gap-1.5 text-sm md:hidden">
        <span className="font-medium text-foreground">Intake section</span>
        <select
          className={inputCls}
          value={step}
          onChange={(e) => setStep(Number(e.target.value))}
        >
          {INTAKE_STEP_LABELS.map((label, index) => (
            <option key={label} value={index}>
              {index + 1}. {label}
            </option>
          ))}
        </select>
      </label>

      <div className="gap-4 md:grid md:grid-cols-[minmax(0,11rem)_1fr] md:gap-4">
        <nav className="mb-4 hidden md:mb-0 md:block">
          <ol className="space-y-1">
            {INTAKE_STEP_LABELS.map((label, index) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                    step === index
                      ? "bg-primary-soft font-medium text-primary"
                      : "text-foreground hover:bg-muted/60",
                  )}
                >
                  <span className="text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="truncate">{label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className="min-w-0 rounded-2xl border border-border bg-card">
          <h3 className="border-b border-border px-4 py-3 text-base font-semibold text-foreground">
            {snapshotStepTitle(step)}
          </h3>
          <div className="px-4 py-3">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No responses recorded for this section.
              </p>
            ) : (
              <dl className="grid gap-2.5 text-sm">
                {rows.map((row) => (
                  <div
                    key={`${step}-${row.label}`}
                    className="grid gap-1 border-b border-border/60 pb-2 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,42%)_1fr] sm:gap-4"
                  >
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="break-words font-medium text-foreground">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
