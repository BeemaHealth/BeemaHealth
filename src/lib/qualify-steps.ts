import type {
  EligibilitySafetyScreen,
  PreSignupConsents,
  PrimaryGoal,
  SexAssignedAtBirth,
  TargetWeightLossRange,
  TreatmentInterest,
  TreatmentPriority,
} from "@/lib/types/mvp";
import {
  isValidEmail,
  isValidPersonName,
  isValidPhone,
  validateGoalWeightLbs,
  validateHeightFt,
  validateHeightIn,
  validateWeightLbs,
} from "@/lib/form-validation";
import {
  needsReproductiveQuestions,
  REPRODUCTIVE_SAFETY_KEYS,
} from "@/lib/reproductive-intake";

export const CONTRAINDICATION_QUESTIONS = [
  {
    key: "pregnant" as const,
    label: "Are you pregnant at this time?",
  },
  {
    key: "breastfeeding" as const,
    label: "Are you currently nursing or breastfeeding?",
  },
  {
    key: "trying_to_conceive" as const,
    label: "Are you actively trying to conceive?",
  },
  {
    key: "thyroid_cancer" as const,
    label: "Do you or a close relative have medullary thyroid cancer?",
  },
  {
    key: "men2" as const,
    label:
      "Have you been diagnosed with MEN2 (Multiple Endocrine Neoplasia type 2)?",
  },
  {
    key: "pancreatitis" as const,
    label: "Have you ever been diagnosed with pancreatitis?",
  },
  {
    key: "gallbladder_disease" as const,
    label: "Do you have a history of gallbladder disease?",
  },
  {
    key: "kidney_disease" as const,
    label: "Do you have chronic kidney disease?",
  },
  {
    key: "liver_disease" as const,
    label: "Do you have liver disease?",
  },
  {
    key: "diabetic_retinopathy" as const,
    label: "Do you have diabetic retinopathy?",
  },
  {
    key: "gastroparesis" as const,
    label: "Do you have gastroparesis (slow stomach emptying)?",
  },
  {
    key: "glp1_reaction" as const,
    label:
      "Have you had a serious allergic reaction to semaglutide, tirzepatide, or similar drugs?",
  },
] satisfies ReadonlyArray<{
  key: keyof EligibilitySafetyScreen;
  label: string;
}>;

export const TREATMENT_INTEREST_OPTIONS = [
  { value: "glp1_pills" as const, label: "Oral GLP-1 tablets" },
  { value: "glp1_injections" as const, label: "Injectable GLP-1 therapy" },
  {
    value: "provider_recommendation" as const,
    label: "I'd like my clinician to recommend the best option",
  },
] as const;

export const PRIMARY_GOAL_OPTIONS = [
  { value: "improve_health" as const, label: "Support my long-term health" },
  {
    value: "gain_confidence" as const,
    label: "Feel more confident day to day",
  },
  {
    value: "feel_better_clothes" as const,
    label: "Move and feel better in my body",
  },
  { value: "something_else" as const, label: "Something else motivates me" },
] as const;

export const TREATMENT_PRIORITY_OPTIONS = [
  { value: "fda_approved" as const, label: "FDA-approved treatment options" },
  { value: "cost" as const, label: "Keeping monthly costs manageable" },
  { value: "results" as const, label: "Durable, lasting results" },
  {
    value: "provider_support" as const,
    label: "Ongoing support from licensed clinicians",
  },
] as const;

export const WEIGHT_LOSS_GOAL_OPTIONS = [
  { value: "1_15" as const, label: "About 1–15 lbs" },
  { value: "16_50" as const, label: "About 16–50 lbs" },
  { value: "51_100" as const, label: "About 51–100 lbs" },
  { value: "100_plus" as const, label: "More than 100 lbs" },
  { value: "not_sure" as const, label: "I'm not sure yet — still exploring" },
] as const;

export const SEX_OPTIONS = [
  { value: "female" as const, label: "Female" },
  { value: "male" as const, label: "Male" },
] as const;

export type QualifyStepId =
  | "treatment_interest"
  | "primary_goal"
  | "treatment_priority"
  | "weight_loss_goal"
  | "state_consent"
  | "dob"
  | "body_metrics"
  | "sex_assigned_at_birth"
  | "gender_identity"
  | "contraindications"
  | "review"
  | "account";

export const PRE_SIGNUP_STEPS: QualifyStepId[] = [
  "treatment_interest",
  "primary_goal",
  "treatment_priority",
  "weight_loss_goal",
  "state_consent",
  "dob",
  "body_metrics",
  "sex_assigned_at_birth",
  "gender_identity",
  "contraindications",
  "review",
];

export const ACCOUNT_STEP: QualifyStepId = "account";

export const STEP_LABELS: Record<QualifyStepId, string> = {
  treatment_interest: "Care format",
  primary_goal: "Your motivation",
  treatment_priority: "Care priorities",
  weight_loss_goal: "Target range",
  state_consent: "State & policies",
  dob: "Birth date",
  body_metrics: "Height & weight",
  sex_assigned_at_birth: "Biological sex",
  gender_identity: "Current identity",
  contraindications: "Health history",
  review: "Confirm details",
  account: "Create account",
};

export const STEP_TITLES: Record<QualifyStepId, string> = {
  treatment_interest: "Which delivery format interests you most?",
  primary_goal: "What's motivating you to explore weight care?",
  treatment_priority: "When choosing care, what matters most to you?",
  weight_loss_goal: "Roughly how much weight are you hoping to lose?",
  state_consent: "What state are you located in?",
  dob: "When were you born?",
  body_metrics: "What are your current height and weight?",
  sex_assigned_at_birth: "What sex were you assigned at birth?",
  gender_identity: "What is your current sex or gender identity?",
  contraindications: "A brief health screening",
  review: "Does everything look correct?",
  account: "Create your account",
};

export const STEP_SUBTITLES: Partial<Record<QualifyStepId, string>> = {
  treatment_interest:
    "Your answer helps us align you with an appropriate care pathway.",
  primary_goal: "Everyone's journey is different — choose what fits you best.",
  treatment_priority:
    "There is no one-size-fits-all approach. A clinician makes the final treatment decision.",
  weight_loss_goal:
    "An estimate is fine. Your provider will review your full health picture.",
  state_consent: "Licensed telehealth is regulated differently in each state.",
  dob: "Beema Health care is available to adults 18 and older.",
  body_metrics: "These figures help us calculate BMI for your clinical review.",
  sex_assigned_at_birth:
    "Certain treatments are prescribed differently based on biological sex.",
  gender_identity:
    "This helps us ask the right reproductive health questions for your care.",
  contraindications:
    "Your responses are confidential and shared only with your care team.",
  review: "Take a moment to verify your answers before creating your account.",
  account:
    "We'll save your contact details, then send a verification link before your medical intake.",
};

/** Fields required to decide whether a step is complete (mirrors qualify.tsx validation). */
export type QualifyFormSlice = {
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
  genderIdentity: SexAssignedAtBirth | "";
  safety: EligibilitySafetyScreen;
};

export function applicableContraindicationQuestions(data: QualifyFormSlice) {
  const showReproductive = needsReproductiveQuestions(
    data.sexAssignedAtBirth,
    data.genderIdentity,
  );
  return CONTRAINDICATION_QUESTIONS.filter(
    (q) =>
      showReproductive ||
      !REPRODUCTIVE_SAFETY_KEYS.includes(
        q.key as (typeof REPRODUCTIVE_SAFETY_KEYS)[number],
      ),
  );
}

export function hasAllPreSignupConsents(consents: PreSignupConsents): boolean {
  return (
    consents.terms === true &&
    consents.privacy === true &&
    consents.telehealth === true
  );
}

export function allPreSignupConsents(checked: boolean): PreSignupConsents {
  return { terms: checked, privacy: checked, telehealth: checked };
}

export function computeIsAdult(dob: string): boolean | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1;
  }
  return age >= 18;
}

export type QualifyAccountFields = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
};

function getChoiceStepValue(
  stepId: QualifyStepId,
  data: QualifyFormSlice,
): string {
  switch (stepId) {
    case "treatment_interest":
      return data.treatmentInterest;
    case "primary_goal":
      return data.primaryGoal;
    case "treatment_priority":
      return data.treatmentPriority;
    case "weight_loss_goal":
      return data.targetWeightLossRange;
    case "sex_assigned_at_birth":
      return data.sexAssignedAtBirth;
    case "gender_identity":
      return data.genderIdentity;
    default:
      return "";
  }
}

export function getQualifyStepError(
  stepId: QualifyStepId,
  data: QualifyFormSlice,
  account?: QualifyAccountFields,
): string | null {
  switch (stepId) {
    case "treatment_interest":
    case "primary_goal":
    case "treatment_priority":
    case "weight_loss_goal":
    case "sex_assigned_at_birth":
    case "gender_identity":
      // ChoiceCard-only steps: block Continue without a redundant footer message.
      return getChoiceStepValue(stepId, data) ? null : "";
    case "state_consent":
      if (!data.state) return "";
      if (!hasAllPreSignupConsents(data.consents)) return "";
      return null;
    case "dob":
      if (!data.dob) return "";
      if (computeIsAdult(data.dob) === null) return "";
      if (computeIsAdult(data.dob) === false)
        return "Beema Health is available to adults 18 and older.";
      return null;
    case "body_metrics": {
      if (
        !data.heightFt.trim() ||
        !data.heightIn.trim() ||
        !data.weightLbs.trim() ||
        !data.goalWeightLbs.trim()
      ) {
        return "";
      }
      const ftErr = validateHeightFt(data.heightFt);
      if (ftErr) return ftErr;
      const inErr = validateHeightIn(data.heightIn);
      if (inErr) return inErr;
      const weightErr = validateWeightLbs(data.weightLbs, "Current weight");
      if (weightErr) return weightErr;
      return validateGoalWeightLbs(data.weightLbs, data.goalWeightLbs);
    }
    case "contraindications": {
      const unanswered = applicableContraindicationQuestions(data).find(
        (q) => typeof data.safety[q.key] !== "boolean",
      );
      return unanswered ? "" : null;
    }
    case "review":
      return null;
    case "account": {
      if (!account) return "";
      const { firstName, lastName, phone, email, password, confirmPassword } =
        account;
      if (
        !firstName.trim() ||
        !lastName.trim() ||
        !phone.trim() ||
        !email.trim() ||
        !password ||
        !confirmPassword
      ) {
        return "";
      }
      if (!isValidPersonName(firstName))
        return "Enter a valid legal first name.";
      if (!isValidPersonName(lastName)) return "Enter a valid legal last name.";
      if (!isValidPhone(phone))
        return "Enter a valid 10-digit US phone number.";
      if (!isValidEmail(email)) return "Enter a valid email address.";
      if (password.length < 10)
        return "Password must be at least 10 characters.";
      if (password !== confirmPassword) return "Passwords do not match.";
      return null;
    }
    default:
      return null;
  }
}

export function isQualifyStepComplete(
  stepId: QualifyStepId,
  data: QualifyFormSlice,
  account?: QualifyAccountFields,
): boolean {
  return getQualifyStepError(stepId, data, account) === null;
}

/** First incomplete pre-signup step, or review when all prior steps are done. */
export function resolveQualifyStepIndex(
  steps: readonly QualifyStepId[],
  data: QualifyFormSlice,
): number {
  if (data.dob && computeIsAdult(data.dob) === false) {
    const dobIdx = steps.indexOf("dob");
    if (dobIdx >= 0) return dobIdx;
  }

  for (const stepId of PRE_SIGNUP_STEPS) {
    if (stepId === "review") continue;
    if (!isQualifyStepComplete(stepId, data)) {
      const idx = steps.indexOf(stepId);
      if (idx >= 0) return idx;
    }
  }

  const reviewIdx = steps.indexOf("review");
  return reviewIdx >= 0 ? reviewIdx : 0;
}
