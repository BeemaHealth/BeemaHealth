/**
 * Waitlist social-proof headcount — seed from env/constant, bump on successful
 * Formspree submit, persist number-only in localStorage (no PHI).
 */

/** Fallback when env override is unset or invalid. */
export const WAITLIST_DISPLAY_COUNT_FALLBACK = 2;

/** localStorage key — integer string only; never write names/emails. */
export const WAITLIST_DISPLAY_COUNT_STORAGE_KEY =
  "beema_waitlist_display_count" as const;

function canUseLocalStorage(): boolean {
  return (
    typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  );
}

function parseNonNegativeInt(raw: string): number | null {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * Seed / floor for the displayed count (env override or constant).
 * Safe on SSR — does not touch localStorage.
 */
export function getWaitlistDisplayCountSeed(): number {
  const raw = import.meta.env.VITE_WAITLIST_DISPLAY_COUNT?.trim() ?? "";
  if (!raw) return WAITLIST_DISPLAY_COUNT_FALLBACK;
  return parseNonNegativeInt(raw) ?? WAITLIST_DISPLAY_COUNT_FALLBACK;
}

/**
 * Read the persisted count when available. Returns null on SSR, missing key,
 * or invalid stored value. Never parses PHI — only a non-negative integer.
 */
export function readStoredWaitlistDisplayCount(): number | null {
  if (!canUseLocalStorage()) return null;
  try {
    const raw = window.localStorage.getItem(WAITLIST_DISPLAY_COUNT_STORAGE_KEY);
    if (raw == null || raw === "") return null;
    return parseNonNegativeInt(raw.trim());
  } catch {
    return null;
  }
}

/**
 * Displayed waitlist count: max(seed, stored) so bumping the constant/env
 * still raises the floor. On SSR (no storage) returns the seed only.
 */
export function getWaitlistDisplayCount(): number {
  const seed = getWaitlistDisplayCountSeed();
  const stored = readStoredWaitlistDisplayCount();
  if (stored === null) return seed;
  return Math.max(seed, stored);
}

/**
 * After a successful Formspree waitlist submit: increment by 1, persist
 * number-only to localStorage, return the new count for UI updates.
 */
export function incrementWaitlistDisplayCount(): number {
  const next = getWaitlistDisplayCount() + 1;
  if (canUseLocalStorage()) {
    try {
      window.localStorage.setItem(
        WAITLIST_DISPLAY_COUNT_STORAGE_KEY,
        String(next),
      );
    } catch {
      // Private mode / quota — still return the incremented value for this session.
    }
  }
  return next;
}
