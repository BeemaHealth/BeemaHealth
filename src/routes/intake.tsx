import { useEffect, useMemo, useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { FlowLayout } from "@/components/quiz/FlowLayout";
import {
  ChoiceCard,
  Field,
  QuizNav,
  QuizShell,
  YesNoField,
  inputCls,
} from "@/components/quiz/quiz-primitives";
import { fetchEligibilityMe, fetchIntakeMe, isApiEnabled, syncIntake } from "@/lib/api/client";
import { requireAuth } from "@/lib/auth";
import {
  FAMILY_HISTORY,
  GOAL_OPTIONS,
  INTAKE_EXCLUDED_CONDITION_KEYS,
  INTAKE_STEP_LABELS,
  MEDICAL_CONDITIONS,
  PRIOR_MEDS,
  SAFETY_ACKS,
  WEIGHT_METHODS,
  emptyIntakeData,
} from "@/lib/intake-steps";
import { computeBmi } from "@/lib/safety-flags";
import type { EligibilityResponses, MedicalIntake, User } from "@/lib/types/mvp";
import { getIntake, saveIntake } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/intake")({
  ssr: false,
  beforeLoad: async () => {
    const session = await requireAuth({ redirectTo: "/qualify", redirectPath: "/intake" });
    if (!session.user.email_verified) throw redirect({ to: "/verify-email/pending" });
  },
  component: IntakePage,
});

/** Intake-only identity fields — account/contact data lives on users / patient_profiles. */
const IDENTITY_FIELDS = [
  ["preferred", "Preferred name (optional)"],
  ["address", "Home address"],
  ["city", "City"],
  ["zip", "ZIP"],
  ["emergency_name", "Emergency contact name"],
  ["emergency_phone", "Emergency contact phone"],
] as const;

function IntakePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  if (!session) return null;
  const [step, setStep] = useState(0);
  const [data, setData] = useState<MedicalIntake>(() => makeDraft(session.user.id));
  const [eligibility, setEligibility] = useState<EligibilityResponses | null>(null);
  const [loading, setLoading] = useState(true);
  const total = INTAKE_STEP_LABELS.length;
  const progress = ((step + 1) / total) * 100;

  const intakeConditions = useMemo(
    () => MEDICAL_CONDITIONS.filter(([k]) => !INTAKE_EXCLUDED_CONDITION_KEYS.has(k)),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [draft, elig] = await Promise.all([fetchIntakeMe(), fetchEligibilityMe()]);
      if (cancelled) return;
      setEligibility(elig);
      if (draft) {
        setData(draft);
      } else if (!isApiEnabled()) {
        const local = getIntake(session.user.id);
        if (local) setData(local);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session.user.id]);

  useEffect(() => {
    if (!loading) saveIntake(data);
  }, [data, loading]);

  function patch<K extends keyof MedicalIntake>(section: K, value: MedicalIntake[K]) {
    setData((d) => ({ ...d, [section]: value, updated_at: new Date().toISOString() }));
  }

  async function saveAndExit() {
    await syncIntake({ ...data, status: "draft" });
    navigate({ to: "/dashboard" });
  }

  async function goToConsent() {
    const updated = { ...data, status: "draft" as const, updated_at: new Date().toISOString() };
    await syncIntake(updated);
    navigate({ to: "/consent" });
  }

  const id = data.identity as Record<string, string>;
  const body = data.body_metrics as Record<string, string | string[]>;
  const wh = data.weight_history as {
    methods: string[];
    prior_meds: string[];
    prior_details: Record<string, string>;
  };
  const mc = data.medical_conditions as Record<string, boolean | string>;
  const fh = data.family_history as Record<string, boolean>;
  const meds = data.medications;
  const allergies = data.allergies;
  const preg = data.pregnancy as Record<string, string | boolean>;
  const life = data.lifestyle as Record<string, string | boolean>;
  const labs = data.labs as Record<string, string | boolean>;
  const prefs = data.medication_preferences as Record<string, string | boolean>;
  const acks = data.safety_acknowledgments as Record<string, boolean>;

  const allAcksChecked = SAFETY_ACKS.every(([k]) => acks[k] === true);
  const summaryBmi =
    eligibility?.bmi ??
    computeBmi(
      String(eligibility?.height_ft ?? ""),
      String(eligibility?.height_in ?? 0),
      String(eligibility?.weight_lbs ?? ""),
    );
  const showTreatmentPrefs = !eligibility?.treatment_interest;

  if (loading) {
    return (
      <FlowLayout progress={0}>
        <div className="w-full max-w-xl text-center text-muted-foreground">Loading your intake…</div>
      </FlowLayout>
    );
  }

  return (
    <FlowLayout progress={progress}>
      <QuizShell
        label={INTAKE_STEP_LABELS[step]}
        title={INTAKE_STEP_LABELS[step]}
        subtitle="Plain-language questions. Required fields are marked. Progress saves automatically."
        footer={
          <div className="mt-8 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} className="text-sm text-muted-foreground hover:text-foreground" disabled={step === 0}>
                ← Back
              </button>
              <button type="button" onClick={saveAndExit} className="text-sm text-primary underline">
                Save & continue later
              </button>
            </div>
            <QuizNav
              showBack={false}
              onNext={() => (step < total - 1 ? setStep((s) => s + 1) : void goToConsent())}
              nextDisabled={step === total - 1 && !allAcksChecked}
              nextLabel={step < total - 1 ? "Next" : "Continue to consent"}
            />
          </div>
        }
      >
        {step === 0 && (
          <div className="grid gap-4">
            <AccountSummary user={session.user} eligibility={eligibility} bmi={summaryBmi} />
            <div className="grid gap-3 sm:grid-cols-2">
              {IDENTITY_FIELDS.map(([k, label]) => (
                <Field key={k} label={label} required={k !== "preferred"}>
                  <input
                    className={inputCls}
                    type={k === "emergency_phone" ? "tel" : "text"}
                    value={id[k] ?? ""}
                    onChange={(e) => patch("identity", { ...id, [k]: e.target.value })}
                  />
                </Field>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-4">
            <p className="rounded-2xl bg-primary-soft/50 px-4 py-3 text-sm text-muted-foreground">
              Height, weight, and goal weight are already on file from your eligibility check
              {summaryBmi != null ? ` (BMI ${summaryBmi})` : ""}.
            </p>
            {[
              ["highest_weight", "Highest adult weight (lb)"],
              ["lowest_weight", "Lowest adult weight (lb)"],
              ["waist", "Waist circumference (optional)"],
              ["duration", "How long have you been trying to lose weight?"],
            ].map(([k, label]) => (
              <Field key={k} label={label}>
                <input className={inputCls} value={(body[k] as string) ?? ""} onChange={(e) => patch("body_metrics", { ...body, [k]: e.target.value })} />
              </Field>
            ))}
            <Field label="Main goals (select all)">
              <div className="grid gap-2 sm:grid-cols-2">
                {GOAL_OPTIONS.map((g) => (
                  <ChoiceCard
                    key={g}
                    compact
                    selected={(body.goals as string[]).includes(g)}
                    onClick={() => {
                      const goals = body.goals as string[];
                      patch("body_metrics", {
                        ...body,
                        goals: goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g],
                      });
                    }}
                    title={g}
                  />
                ))}
              </div>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4">
            <Field label="Weight-loss methods tried">
              <div className="grid gap-2 sm:grid-cols-2">
                {WEIGHT_METHODS.map((m) => (
                  <ChoiceCard key={m} compact selected={wh.methods.includes(m)} onClick={() => patch("weight_history", { ...wh, methods: wh.methods.includes(m) ? wh.methods.filter((x) => x !== m) : [...wh.methods, m] })} title={m} />
                ))}
              </div>
            </Field>
            <Field label="Prior GLP-1 / weight medications used">
              <div className="grid gap-2 sm:grid-cols-2">
                {PRIOR_MEDS.map((m) => (
                  <ChoiceCard key={m} compact selected={wh.prior_meds.includes(m)} onClick={() => patch("weight_history", { ...wh, prior_meds: wh.prior_meds.includes(m) ? wh.prior_meds.filter((x) => x !== m) : [...wh.prior_meds, m] })} title={m} />
                ))}
              </div>
            </Field>
            {wh.prior_meds.length > 0 && (
              <div className="grid gap-3">
                {["medication", "dose", "started", "stopped", "stop_reason", "side_effects"].map((f) => (
                  <Field key={f} label={f.replace("_", " ")}>
                    <input className={inputCls} value={wh.prior_details[f] ?? ""} onChange={(e) => patch("weight_history", { ...wh, prior_details: { ...wh.prior_details, [f]: e.target.value } })} />
                  </Field>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4 max-h-[50vh] overflow-y-auto pr-1">
            <p className="text-sm text-muted-foreground">
              Conditions from your eligibility screening are already on file and not shown again.
            </p>
            {intakeConditions.map(([k, label]) => (
              <div key={k}>
                <YesNoField label={label} value={mc[k] === true ? true : mc[k] === false ? false : null} onChange={(v) => patch("medical_conditions", { ...mc, [k]: v })} />
                {mc[k] === true && (
                  <input className={`${inputCls} mt-2`} placeholder="Optional explanation" value={(mc[`${k}_note`] as string) ?? ""} onChange={(e) => patch("medical_conditions", { ...mc, [`${k}_note`]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-4">
            {FAMILY_HISTORY.map(([k, label]) => (
              <YesNoField key={k} label={label} value={fh[k] ?? null} onChange={(v) => patch("family_history", { ...fh, [k]: v })} />
            ))}
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-4">
            {[
              ["taking_prescription", "Currently taking prescription medications?"],
              ["taking_otc", "Taking over-the-counter medications?"],
              ["supplements", "Taking supplements?"],
              ["insulin", "Using insulin?"],
              ["sulfonylurea", "Taking sulfonylurea for diabetes?"],
              ["bp_meds", "Blood pressure medications?"],
              ["psych_meds", "Antidepressants or psychiatric medications?"],
              ["opioids", "Currently taking opioids?"],
              ["weight_meds", "Other weight-loss medication?"],
            ].map(([k, label]) => (
              <YesNoField key={k} label={label} value={meds.answers[k] === true ? true : meds.answers[k] === false ? false : null} onChange={(v) => patch("medications", { ...meds, answers: { ...meds.answers, [k]: v } })} />
            ))}
            <Field label="Medication list">
              {meds.list.map((m, i) => (
                <div key={i} className="mb-2 grid gap-2 sm:grid-cols-2">
                  {(["name", "dose", "frequency", "reason"] as const).map((f) => (
                    <input key={f} className={inputCls} placeholder={f} value={m[f]} onChange={(e) => { const list = [...meds.list]; list[i] = { ...list[i], [f]: e.target.value }; patch("medications", { ...meds, list }); }} />
                  ))}
                </div>
              ))}
              <button type="button" className="text-sm text-primary underline" onClick={() => patch("medications", { ...meds, list: [...meds.list, { name: "", dose: "", frequency: "", reason: "" }] })}>
                + Add medication
              </button>
            </Field>
          </div>
        )}

        {step === 6 && (
          <div className="grid gap-4">
            <YesNoField label="Medication allergies?" value={allergies.answers.has_med === true ? true : allergies.answers.has_med === false ? false : null} onChange={(v) => patch("allergies", { ...allergies, answers: { ...allergies.answers, has_med: v } })} />
            <YesNoField label="Food allergies?" value={allergies.answers.has_food === true ? true : allergies.answers.has_food === false ? false : null} onChange={(v) => patch("allergies", { ...allergies, answers: { ...allergies.answers, has_food: v } })} />
            {allergies.list.map((a, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-3">
                {(["allergy", "reaction", "severity"] as const).map((f) => (
                  <input key={f} className={inputCls} placeholder={f} value={a[f]} onChange={(e) => { const list = [...allergies.list]; list[i] = { ...list[i], [f]: e.target.value }; patch("allergies", { ...allergies, list }); }} />
                ))}
              </div>
            ))}
            <button type="button" className="text-sm text-primary underline" onClick={() => patch("allergies", { ...allergies, list: [...allergies.list, { allergy: "", reaction: "", severity: "" }] })}>
              + Add allergy
            </button>
          </div>
        )}

        {step === 7 && (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              Pregnancy and breastfeeding status were captured during your eligibility screening.
            </p>
            {[
              ["lmp", "Date of last menstrual period (optional)"],
              ["contraception", "Using contraception?"],
            ].map(([k, label]) => (
              <Field key={k} label={label}>
                <input className={inputCls} value={(preg[k] as string) ?? ""} onChange={(e) => patch("pregnancy", { ...preg, [k]: e.target.value })} />
              </Field>
            ))}
            <label className="flex gap-3 text-sm">
              <input type="checkbox" checked={preg.understand === true} onChange={(e) => patch("pregnancy", { ...preg, understand: e.target.checked })} />
              I understand weight-loss medications may not be appropriate during pregnancy or breastfeeding.
            </label>
          </div>
        )}

        {step === 8 && (
          <div className="grid gap-3">
            {[
              ["exercise_days", "Days per week exercising"],
              ["exercise_type", "Type of exercise"],
              ["diet", "How would you describe your diet?"],
              ["smoke", "Do you smoke or vape?"],
              ["alcohol", "Do you drink alcohol?"],
              ["drugs", "Recreational drug use?"],
              ["sleep", "Hours of sleep per night"],
              ["binge", "Binge eating episodes?"],
              ["night_eating", "Frequently eat at night?"],
              ["struggle", "Struggle more with hunger, cravings, portions, or emotional eating?"],
            ].map(([k, label]) => (
              <Field key={k} label={label}>
                <input className={inputCls} value={(life[k] as string) ?? ""} onChange={(e) => patch("lifestyle", { ...life, [k]: e.target.value })} />
              </Field>
            ))}
          </div>
        )}

        {step === 9 && (
          <div className="grid gap-4">
            {[
              ["bp", "Most recent blood pressure"],
              ["a1c", "Most recent A1C"],
              ["glucose", "Most recent fasting glucose"],
              ["cholesterol", "Most recent cholesterol"],
            ].map(([k, label]) => (
              <Field key={k} label={label}>
                <input className={inputCls} value={(labs[k] as string) ?? ""} onChange={(e) => patch("labs", { ...labs, [k]: e.target.value })} />
              </Field>
            ))}
            <YesNoField label="Labs in last 12 months?" value={labs.recent_labs === true ? true : labs.recent_labs === false ? false : null} onChange={(v) => patch("labs", { ...labs, recent_labs: v })} />
            <YesNoField label="Willing to complete labs if required?" value={labs.willing === true ? true : labs.willing === false ? false : null} onChange={(v) => patch("labs", { ...labs, willing: v })} />
            <Field label="Upload lab results, insurance card, or photo ID">
              <input type="file" multiple className="text-sm" onChange={() => patch("labs", { ...labs, uploads_noted: true })} />
            </Field>
          </div>
        )}

        {step === 10 && (
          <div className="grid gap-4">
            {showTreatmentPrefs ? (
              <Field label="Treatment option of interest">
                <div className="grid gap-2">
                  {[
                    ["zepbound", "Zepbound injection"],
                    ["wegovy_inj", "Wegovy injection"],
                    ["wegovy_pill", "Wegovy pill, if available"],
                    ["compounded_sema", "Compounded semaglutide injection, if legally available"],
                    ["provider_choice", "Not sure — provider to recommend"],
                  ].map(([k, label]) => (
                    <ChoiceCard key={k} compact selected={prefs.treatment === k} onClick={() => patch("medication_preferences", { ...prefs, treatment: k })} title={label} />
                  ))}
                </div>
              </Field>
            ) : (
              <p className="rounded-2xl bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Treatment format preference was captured during eligibility ({eligibility?.treatment_interest?.replace(/_/g, " ")}).
              </p>
            )}
            <YesNoField label="Comfortable self-injecting?" value={prefs.self_inject === true ? true : prefs.self_inject === false ? false : null} onChange={(v) => patch("medication_preferences", { ...prefs, self_inject: v })} />
            <Field label="Pharmacy preference (pickup or shipping)">
              <input className={inputCls} value={(prefs.shipping_preference as string) ?? ""} onChange={(e) => patch("medication_preferences", { ...prefs, shipping_preference: e.target.value })} placeholder="Local pickup or home shipping" />
            </Field>
            {["preferred_pharmacy", "pharmacy_phone", "pharmacy_address", "insurance_provider", "member_id"].map((k) => (
              <Field key={k} label={k.replace(/_/g, " ")}>
                <input className={inputCls} value={(prefs[k] as string) ?? ""} onChange={(e) => patch("medication_preferences", { ...prefs, [k]: e.target.value })} />
              </Field>
            ))}
            <YesNoField label="Open to cash-pay if insurance doesn't cover?" value={prefs.cash_pay_ok === true ? true : prefs.cash_pay_ok === false ? false : null} onChange={(v) => patch("medication_preferences", { ...prefs, cash_pay_ok: v })} />
          </div>
        )}

        {step === 11 && (
          <div className="grid gap-3">
            {SAFETY_ACKS.map(([k, label]) => (
              <label key={k} className="flex items-start gap-3 rounded-2xl border border-border px-4 py-3 text-sm">
                <input type="checkbox" className="mt-1 size-4" checked={acks[k] === true} onChange={(e) => patch("safety_acknowledgments", { ...acks, [k]: e.target.checked })} />
                <span>{label}</span>
              </label>
            ))}
          </div>
        )}
      </QuizShell>
    </FlowLayout>
  );
}

function AccountSummary({
  user,
  eligibility,
  bmi,
}: {
  user: User;
  eligibility: EligibilityResponses | null;
  bmi: number | null;
}) {
  const rows = [
    ["Name", `${user.first_name} ${user.last_name}`.trim() || "—"],
    ["Email", user.email],
    ["Phone", user.phone || "—"],
    ["Date of birth", user.dob || eligibility?.dob || "—"],
    ["State", user.state || eligibility?.state || "—"],
    [
      "Height",
      eligibility?.height_ft != null
        ? `${eligibility.height_ft}' ${eligibility.height_in ?? 0}"`
        : "—",
    ],
    ["Weight", eligibility?.weight_lbs != null ? `${eligibility.weight_lbs} lb` : "—"],
    ["Goal weight", eligibility?.goal_weight_lbs != null ? `${eligibility.goal_weight_lbs} lb` : "—"],
    ["BMI", bmi != null ? String(bmi) : "—"],
  ];

  return (
    <div className="rounded-2xl border border-border bg-muted/30 px-4 py-3">
      <p className="text-sm font-medium text-foreground">Already on file from your account & eligibility check</p>
      <dl className="mt-2 grid gap-1 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function makeDraft(userId: string): MedicalIntake {
  const empty = emptyIntakeData();
  return {
    id: crypto.randomUUID(),
    user_id: userId,
    status: "draft",
    ...empty,
    submitted_at: null,
    updated_at: new Date().toISOString(),
  };
}
