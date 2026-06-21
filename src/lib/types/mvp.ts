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
  | "glp1_pills"
  | "glp1_injections"
  | "provider_recommendation"
  | "not_sure";

export type PrimaryGoal =
  | "improve_health"
  | "gain_confidence"
  | "feel_better_clothes"
  | "lose_weight"
  | "metabolic_health"
  | "learn_options"
  | "something_else";

export type TreatmentPriority =
  | "fda_approved"
  | "cost"
  | "results"
  | "convenience"
  | "provider_support";

export type TargetWeightLossRange =
  | "1_15"
  | "16_50"
  | "51_100"
  | "100_plus"
  | "not_sure";

export type SexAssignedAtBirth = "female" | "male" | "intersex" | "unknown";

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
  email_verified: boolean;
  created_at: string;
}

export interface PatientProfile {
  id: string;
  sex_assigned_at_birth?: SexAssignedAtBirth | "";
  gender_identity?: SexAssignedAtBirth | "";
  preferred_name?: string;
  address: string;
  city: string;
  county: string;
  zip: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  updated_at?: string;
}

export interface EligibilitySafetyScreen {
  pregnant?: boolean;
  breastfeeding?: boolean;
  trying_to_conceive?: boolean;
  thyroid_cancer?: boolean;
  men2?: boolean;
  pancreatitis?: boolean;
  gallbladder_disease?: boolean;
  kidney_disease?: boolean;
  liver_disease?: boolean;
  diabetic_retinopathy?: boolean;
  gastroparesis?: boolean;
  glp1_reaction?: boolean;
}

export interface PreSignupConsents {
  terms?: boolean;
  telehealth?: boolean;
  privacy?: boolean;
}

export interface EligibilityResponses {
  id: string;
  user_id: string | null;
  funnel_session_id?: string | null;
  treatment_interest: TreatmentInterest | "";
  primary_goal: PrimaryGoal | "";
  treatment_priority: TreatmentPriority | "";
  target_weight_loss_range: TargetWeightLossRange | "";
  state: string;
  dob: string;
  is_18_or_older: boolean | null;
  height_ft: number | null;
  height_in: number | null;
  weight_lbs: number | null;
  goal_weight_lbs: number | null;
  bmi: number | null;
  sex_assigned_at_birth: SexAssignedAtBirth | "";
  gender_identity: SexAssignedAtBirth | "";
  safety_screen: EligibilitySafetyScreen;
  safety_concern_flag: boolean;
  is_likely_eligible: boolean | null;
  needs_clinician_review: boolean;
  disqualification_reason: string | null;
  pre_signup_consents: PreSignupConsents;
  completed_at: string | null;
  created_at: string;
  updated_at?: string;
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
  active_submission_version?: number | null;
  working_version?: number;
  account_screening?: AccountScreening;
  updated_at: string;
  can_edit?: boolean;
  active_submission?: IntakeSubmission | null;
}

export interface AccountScreening {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  dob: string;
  state: string;
  height_ft: number | null;
  height_in: number | null;
  weight_lbs: string | null;
  goal_weight_lbs: string | null;
  bmi: number | null;
}

export interface IntakeSubmissionSnapshot {
  meta: {
    version: number;
    submitted_at: string;
    intake_id: string;
    intake_status: string;
  };
  account: {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    dob: string;
    state: string;
  };
  account_summary: {
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone: string;
    dob: string;
    state: string;
    height_ft: number | null;
    height_in: number | null;
    weight_lbs: string | null;
    goal_weight_lbs: string | null;
    bmi: number | null;
  };
  eligibility_screening: Record<string, unknown>;
  identity_contact: Record<string, string>;
  clinical: Record<string, unknown>;
  consent: Record<string, unknown> | null;
}

export interface IntakeSubmission {
  id: string;
  user_id: string;
  medical_intake_id: string;
  version: number;
  status_at_submit: "submitted" | "resubmitted";
  snapshot: IntakeSubmissionSnapshot;
  submitted_at: string;
  created_at: string;
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
  external_review_id?: string;
  doctor_partner?: string;
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

export interface DashboardData {
  user: User;
  intake_status: IntakeStatus;
  submitted_at: string | null;
  treatment_interest: TreatmentInterest | null;
  patient_note: string;
  has_active_prescription: boolean;
  pharmacy_order?: PharmacyOrder | null;
}

export type PrescriptionRoute = "injection" | "oral" | "other";

export type PrescriptionFulfillmentStatus =
  | "draft"
  | "signed"
  | "sent_to_pharmacy"
  | "cancelled";

export type PharmacyOrderStatus =
  | "created"
  | "submitted"
  | "received"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "error"
  | "on_hold";

export interface PharmacyOrder {
  id: string;
  prescription_id: string;
  user_id: string;
  pharmacy_partner: string;
  external_order_id: string;
  external_reference_id: string;
  status: PharmacyOrderStatus;
  recipient_type: "patient" | "clinic";
  ship_to_city: string;
  ship_to_state: string;
  ship_to_zip_code: string;
  ship_to_country: string;
  tracking_number: string;
  carrier: string;
  error_message: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientPrescription {
  id: string;
  user_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  route: PrescriptionRoute | "";
  instructions: string;
  pharmacy_name: string;
  rx_type?: "new" | "refill" | "";
  drug_strength?: string;
  drug_form?: string;
  quantity?: string;
  quantity_units?: string;
  refills?: number;
  days_supply?: number | null;
  lf_product_id?: number | null;
  fulfillment_status?: PrescriptionFulfillmentStatus;
  is_active: boolean;
  prescribed_at: string;
  prescribed_by_id: string | null;
  created_at: string;
  updated_at: string;
}

export type DocumentType =
  | "lab_results"
  | "insurance_card"
  | "photo_id"
  | "other";

export interface UploadedDocument {
  id: string;
  document_type: DocumentType;
  file_key: string;
  file_url: string | null;
  original_filename: string;
  content_type: string;
  uploaded_at: string;
}

export interface DocumentUploadPresign {
  upload_url: string | null;
  file_key: string;
  method: "s3" | "local";
}

export interface DocumentUploadResponse {
  document: UploadedDocument;
  upload: DocumentUploadPresign;
}

export type SideEffectType =
  | "none"
  | "mild_nausea"
  | "reduced_appetite"
  | "constipation"
  | "fatigue"
  | "other";

export interface SideEffectCheckIn {
  id: string;
  user_id: string;
  side_effect: SideEffectType;
  experienced_on: string;
  created_at: string;
}

export interface PatientSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  product_emails: boolean;
  two_factor_enabled: boolean;
  updated_at?: string;
}

export interface RefillRequest {
  id: string;
  user_id: string;
  side_effect_check_in_id: string | null;
  status: "pending" | "approved" | "denied";
  created_at: string;
}

export interface LoginMfaChallenge {
  mfa_required: true;
  mfa_challenge_id: string;
  detail: string;
}
