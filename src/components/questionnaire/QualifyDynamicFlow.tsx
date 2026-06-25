import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
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
  createFunnelSession,
  fetchActiveQuestionnaire,
  fetchFunnelEligibility,
  isApiEnabled,
  patchFunnelEligibility,
  registerUser,
  type QuestionnaireVersionSchema,
} from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";

export function QualifyDynamicFlow() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [schema, setSchema] = useState<QuestionnaireVersionSchema | null>(null);
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
        let versionId: string | undefined;
        if (!session) {
          const draft =
            (await fetchFunnelEligibility()) ?? (await createFunnelSession());
          if (draft?.questionnaire_version_id) {
            versionId = draft.questionnaire_version_id;
          }
          if (draft?.questionnaire_responses) {
            setResponses(
              draft.questionnaire_responses as Record<string, unknown>,
            );
          }
        }
        const active = await fetchActiveQuestionnaire("qualify", versionId);
        if (!cancelled) setSchema(active);
      } catch {
        if (!cancelled)
          setFormError("Could not load questionnaire configuration.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const currentStep = schema
    ? getVisibleStepAt(schema, stepIndex, responses)
    : undefined;

  useEffect(() => {
    if (!currentStep || !schema) return;
    stepStartedAt.current = Date.now();
    trackStepViewed("qualify", currentStep.step_key, {
      versionId: schema.id,
      stepIndex,
    });
  }, [currentStep?.step_key, schema?.id, stepIndex]);

  async function persistResponses(next: Record<string, unknown>) {
    if (!isApiEnabled()) return;
    await patchFunnelEligibility({
      questionnaire_responses: next,
      questionnaire_version_id: schema?.id,
    } as never);
  }

  async function handleNext() {
    if (!schema || !currentStep) return;
    const stepErrors = getStepValidationErrors(schema, stepIndex, responses);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    setFormError("");
    try {
      trackStepCompleted(
        "qualify",
        currentStep.step_key,
        Date.now() - stepStartedAt.current,
        { versionId: schema.id, stepIndex },
      );

      if (currentStep.step_key === "account" && !session) {
        const email = String(responses.email ?? "");
        const password = String(responses.password ?? "");
        await registerUser({
          email,
          password,
          first_name: String(responses.first_name ?? ""),
          last_name: String(responses.last_name ?? ""),
          phone: String(responses.phone ?? ""),
        });
        navigate({ to: "/intake" });
        return;
      }

      await persistResponses(responses);
      const total = getVisibleStepCount(schema, responses);
      if (stepIndex + 1 >= total) {
        if (session) {
          navigate({ to: "/intake" });
        }
        return;
      }
      setStepIndex((i) => i + 1);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Could not save progress.");
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

  if (!schema) {
    return (
      <FlowLayout progress={0}>
        <p className="text-center text-destructive">
          {formError || "Questionnaire unavailable."}
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
              void persistResponses(next);
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
            stepIndex + 1 >= totalSteps && session
              ? "Continue to intake"
              : "Continue"
          }
          nextLoading={submitting}
        />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            search={{ redirect: "/qualify" }}
            className="text-primary underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </FlowLayout>
  );
}
