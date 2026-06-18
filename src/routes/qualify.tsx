import { useMemo, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import {
  BlockedMessage,
  ChoiceCard,
  Field,
  QuizNav,
  QuizShell,
  YesNoField,
  inputCls,
} from "@/components/quiz/quiz-primitives";
import { registerUser, syncEligibility } from "@/lib/api/client";
import { computeBmi } from "@/lib/safety-flags";
import { getSession } from "@/lib/storage";
import { US_STATES } from "@/lib/veya-data";
import type {
  BiologicalSex,
  BudgetRange,
  EligibilityResponses,
  InjectionPreference,
  TreatmentInterest,
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

const STEP_LABELS = [
  "Basic info",
  "Your account",
  "Location",
  "Treatment interest",
  "Safety screen",
  "Review",
];

type FormState = {
  heightFt: string;
  heightIn: string;
  weight: string;
  goalWeight: string;
  biologicalSex: BiologicalSex | "";
  isAdult: boolean | null;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  dob: string;
  state: string;
  locatedInState: boolean | null;
  livesInState: boolean | null;
  city: string;
  zip: string;
  treatmentInterest: TreatmentInterest | "";
  injectionPreference: InjectionPreference | "";
  budget: BudgetRange | "";
  safety: Record<string, boolean>;
};

const initial: FormState = {
  heightFt: "",
  heightIn: "",
  weight: "",
  goalWeight: "",
  biologicalSex: "",
  isAdult: null,
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  phone: "",
  dob: "",
  state: "",
  locatedInState: null,
  livesInState: null,
  city: "",
  zip: "",
  treatmentInterest: "",
  injectionPreference: "",
  budget: "",
  safety: {},
};

const SAFETY_QUESTIONS = [
  { key: "pregnant", label: "Are you currently pregnant, trying to become pregnant, or breastfeeding?" },
  { key: "thyroid_cancer", label: "Personal or family history of medullary thyroid cancer?" },
  { key: "men2", label: "Multiple Endocrine Neoplasia syndrome type 2 (MEN2)?" },
  { key: "pancreatitis", label: "History of pancreatitis?" },
  { key: "glp1_reaction", label: "Severe allergic reaction to semaglutide, tirzepatide, or similar medications?" },
] as const;

function EligibilityPage() {
  const navigate = useNavigate();
  const existingSession = getSession();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>(initial);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const bmi = useMemo(
    () => computeBmi(data.heightFt, data.heightIn, data.weight),
    [data.heightFt, data.heightIn, data.weight],
  );

  const under18 = data.isAdult === false;

  const safetyConcern = SAFETY_QUESTIONS.some((q) => data.safety[q.key] === true);

  const skipAccountStep = !!existingSession;
  const visibleSteps = skipAccountStep ? STEP_LABELS.filter((_, i) => i !== 1) : STEP_LABELS;
  const totalSteps = visibleSteps.length;
  const logicalStep = skipAccountStep && step >= 1 ? step + 1 : step;
  const progress = ((step + 1) / totalSteps) * 100;

  const canContinue = (() => {
    switch (logicalStep) {
      case 0:
        return (
          data.heightFt &&
          data.weight &&
          data.goalWeight &&
          data.biologicalSex &&
          data.isAdult !== null
        );
      case 1:
        return (
          data.email &&
          data.password.length >= 8 &&
          data.firstName &&
          data.lastName &&
          data.phone &&
          data.dob &&
          data.state
        );
      case 2:
        return (
          data.livesInState !== null &&
          data.locatedInState !== null &&
          data.city &&
          data.zip
        );
      case 3:
        return data.treatmentInterest && data.injectionPreference && data.budget;
      case 4:
        return SAFETY_QUESTIONS.every((q) => typeof data.safety[q.key] === "boolean");
      default:
        return true;
    }
  })();

  async function handleFinish() {
    setSubmitting(true);
    setError("");
    try {
      const session =
        existingSession ??
        (await registerUser({
          email: data.email,
          password: data.password,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          dob: data.dob,
          state: data.state,
        }));

      const record: EligibilityResponses = {
        id: crypto.randomUUID(),
        user_id: session.user.id,
        height_ft: data.heightFt,
        height_in: data.heightIn,
        weight: data.weight,
        bmi,
        goal_weight: data.goalWeight,
        biological_sex: data.biologicalSex,
        is_adult: data.isAdult,
        lives_in_colorado: data.livesInState,
        located_in_colorado: data.locatedInState,
        city: data.city,
        zip: data.zip,
        treatment_interest: data.treatmentInterest,
        injection_preference: data.injectionPreference,
        budget: data.budget,
        safety_screen: data.safety,
        safety_concern_flag: safetyConcern,
        created_at: new Date().toISOString(),
      };
      await syncEligibility(record);
      navigate({ to: "/intake" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FlowLayout progress={progress}>
      <QuizShell
        step={step}
        totalSteps={totalSteps}
        label={visibleSteps[step]}
        title={getTitle(logicalStep)}
        subtitle={getSubtitle(logicalStep)}
        footer={
          <>
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            {under18 && logicalStep === 0 && (
              <div className="mt-4">
                <BlockedMessage
                  title="Aretide is currently only available for adults 18 and older."
                  body="We cannot continue with this intake. If you have questions, contact support."
                />
              </div>
            )}
            {safetyConcern && logicalStep === 4 && (
              <p className="mt-4 rounded-2xl bg-warning/10 px-4 py-3 text-sm text-foreground">
                One or more answers will be flagged for provider review. This does not
                automatically approve or deny treatment.
              </p>
            )}
            {!under18 && (
              <QuizNav
                showBack={step > 0}
                onBack={() => setStep((s) => s - 1)}
                onNext={() => {
                  if (logicalStep === 5) void handleFinish();
                  else setStep((s) => s + 1);
                }}
                nextDisabled={!canContinue || submitting}
                nextLabel={
                  logicalStep === 5
                    ? submitting
                      ? "Saving…"
                      : "Continue to medical intake"
                    : "Continue"
                }
              />
            )}
            {logicalStep === 1 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" search={{ redirect: "/qualify" }} className="text-primary underline">
                  Log in
                </Link>
              </p>
            )}
          </>
        }
      >
        {logicalStep === 0 && (
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Height (ft)" required>
                <input type="number" className={inputCls} value={data.heightFt} onChange={(e) => set("heightFt", e.target.value)} placeholder="5" />
              </Field>
              <Field label="Height (in)" required>
                <input type="number" className={inputCls} value={data.heightIn} onChange={(e) => set("heightIn", e.target.value)} placeholder="8" />
              </Field>
              <Field label="Weight (lb)" required>
                <input type="number" className={inputCls} value={data.weight} onChange={(e) => set("weight", e.target.value)} placeholder="190" />
              </Field>
            </div>
            <Field label="Goal weight (lb)" required>
              <input type="number" className={inputCls} value={data.goalWeight} onChange={(e) => set("goalWeight", e.target.value)} />
            </Field>
            <Field label="Biological sex" required>
              <div className="grid grid-cols-3 gap-2">
                {(["female", "male", "other"] as const).map((s) => (
                  <ChoiceCard key={s} compact selected={data.biologicalSex === s} onClick={() => set("biologicalSex", s)} title={s.charAt(0).toUpperCase() + s.slice(1)} />
                ))}
              </div>
            </Field>
            <YesNoField label="Are you at least 18 years old?" value={data.isAdult} onChange={(v) => set("isAdult", v)} />
            {bmi != null && (
              <p className="rounded-2xl bg-primary-soft/50 px-4 py-3 text-sm">
                Estimated BMI: <strong>{bmi}</strong>
              </p>
            )}
          </div>
        )}

        {logicalStep === 1 && (
          <div className="grid gap-4">
            <Field label="Email" required><input type="email" className={inputCls} value={data.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Password (min 8 characters)" required><input type="password" className={inputCls} value={data.password} onChange={(e) => set("password", e.target.value)} /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name" required><input className={inputCls} value={data.firstName} onChange={(e) => set("firstName", e.target.value)} /></Field>
              <Field label="Last name" required><input className={inputCls} value={data.lastName} onChange={(e) => set("lastName", e.target.value)} /></Field>
            </div>
            <Field label="Phone" required><input type="tel" className={inputCls} value={data.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Date of birth" required><input type="date" className={inputCls} value={data.dob} onChange={(e) => set("dob", e.target.value)} /></Field>
            <Field label="State of residence" required>
              <select
                className={inputCls}
                value={data.state}
                onChange={(e) => set("state", e.target.value)}
              >
                <option value="">Select your state</option>
                {US_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {logicalStep === 2 && (
          <div className="grid gap-4">
            <YesNoField
              label={`Do you currently live in ${data.state || "your state of residence"}?`}
              value={data.livesInState}
              onChange={(v) => set("livesInState", v)}
            />
            <YesNoField
              label={`Are you physically located in ${data.state || "your state of residence"} right now?`}
              value={data.locatedInState}
              onChange={(v) => set("locatedInState", v)}
            />
            <Field label="City" required><input className={inputCls} value={data.city} onChange={(e) => set("city", e.target.value)} /></Field>
            <Field label="ZIP code" required><input className={inputCls} value={data.zip} onChange={(e) => set("zip", e.target.value)} /></Field>
          </div>
        )}

        {logicalStep === 3 && (
          <div className="grid gap-5">
            <Field label="Which best describes your interest?" required>
              <div className="grid gap-2">
                <ChoiceCard compact selected={data.treatmentInterest === "insurance_brand"} onClick={() => set("treatmentInterest", "insurance_brand")} title="Brand-name medication through insurance" />
                <ChoiceCard compact selected={data.treatmentInterest === "cash_pay"} onClick={() => set("treatmentInterest", "cash_pay")} title="Cash-pay options" />
                <ChoiceCard compact selected={data.treatmentInterest === "not_sure"} onClick={() => set("treatmentInterest", "not_sure")} title="I'm not sure" />
              </div>
            </Field>
            <Field label="Comfortable with injections?" required>
              <div className="grid gap-2">
                <ChoiceCard compact selected={data.injectionPreference === "yes"} onClick={() => set("injectionPreference", "yes")} title="Yes" />
                <ChoiceCard compact selected={data.injectionPreference === "pill_preferred"} onClick={() => set("injectionPreference", "pill_preferred")} title="No, I prefer a pill if possible" />
                <ChoiceCard compact selected={data.injectionPreference === "not_sure"} onClick={() => set("injectionPreference", "not_sure")} title="Not sure" />
              </div>
            </Field>
            <Field label="Approximate monthly medication budget" required>
              <div className="grid gap-2">
                {[
                  ["under_200", "Under $200"],
                  ["200_300", "$200–$300"],
                  ["300_500", "$300–$500"],
                  ["500_plus", "$500+"],
                  ["insurance", "I plan to use insurance"],
                ].map(([v, label]) => (
                  <ChoiceCard key={v} compact selected={data.budget === v} onClick={() => set("budget", v as BudgetRange)} title={label} />
                ))}
              </div>
            </Field>
          </div>
        )}

        {logicalStep === 4 && (
          <div className="grid gap-5">
            {SAFETY_QUESTIONS.map((q) => (
              <YesNoField
                key={q.key}
                label={q.label}
                value={data.safety[q.key] ?? null}
                onChange={(v) => set("safety", { ...data.safety, [q.key]: v })}
              />
            ))}
          </div>
        )}

        {logicalStep === 5 && (
          <div className="space-y-3 text-sm">
            <SummaryRow label="BMI" value={bmi?.toString() ?? "—"} />
            <SummaryRow label="State" value={data.state || "—"} />
            <SummaryRow label="City / ZIP" value={`${data.city}, ${data.zip}`} />
            <SummaryRow label="Treatment interest" value={data.treatmentInterest} />
            {safetyConcern && (
              <p className="flex items-center gap-2 rounded-2xl bg-warning/10 px-4 py-3 text-foreground">
                <CheckCircle2 className="size-4" /> Flagged for provider safety review
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Next: complete the full medical intake questionnaire. You can save and continue later.
            </p>
          </div>
        )}
      </QuizShell>
    </FlowLayout>
  );
}

function getTitle(step: number) {
  const titles = [
    "Let's check your eligibility",
    "Create your account",
    "Confirm your location",
    "Treatment preferences",
    "Safety screening",
    "Review eligibility answers",
  ];
  return titles[step] ?? "";
}

function getSubtitle(step: number) {
  const subs = [
    "A few basic questions to start. This takes about 2 minutes.",
    "We need an account before your full medical intake.",
    "Confirm where you live and where you are right now for telehealth compliance.",
    "Help us understand what you're looking for. No prescription is guaranteed.",
    "Answer honestly — a licensed provider will review everything.",
    "Confirm your answers, then continue to the medical intake.",
  ];
  return subs[step];
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-2xl border border-border px-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
