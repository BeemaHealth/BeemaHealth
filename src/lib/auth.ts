/**
 * Server-backed session validation.
 *
 * The browser may cache the auth token locally, but "signed in" is only true
 * after the server confirms the token via GET /auth/me/.
 */

import { fetchAuthMe, isApiEnabled } from "@/lib/api/client";
import { applySession, clearSession, getCachedSession } from "@/lib/session";
import type { SessionUser } from "@/lib/types/mvp";
import { redirect } from "@tanstack/react-router";

let validationPromise: Promise<SessionUser | null> | null = null;

export { applySession, clearSession, getCachedSession, subscribeSession } from "@/lib/session";

export async function validateSession(): Promise<SessionUser | null> {
  if (!isApiEnabled()) {
    return getCachedSession();
  }

  const cached = getCachedSession();
  if (!cached?.token) {
    clearSession();
    return null;
  }

  if (!validationPromise) {
    validationPromise = (async () => {
      try {
        const session = await fetchAuthMe();
        applySession(session);
        return session;
      } catch {
        clearSession();
        return null;
      } finally {
        validationPromise = null;
      }
    })();
  }

  return validationPromise;
}

type RequireAuthOptions = {
  redirectTo?: string;
  redirectPath?: string;
};

export async function requireAuth(options: RequireAuthOptions = {}): Promise<SessionUser> {
  const redirectTo = options.redirectTo ?? "/login";
  const redirectPath = options.redirectPath ?? "/dashboard";

  const session = await validateSession();
  if (!session) {
    throw redirect({ to: redirectTo, search: { redirect: redirectPath } });
  }
  return session;
}
