import { useMemo } from "react";
import type {
  QuestionnaireStepSchema,
  QuestionnaireVersionSchema,
} from "@/lib/api/client";
import {
  getVisibleSteps,
  validateStepFields,
} from "@/lib/questionnaire/validation";
import { sortQuestionnaireFields } from "@/lib/questionnaire/sort-fields";
import { renderQuestionnaireField } from "@/components/questionnaire/FieldRegistry";
import { QuizShell } from "@/components/quiz/quiz-primitives";

import type { RegistrationFields } from "@/lib/questionnaire/registration";
import type { BelugaAccountExtras } from "@/lib/questionnaire/beluga-review";
import type { QuestionnaireReviewVariant } from "@/components/questionnaire/QuestionnaireReviewField";

type QuestionnaireRendererProps = {
  schema: QuestionnaireVersionSchema;
  stepIndex: number;
  /** When set, the step is selected by key (graph navigation) over stepIndex. */
  stepKey?: string;
  responses: Record<string, unknown>;
  onChange: (fieldKey: string, value: unknown) => void;
  errors?: Record<string, string>;
  readOnly?: boolean;
  stepLabels?: Record<string, string>;
  /** Patient state for address verification (home / shipping). */
  expectedState?: string | null;
  registration?: {
    value: RegistrationFields;
    onChange: (next: RegistrationFields) => void;
  };
  signedIn?: boolean;
  qualifySchema?: QuestionnaireVersionSchema | null;
  qualifyResponses?: Record<string, unknown>;
  accountExtras?: BelugaAccountExtras;
  reviewVariant?: QuestionnaireReviewVariant;
};

export function QuestionnaireRenderer({
  schema,
  stepIndex,
  stepKey,
  responses,
  onChange,
  errors = {},
  readOnly = false,
  stepLabels,
  expectedState,
  registration,
  signedIn,
  qualifySchema,
  qualifyResponses,
  accountExtras,
  reviewVariant,
}: QuestionnaireRendererProps) {
  const visibleSteps = useMemo(
    () => getVisibleSteps(schema.steps, responses),
    [schema.steps, responses],
  );
  const currentStep: QuestionnaireStepSchema | undefined = stepKey
    ? schema.steps.find((s) => s.step_key === stepKey)
    : visibleSteps[stepIndex];

  if (!currentStep) {
    return (
      <p className="text-sm text-muted-foreground">
        No step available at this index.
      </p>
    );
  }

  const navLabel =
    stepLabels?.[currentStep.step_key] ?? currentStep.title.slice(0, 24);

  return (
    <QuizShell
      label={navLabel}
      title={currentStep.title}
      subtitle={currentStep.subtitle}
    >
      <div className="space-y-6">
        {sortQuestionnaireFields(currentStep.fields).map((field) => (
          <div key={field.field_key}>
            {renderQuestionnaireField(field, {
              value: responses[field.field_key],
              onChange: (v) => onChange(field.field_key, v),
              error: errors[field.field_key],
              readOnly,
              expectedState,
              registration,
              signedIn,
              schema,
              allResponses: responses,
              qualifySchema,
              qualifyResponses,
              accountExtras,
              reviewVariant,
            })}
          </div>
        ))}
      </div>
    </QuizShell>
  );
}

export function getStepValidationErrors(
  schema: QuestionnaireVersionSchema,
  stepIndex: number,
  responses: Record<string, unknown>,
): Record<string, string> {
  const visibleSteps = getVisibleSteps(schema.steps, responses);
  const step = visibleSteps[stepIndex];
  if (!step) return { _step: "Invalid step." };
  return validateStepFields(step, responses);
}

export function getStepValidationErrorsByKey(
  schema: QuestionnaireVersionSchema,
  stepKey: string,
  responses: Record<string, unknown>,
): Record<string, string> {
  const step = schema.steps.find((s) => s.step_key === stepKey);
  if (!step) return { _step: "Invalid step." };
  return validateStepFields(step, responses);
}

export function getVisibleStepCount(
  schema: QuestionnaireVersionSchema,
  responses: Record<string, unknown>,
): number {
  return getVisibleSteps(schema.steps, responses).length;
}

export function getVisibleStepAt(
  schema: QuestionnaireVersionSchema,
  stepIndex: number,
  responses: Record<string, unknown>,
): QuestionnaireStepSchema | undefined {
  return getVisibleSteps(schema.steps, responses)[stepIndex];
}
