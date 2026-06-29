import type { BelugaDoctorReview } from "@/lib/questionnaire/beluga-review";
import { NOTICE_BANNER_STYLES } from "@/lib/design-tokens";

type QuestionnaireReviewProductionViewProps = {
  review: BelugaDoctorReview;
  value: boolean;
  required?: boolean;
  readOnly?: boolean;
  blockConfirm?: boolean;
  onChange: (confirmed: boolean) => void;
};

/** Patient-facing review: human labels only, no API field names. */
export function QuestionnaireReviewProductionView({
  review,
  value,
  required = false,
  readOnly = false,
  blockConfirm = false,
  onChange,
}: QuestionnaireReviewProductionViewProps) {
  const sendingToDoctor = review.fields.filter((f) => f.status === "filled");
  const stillNeeded = [
    ...review.fields.filter((f) => f.status !== "filled"),
    ...review.missingAssignments,
  ];
  const seenNeeded = new Set<string>();
  const missingLabels = stillNeeded
    .map((f) => f.label)
    .filter((label) => {
      if (seenNeeded.has(label)) return false;
      seenNeeded.add(label);
      return true;
    });
  const hasGaps = missingLabels.length > 0;

  return (
    <div className="space-y-6">
      {hasGaps ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${NOTICE_BANNER_STYLES.warning}`}
        >
          <p className="font-medium text-foreground">
            A few details are still needed
          </p>
          <p className="mt-1 text-muted-foreground">
            Please complete:{" "}
            <span className="font-medium text-foreground">
              {missingLabels.join(", ")}
            </span>
            . Go back and fill those in, then return here to confirm.
          </p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
        {sendingToDoctor.length === 0 ? (
          <p className="px-4 py-3 text-sm text-muted-foreground">
            Complete the earlier steps and your answers will appear here for you
            to review.
          </p>
        ) : (
          <dl className="divide-y divide-border">
            {sendingToDoctor.map((field) => (
              <div
                key={field.beluga}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] sm:gap-4"
              >
                <dt className="text-sm font-medium text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="text-sm text-foreground whitespace-pre-line">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      {!readOnly && (
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 size-4 rounded border-input"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={blockConfirm}
          />
          <span className="text-sm text-foreground">
            I confirm these answers are complete and accurate to the best of my
            knowledge.
            {required ? <span className="text-destructive"> *</span> : null}
            {blockConfirm ? (
              <span className="mt-1 block text-xs text-muted-foreground">
                Please provide the missing details above before continuing.
              </span>
            ) : null}
          </span>
        </label>
      )}
    </div>
  );
}
