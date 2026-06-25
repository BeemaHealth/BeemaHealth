/**
 * Django DRF API client.
 *
 * All frontend API calls must go through this module — never call fetch() for
 * backend endpoints from route or component files.
 *
 * Pre-account PHI is stored server-side via HttpOnly funnel cookie. After login,
 * authenticated /me/ endpoints are used. localStorage fallback exists only when
 * VITE_API_URL is unset (dev without backend).
 *
 * Local dev: set VITE_API_URL=/api so Vite proxies to the backend — required for
 * cross-port funnel cookies (8080 frontend → 8000 API).
 */

import type {
  ConsentRecord,
  DashboardData,
  PatientPrescription,
  DocumentType,
  DocumentUploadResponse,
  EligibilityResponses,
  LoginMfaChallenge,
  MedicalIntake,
  IntakeSubmission,
  PatientProfile,
  PatientSettings,
  ProviderReview,
  RefillRequest,
  SessionUser,
  UploadedDocument,
  User,
  SideEffectCheckIn,
} from "@/lib/types/mvp";
import { applySession, clearSession } from "@/lib/session";
import * as store from "@/lib/storage";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const USE_API = Boolean(API_BASE);

type ApiOptions = RequestInit & { withCredentials?: boolean };

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const GENERIC_SERVER_ERROR = "Something went wrong. Please try again.";

function looksLikeHtml(body: string): boolean {
  const trimmed = body.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
}

async function parseApiErrorMessage(
  res: Response,
  body: string,
): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      if (typeof parsed.detail === "string" && parsed.detail.trim()) {
        return parsed.detail;
      }
      const messages: string[] = [];
      for (const value of Object.values(parsed)) {
        if (Array.isArray(value)) {
          for (const item of value) {
            if (typeof item === "string" && item.trim()) messages.push(item);
          }
        } else if (typeof value === "string" && value.trim()) {
          messages.push(value);
        }
      }
      if (messages.length > 0) return messages.join(" ");
    } catch {
      // fall through to generic handling
    }
  }

  if (
    res.status >= 500 ||
    contentType.includes("text/html") ||
    looksLikeHtml(body)
  ) {
    return GENERIC_SERVER_ERROR;
  }

  const trimmed = body.trim();
  return trimmed || `Request failed (${res.status})`;
}

async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  if (!USE_API) {
    throw new Error("VITE_API_URL is not configured.");
  }
  const session = store.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (session?.token) headers.Authorization = `Token ${session.token}`;

  const { withCredentials, ...fetchOptions } = options;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      headers,
      credentials: withCredentials ? "include" : "same-origin",
    });
  } catch {
    throw new ApiError("Unable to reach the server.", 0);
  }
  if (!res.ok) {
    const body = await res.text();
    const message = await parseApiErrorMessage(res, body);
    if (res.status === 401 && !path.startsWith("/auth/login")) {
      clearSession();
    }
    throw new ApiError(message, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function persistSession(session: SessionUser) {
  applySession(session);
  if (!USE_API) store.saveUser(session.user);
}

function updateStoredUser(user: User) {
  const session = store.getSession();
  if (session) {
    persistSession({ ...session, user });
  }
}

export async function createFunnelSession(): Promise<EligibilityResponses> {
  return apiFetch<EligibilityResponses>("/funnel/session/", {
    method: "POST",
    withCredentials: true,
  });
}

export async function fetchFunnelEligibility(): Promise<EligibilityResponses | null> {
  try {
    return await apiFetch<EligibilityResponses>("/funnel/eligibility/", {
      withCredentials: true,
    });
  } catch {
    return null;
  }
}

export async function patchFunnelEligibility(
  data: Partial<EligibilityResponses>,
): Promise<EligibilityResponses> {
  return apiFetch<EligibilityResponses>("/funnel/eligibility/", {
    method: "PATCH",
    body: JSON.stringify(data),
    withCredentials: true,
  });
}

export async function registerUser(payload: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
}): Promise<SessionUser> {
  if (USE_API) {
    const remote = await apiFetch<SessionUser>("/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
      withCredentials: true,
    });
    persistSession(remote);
    return remote;
  }

  const user: User = {
    id: crypto.randomUUID(),
    email: payload.email,
    first_name: payload.first_name,
    last_name: payload.last_name,
    phone: payload.phone,
    dob: "",
    state: "",
    email_verified: true,
    is_staff: false,
    is_provider: false,
    is_patient: true,
    created_at: new Date().toISOString(),
  };
  const session: SessionUser = { token: `local-${user.id}`, user };
  store.saveUser(user);
  persistSession(session);
  return session;
}

export async function verifyEmail(token: string): Promise<User> {
  if (!USE_API) {
    const session = store.getSession();
    if (!session) throw new Error("Not signed in.");
    const user = { ...session.user, email_verified: true };
    updateStoredUser(user);
    return user;
  }
  const result = await apiFetch<{ user: User }>("/auth/verify-email/", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
  updateStoredUser(result.user);
  return result.user;
}

export async function resendVerificationEmail(): Promise<void> {
  if (!USE_API) return;
  await apiFetch("/auth/resend-verification/", { method: "POST" });
}

export async function loginUser(
  email: string,
  password: string,
): Promise<SessionUser | LoginMfaChallenge> {
  if (USE_API) {
    const remote = await apiFetch<SessionUser | LoginMfaChallenge>(
      "/auth/login/",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
        withCredentials: true,
      },
    );
    if ("mfa_required" in remote && remote.mfa_required) {
      return remote;
    }
    persistSession(remote as SessionUser);
    return remote as SessionUser;
  }

  const user = store.getAllUsers().find((u) => u.email === email);
  if (!user) throw new Error("No account found with that email.");
  const session: SessionUser = { token: `local-${user.id}`, user };
  persistSession(session);
  return session;
}

export async function loginMfa(
  mfaChallengeId: string,
  code: string,
): Promise<SessionUser> {
  const remote = await apiFetch<SessionUser>("/auth/login/mfa/", {
    method: "POST",
    body: JSON.stringify({ mfa_challenge_id: mfaChallengeId, code }),
    withCredentials: true,
  });
  persistSession(remote);
  return remote;
}

export async function patchAuthMe(
  data: Partial<
    Pick<User, "email" | "first_name" | "last_name" | "phone" | "dob" | "state">
  >,
): Promise<SessionUser> {
  const remote = await apiFetch<SessionUser>("/auth/me/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
  persistSession(remote);
  return remote;
}

export async function logoutUser() {
  if (USE_API && store.getSession()) {
    try {
      await apiFetch("/auth/logout/", { method: "POST" });
    } catch {
      // still clear local session
    }
  }
  clearSession();
}

export async function fetchAuthMe(): Promise<SessionUser> {
  return apiFetch<SessionUser>("/auth/me/");
}

export async function fetchEligibilityMe(): Promise<EligibilityResponses | null> {
  if (!USE_API) {
    const session = store.getSession();
    return session ? store.getEligibility(session.user.id) : null;
  }
  try {
    return await apiFetch<EligibilityResponses>("/eligibility/me/");
  } catch {
    return null;
  }
}

export async function syncEligibility(
  data: Partial<EligibilityResponses>,
): Promise<EligibilityResponses | void> {
  if (!USE_API) {
    if (!data.user_id) return;
    store.saveEligibility(data as EligibilityResponses);
    return;
  }
  try {
    return await apiFetch<EligibilityResponses>("/eligibility/me/", {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  } catch {
    return await apiFetch<EligibilityResponses>("/eligibility/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export async function fetchIntakeMe(): Promise<MedicalIntake | null> {
  if (!USE_API) {
    const session = store.getSession();
    return session ? store.getIntake(session.user.id) : null;
  }
  try {
    return await apiFetch<MedicalIntake>("/medical-intakes/me/");
  } catch {
    return null;
  }
}

export async function refreshIntakeAccountScreening(): Promise<MedicalIntake | null> {
  if (!USE_API) return null;
  try {
    return await apiFetch<MedicalIntake>(
      "/medical-intakes/me/refresh-account-screening/",
      { method: "POST" },
    );
  } catch {
    return null;
  }
}

export async function fetchIntakeSubmissions(): Promise<IntakeSubmission[]> {
  if (!USE_API) return [];
  try {
    return await apiFetch<IntakeSubmission[]>(
      "/medical-intakes/me/submissions/",
    );
  } catch {
    return [];
  }
}

export async function resubmitIntake(): Promise<MedicalIntake> {
  return apiFetch<MedicalIntake>("/medical-intakes/me/resubmit/", {
    method: "POST",
  });
}

export async function syncIntake(
  data: MedicalIntake,
): Promise<MedicalIntake | void> {
  if (!USE_API) {
    store.saveIntake(data);
    return data;
  }
  return apiFetch<MedicalIntake>("/medical-intakes/me/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function fetchConsentMe(): Promise<ConsentRecord | null> {
  if (!USE_API) {
    const session = store.getSession();
    return session ? store.getConsent(session.user.id) : null;
  }
  try {
    return await apiFetch<ConsentRecord>("/consent-records/me/");
  } catch {
    return null;
  }
}

export async function syncConsent(data: ConsentRecord) {
  if (!USE_API) {
    store.saveConsent(data);
    return;
  }
  await apiFetch("/consent-records/me/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function syncReview(data: ProviderReview) {
  if (!USE_API) {
    store.saveReview(data);
    return;
  }
  await apiFetch("/provider-reviews/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchDashboard(): Promise<DashboardData | null> {
  if (!USE_API) return null;
  return apiFetch<DashboardData>("/dashboard/me/");
}

/*
export async function fetchAdminPatients() {
  if (!USE_API) return null;
  return apiFetch<unknown[]>("/admin/patients/");
}

export async function fetchAdminPatient(patientId: string) {
  if (!USE_API) return null;
  return apiFetch<Record<string, unknown>>(`/admin/patients/${patientId}/`);
}

export async function patchAdminPatient(
  patientId: string,
  data: Partial<ProviderReview>,
) {
  if (!USE_API) return null;
  return apiFetch<ProviderReview>(`/admin/patients/${patientId}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}
*/

export function isApiEnabled() {
  return USE_API;
}

// --- Staff CRM ---

export type StaffSummary = {
  total_patients: number;
  active_funnel_sessions: number;
  submitted_intakes: number;
};

export async function fetchStaffSummary(): Promise<StaffSummary> {
  return apiFetch<StaffSummary>("/staff/summary/");
}

export type FunnelAnalyticsStep = {
  step_key: string;
  views: number;
  completions: number;
  dropoff_percent?: number;
};

export async function fetchStaffFunnelAnalytics(params: {
  questionnaire_slug?: string;
  experiment_id?: string;
  variant_key?: string;
}): Promise<{ questionnaire_slug: string; steps: FunnelAnalyticsStep[] }> {
  const search = new URLSearchParams();
  if (params.questionnaire_slug)
    search.set("questionnaire_slug", params.questionnaire_slug);
  if (params.experiment_id) search.set("experiment_id", params.experiment_id);
  if (params.variant_key) search.set("variant_key", params.variant_key);
  const qs = search.toString();
  return apiFetch(`/staff/analytics/funnel/${qs ? `?${qs}` : ""}`);
}

export async function fetchStaffDropoffAnalytics(
  questionnaire_slug = "qualify",
) {
  return apiFetch<{ questionnaire_slug: string; steps: FunnelAnalyticsStep[] }>(
    `/staff/analytics/dropoff/?questionnaire_slug=${encodeURIComponent(questionnaire_slug)}`,
  );
}

export type StaffPatientRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  state: string;
  stage: string;
  last_event_name: string | null;
  last_step_key: string | null;
  utm_source: string;
  variant_key: string;
  created_at: string;
};

export async function fetchStaffPatients(stage?: string) {
  const qs = stage ? `?stage=${encodeURIComponent(stage)}` : "";
  return apiFetch<{ patients: StaffPatientRow[]; count: number }>(
    `/staff/patients/${qs}`,
  );
}

export type MedicationItem = {
  id: string;
  name: string;
  slug: string;
  drug_type: "semaglutide" | "tirzepatide" | "other";
  delivery_type: "injection" | "daily_pill";
  price_cents: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type MedicationWrite = {
  name: string;
  slug: string;
  drug_type: string;
  delivery_type: string;
  price_cents: number;
  active: boolean;
};

export type ValidationRule = {
  type:
    | "required"
    | "min"
    | "max"
    | "min_length"
    | "max_length"
    | "pattern"
    | "enum";
  value?: unknown;
  message?: string;
};

export type QuestionnaireFieldSchema = {
  id?: string;
  field_key: string;
  field_type: string;
  label: string;
  help_text?: string;
  options?: { value: string; label: string }[];
  validation_rules?: ValidationRule[];
  maps_to_section?: string;
  plugin_id?: string;
  sort_order?: number;
  required?: boolean;
};

export type QuestionnaireStepSchema = {
  id?: string;
  step_key: string;
  sort_order: number;
  title: string;
  subtitle?: string;
  visibility_rule?: Record<string, unknown> | null;
  fields: QuestionnaireFieldSchema[];
};

export type QuestionnaireVersionSchema = {
  id: string;
  questionnaire_slug: string;
  questionnaire_type: "qualify" | "intake";
  medication_id: string | null;
  version_label: string;
  status: "draft" | "published" | "archived";
  published_at: string | null;
  steps: QuestionnaireStepSchema[];
};

export type QuestionnaireListItem = {
  id: string;
  slug: string;
  questionnaire_type: "qualify" | "intake";
  title: string;
  medication: MedicationItem | null;
  published_version: { id: string; version_label: string } | null;
};

export async function fetchActiveQuestionnaire(
  slug: string,
  versionId?: string,
) {
  const qs = versionId ? `?version_id=${encodeURIComponent(versionId)}` : "";
  return apiFetch<QuestionnaireVersionSchema>(
    `/questionnaires/${slug}/active/${qs}`,
  );
}

export async function fetchStaffMedications() {
  return apiFetch<MedicationItem[]>("/staff/medications/");
}

export async function createStaffMedication(data: MedicationWrite) {
  return apiFetch<MedicationItem>("/staff/medications/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateStaffMedication(
  id: string,
  data: Partial<MedicationWrite>,
) {
  return apiFetch<MedicationItem>(`/staff/medications/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteStaffMedication(id: string) {
  return apiFetch<void>(`/staff/medications/${id}/`, { method: "DELETE" });
}

export async function fetchStaffQuestionnaires() {
  return apiFetch<QuestionnaireListItem[]>("/staff/questionnaires/");
}

export async function createStaffQuestionnaire(data: {
  slug: string;
  questionnaire_type: string;
  title: string;
  medication_id?: string | null;
}) {
  return apiFetch<QuestionnaireListItem>("/staff/questionnaires/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchStaffQuestionnaireVersions(slug: string) {
  return apiFetch<QuestionnaireVersionSchema[]>(
    `/staff/questionnaires/${slug}/versions/`,
  );
}

export async function fetchStaffQuestionnaireVersion(
  slug: string,
  versionId: string,
) {
  return apiFetch<QuestionnaireVersionSchema>(
    `/staff/questionnaires/${slug}/versions/${versionId}/`,
  );
}

export async function createStaffQuestionnaireVersion(
  slug: string,
  version_label: string,
) {
  return apiFetch<QuestionnaireVersionSchema>(
    `/staff/questionnaires/${slug}/versions/`,
    {
      method: "POST",
      body: JSON.stringify({ version_label }),
    },
  );
}

export async function publishStaffQuestionnaireVersion(
  slug: string,
  versionId: string,
) {
  return apiFetch<QuestionnaireVersionSchema>(
    `/staff/questionnaires/${slug}/versions/${versionId}/publish/`,
    { method: "POST" },
  );
}

export async function duplicateStaffQuestionnaireVersion(
  slug: string,
  versionId: string,
) {
  return apiFetch<QuestionnaireVersionSchema>(
    `/staff/questionnaires/${slug}/versions/${versionId}/duplicate/`,
    { method: "POST" },
  );
}

export async function createStaffQuestionnaireStep(
  slug: string,
  versionId: string,
  data: Partial<QuestionnaireStepSchema>,
) {
  return apiFetch(
    `/staff/questionnaires/${slug}/versions/${versionId}/steps/`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
}

export async function updateStaffQuestionnaireStep(
  slug: string,
  versionId: string,
  stepKey: string,
  data: Partial<QuestionnaireStepSchema>,
) {
  return apiFetch(
    `/staff/questionnaires/${slug}/versions/${versionId}/steps/${stepKey}/`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    },
  );
}

export async function deleteStaffQuestionnaireStep(
  slug: string,
  versionId: string,
  stepKey: string,
) {
  return apiFetch(
    `/staff/questionnaires/${slug}/versions/${versionId}/steps/${stepKey}/`,
    {
      method: "DELETE",
    },
  );
}

export async function createStaffQuestionnaireField(
  slug: string,
  versionId: string,
  stepKey: string,
  data: QuestionnaireFieldSchema,
) {
  return apiFetch(
    `/staff/questionnaires/${slug}/versions/${versionId}/steps/${stepKey}/fields/`,
    { method: "POST", body: JSON.stringify(data) },
  );
}

export async function updateStaffQuestionnaireField(
  slug: string,
  versionId: string,
  stepKey: string,
  fieldKey: string,
  data: Partial<QuestionnaireFieldSchema>,
) {
  return apiFetch(
    `/staff/questionnaires/${slug}/versions/${versionId}/steps/${stepKey}/fields/${fieldKey}/`,
    { method: "PATCH", body: JSON.stringify(data) },
  );
}

export async function deleteStaffQuestionnaireField(
  slug: string,
  versionId: string,
  stepKey: string,
  fieldKey: string,
) {
  return apiFetch(
    `/staff/questionnaires/${slug}/versions/${versionId}/steps/${stepKey}/fields/${fieldKey}/`,
    { method: "DELETE" },
  );
}

export type ExperimentSchema = {
  id: string;
  name: string;
  questionnaire_slug: string;
  status: string;
  start_at: string | null;
  end_at: string | null;
  variants: {
    id: string;
    variant_key: string;
    questionnaire_version_id: string;
    version_label: string;
    weight_percent: number;
  }[];
};

export async function fetchStaffExperiments() {
  return apiFetch<ExperimentSchema[]>("/staff/experiments/");
}

export async function createStaffExperiment(data: {
  name: string;
  questionnaire?: string;
  questionnaire_slug?: string;
  status?: string;
}) {
  return apiFetch<ExperimentSchema>("/staff/experiments/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function patchStaffExperiment(
  experimentId: string,
  data: Partial<{
    name: string;
    status: string;
    start_at: string;
    end_at: string;
  }>,
) {
  return apiFetch<ExperimentSchema>(`/staff/experiments/${experimentId}/`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function createStaffExperimentVariant(
  experimentId: string,
  data: {
    variant_key: string;
    questionnaire_version: string;
    weight_percent: number;
  },
) {
  return apiFetch(`/staff/experiments/${experimentId}/variants/`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchStaffExperimentResults(experimentId: string) {
  return apiFetch<{ experiment_id: string; variants: unknown[] }>(
    `/staff/experiments/${experimentId}/results/`,
  );
}

export async function trackFunnelEventApi(payload: {
  event_name: string;
  questionnaire_slug?: string;
  questionnaire_version_id?: string;
  step_key?: string;
  experiment_id?: string;
  variant_key?: string;
  properties?: Record<string, unknown>;
}) {
  if (!USE_API) return;
  try {
    await apiFetch("/analytics/events/", {
      method: "POST",
      body: JSON.stringify(payload),
      withCredentials: true,
    });
  } catch {
    // Analytics must not block funnel UX.
  }
}

export function inferDocumentType(filename: string): DocumentType {
  const lower = filename.toLowerCase();
  if (/\b(lab|labs|a1c|blood|result|cholesterol|glucose)\b/.test(lower)) {
    return "lab_results";
  }
  if (/\b(insurance|ins card|ins_card)\b/.test(lower)) {
    return "insurance_card";
  }
  if (/\b(id|passport|license|driver|dl)\b/.test(lower)) {
    return "photo_id";
  }
  return "other";
}

export async function fetchDocuments(): Promise<UploadedDocument[]> {
  return apiFetch<UploadedDocument[]>("/documents/");
}

export async function createDocumentUpload(payload: {
  document_type: DocumentType;
  filename: string;
  content_type: string;
}): Promise<DocumentUploadResponse> {
  return apiFetch<DocumentUploadResponse>("/documents/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function uploadDocumentFile(
  file: File,
  response: DocumentUploadResponse,
): Promise<UploadedDocument> {
  const { upload, document } = response;
  if (upload.method === "s3" && upload.upload_url) {
    let putRes: Response;
    try {
      putRes = await fetch(upload.upload_url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type":
            document.content_type || file.type || "application/octet-stream",
        },
      });
    } catch {
      throw new ApiError("Unable to upload file to storage.", 0);
    }
    if (!putRes.ok) {
      throw new ApiError("File upload to storage failed.", putRes.status);
    }
    return document;
  }

  const formData = new FormData();
  formData.append("file", file);
  const session = store.getSession();
  const headers: Record<string, string> = {};
  if (session?.token) headers.Authorization = `Token ${session.token}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/documents/${document.id}/upload/`, {
      method: "POST",
      headers,
      body: formData,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Unable to upload file.", 0);
  }
  if (!res.ok) {
    const body = await res.text();
    const message = await parseApiErrorMessage(res, body);
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<UploadedDocument>;
}

export type DocumentPreview = {
  objectUrl: string;
  contentType: string;
};

function isPresignedDocumentUrl(url: string): boolean {
  return /amazonaws\.com/i.test(url) || /X-Amz-Signature/i.test(url);
}

export async function fetchUploadedDocumentPreview(
  document: UploadedDocument,
): Promise<DocumentPreview> {
  if (!document.file_url) {
    throw new ApiError("This document is not ready to view yet.", 404);
  }

  const headers: Record<string, string> = {};
  if (!isPresignedDocumentUrl(document.file_url)) {
    const session = store.getSession();
    if (session?.token) headers.Authorization = `Token ${session.token}`;
  }

  let res: Response;
  try {
    res = await fetch(document.file_url, {
      headers,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError("Unable to load document.", 0);
  }

  if (!res.ok) {
    const body = await res.text();
    const message = await parseApiErrorMessage(res, body);
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  return {
    objectUrl: URL.createObjectURL(blob),
    contentType:
      blob.type || document.content_type || "application/octet-stream",
  };
}

export async function uploadDocumentBatch(
  items: { file: File; documentType: DocumentType }[],
): Promise<UploadedDocument[]> {
  const newDocs: UploadedDocument[] = [];
  for (const { file, documentType } of items) {
    const response = await createDocumentUpload({
      document_type: documentType,
      filename: file.name,
      content_type: file.type || "application/octet-stream",
    });
    const uploaded = await uploadDocumentFile(file, response);
    newDocs.push(uploaded);
  }
  return newDocs;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiFetch<void>(`/documents/${documentId}/`, { method: "DELETE" });
}

export async function patchDocumentType(
  documentId: string,
  documentType: DocumentType,
): Promise<UploadedDocument> {
  return apiFetch<UploadedDocument>(`/documents/${documentId}/`, {
    method: "PATCH",
    body: JSON.stringify({ document_type: documentType }),
  });
}

export async function fetchSideEffectCheckIns(): Promise<SideEffectCheckIn[]> {
  if (!USE_API) return [];
  try {
    return await apiFetch<SideEffectCheckIn[]>("/side-effect-check-ins/me/");
  } catch {
    return [];
  }
}

export async function submitSideEffectCheckIn(payload: {
  side_effect: SideEffectCheckIn["side_effect"];
  experienced_on: string;
}): Promise<SideEffectCheckIn> {
  return apiFetch<SideEffectCheckIn>("/side-effect-check-ins/me/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchPatientProfile(): Promise<PatientProfile | null> {
  if (!USE_API) return null;
  try {
    return await apiFetch<PatientProfile>("/patient-profile/me/");
  } catch {
    return null;
  }
}

export async function patchPatientProfile(
  data: Partial<PatientProfile>,
): Promise<PatientProfile> {
  return apiFetch<PatientProfile>("/patient-profile/me/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function fetchPatientSettings(): Promise<PatientSettings | null> {
  if (!USE_API) return null;
  try {
    return await apiFetch<PatientSettings>("/patient-settings/me/");
  } catch {
    return null;
  }
}

export async function patchPatientSettings(
  data: Partial<PatientSettings>,
): Promise<PatientSettings> {
  return apiFetch<PatientSettings>("/patient-settings/me/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function sendTwoFactorSetupCode(): Promise<{
  challenge_id: string;
}> {
  return apiFetch<{ challenge_id: string }>(
    "/patient-settings/me/two-factor/send-code/",
    { method: "POST" },
  );
}

export async function confirmTwoFactor(
  challengeId: string,
  code: string,
): Promise<PatientSettings> {
  return apiFetch<PatientSettings>("/patient-settings/me/two-factor/confirm/", {
    method: "POST",
    body: JSON.stringify({ challenge_id: challengeId, code }),
  });
}

export async function submitRefillRequest(payload?: {
  side_effect_check_in_id?: string;
}): Promise<RefillRequest> {
  return apiFetch<RefillRequest>("/refill-requests/me/", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function fetchPatientPrescription(): Promise<PatientPrescription | null> {
  if (!USE_API) return null;
  try {
    return await apiFetch<PatientPrescription | null>("/prescriptions/me/");
  } catch {
    return null;
  }
}

export async function fetchRefillRequests(): Promise<RefillRequest[]> {
  if (!USE_API) return [];
  try {
    return await apiFetch<RefillRequest[]>("/refill-requests/me/");
  } catch {
    return [];
  }
}

export const UPLOAD_DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "photo_id", label: "Photo ID" },
  { value: "insurance_card", label: "Insurance card" },
  { value: "lab_results", label: "Lab result" },
];

export function documentTypeLabel(type: DocumentType): string {
  return (
    UPLOAD_DOCUMENT_TYPES.find((option) => option.value === type)?.label ?? type
  );
}
