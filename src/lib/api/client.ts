/**
 * Django DRF API client — wire to your backend when ready.
 *
 * Set VITE_API_URL in .env (e.g. http://localhost:8000/api).
 * Until the backend is live, calls fall back to localStorage via storage.ts.
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

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T | null> {
  if (!API_BASE) return null;
  const session = store.getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (session?.token) headers.Authorization = `Token ${session.token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
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
  const remote = await apiFetch<SessionUser>("/auth/register/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (remote) {
    store.setSession(remote);
    store.saveUser(remote.user);
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
  store.setSession(session);
  return session;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<SessionUser> {
  const remote = await apiFetch<SessionUser>("/auth/login/", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (remote) {
    store.setSession(remote);
    return remote;
  }

  const user = store.getAllUsers().find((u) => u.email === email);
  if (!user) throw new Error("No account found with that email.");
  const session: SessionUser = { token: `local-${user.id}`, user };
  store.setSession(session);
  return session;
}

export function logoutUser() {
  store.setSession(null);
}

export async function syncEligibility(data: EligibilityResponses) {
  store.saveEligibility(data);
  await apiFetch("/eligibility/", { method: "POST", body: JSON.stringify(data) });
}

export async function syncIntake(data: MedicalIntake) {
  store.saveIntake(data);
  await apiFetch("/medical-intakes/", { method: "POST", body: JSON.stringify(data) });
}

export async function syncConsent(data: ConsentRecord) {
  store.saveConsent(data);
  await apiFetch("/consent-records/", { method: "POST", body: JSON.stringify(data) });
}

export async function syncReview(data: ProviderReview) {
  store.saveReview(data);
  await apiFetch("/provider-reviews/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
