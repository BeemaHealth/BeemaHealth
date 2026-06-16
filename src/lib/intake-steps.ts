/**
 * Medical intake step field definitions — keeps intake route readable.
 */

export const INTAKE_STEP_LABELS = [
  "Identity & contact",
  "Body metrics & goals",
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

export function emptyIntakeData() {
  return {
    identity: {} as Record<string, string>,
    body_metrics: { goals: [] as string[] } as Record<string, string | string[]>,
    weight_history: {
      methods: [] as string[],
      prior_meds: [] as string[],
      prior_details: {} as Record<string, string>,
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
