/** Portal auth endpoints: magic link / email code login, session user, logout. */

import { apiGet, apiPost, ApiError } from "./client";

/** Shown after every link request, whether or not the email has an account. */
export const LINK_SENT_MESSAGE =
  "If that email can sign in, a code and link are on the way. Check your inbox (and spam) in a minute or two.";

export interface PortalRole {
  organization: string;
  role: string;
}

/** Response of GET /auth/me/ and POST /auth/verify/. */
export interface PortalUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  kind: "patient" | "staff" | "system";
  timezone: string;
  language: string;
  email_verified: boolean;
  roles: PortalRole[];
  has_patient_profile: boolean;
}

/** Asks the server to email a sign-in link and code. Always resolves the same way on success. */
export async function requestLoginLink(email: string): Promise<void> {
  await apiPost<{ detail: string }>("/auth/request-link/", {
    email: email.trim(),
  });
}

/** Completes sign-in from the emailed magic link token. */
export function verifyLinkToken(token: string): Promise<PortalUser> {
  return apiPost<PortalUser>("/auth/verify/", { token });
}

/** Completes sign-in from the six digit emailed code. */
export function verifyEmailCode(
  email: string,
  code: string,
): Promise<PortalUser> {
  return apiPost<PortalUser>("/auth/verify/", { email: email.trim(), code });
}

export function fetchMe(): Promise<PortalUser> {
  return apiGet<PortalUser>("/auth/me/");
}

export function logout(): Promise<void> {
  return apiPost<void>("/auth/logout/");
}

/** True when the error means there is no signed-in session. */
export function isUnauthenticated(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 401 || err.status === 403);
}

/** Display name pieces for greetings and avatars. */
export function displayFirstName(
  user: Pick<PortalUser, "first_name" | "email">,
): string {
  const first = user.first_name.trim();
  if (first) return first;
  return user.email.split("@")[0] ?? "";
}

export function initials(
  user: Pick<PortalUser, "first_name" | "last_name" | "email">,
): string {
  const a = user.first_name.trim()[0] ?? "";
  const b = user.last_name.trim()[0] ?? "";
  return (a + b).toUpperCase() || (user.email[0] ?? "?").toUpperCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  return v.length <= 254 && EMAIL_RE.test(v);
}

export const PORTAL_LOGIN_PATH = "/portal/login";

/** True for /portal/login and /portal/login/verify, which skip the auth guard. */
export function isLoginPath(pathname: string): boolean {
  return (
    pathname === PORTAL_LOGIN_PATH ||
    pathname.startsWith(`${PORTAL_LOGIN_PATH}/`)
  );
}
