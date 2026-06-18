import { CONTRAINDICATION_QUESTIONS, type QualifyAccountFields, type QualifyFormSlice } from "@/lib/qualify-steps";
import { emptyIntakeData, normalizeIntake, type PriorMedDetails } from "@/lib/intake-steps";
import type { MedicalIntake } from "@/lib/types/mvp";

export function validQualifySlice(overrides: Partial<QualifyFormSlice> = {}): QualifyFormSlice {
  const safety = Object.fromEntries(
    CONTRAINDICATION_QUESTIONS.map((q) => [q.key, false]),
  ) as QualifyFormSlice["safety"];

  return {
    treatmentInterest: "glp1_pills",
    primaryGoal: "improve_health",
    treatmentPriority: "fda_approved",
    targetWeightLossRange: "16_50",
    state: "Colorado",
    consents: { terms: true, privacy: true, telehealth: true },
    dob: "1990-06-15",
    heightFt: "5",
    heightIn: "8",
    weightLbs: "190",
    goalWeightLbs: "160",
    sexAssignedAtBirth: "female",
    safety,
    ...overrides,
  };
}

export function validAccountFields(overrides: Partial<QualifyAccountFields> = {}): QualifyAccountFields {
  return {
    firstName: "Jane",
    lastName: "Doe",
    phone: "(303) 555-0100",
    email: "jane.doe@example.com",
    password: "secure-pass-1",
    confirmPassword: "secure-pass-1",
    ...overrides,
  };
}

export function validEligibility(overrides: { treatment_interest?: string; weight_lbs?: number } = {}) {
  return { treatment_interest: "glp1_pills", weight_lbs: 190, ...overrides };
}

export function validIntake(overrides: Partial<MedicalIntake> = {}): MedicalIntake {
  const base = emptyIntakeData();
  const draft: MedicalIntake = normalizeIntake({
    id: "test-intake",
    user_id: "test-user",
    status: "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    submitted_at: null,
    identity: {
      address: "123 Main St",
      city: "Denver",
      zip: "80202",
      address_verified: "true",
      emergency_name: "John Doe",
      emergency_phone: "3035550101",
    },
    body_metrics: {
      goals: ["Weight loss"],
      highest_weight: "210",
      lowest_weight: "165",
    },
    weight_history: {
      methods: ["Diet changes"],
      prior_meds: [] as string[],
      prior_details: {} as Record<string, PriorMedDetails>,
    },
    medical_conditions: Object.fromEntries(
      [
        "type1_diabetes",
        "type2_diabetes",
        "prediabetes",
        "high_bp",
        "high_cholesterol",
        "heart_disease",
        "stroke",
        "sleep_apnea",
        "gi_reflux",
        "thyroid",
        "eating_disorder",
        "depression",
        "anxiety",
        "bipolar",
        "suicidal",
        "cancer",
        "recent_surgery",
        "upcoming_surgery",
        "other_major",
      ].map((k) => [k, false]),
    ),
    family_history: Object.fromEntries(
      ["thyroid_cancer", "men2", "pancreatitis", "diabetes", "obesity", "heart"].map((k) => [k, false]),
    ),
    medications: {
      answers: {
        taking_prescription: false,
        taking_otc: false,
        supplements: false,
        insulin: false,
        sulfonylurea: false,
        bp_meds: false,
        psych_meds: false,
        opioids: false,
        weight_meds: false,
      },
      list: [],
    },
    allergies: {
      answers: { has_med: false, has_food: false },
      list: [],
    },
    pregnancy: { understand: true },
    lifestyle: {
      exercise_days: "3",
      exercise_type: "Walking",
      diet: "Balanced",
      smoke: "No",
      alcohol: "Occasionally",
      drugs: "No",
      sleep: "7",
      binge: "No",
      night_eating: "No",
      struggle: "Cravings",
    },
    labs: { recent_labs: false, willing: true },
    medication_preferences: {
      self_inject: true,
      shipping_preference: "Standard",
      cash_pay_ok: true,
    },
    safety_acknowledgments: Object.fromEntries(
      [
        "no_guarantee",
        "provider_review",
        "side_effects",
        "emergency",
        "compounded",
        "accurate",
        "telehealth",
        "electronic",
        "storage",
      ].map((k) => [k, true]),
    ),
    ...overrides,
  } as MedicalIntake);

  return draft;
}
