const SESSION_KEY = "beemahealth_pending_utms";

export type UtmParams = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  landing_page_slug: string;
  /** On-site CTA that led here (e.g. home_hero) — not PHI. */
  cta_id: string;
  /** document.referrer at first capture (truncated) — not PHI. */
  referrer: string;
  /** First path seen this session (e.g. /, /waitlist/) — not PHI. */
  landing_path: string;
};

export type AttributionSnapshot = Partial<UtmParams> & {
  /** Current path at submit time. */
  page_path?: string;
};

export function readUtmsFromUrl(
  search: string = window.location.search,
): Partial<UtmParams> {
  const params = new URLSearchParams(search);
  const result: Partial<UtmParams> = {};
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
  ] as const) {
    const val = params.get(key);
    if (val) result[key] = val.slice(0, 128);
  }
  const cta = params.get("cta_id");
  if (cta) result.cta_id = cta.slice(0, 64);
  return result;
}

export function storePendingUtms(utms: Partial<UtmParams>): void {
  if (Object.keys(utms).length === 0) return;
  try {
    const existing = getPendingUtms();
    // Don't overwrite an existing landing page slug / first-touch fields with empty
    const merged = { ...existing, ...utms };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
  } catch {
    // sessionStorage unavailable — ignore
  }
}

export function getPendingUtms(): Partial<UtmParams> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<UtmParams>;
  } catch {
    return {};
  }
}

export function clearPendingUtms(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/**
 * Capture UTMs + cta_id from the URL, and first-touch referrer / landing path.
 * Safe for sessionStorage (no PHI). Works without a backend — Formspree / GA
 * read these later.
 */
export function capturePageUtms(): void {
  if (typeof window === "undefined") return;

  const fromUrl = readUtmsFromUrl();
  const existing = getPendingUtms();
  const patch: Partial<UtmParams> = { ...fromUrl };

  if (!existing.referrer && document.referrer) {
    patch.referrer = document.referrer.slice(0, 512);
  }
  if (!existing.landing_path) {
    patch.landing_path =
      `${window.location.pathname}${window.location.search}`.slice(0, 256);
  }

  if (Object.keys(patch).length > 0) storePendingUtms(patch);
}

/**
 * Fields to attach to Formspree (or similar) on waitlist submit so each
 * lead row shows where the visitor came from — no backend required.
 */
export function getAttributionForSubmit(): AttributionSnapshot {
  const pending = getPendingUtms();
  const page_path =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`.slice(0, 256)
      : undefined;

  return {
    utm_source: pending.utm_source,
    utm_medium: pending.utm_medium,
    utm_campaign: pending.utm_campaign,
    utm_content: pending.utm_content,
    cta_id: pending.cta_id,
    referrer: pending.referrer,
    landing_path: pending.landing_path,
    page_path,
  };
}
