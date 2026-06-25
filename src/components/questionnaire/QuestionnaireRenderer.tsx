import { useMemo } from "react";
import type {
  QuestionnaireStepSchema,
  QuestionnaireVersionSchema,
} from "@/lib/api/client";
import {
  getVisibleSteps,
  validateStepFields,
} from "@/lib/questionnaire/validation";
import { renderQuestionnaireField } from "@/components/questionnaire/FieldRegistry";
import { QuizShell } from "@/components/quiz/quiz-primitives";

type QuestionnaireRendererProps = {
  schema: QuestionnaireVersionSchema;
  stepIndex: number;
  responses: Record<string, unknown>;
  onChange: (fieldKey: string, value: unknown) => void;
  errors?: Record<string, string>;
  preview?: boolean;
  stepLabels?: Record<string, string>;
};

export function QuestionnaireRenderer({
  schema,
  stepIndex,
  responses,
  onChange,
  errors = {},
  preview = false,
  stepLabels,
}: QuestionnaireRendererProps) {
  const visibleSteps = useMemo(
    () => getVisibleSteps(schema.steps, responses),
    [schema.steps, responses],
  );
  const currentStep: QuestionnaireStepSchema | undefined =
    visibleSteps[stepIndex];

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
        {currentStep.fields.map((field) => (
          <div key={field.field_key}>
            {renderQuestionnaireField(field, {
              value: responses[field.field_key],
              onChange: (v) => onChange(field.field_key, v),
              error: errors[field.field_key],
              preview,
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
