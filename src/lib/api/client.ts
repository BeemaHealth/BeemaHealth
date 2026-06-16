/**
 * Django DRF API client.
 *
 * Set VITE_API_URL in .env (e.g. http://localhost:8000/api).
 * When set, PHI is stored on the server — not in localStorage (except auth token).
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

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!USE_API) {
    throw new Error("VITE_API_URL is not configured.");
  }
  const session = store.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (session?.token) headers.Authorization = `Token ${session.token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function persistSession(session: SessionUser) {
  store.setSession(session);
  if (!USE_API) store.saveUser(session.user);
}

export async function registerUser(payload: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  dob: string;
  state: string;
}): Promise<SessionUser> {
  if (USE_API) {
    const remote = await apiFetch<SessionUser>("/auth/register/", {
      method: "POST",
      body: JSON.stringify(payload),
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
    dob: payload.dob,
    state: payload.state,
    created_at: new Date().toISOString(),
  };
  const session: SessionUser = { token: `local-${user.id}`, user };
  store.saveUser(user);
  persistSession(session);
  return session;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<SessionUser> {
  if (USE_API) {
    const remote = await apiFetch<SessionUser>("/auth/login/", {
      method: "POST",
      body: JSON.stringify({ email, password }),
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

export async function syncEligibility(data: EligibilityResponses) {
  if (!USE_API) {
    store.saveEligibility(data);
    return;
  }
  try {
    await apiFetch("/eligibility/me/", { method: "PATCH", body: JSON.stringify(data) });
  } catch {
    await apiFetch("/eligibility/", { method: "POST", body: JSON.stringify(data) });
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
