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

/**
 * Gmail (and some “copy link” UIs) sometimes percent-encode the entire UTM
 * query so `=` → `%3D` and `&` → `%26`. The browser then treats the blob as
 * one parameter *name*, so GA never sees `utm_source` / `utm_content`.
 *
 * Example broken:
 *   ?utm_source%3Dx%26utm_medium%3Dsocial%26…&source=gmail&ust=…
 * Repaired:
 *   ?utm_source=x&utm_medium=social&…&source=gmail&ust=…
 */
export function repairMangledUtmSearch(search: string): string {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) return search.startsWith("?") ? "?" : "";

  const params = new URLSearchParams(raw);
  if (params.get("utm_source")) {
    return search.startsWith("?") ? `?${raw}` : raw;
  }

  // Case: first segment is fully encoded (`utm_source%3Dx%26utm_medium%3D…`)
  const amp = raw.indexOf("&");
  const first = amp === -1 ? raw : raw.slice(0, amp);
  const rest = amp === -1 ? "" : raw.slice(amp); // includes leading &
  if (/%3[Dd]|%26/.test(first) && /utm_source/i.test(first)) {
    try {
      const decoded = decodeURIComponent(first);
      if (decoded.includes("utm_source=") && decoded.includes("&")) {
        const fixed = `${decoded}${rest}`;
        return search.startsWith("?") ? `?${fixed}` : fixed;
      }
    } catch {
      // ignore bad encoding
    }
  }

  // Case: URLSearchParams already decoded the blob into a key named
  // `utm_source=x&utm_medium=social&…` with an empty value
  for (const key of params.keys()) {
    if (key.startsWith("utm_source=") && key.includes("&")) {
      const merged = new URLSearchParams(key);
      if (!merged.get("utm_source")) continue;
      if (rest) {
        for (const [k, v] of new URLSearchParams(rest.slice(1))) {
          if (!merged.has(k)) merged.set(k, v);
        }
      }
      const out = merged.toString();
      return search.startsWith("?") ? `?${out}` : out;
    }
  }

  return search.startsWith("?") ? `?${raw}` : raw;
}

/**
 * If the address bar has a Gmail-mangled UTM query, rewrite it in place so
 * GA4’s automatic campaign detection can read real utm_* keys.
 */
export function repairMangledUtmLocation(): boolean {
  if (typeof window === "undefined") return false;
  const current = window.location.search;
  const fixed = repairMangledUtmSearch(current);
  if (!fixed || fixed === current) return false;
  if (!new URLSearchParams(fixed).get("utm_source")) return false;
  const next = `${window.location.pathname}${fixed}${window.location.hash}`;
  window.history.replaceState(window.history.state, "", next);
  return true;
}

export function readUtmsFromUrl(
  search: string = window.location.search,
): Partial<UtmParams> {
  const params = new URLSearchParams(repairMangledUtmSearch(search));
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

  // Fix Gmail/double-encoded UTMs before Formspree + GA read the query.
  repairMangledUtmLocation();

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
