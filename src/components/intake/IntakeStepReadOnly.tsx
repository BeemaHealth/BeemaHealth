import { DisplayField } from "@/components/portal/AccountSectionCard";
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
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <DisplayField
          key={`${step}-${row.label}`}
          label={row.label}
          value={row.value}
          className={row.value.length > 80 ? "sm:col-span-2" : undefined}
        />
      ))}
    </dl>
  );
}
