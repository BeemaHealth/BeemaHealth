import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import {
  QuestionnaireRenderer,
  getStepValidationErrors,
  getVisibleStepAt,
  getVisibleStepCount,
} from "@/components/questionnaire/QuestionnaireRenderer";
import { QuizNav } from "@/components/quiz/quiz-primitives";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import { trackStepCompleted, trackStepViewed } from "@/lib/analytics";
import {
  fetchActiveQuestionnaire,
  fetchIntakeMe,
  isApiEnabled,
  syncIntake,
  type QuestionnaireVersionSchema,
} from "@/lib/api/client";
import type { MedicalIntake } from "@/lib/types/mvp";

function applyResponsesToIntake(
  intake: MedicalIntake,
  responses: Record<string, unknown>,
  stepFields: { field_key: string; maps_to_section?: string }[],
): MedicalIntake {
  const next = { ...intake };
  for (const field of stepFields) {
    const section = field.maps_to_section || "identity";
    const value = responses[field.field_key];
    if (value === undefined) continue;
    const bucket = {
      ...(next[section as keyof MedicalIntake] as Record<string, unknown>),
    };
    bucket[field.field_key] = value as string;
    (next as Record<string, unknown>)[section] = bucket;
  }
  next.questionnaire_responses = responses;
  return next;
}

export function IntakeDynamicFlow() {
  const navigate = useNavigate();
  const [schema, setSchema] = useState<QuestionnaireVersionSchema | null>(null);
  const [intake, setIntake] = useState<MedicalIntake | null>(null);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const stepStartedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await fetchIntakeMe();
        const versionId = existing?.questionnaire_version_id ?? undefined;
        const active = await fetchActiveQuestionnaire("intake", versionId);
        if (!cancelled) {
          setSchema(active);
          setIntake(existing);
          setResponses(
            (existing?.questionnaire_responses as Record<string, unknown>) ??
              {},
          );
        }
      } catch {
        if (!cancelled) setFormError("Could not load intake questionnaire.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentStep = schema
    ? getVisibleStepAt(schema, stepIndex, responses)
    : undefined;

  useEffect(() => {
    if (!currentStep || !schema) return;
    stepStartedAt.current = Date.now();
    trackStepViewed("intake", currentStep.step_key, {
      versionId: schema.id,
      stepIndex,
    });
  }, [currentStep?.step_key, schema?.id, stepIndex]);

  async function persist(nextResponses: Record<string, unknown>) {
    if (!isApiEnabled() || !intake || !schema || !currentStep) return;
    const patched = applyResponsesToIntake(
      intake,
      nextResponses,
      currentStep.fields,
    );
    patched.questionnaire_version_id = schema.id;
    const saved = await syncIntake(patched);
    if (saved) setIntake(saved);
    else setIntake(patched);
  }

  async function handleNext() {
    if (!schema || !currentStep || !intake) return;
    const stepErrors = getStepValidationErrors(schema, stepIndex, responses);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      trackStepCompleted(
        "intake",
        currentStep.step_key,
        Date.now() - stepStartedAt.current,
        { versionId: schema.id, stepIndex },
      );
      await persist(responses);
      const total = getVisibleStepCount(schema, responses);
      if (stepIndex + 1 >= total) {
        navigate({ to: "/consent" });
        return;
      }
      setStepIndex((i) => i + 1);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save intake.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <FlowLayout progress={0}>
        <div className="flex justify-center py-24">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </FlowLayout>
    );
  }

  if (!schema || !intake) {
    return (
      <FlowLayout progress={0}>
        <p className="text-center text-destructive">
          {formError || "Intake unavailable."}
        </p>
      </FlowLayout>
    );
  }

  const totalSteps = getVisibleStepCount(schema, responses);

  return (
    <FlowLayout progress={((stepIndex + 1) / totalSteps) * 100}>
      <div className="mx-auto max-w-xl">
        <QuestionnaireRenderer
          schema={schema}
          stepIndex={stepIndex}
          responses={responses}
          errors={errors}
          onChange={(key, value) => {
            setResponses((prev) => {
              const next = { ...prev, [key]: value };
              void persist(next);
              return next;
            });
          }}
        />
        {formError ? (
          <p className="mt-4 text-sm text-destructive">{formError}</p>
        ) : null}
        <QuizNav
          showBack={stepIndex > 0}
          onBack={() => setStepIndex((i) => Math.max(0, i - 1))}
          onNext={() => void handleNext()}
          nextLabel={
            stepIndex + 1 >= totalSteps ? "Continue to consent" : "Continue"
          }
          nextLoading={submitting}
        />
      </div>
    </FlowLayout>
  );
}
