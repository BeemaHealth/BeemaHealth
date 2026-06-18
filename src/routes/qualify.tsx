import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import {
  BlockedMessage,
  ChoiceCard,
  Field,
  PasswordInput,
  QuizNav,
  QuizShell,
  YesNoField,
  inputCls,
} from "@/components/quiz/quiz-primitives";
import { DateOfBirthField } from "@/components/quiz/DateOfBirthField";
import {
  createFunnelSession,
  fetchEligibilityMe,
  fetchFunnelEligibility,
  isApiEnabled,
  patchFunnelEligibility,
  registerUser,
  syncEligibility,
} from "@/lib/api/client";
import {
  ACCOUNT_STEP,
  CONTRAINDICATION_QUESTIONS,
  PRE_SIGNUP_STEPS,
  PRIMARY_GOAL_OPTIONS,
  allPreSignupConsents,
  computeIsAdult,
  hasAllPreSignupConsents,
  resolveQualifyStepIndex,
  SEX_OPTIONS,
  STEP_LABELS,
  STEP_SUBTITLES,
  STEP_TITLES,
  TREATMENT_INTEREST_OPTIONS,
  TREATMENT_PRIORITY_OPTIONS,
  WEIGHT_LOSS_GOAL_OPTIONS,
  type QualifyStepId,
} from "@/lib/qualify-steps";
import { computeBmi } from "@/lib/safety-flags";
import { useAuth } from "@/context/AuthContext";
import { US_STATES } from "@/lib/veya-data";
import type {
  EligibilityResponses,
  EligibilitySafetyScreen,
  PreSignupConsents,
  PrimaryGoal,
  SexAssignedAtBirth,
  TargetWeightLossRange,
  TreatmentInterest,
  TreatmentPriority,
} from "@/lib/types/mvp";

export const Route = createFileRoute("/qualify")({
  head: () => ({
    meta: [
      { title: "Eligibility check — Aretide" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EligibilityPage,
});

type FormState = {
  treatmentInterest: TreatmentInterest | "";
  primaryGoal: PrimaryGoal | "";
  treatmentPriority: TreatmentPriority | "";
  targetWeightLossRange: TargetWeightLossRange | "";
  state: string;
  consents: PreSignupConsents;
  dob: string;
  heightFt: string;
  heightIn: string;
  weightLbs: string;
  goalWeightLbs: string;
  sexAssignedAtBirth: SexAssignedAtBirth | "";
  safety: EligibilitySafetyScreen;
  email: string;
  password: string;
};

const initial: FormState = {
  treatmentInterest: "",
  primaryGoal: "",
  treatmentPriority: "",
  targetWeightLossRange: "",
  state: "",
  consents: {},
  dob: "",
  heightFt: "",
  heightIn: "",
  weightLbs: "",
  goalWeightLbs: "",
  sexAssignedAtBirth: "",
  safety: {},
  email: "",
  password: "",
};

function draftToForm(draft: EligibilityResponses): FormState {
  return {
    treatmentInterest: draft.treatment_interest || "",
    primaryGoal: draft.primary_goal || "",
    treatmentPriority: draft.treatment_priority || "",
    targetWeightLossRange: draft.target_weight_loss_range || "",
    state: draft.state || "",
    consents: draft.pre_signup_consents || {},
    dob: draft.dob || "",
    heightFt: draft.height_ft != null ? String(draft.height_ft) : "",
    heightIn: draft.height_in != null ? String(draft.height_in) : "",
    weightLbs: draft.weight_lbs != null ? String(draft.weight_lbs) : "",
    goalWeightLbs: draft.goal_weight_lbs != null ? String(draft.goal_weight_lbs) : "",
    sexAssignedAtBirth: draft.sex_assigned_at_birth || "",
    safety: draft.safety_screen || {},
    email: "",
    password: "",
  };
}

function formToPayload(data: FormState): Partial<EligibilityResponses> {
  const isAdult = computeIsAdult(data.dob);
  return {
    treatment_interest: data.treatmentInterest || undefined,
    primary_goal: data.primaryGoal || undefined,
    treatment_priority: data.treatmentPriority || undefined,
    target_weight_loss_range: data.targetWeightLossRange || undefined,
    state: data.state || undefined,
    pre_signup_consents: data.consents,
    dob: data.dob || undefined,
    is_18_or_older: isAdult,
    height_ft: data.heightFt ? Number(data.heightFt) : undefined,
    height_in: data.heightIn ? Number(data.heightIn) : undefined,
    weight_lbs: data.weightLbs ? Number(data.weightLbs) : undefined,
    goal_weight_lbs: data.goalWeightLbs ? Number(data.goalWeightLbs) : undefined,
    sex_assigned_at_birth: data.sexAssignedAtBirth || undefined,
    safety_screen: data.safety,
  };
}

function EligibilityPage() {
  const navigate = useNavigate();
  const { session: existingSession, isInitialized, setSession } = useAuth();
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<FormState>(initial);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isApiEnabled());

  const steps: QualifyStepId[] = existingSession
    ? PRE_SIGNUP_STEPS
    : [...PRE_SIGNUP_STEPS, ACCOUNT_STEP];

  const currentStep = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const bmi = useMemo(
    () => computeBmi(data.heightFt, data.heightIn, data.weightLbs),
    [data.heightFt, data.heightIn, data.weightLbs],
  );

  const isAdult = computeIsAdult(data.dob);
  const under18 = isAdult === false;
  const safetyConcern = CONTRAINDICATION_QUESTIONS.some((q) => data.safety[q.key] === true);

  useEffect(() => {
    if (!isApiEnabled()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const stepList: QualifyStepId[] = existingSession
          ? PRE_SIGNUP_STEPS
          : [...PRE_SIGNUP_STEPS, ACCOUNT_STEP];

        let draft: EligibilityResponses | null = null;
        if (existingSession) {
          draft = await fetchEligibilityMe();
        } else {
          draft = await fetchFunnelEligibility();
          if (!draft) draft = await createFunnelSession();
        }

        if (!cancelled && draft) {
          const restored = draftToForm(draft);
          setData((prev) => ({ ...prev, ...restored }));
          setStepIndex(resolveQualifyStepIndex(stepList, restored));
        }
      } catch {
        if (!cancelled) setError("Could not restore your progress. You can still continue.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [existingSession]);

  async function persistDraft() {
    if (!isApiEnabled()) return;
    const payload = formToPayload(data);
    if (existingSession) {
      await syncEligibility(payload);
    } else {
      await patchFunnelEligibility(payload);
    }
  }

  const canContinue = (() => {
    switch (currentStep) {
      case "treatment_interest":
        return Boolean(data.treatmentInterest);
      case "primary_goal":
        return Boolean(data.primaryGoal);
      case "treatment_priority":
        return Boolean(data.treatmentPriority);
      case "weight_loss_goal":
        return Boolean(data.targetWeightLossRange);
      case "state_consent":
        return Boolean(data.state) && hasAllPreSignupConsents(data.consents);
      case "dob":
        return Boolean(data.dob) && isAdult !== null;
      case "body_metrics":
        return Boolean(data.heightFt && data.weightLbs && data.goalWeightLbs);
      case "sex_assigned_at_birth":
        return Boolean(data.sexAssignedAtBirth);
      case "contraindications":
        return CONTRAINDICATION_QUESTIONS.every((q) => typeof data.safety[q.key] === "boolean");
      case "review":
        return true;
      case "account":
        return Boolean(data.email) && data.password.length >= 10;
      default:
        return false;
    }
  })();

  async function handleNext() {
    setError("");
    if (currentStep === "account" || (currentStep === "review" && existingSession)) {
      await handleFinish();
      return;
    }
    setSubmitting(true);
    try {
      await persistDraft();
      setStepIndex((i) => i + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your progress.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFinish() {
    setSubmitting(true);
    setError("");
    try {
      if (existingSession) {
        await persistDraft();
        if (existingSession.user.email_verified) {
          navigate({ to: "/intake" });
        } else {
          navigate({ to: "/verify-email/pending" });
        }
        return;
      }

      await persistDraft();
      const session = await registerUser({
        email: data.email,
        password: data.password,
      });
      setSession(session);
      navigate({ to: "/verify-email/pending" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isInitialized || loading) {
    return (
      <FlowLayout progress={0}>
        <div className="w-full max-w-xl text-center text-muted-foreground">Loading your progress…</div>
      </FlowLayout>
    );
  }

  return (
    <FlowLayout progress={progress}>
      <QuizShell
        label={STEP_LABELS[currentStep]}
        title={STEP_TITLES[currentStep]}
        subtitle={STEP_SUBTITLES[currentStep]}
        footer={
          <>
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            {under18 && currentStep === "dob" && (
              <div className="mt-4">
                <BlockedMessage
                  title="Aretide is currently only available for adults 18 and older."
                  body="We cannot continue with this intake. If you have questions, contact support."
                />
              </div>
            )}
            {safetyConcern && currentStep === "contraindications" && (
              <p className="mt-4 rounded-2xl bg-warning/10 px-4 py-3 text-sm text-foreground">
                Some answers may need a closer look from your clinician. This does not
                automatically approve or deny treatment.
              </p>
            )}
            {!under18 && (
              <QuizNav
                showBack={stepIndex > 0}
                onBack={() => setStepIndex((i) => i - 1)}
                onNext={() => void handleNext()}
                nextDisabled={!canContinue || submitting}
                nextLabel={
                  submitting
                    ? "Saving…"
                    : currentStep === "account"
                      ? "Create account"
                      : currentStep === "review" && existingSession
                        ? "Continue to medical intake"
                        : currentStep === "review"
                          ? "Create account"
                          : "Continue"
                }
              />
            )}
            {currentStep === "account" && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" search={{ redirect: "/intake" }} className="text-primary underline">
                  Log in
                </Link>
              </p>
            )}
          </>
        }
      >
        {currentStep === "treatment_interest" && (
          <div className="grid gap-2">
            {TREATMENT_INTEREST_OPTIONS.map((opt) => (
              <ChoiceCard
                key={opt.value}
                compact
                selected={data.treatmentInterest === opt.value}
                onClick={() => set("treatmentInterest", opt.value)}
                title={opt.label}
              />
            ))}
          </div>
        )}

        {currentStep === "primary_goal" && (
          <div className="grid gap-2">
            {PRIMARY_GOAL_OPTIONS.map((opt) => (
              <ChoiceCard
                key={opt.value}
                compact
                selected={data.primaryGoal === opt.value}
                onClick={() => set("primaryGoal", opt.value)}
                title={opt.label}
              />
            ))}
          </div>
        )}

        {currentStep === "treatment_priority" && (
          <div className="grid gap-2">
            {TREATMENT_PRIORITY_OPTIONS.map((opt) => (
              <ChoiceCard
                key={opt.value}
                compact
                selected={data.treatmentPriority === opt.value}
                onClick={() => set("treatmentPriority", opt.value)}
                title={opt.label}
              />
            ))}
          </div>
        )}

        {currentStep === "weight_loss_goal" && (
          <div className="grid gap-2">
            {WEIGHT_LOSS_GOAL_OPTIONS.map((opt) => (
              <ChoiceCard
                key={opt.value}
                compact
                selected={data.targetWeightLossRange === opt.value}
                onClick={() => set("targetWeightLossRange", opt.value)}
                title={opt.label}
              />
            ))}
          </div>
        )}

        {currentStep === "state_consent" && (
          <div className="grid gap-4">
            <Field label="Your state" required>
              <select
                className={inputCls}
                value={data.state}
                onChange={(e) => set("state", e.target.value)}
              >
                <option value="">Choose a state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border px-4 py-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={hasAllPreSignupConsents(data.consents)}
                onChange={(e) => set("consents", allPreSignupConsents(e.target.checked))}
              />
              <span className="text-sm text-foreground">
                I have read and agree to the{" "}
                <Link to="/legal/terms" className="text-primary underline" target="_blank">
                  Terms of Service
                </Link>
                ,{" "}
                <Link to="/legal/privacy" className="text-primary underline" target="_blank">
                  Privacy Policy
                </Link>
                , and{" "}
                <Link to="/legal/telehealth-consent" className="text-primary underline" target="_blank">
                  Telehealth Consent
                </Link>
                .
              </span>
            </label>
          </div>
        )}

        {currentStep === "dob" && (
          <DateOfBirthField value={data.dob} onChange={(v) => set("dob", v)} />
        )}

        {currentStep === "body_metrics" && (
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Height (ft)" required>
                <input type="number" className={inputCls} value={data.heightFt} onChange={(e) => set("heightFt", e.target.value)} placeholder="5" />
              </Field>
              <Field label="Height (in)" required>
                <input type="number" className={inputCls} value={data.heightIn} onChange={(e) => set("heightIn", e.target.value)} placeholder="8" />
              </Field>
              <Field label="Weight (lb)" required>
                <input type="number" className={inputCls} value={data.weightLbs} onChange={(e) => set("weightLbs", e.target.value)} placeholder="190" />
              </Field>
            </div>
            <Field label="Target weight (lb)" required>
              <input type="number" className={inputCls} value={data.goalWeightLbs} onChange={(e) => set("goalWeightLbs", e.target.value)} />
            </Field>
            {bmi != null && (
              <p className="rounded-2xl bg-primary-soft/50 px-4 py-3 text-sm">
                Estimated BMI: <strong>{bmi}</strong>
              </p>
            )}
          </div>
        )}

        {currentStep === "sex_assigned_at_birth" && (
          <div className="grid grid-cols-2 gap-2">
            {SEX_OPTIONS.map((opt) => (
              <ChoiceCard
                key={opt.value}
                compact
                selected={data.sexAssignedAtBirth === opt.value}
                onClick={() => set("sexAssignedAtBirth", opt.value)}
                title={opt.label}
              />
            ))}
          </div>
        )}

        {currentStep === "contraindications" && (
          <div className="grid gap-5">
            {CONTRAINDICATION_QUESTIONS.map((q) => (
              <YesNoField
                key={q.key}
                label={q.label}
                value={data.safety[q.key] ?? null}
                onChange={(v) => set("safety", { ...data.safety, [q.key]: v })}
              />
            ))}
          </div>
        )}

        {currentStep === "review" && (
          <div className="space-y-3 text-sm">
            <SummaryRow label="Care format" value={labelFor(TREATMENT_INTEREST_OPTIONS, data.treatmentInterest)} />
            <SummaryRow label="Motivation" value={labelFor(PRIMARY_GOAL_OPTIONS, data.primaryGoal)} />
            <SummaryRow label="Care priority" value={labelFor(TREATMENT_PRIORITY_OPTIONS, data.treatmentPriority)} />
            <SummaryRow label="Target range" value={labelFor(WEIGHT_LOSS_GOAL_OPTIONS, data.targetWeightLossRange)} />
            <SummaryRow label="State" value={data.state || "—"} />
            <SummaryRow label="BMI" value={bmi?.toString() ?? "—"} />
            <SummaryRow label="Biological sex" value={labelFor(SEX_OPTIONS, data.sexAssignedAtBirth)} />
            {safetyConcern && (
              <p className="flex items-center gap-2 rounded-2xl bg-warning/10 px-4 py-3 text-foreground">
                <CheckCircle2 className="size-4" /> Marked for clinician review
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {existingSession
                ? "Up next: your medical intake questionnaire."
                : "Up next: create your account, then complete the medical intake."}
            </p>
          </div>
        )}

        {currentStep === "account" && (
          <div className="grid gap-4">
            <Field label="Email" required>
              <input type="email" className={inputCls} value={data.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
            </Field>
            <Field label="Password (min 10 characters)" required>
              <PasswordInput value={data.password} onChange={(v) => set("password", v)} autoComplete="new-password" />
            </Field>
            <p className="text-sm text-muted-foreground">
              Your legal name, phone, and address are collected once in the medical intake after you verify your email.
            </p>
          </div>
        )}
      </QuizShell>
    </FlowLayout>
  );
}

function labelFor<T extends string>(
  options: ReadonlyArray<{ value: T; label: string }>,
  value: string,
) {
  return options.find((o) => o.value === value)?.label ?? (value || "—");
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl border border-border px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
