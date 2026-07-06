/**
 * TEMPORARY prototype fallback — mirrors Django DRF table shapes in localStorage.
 *
 * PHI must NEVER be stored in localStorage or sessionStorage (HIPAA). This
 * module will be removed; the browser may only hold non-PHI identifiers (auth
 * token, HttpOnly funnel cookie). See src/lib/types/mvp.ts and
 * backend/DATABASE.md#anonymous-funnel-session-pre-account.
 */

import type {
  ConsentRecord,
  EligibilityResponses,
  MedicalIntake,
  ProviderReview,
  SafetyFlag,
  SessionUser,
  User,
} from "@/lib/types/mvp";

const KEYS = {
  session: "beemahealth_session",
  users: "beemahealth_users",
  eligibility: "beemahealth_eligibility",
  intakes: "beemahealth_intakes",
  consents: "beemahealth_consents",
  flags: "beemahealth_safety_flags",
  reviews: "beemahealth_reviews",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getSession(): SessionUser | null {
  return read<SessionUser | null>(KEYS.session, null);
}

export function setSession(session: SessionUser | null) {
  if (session) write(KEYS.session, session);
  else localStorage.removeItem(KEYS.session);
}

export function getAllUsers(): User[] {
  return read<User[]>(KEYS.users, []);
}

export function saveUser(user: User) {
  const users = getAllUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  write(KEYS.users, users);
}

export function getEligibility(userId: string): EligibilityResponses | null {
  const all = read<Record<string, EligibilityResponses>>(KEYS.eligibility, {});
  return all[userId] ?? null;
}

export function saveEligibility(data: EligibilityResponses) {
  const all = read<Record<string, EligibilityResponses>>(KEYS.eligibility, {});
  all[data.user_id] = data;
  write(KEYS.eligibility, all);
}

export function getIntake(userId: string): MedicalIntake | null {
  const all = read<Record<string, MedicalIntake>>(KEYS.intakes, {});
  return all[userId] ?? null;
}

export function saveIntake(data: MedicalIntake) {
  const all = read<Record<string, MedicalIntake>>(KEYS.intakes, {});
  all[data.user_id] = data;
  write(KEYS.intakes, all);
}

export function getConsent(userId: string): ConsentRecord | null {
  const all = read<Record<string, ConsentRecord>>(KEYS.consents, {});
  return all[userId] ?? null;
}

export function saveConsent(data: ConsentRecord) {
  const all = read<Record<string, ConsentRecord>>(KEYS.consents, {});
  all[data.user_id] = data;
  write(KEYS.consents, all);
}

export function getSafetyFlags(userId: string): SafetyFlag[] {
  const all = read<Record<string, SafetyFlag[]>>(KEYS.flags, {});
  return all[userId] ?? [];
}

export function saveSafetyFlags(userId: string, flags: SafetyFlag[]) {
  const all = read<Record<string, SafetyFlag[]>>(KEYS.flags, {});
  all[userId] = flags;
  write(KEYS.flags, all);
}

export function getReview(userId: string): ProviderReview | null {
  const all = read<Record<string, ProviderReview>>(KEYS.reviews, {});
  return all[userId] ?? null;
}

export function saveReview(data: ProviderReview) {
  const all = read<Record<string, ProviderReview>>(KEYS.reviews, {});
  all[data.user_id] = data;
  write(KEYS.reviews, all);
}

export function listPatientRecords() {
  const users = getAllUsers();
  return users.map((user) => ({
    user,
    eligibility: getEligibility(user.id),
    intake: getIntake(user.id),
    consent: getConsent(user.id),
    flags: getSafetyFlags(user.id),
    review: getReview(user.id),
  }));
}
