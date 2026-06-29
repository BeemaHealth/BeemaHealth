import { useMemo, useState } from "react";
import type { QuestionnaireVersionSchema } from "@/lib/api/client";
import { BelugaPayloadDevTable } from "@/components/questionnaire/BelugaPayloadDevTable";
import { QuestionnaireReviewProductionView } from "@/components/questionnaire/QuestionnaireReviewProductionView";
import { Button } from "@/components/ui/button";
import {
  buildBelugaDoctorReview,
  isBelugaReviewDebugEnabled,
  type BelugaAccountExtras,
} from "@/lib/questionnaire/beluga-review";
import type { RegistrationFields } from "@/lib/questionnaire/registration";

/** staff = builder node placeholder; preview = dev/prod toggle; patient = live funnel */
export type QuestionnaireReviewVariant = "patient" | "staff" | "preview";

type QuestionnaireReviewFieldProps = {
  variant?: QuestionnaireReviewVariant;
  qualifySchema?: QuestionnaireVersionSchema | null;
  qualifyResponses?: Record<string, unknown>;
  intakeSchema?: QuestionnaireVersionSchema | null;
  intakeResponses?: Record<string, unknown>;
  registration?: RegistrationFields;
  accountExtras?: BelugaAccountExtras;
  value: boolean;
  required?: boolean;
  readOnly?: boolean;
  onChange: (confirmed: boolean) => void;
};

export function QuestionnaireReviewField({
  variant = "patient",
  qualifySchema,
  qualifyResponses = {},
  intakeSchema,
  intakeResponses = {},
  registration,
  accountExtras,
  value,
  required = false,
  readOnly = false,
  onChange,
}: QuestionnaireReviewFieldProps) {
  const review = useMemo(
    () =>
      buildBelugaDoctorReview({
        qualifySchema,
        qualifyResponses,
        intakeSchema: intakeSchema ?? qualifySchema,
        intakeResponses,
        registration,
        accountExtras,
      }),
    [
      qualifySchema,
      qualifyResponses,
      intakeSchema,
      intakeResponses,
      registration,
      accountExtras,
    ],
  );

  const [previewMode, setPreviewMode] = useState<"dev" | "production">("dev");
  const canTogglePreview =
    variant === "preview" && isBelugaReviewDebugEnabled();

  const stillNeeded = [
    ...review.fields.filter((f) => f.status !== "filled"),
    ...review.missingAssignments,
  ];
  const hasGaps = stillNeeded.length > 0;
  const blockConfirm = hasGaps && variant === "patient";

  if (variant === "staff") {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        Patients review their answers and confirm everything is correct before
        continuing.
      </div>
    );
  }

  if (canTogglePreview && previewMode === "dev") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Preview mode: developer payload
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
            onClick={() => setPreviewMode("production")}
          >
            Switch to production view
          </Button>
        </div>
        <BelugaPayloadDevTable review={review} />
        {!readOnly && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border px-4 py-3">
            <input
              type="checkbox"
              className="mt-1 size-4 rounded border-input"
              checked={value}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="text-sm text-foreground">
              Preview: confirm review (dev)
            </span>
          </label>
        )}
      </div>
    );
  }

  if (canTogglePreview && previewMode === "production") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">
            Preview mode: patient view
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl text-xs"
            onClick={() => setPreviewMode("dev")}
          >
            Switch to dev view
          </Button>
        </div>
        <QuestionnaireReviewProductionView
          review={review}
          value={value}
          required={required}
          readOnly={readOnly}
          blockConfirm={false}
          onChange={onChange}
        />
      </div>
    );
  }

  return (
    <QuestionnaireReviewProductionView
      review={review}
      value={value}
      required={required}
      readOnly={readOnly}
      blockConfirm={blockConfirm}
      onChange={onChange}
    />
  );
}
