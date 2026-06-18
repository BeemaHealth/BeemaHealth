/**
 * Medical intake step field definitions — keeps intake route readable.
 */

import { isIdentityAddressComplete } from "@/lib/address-validation";
import type { MedicalIntake } from "@/lib/types/mvp";

export const INTAKE_STEP_LABELS = [
  "Identity & contact",
  "Weight history & goals",
  "Weight-loss history",
  "Medical conditions",
  "Family history",
  "Current medications",
  "Allergies",
  "Pregnancy & reproductive",
  "Lifestyle",
  "Labs & vitals",
  "Medication preferences",
  "Safety acknowledgments",
] as const;

export const MEDICAL_CONDITIONS = [
  ["type1_diabetes", "Type 1 diabetes"],
  ["type2_diabetes", "Type 2 diabetes"],
  ["prediabetes", "Prediabetes"],
  ["high_bp", "High blood pressure"],
  ["high_cholesterol", "High cholesterol"],
  ["heart_disease", "Heart disease"],
  ["stroke", "Stroke"],
  ["sleep_apnea", "Sleep apnea"],
  ["kidney", "Kidney disease"],
  ["kidney_severe", "Severe kidney disease"],
  ["liver", "Liver disease"],
  ["gallbladder", "Gallbladder disease"],
  ["pancreatitis", "Pancreatitis"],
  ["gastroparesis", "Gastroparesis or delayed stomach emptying"],
  ["gi_reflux", "Severe acid reflux or GI disease"],
  ["thyroid", "Thyroid disease"],
  ["thyroid_cancer", "Medullary thyroid cancer"],
  ["men2", "Multiple Endocrine Neoplasia syndrome type 2 (MEN2)"],
  ["eating_disorder", "Eating disorder history"],
  ["depression", "Depression"],
  ["anxiety", "Anxiety"],
  ["bipolar", "Bipolar disorder"],
  ["suicidal", "Suicidal thoughts or self-harm history"],
  ["cancer", "Cancer history"],
  ["recent_surgery", "Recent major surgery"],
  ["upcoming_surgery", "Upcoming surgery or anesthesia"],
  ["other_major", "Other major medical conditions"],
] as const;

export const FAMILY_HISTORY = [
  ["thyroid_cancer", "Family history of medullary thyroid carcinoma"],
  ["men2", "Family history of MEN2"],
  ["pancreatitis", "Family history of pancreatitis"],
  ["diabetes", "Family history of diabetes"],
  ["obesity", "Family history of obesity"],
  ["heart", "Family history of heart disease"],
] as const;

export const WEIGHT_METHODS = [
  "Diet changes",
  "Exercise",
  "Calorie tracking",
  "Commercial weight-loss programs",
  "Prescription medication",
  "GLP-1 medications",
  "Bariatric surgery",
  "None",
] as const;

export const PRIOR_MEDS = [
  "Semaglutide",
  "Tirzepatide",
  "Wegovy",
  "Zepbound",
  "Rybelsus",
  "Compounded semaglutide",
  "Other",
] as const;

export type PriorMedDetails = {
  dose: string;
  started: string;
  stopped: string;
  stop_reason: string;
  side_effects: string;
};

/** Per-medication follow-up when a prior GLP-1 / weight med is selected. */
export const PRIOR_MED_DETAIL_FIELDS = [
  ["dose", "Dose (e.g. 0.5 mg weekly)", true],
  ["started", "When did you start?", false],
  ["stopped", "When did you stop?", true],
  ["stop_reason", "Why did you stop?", true],
  ["side_effects", "Side effects (optional)", false],
] as const satisfies ReadonlyArray<
  [keyof PriorMedDetails, string, boolean]
>;

export function emptyPriorMedDetails(): PriorMedDetails {
  return { dose: "", started: "", stopped: "", stop_reason: "", side_effects: "" };
}

export function isPriorMedDetailsComplete(details: Partial<PriorMedDetails> | undefined): boolean {
  return (
    Boolean(String(details?.dose ?? "").trim()) &&
    Boolean(String(details?.stopped ?? "").trim()) &&
    Boolean(String(details?.stop_reason ?? "").trim())
  );
}

export function normalizePriorDetails(
  priorMeds: readonly string[],
  raw: Record<string, unknown> | undefined,
): Record<string, PriorMedDetails> {
  const result: Record<string, PriorMedDetails> = {};
  for (const med of priorMeds) {
    const existing = raw?.[med];
    if (existing && typeof existing === "object" && !Array.isArray(existing)) {
      result[med] = { ...emptyPriorMedDetails(), ...(existing as Partial<PriorMedDetails>) };
    } else {
      result[med] = emptyPriorMedDetails();
    }
  }
  return result;
}

export const GOAL_OPTIONS = [
  "Weight loss",
  "Better blood sugar",
  "Better energy",
  "Reduce cravings",
  "Improve confidence",
  "Other",
] as const;

export const SAFETY_ACKS = [
  ["no_guarantee", "I understand that completing this form does not guarantee a prescription."],
  ["provider_review", "I understand that a licensed provider will review my information before any treatment decision."],
  ["side_effects", "I understand that medical weight-loss medications may cause side effects including nausea, vomiting, diarrhea, constipation, abdominal pain, dehydration, gallbladder issues, and other risks."],
  ["emergency", "I understand that I must seek emergency care for severe abdominal pain, allergic reaction, chest pain, fainting, trouble breathing, or other emergency symptoms."],
  ["compounded", "I understand that compounded medications, if offered, are not FDA-approved and may only be used when legally available and clinically appropriate."],
  ["accurate", "I confirm that the information I provided is accurate and complete."],
  ["telehealth", "I consent to telehealth evaluation."],
  ["electronic", "I consent to electronic communication."],
  ["storage", "I consent to Aretide storing my intake information for provider review."],
] as const;

/** Conditions already captured in eligibility.safety_screen — not re-collected in intake. */
export const INTAKE_EXCLUDED_CONDITION_KEYS = new Set([
  "thyroid_cancer",
  "men2",
  "pancreatitis",
  "gallbladder",
  "kidney",
  "kidney_severe",
  "liver",
  "gastroparesis",
  "diabetic_retinopathy",
]);

export const IDENTITY_FIELDS = [
  ["preferred", "Preferred name (optional)"],
  ["address", "Home address"],
  ["city", "City"],
  ["zip", "ZIP"],
  ["emergency_name", "Emergency contact name"],
  ["emergency_phone", "Emergency contact phone"],
] as const;

export const REQUIRED_IDENTITY_FIELDS = IDENTITY_FIELDS.filter(([k]) => k !== "preferred").map(
  ([k]) => k,
);

const MEDICATION_ANSWER_KEYS = [
  "taking_prescription",
  "taking_otc",
  "supplements",
  "insulin",
  "sulfonylurea",
  "bp_meds",
  "psych_meds",
  "opioids",
  "weight_meds",
] as const;

const LIFESTYLE_FIELD_KEYS = [
  "exercise_days",
  "exercise_type",
  "diet",
  "smoke",
  "alcohol",
  "drugs",
  "sleep",
  "binge",
  "night_eating",
  "struggle",
] as const;

function intakeConditionKeys(): string[] {
  return MEDICAL_CONDITIONS.filter(([k]) => !INTAKE_EXCLUDED_CONDITION_KEYS.has(k)).map(([k]) => k);
}

function isFilled(value: unknown): boolean {
  return Boolean(String(value ?? "").trim());
}

/** Whether the current intake step has all required answers (mirrors intake.tsx field rules). */
export function isIntakeStepComplete(
  step: number,
  data: MedicalIntake,
  eligibility: { treatment_interest?: string | null } | null = null,
): boolean {
  const id = data.identity as Record<string, string>;
  const body = data.body_metrics as Record<string, string | string[]>;
  const mc = data.medical_conditions as Record<string, boolean | string>;
  const fh = data.family_history as Record<string, boolean>;
  const meds = data.medications;
  const allergies = data.allergies;
  const preg = data.pregnancy as Record<string, string | boolean>;
  const life = data.lifestyle as Record<string, string | boolean>;
  const labs = data.labs as Record<string, string | boolean>;
  const prefs = data.medication_preferences as Record<string, string | boolean>;
  const acks = data.safety_acknowledgments as Record<string, boolean>;
  const wh = data.weight_history as {
    prior_meds?: string[];
    prior_details?: Record<string, PriorMedDetails>;
  };

  switch (step) {
    case 0:
      return (
        REQUIRED_IDENTITY_FIELDS.every((k) => isFilled(id[k])) &&
        isIdentityAddressComplete(id)
      );
    case 1:
      return (
        isFilled(body.highest_weight) &&
        isFilled(body.lowest_weight) &&
        Array.isArray(body.goals) &&
        body.goals.length > 0
      );
    case 2: {
      const priorMeds = wh.prior_meds ?? [];
      if (priorMeds.length === 0) return true;
      const details = wh.prior_details ?? {};
      return priorMeds.every((med) => isPriorMedDetailsComplete(details[med]));
    }
    case 3:
      return intakeConditionKeys().every((k) => typeof mc[k] === "boolean");
    case 4:
      return FAMILY_HISTORY.every(([k]) => typeof fh[k] === "boolean");
    case 5:
      return MEDICATION_ANSWER_KEYS.every((k) => typeof meds.answers[k] === "boolean");
    case 6:
      return (
        typeof allergies.answers.has_med === "boolean" &&
        typeof allergies.answers.has_food === "boolean"
      );
    case 7:
      return preg.understand === true;
    case 8:
      return LIFESTYLE_FIELD_KEYS.every((k) => isFilled(life[k]));
    case 9:
      return typeof labs.recent_labs === "boolean" && typeof labs.willing === "boolean";
    case 10: {
      const needsTreatment = !eligibility?.treatment_interest;
      return (
        typeof prefs.self_inject === "boolean" &&
        typeof prefs.cash_pay_ok === "boolean" &&
        isFilled(prefs.shipping_preference) &&
        (!needsTreatment || isFilled(prefs.treatment))
      );
    }
    case 11:
      return SAFETY_ACKS.every(([k]) => acks[k] === true);
    default:
      return false;
  }
}

/** First incomplete intake step, or last step when all prior steps are done. */
export function resolveIntakeStepIndex(
  data: MedicalIntake,
  eligibility: { treatment_interest?: string | null } | null = null,
): number {
  const total = INTAKE_STEP_LABELS.length;
  for (let i = 0; i < total; i++) {
    if (!isIntakeStepComplete(i, data, eligibility)) return i;
  }
  return total - 1;
}

export function emptyIntakeData() {
  return {
    identity: {} as Record<string, string>,
    body_metrics: { goals: [] as string[] } as Record<string, string | string[]>,
    weight_history: {
      methods: [] as string[],
      prior_meds: [] as string[],
      prior_details: {} as Record<string, PriorMedDetails>,
    },
    medical_conditions: {} as Record<string, boolean | string>,
    family_history: {} as Record<string, boolean>,
    medications: {
      answers: {} as Record<string, boolean | string>,
      list: [] as { name: string; dose: string; frequency: string; reason: string }[],
    },
    allergies: {
      answers: {} as Record<string, boolean | string>,
      list: [] as { allergy: string; reaction: string; severity: string }[],
    },
    pregnancy: {} as Record<string, string | boolean>,
    lifestyle: {} as Record<string, string | boolean>,
    labs: {} as Record<string, string | boolean>,
    medication_preferences: {} as Record<string, string | boolean>,
    safety_acknowledgments: {} as Record<string, boolean>,
  };
}

/** Merge sparse API/local intake payloads with empty defaults (arrays, nested objects). */
export function normalizeIntake(draft: MedicalIntake): MedicalIntake {
  const empty = emptyIntakeData();
  const wh = draft.weight_history as Partial<typeof empty.weight_history>;

  return {
    ...draft,
    identity: { ...empty.identity, ...draft.identity },
    body_metrics: {
      ...empty.body_metrics,
      ...draft.body_metrics,
      goals: Array.isArray(draft.body_metrics?.goals)
        ? draft.body_metrics.goals
        : empty.body_metrics.goals,
    },
    weight_history: {
      ...empty.weight_history,
      ...wh,
      methods: Array.isArray(wh.methods) ? wh.methods : empty.weight_history.methods,
      prior_meds: Array.isArray(wh.prior_meds) ? wh.prior_meds : empty.weight_history.prior_meds,
      prior_details: normalizePriorDetails(
        Array.isArray(wh.prior_meds) ? wh.prior_meds : [],
        wh.prior_details as Record<string, unknown> | undefined,
      ),
    },
    medical_conditions: { ...empty.medical_conditions, ...draft.medical_conditions },
    family_history: { ...empty.family_history, ...draft.family_history },
    medications: {
      answers: { ...empty.medications.answers, ...(draft.medications?.answers ?? {}) },
      list: Array.isArray(draft.medications?.list) ? draft.medications.list : empty.medications.list,
    },
    allergies: {
      answers: { ...empty.allergies.answers, ...(draft.allergies?.answers ?? {}) },
      list: Array.isArray(draft.allergies?.list) ? draft.allergies.list : empty.allergies.list,
    },
    pregnancy: { ...empty.pregnancy, ...draft.pregnancy },
    lifestyle: { ...empty.lifestyle, ...draft.lifestyle },
    labs: { ...empty.labs, ...draft.labs },
    medication_preferences: { ...empty.medication_preferences, ...draft.medication_preferences },
    safety_acknowledgments: { ...empty.safety_acknowledgments, ...draft.safety_acknowledgments },
  };
}
