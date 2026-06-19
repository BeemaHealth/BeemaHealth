import { useMemo, useState } from "react";
import {
  IntakePortalStepNav,
  IntakePortalStepNavSelect,
} from "@/components/intake/IntakePortalStepNav";
import {
  AccountSectionCard,
  DisplayField,
} from "@/components/portal/AccountSectionCard";
import { INTAKE_STEP_LABELS } from "@/lib/intake-steps";
import { getIntakeStepMeta } from "@/lib/intake-portal-ui";
import {
  snapshotRowsForStep,
  snapshotStepTitle,
} from "@/lib/intake-submission-display";
import type { IntakeSubmissionSnapshot } from "@/lib/types/mvp";

const ALL_INTAKE_STEPS = INTAKE_STEP_LABELS.map((_, index) => index);

export function IntakeSubmissionViewer({
  snapshot,
  version,
}: {
  snapshot: IntakeSubmissionSnapshot;
  version?: number;
}) {
  const [step, setStep] = useState(0);
  const rows = snapshotRowsForStep(step, snapshot);
  const stepMeta = getIntakeStepMeta(step);
  const StepIcon = stepMeta.icon;
  const submittedAt = snapshot.meta?.submitted_at
    ? new Date(snapshot.meta.submitted_at).toLocaleDateString()
    : null;

  const versionBanner = useMemo(
    () => (
      <div className="rounded-2xl border border-border/80 bg-muted/50 px-4 py-3 text-sm">
        {version != null && (
          <span className="font-semibold text-foreground">
            Intake version {version}
          </span>
        )}
        {submittedAt && (
          <span className="text-muted-foreground">
            {version != null ? " · " : ""}
            Submitted {submittedAt}
          </span>
        )}
      </div>
    ),
    [submittedAt, version],
  );

  return (
    <div className="space-y-4 pb-1">
      {versionBanner}

      <div className="gap-4 lg:grid lg:grid-cols-[minmax(0,14rem)_1fr] lg:gap-4">
        <IntakePortalStepNav
          className="hidden lg:block"
          step={step}
          applicableSteps={ALL_INTAKE_STEPS}
          submitting={false}
          onSelect={setStep}
        />

        <div className="min-w-0 space-y-4">
          <IntakePortalStepNavSelect
            className="lg:hidden"
            step={step}
            applicableSteps={ALL_INTAKE_STEPS}
            onSelect={setStep}
          />

          <AccountSectionCard
            title={snapshotStepTitle(step)}
            description={stepMeta.description}
            icon={StepIcon}
            tone={stepMeta.tone}
          >
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No responses recorded for this section.
              </p>
            ) : (
              <dl className="grid gap-4 sm:grid-cols-2">
                {rows.map((row) => (
                  <DisplayField
                    key={`${step}-${row.label}`}
                    label={row.label}
                    value={row.value}
                    className={
                      row.value.length > 80 ? "sm:col-span-2" : undefined
                    }
                  />
                ))}
              </dl>
            )}
          </AccountSectionCard>
        </div>
      </div>
    </div>
  );
}
