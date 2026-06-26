import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { trackStepCompleted, trackStepViewed } from "@/lib/analytics";
import { useAuth } from "@/context/AuthContext";
import {
  fetchActiveQuestionnaire,
  fetchEligibilityMe,
  fetchIntakeMe,
  fetchPatientProfile,
  isApiEnabled,
  resolveIntakeQuestionnaire,
  syncIntake,
  type QuestionnaireVersionSchema,
} from "@/lib/api/client";
import {
  flattenAddressGroupForSection,
  hydrateAddressResponsesFromIntake,
} from "@/lib/questionnaire/address-group";
import type {
  EligibilityResponses,
  MedicalIntake,
  PatientProfile,
  User,
} from "@/lib/types/mvp";
import type { BelugaAccountExtras } from "@/lib/questionnaire/beluga-review";

function buildAccountExtras(
  user: User | null,
  profile: PatientProfile | null,
  eligibility: EligibilityResponses | null,
): BelugaAccountExtras | undefined {
  if (!user && !profile && !eligibility) return undefined;
  const sexRaw = profile?.sex_assigned_at_birth?.trim();
  let sex: string | undefined;
  if (sexRaw === "male") sex = "Male";
  else if (sexRaw === "female") sex = "Female";
  else if (sexRaw === "intersex") sex = "Other";
  return {
    firstName: user?.first_name?.trim() || undefined,
    lastName: user?.last_name?.trim() || undefined,
    email: user?.email?.trim() || undefined,
    phone: user?.phone?.trim() || undefined,
    dob: user?.dob?.trim() || eligibility?.dob?.trim() || undefined,
    state: user?.state?.trim() || eligibility?.state?.trim() || undefined,
    address: profile?.address?.trim() || undefined,
    city: profile?.city?.trim() || undefined,
    zip: profile?.zip?.trim() || undefined,
    sex,
  };
}

function applyResponsesToIntake(
  intake: MedicalIntake,
  responses: Record<string, unknown>,
  stepFields: {
    field_key: string;
    field_type?: string;
    maps_to_section?: string;
  }[],
): MedicalIntake {
  const next = { ...intake };
  const sectionPatches = new Map<string, Record<string, unknown>>();

  for (const field of stepFields) {
    if (
      field.field_type === "review" ||
      field.field_type === "account" ||
      field.field_type === "legal_consent"
    ) {
      continue;
    }
    const value = responses[field.field_key];
    if (value === undefined) continue;
    const section = field.maps_to_section || "identity";
    if (!sectionPatches.has(section)) {
      sectionPatches.set(section, {
        ...((next[section as keyof MedicalIntake] as Record<string, unknown>) ??
          {}),
      });
    }
    const bucket = sectionPatches.get(section)!;
    if (field.field_type === "address_group") {
      Object.assign(bucket, flattenAddressGroupForSection(value, section));
    } else {
      bucket[field.field_key] = value;
    }
  }

  for (const [section, bucket] of sectionPatches) {
    (next as Record<string, unknown>)[section] = bucket;
  }
  next.questionnaire_responses = responses;
  return next;
}

export function IntakeDynamicFlow() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const user = session?.user ?? null;
  const [schema, setSchema] = useState<QuestionnaireVersionSchema | null>(null);
  const [qualifySchema, setQualifySchema] =
    useState<QuestionnaireVersionSchema | null>(null);
  const [qualifyResponses, setQualifyResponses] = useState<
    Record<string, unknown>
  >({});
  const [accountExtras, setAccountExtras] = useState<
    BelugaAccountExtras | undefined
  >();
  const [intake, setIntake] = useState<MedicalIntake | null>(null);
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [history, setHistory] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [expectedState, setExpectedState] = useState<string | null>(null);
  const stepStartedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await fetchIntakeMe();
        const eligibility = await fetchEligibilityMe();
        const profile = await fetchPatientProfile();
        let active: QuestionnaireVersionSchema;
        let loadedQualifySchema: QuestionnaireVersionSchema | null = null;
        if (eligibility?.questionnaire_version_id) {
          try {
            loadedQualifySchema = await fetchActiveQuestionnaire(
              "qualify",
              eligibility.questionnaire_version_id,
            );
          } catch {
            loadedQualifySchema = null;
          }
        }
        if (existing?.questionnaire_version_id) {
          active = await fetchActiveQuestionnaire(
            "intake",
            existing.questionnaire_version_id,
          );
        } else if (
          eligibility?.selected_intake_questionnaire_slug &&
          eligibility.questionnaire_version_id
        ) {
          active = await fetchActiveQuestionnaire(
            eligibility.selected_intake_questionnaire_slug,
          );
        } else if (eligibility?.questionnaire_version_id) {
          const resolved = await resolveIntakeQuestionnaire({
            qualify_version_id: eligibility.questionnaire_version_id,
            questionnaire_responses:
              (eligibility.questionnaire_responses as Record<
                string,
                unknown
              >) ?? {},
          });
          active = resolved.version;
        } else {
          active = await fetchActiveQuestionnaire("intake");
        }
        if (!cancelled) {
          setSchema(active);
          setQualifySchema(loadedQualifySchema);
          setQualifyResponses(
            (eligibility?.questionnaire_responses as Record<string, unknown>) ??
              {},
          );
          setAccountExtras(buildAccountExtras(user, profile, eligibility));
          setIntake(existing);
          setExpectedState(eligibility?.state ?? null);
          const baseResponses =
            (existing?.questionnaire_responses as Record<string, unknown>) ??
            (eligibility?.questionnaire_responses as Record<string, unknown>) ??
            {};
          const allFields = active.steps.flatMap((s) => s.fields);
          setResponses(
            existing
              ? hydrateAddressResponsesFromIntake(
                  allFields,
                  existing,
                  baseResponses,
                )
              : baseResponses,
          );
          if (
            existing &&
            !existing.questionnaire_version_id &&
            isApiEnabled()
          ) {
            const patched = {
              ...existing,
              questionnaire_version_id: active.id,
            };
            const saved = await syncIntake(patched);
            if (saved) setIntake(saved);
          }
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
  }, [user]);

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
    const stepErrors = getStepValidationErrorsByKey(
      schema,
      currentStep.step_key,
      responses,
    );
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      trackStepCompleted(
        schema.questionnaire_slug,
        currentStep.step_key,
        Date.now() - stepStartedAt.current,
        { versionId: schema.id, stepIndex },
      );
      await persist(responses);
      const nextStep = resolveNextStep(currentStep, responses, schema.steps);
      if (!nextStep) {
        navigate({ to: "/consent" });
        return;
      }
      setHistory((h) => [...h, nextStep.step_key]);
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
  const isLastStep =
    currentStep && !resolveNextStep(currentStep, responses, schema.steps);

  return (
    <FlowLayout progress={progress}>
      <div className="mx-auto w-full max-w-xl">
        <QuestionnaireRenderer
          schema={schema}
          stepIndex={stepIndex}
          stepKey={currentStepKey}
          responses={responses}
          errors={errors}
          expectedState={expectedState}
          qualifySchema={qualifySchema}
          qualifyResponses={qualifyResponses}
          accountExtras={accountExtras}
          reviewVariant="patient"
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
          showBack={history.length > 1}
          onBack={() => setHistory((h) => h.slice(0, -1))}
          onNext={() => void handleNext()}
          nextLabel={isLastStep ? "Continue to consent" : "Continue"}
          nextLoading={submitting}
        />
      </div>
    </FlowLayout>
  );
}
