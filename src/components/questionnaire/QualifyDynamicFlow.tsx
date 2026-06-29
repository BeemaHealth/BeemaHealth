import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import {
  QuestionnaireRenderer,
  getStepValidationErrorsByKey,
} from "@/components/questionnaire/QuestionnaireRenderer";
import {
  countStepsForward,
  getEntryStep,
  progressPercentFromLevel,
  resolveNextStep,
} from "@/lib/questionnaire/step-routing";
import { QuizNav } from "@/components/quiz/quiz-primitives";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import {
  trackStepCompleted,
  trackStepViewed,
  trackCtaClicked,
} from "@/lib/analytics";
import {
  createFunnelSession,
  fetchActiveQuestionnaire,
  fetchEligibilityMe,
  fetchFunnelEligibility,
  isApiEnabled,
  patchFunnelEligibility,
  patchFunnelSessionAttribution,
  registerUser,
  syncEligibility,
  type QuestionnaireVersionSchema,
} from "@/lib/api/client";
import {
  emptyRegistrationFields,
  isRegistrationStep,
  validateRegistrationFields,
} from "@/lib/questionnaire/registration";
import { useAuth } from "@/context/AuthContext";

export function QualifyDynamicFlow() {
  const navigate = useNavigate();
  const { session, setSession } = useAuth();
  const [schema, setSchema] = useState<QuestionnaireVersionSchema | null>(null);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [history, setHistory] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [reg, setReg] = useState(emptyRegistrationFields());
  const stepStartedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const ctaId = params.get("cta_id")?.trim();

        let versionId: string | undefined;
        if (session) {
          const eligibility = await fetchEligibilityMe();
          if (eligibility?.questionnaire_version_id) {
            versionId = eligibility.questionnaire_version_id;
          }
          if (eligibility?.questionnaire_responses) {
            setResponses(
              eligibility.questionnaire_responses as Record<string, unknown>,
            );
          }
        } else {
          let draft =
            (await fetchFunnelEligibility()) ??
            (await createFunnelSession(ctaId ? { cta_id: ctaId } : undefined));
          // Attribution may re-pin the qualify version to the one this CTA
          // maps to (only before any answers exist) — use its fresh result.
          if (ctaId) {
            const attributed = await patchFunnelSessionAttribution({
              cta_id: ctaId,
            });
            if (attributed) draft = attributed;
          }
          if (draft?.questionnaire_version_id) {
            versionId = draft.questionnaire_version_id;
          }
          if (draft?.questionnaire_responses) {
            setResponses(
              draft.questionnaire_responses as Record<string, unknown>,
            );
          }
        }

        // Track the CTA click only after the funnel session (HttpOnly cookie)
        // exists, so the event is attributed to the session rather than landing
        // unlinked. Authenticated visitors attach it to their user instead.
        if (ctaId) {
          trackCtaClicked(ctaId, "qualify");
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

  // Initialise the navigation history at the entry step once the schema loads.
  useEffect(() => {
    if (!schema || history.length > 0) return;
    const entry = getEntryStep(schema.steps, responses);
    if (entry) setHistory([entry.step_key]);
  }, [schema, history.length, responses]);

  const currentStepKey = history[history.length - 1];
  const currentStep =
    schema && currentStepKey
      ? schema.steps.find((s) => s.step_key === currentStepKey)
      : undefined;
  const stepIndex = history.length - 1;

  useEffect(() => {
    if (!currentStep || !schema) return;
    stepStartedAt.current = Date.now();
    trackStepViewed(schema.questionnaire_slug, currentStep.step_key, {
      versionId: schema.id,
      stepIndex,
    });
  }, [
    currentStep?.step_key,
    schema?.id,
    schema?.questionnaire_slug,
    stepIndex,
  ]);

  async function persistResponses(next: Record<string, unknown>) {
    if (!isApiEnabled()) return;
    const payload = {
      questionnaire_responses: next,
      questionnaire_version_id: schema?.id,
    } as Partial<import("@/lib/types/mvp").EligibilityResponses>;
    if (session) {
      await syncEligibility(payload);
    } else {
      await patchFunnelEligibility(payload as never);
    }
  }

  async function handleNext() {
    if (!schema || !currentStep) return;
    const onRegistrationStep = isRegistrationStep(currentStep);

    const stepErrors = getStepValidationErrorsByKey(
      schema,
      currentStep.step_key,
      responses,
    );
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    if (onRegistrationStep && !session) {
      const regError = validateRegistrationFields(reg);
      if (regError) {
        setFormError(regError);
        return;
      }
    }
    setErrors({});
    setSubmitting(true);
    setFormError("");
    try {
      trackStepCompleted(
        schema.questionnaire_slug,
        currentStep.step_key,
        Date.now() - stepStartedAt.current,
        { versionId: schema.id, stepIndex },
      );

      // Persist answers + the resolved qualify version first so the intake step
      // can resolve the routed intake from these responses.
      await persistResponses(responses);

      // Create the account when reaching the registration step (detected by the
      // account_registration plugin, not a hardcoded step key) so custom
      // flowcharts advance into the intake correctly.
      let activeSession = session;
      if (onRegistrationStep && !activeSession) {
        const regError = validateRegistrationFields(reg);
        if (regError) {
          setFormError(regError);
          setSubmitting(false);
          return;
        }
        activeSession = await registerUser({
          email: reg.email.trim(),
          password: reg.password,
          first_name: reg.firstName.trim(),
          last_name: reg.lastName.trim(),
          phone: reg.phone.trim(),
        });
        setSession(activeSession);
        navigate({ to: "/intake" });
        return;
      }

      const nextStep = resolveNextStep(currentStep, responses, schema.steps);
      if (!nextStep) {
        if (activeSession) {
          navigate({ to: "/intake" });
        } else {
          setFormError(
            "Add an account step to this questionnaire so patients can continue to the medical intake.",
          );
        }
        return;
      }
      setHistory((h) => [...h, nextStep.step_key]);
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

  const onRegistrationStep = isRegistrationStep(currentStep);
  const stepsAhead = currentStep
    ? countStepsForward(currentStep, responses, schema.steps)
    : 0;
  const levelProgress = progressPercentFromLevel(schema.steps, currentStep);
  const routeProgress =
    history.length + stepsAhead > 0
      ? Math.round((history.length / (history.length + stepsAhead)) * 100)
      : 0;
  const progress = schema.steps.some((s) => (s.progress_level ?? 0) > 0)
    ? levelProgress
    : routeProgress;
  const isLastStep = currentStep
    ? !resolveNextStep(currentStep, responses, schema.steps)
    : false;
  const nextLabel =
    onRegistrationStep && !session
      ? "Create account"
      : isLastStep
        ? "Continue to intake"
        : "Continue";

  return (
    <FlowLayout progress={progress}>
      <div className="mx-auto w-full max-w-xl">
        <QuestionnaireRenderer
          schema={schema}
          stepIndex={stepIndex}
          stepKey={currentStepKey}
          responses={responses}
          errors={errors}
          registration={{ value: reg, onChange: setReg }}
          signedIn={!!session}
          onChange={(key, value) => {
            setResponses((prev) => {
              const next = { ...prev, [key]: value };
              void persistResponses(next);
              return next;
            });
            setErrors((prev) => {
              if (!prev[key]) return prev;
              const rest = { ...prev };
              delete rest[key];
              return rest;
            });
          }}
        />
        {formError ? (
          <p className="mt-4 text-sm text-destructive">{formError}</p>
        ) : null}
        <QuizNav
          showBack={history.length > 1}
          onBack={() => setHistory((h) => h.slice(0, -1))}
          onNext={() => void handleNext()}
          nextLabel={nextLabel}
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
