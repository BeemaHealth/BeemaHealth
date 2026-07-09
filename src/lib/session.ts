import * as store from "@/lib/storage";
import type { SessionUser } from "@/lib/types/mvp";

type SessionListener = (session: SessionUser | null) => void;

const listeners = new Set<SessionListener>();

export function subscribeSession(listener: SessionListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function applySession(session: SessionUser | null) {
  store.setSession(session);
  for (const listener of listeners) listener(session);
}

export function clearSession() {
  applySession(null);
}

export function getCachedSession(): SessionUser | null {
  return store.getSession();
}
