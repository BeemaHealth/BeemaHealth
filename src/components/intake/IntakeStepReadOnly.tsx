import { snapshotRowsForStep } from "@/lib/intake-submission-display";
import type { IntakeSubmissionSnapshot } from "@/lib/types/mvp";

export function IntakeStepReadOnly({
  step,
  snapshot,
}: {
  step: number;
  snapshot: IntakeSubmissionSnapshot;
}) {
  const rows = snapshotRowsForStep(step, snapshot);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No responses recorded for this section.
      </p>
    );
  }

  return (
    <dl className="grid gap-3 text-sm">
      {rows.map((row) => (
        <div
          key={`${step}-${row.label}`}
          className="grid gap-1 border-b border-border/60 pb-3 last:border-0 last:pb-0 sm:grid-cols-[minmax(0,38%)_1fr] sm:gap-4"
        >
          <dt className="text-muted-foreground">{row.label}</dt>
          <dd className="font-medium text-foreground break-words">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
