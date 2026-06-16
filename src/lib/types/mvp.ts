/**
 * MVP data models — structured for Django DRF backend integration.
 *
 * ARCHITECTURE NOTE: PHI must NEVER be stored in localStorage or sessionStorage.
 * HIPAA requires patient health data to live on the server (encrypted, audited,
 * BAA-covered infrastructure). The browser may only hold non-PHI identifiers:
 * an HttpOnly funnel cookie before account creation, and the auth token after
 * login. Pre-account flow: anonymous funnel session → register claims draft →
 * authenticated /me/ endpoints. See backend/DATABASE.md#anonymous-funnel-session-pre-account.
 */

export type IntakeStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "more_info_needed"
  | "approved"
  | "not_approved"
  | "prescription_sent";

export type TreatmentInterest =
  | "insurance_brand"
  | "cash_pay"
  | "not_sure";

export type InjectionPreference = "yes" | "pill_preferred" | "not_sure";

export type BudgetRange =
  | "under_200"
  | "200_300"
  | "300_500"
  | "500_plus"
  | "insurance";

export type BiologicalSex = "female" | "male" | "other";

export type ProviderDecision =
  | "needs_more_info"
  | "not_appropriate"
  | "labs_required"
  | "approved"
  | "prescription_sent_outside";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  dob: string;
  state: string;
  created_at: string;
}

export interface PatientProfile {
  id: string;
  user_id: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
}

export interface EligibilityResponses {
  id: string;
  user_id: string;
  height_ft: string;
  height_in: string;
  weight: string;
  bmi: number | null;
  goal_weight: string;
  biological_sex: BiologicalSex | "";
  is_adult: boolean | null;
  lives_in_colorado: boolean | null;
  located_in_colorado: boolean | null;
  city: string;
  zip: string;
  treatment_interest: TreatmentInterest | "";
  injection_preference: InjectionPreference | "";
  budget: BudgetRange | "";
  safety_screen: Record<string, boolean>;
  safety_concern_flag: boolean;
  created_at: string;
}

export interface MedicationEntry {
  name: string;
  dose: string;
  frequency: string;
  reason: string;
}

export interface AllergyEntry {
  allergy: string;
  reaction: string;
  severity: string;
}

export interface PriorGlp1Entry {
  medication: string;
  dose: string;
  started: string;
  stopped: string;
  stop_reason: string;
  side_effects: string;
}

export interface MedicalIntake {
  id: string;
  user_id: string;
  status: IntakeStatus;
  identity: Record<string, string>;
  body_metrics: Record<string, string | string[]>;
  weight_history: Record<string, unknown>;
  medical_conditions: Record<string, boolean | string>;
  family_history: Record<string, boolean>;
  medications: {
    answers: Record<string, boolean | string>;
    list: MedicationEntry[];
  };
  allergies: {
    answers: Record<string, boolean | string>;
    list: AllergyEntry[];
  };
  pregnancy: Record<string, string | boolean>;
  lifestyle: Record<string, string | boolean>;
  labs: Record<string, string | boolean>;
  medication_preferences: Record<string, string | boolean>;
  safety_acknowledgments: Record<string, boolean>;
  submitted_at: string | null;
  updated_at: string;
}

export interface ConsentRecord {
  id: string;
  user_id: string;
  telehealth_consent: boolean;
  no_guarantee_acknowledgment: boolean;
  emergency_disclaimer_acknowledgment: boolean;
  medication_risk_acknowledgment: boolean;
  compounded_medication_acknowledgment: boolean;
  privacy_acknowledgment: boolean;
  typed_signature: string;
  signed_at: string;
}

export interface SafetyFlag {
  id: string;
  user_id: string;
  flag_type: string;
  severity: "low" | "medium" | "high";
  description: string;
  created_at: string;
}

export interface ProviderReview {
  id: string;
  user_id: string;
  reviewer_id: string;
  status: IntakeStatus;
  internal_note: string;
  patient_note: string;
  decision: ProviderDecision | "";
  reviewed_at: string | null;
}

export interface SessionUser {
  token: string;
  user: User;
}
