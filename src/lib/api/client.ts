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
  EligibilityResponses,
  MedicalIntake,
  ProviderReview,
  SessionUser,
  User,
} from "@/lib/types/mvp";
import * as store from "@/lib/storage";

const API_BASE = import.meta.env.VITE_API_URL ?? "";
const USE_API = Boolean(API_BASE);

type ApiOptions = RequestInit & { withCredentials?: boolean };

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
  const res = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: withCredentials ? "include" : "same-origin",
  });
  if (!res.ok) {
    let message = await res.text();
    try {
      const parsed = JSON.parse(message) as { detail?: string };
      if (parsed.detail) message = parsed.detail;
    } catch {
      // use raw text
    }
    throw new Error(message || `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function persistSession(session: SessionUser) {
  store.setSession(session);
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
    first_name: "",
    last_name: "",
    phone: "",
    dob: "",
    state: "",
    email_verified: true,
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
): Promise<SessionUser> {
  if (USE_API) {
    const remote = await apiFetch<SessionUser>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      withCredentials: true,
    });
    persistSession(remote);
    return remote;
  }

  const user = store.getAllUsers().find((u) => u.email === email);
  if (!user) throw new Error("No account found with that email.");
  const session: SessionUser = { token: `local-${user.id}`, user };
  persistSession(session);
  return session;
}

export async function logoutUser() {
  if (USE_API && store.getSession()) {
    try {
      await apiFetch("/auth/logout/", { method: "POST" });
    } catch {
      // still clear local session
    }
  }
  store.setSession(null);
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

export async function syncEligibility(data: Partial<EligibilityResponses>) {
  if (!USE_API) {
    if (!data.user_id) return;
    store.saveEligibility(data as EligibilityResponses);
    return;
  }
  try {
    await apiFetch("/eligibility/me/", { method: "PATCH", body: JSON.stringify(data) });
  } catch {
    await apiFetch("/eligibility/", { method: "POST", body: JSON.stringify(data) });
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

export async function syncIntake(data: MedicalIntake) {
  if (!USE_API) {
    store.saveIntake(data);
    return;
  }
  await apiFetch("/medical-intakes/me/", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
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

export async function fetchDashboard() {
  if (!USE_API) return null;
  return apiFetch<Record<string, unknown>>("/dashboard/me/");
}

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

export function isApiEnabled() {
  return USE_API;
}
