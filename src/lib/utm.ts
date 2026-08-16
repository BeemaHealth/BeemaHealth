import { BASK_INTAKE_HOST } from "@/lib/gtm";

const SESSION_KEY = "beemahealth_pending_utms";

/**
 * Query keys Bask copies into `signUpSearchParams` for ad attribution.
 * Must survive the marketing-site → q.beemahealth.com hop via resolveCta().
 */
export const BASK_HANDOFF_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
] as const;

export type BaskHandoffParamKey = (typeof BASK_HANDOFF_PARAM_KEYS)[number];

/**
 * Every marketing route is statically prerendered (vite.config.ts), so the
 * "Get Started" anchor's `href` is baked in at build time with no query
 * string to read - it ships with only `cta_id`, never the utm_ or click-id
 * params. `resolveCta()` recomputes the correct href once the app hydrates,
 * but hydration means loading and running the full JS bundle first; a click
 * before that finishes still fires the stale, param-less prerendered href
 * and Bask (and every downstream ad platform) sees the visit as Direct.
 *
 * This is a plain, dependency-free classic script (not a module) rendered
 * inline right after the CTA anchors in the document body - see
 * `RootShell` in `src/routes/__root.tsx`. The browser executes it the
 * instant it's parsed, before the framework bundle is even requested, so it
 * closes that window almost entirely: by the time a human (or even a fast
 * bot) can click, the anchor's href already carries every param the
 * landing URL had. It intentionally does not touch sessionStorage - that
 * stays `capturePageUtms()`'s job once React mounts; this only has to fix
 * the very first, pre-hydration paint of the current page's own CTAs.
 */
export const BASK_HREF_SYNC_SCRIPT = `
(function () {
  try {
    var params = new URLSearchParams(window.location.search);
    var keys = ${JSON.stringify(BASK_HANDOFF_PARAM_KEYS)};
    var found = {};
    var any = false;
    for (var i = 0; i < keys.length; i++) {
      var value = params.get(keys[i]);
      if (value) {
        found[keys[i]] = value;
        any = true;
      }
    }
    if (!any) return;
    var anchors = document.querySelectorAll('a[href^="https://${BASK_INTAKE_HOST}/"]');
    for (var j = 0; j < anchors.length; j++) {
      try {
        var url = new URL(anchors[j].href);
        for (var key in found) url.searchParams.set(key, found[key]);
        anchors[j].href = url.toString();
      } catch (e) {}
    }
  } catch (e) {}
})();
`.trim();

export type UtmParams = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  /** Meta click id - not PHI. */
  fbclid: string;
  /** Google click id - not PHI. */
  gclid: string;
  landing_page_slug: string;
  /** On-site CTA that led here (e.g. home_hero) - not PHI. */
  cta_id: string;
  /** document.referrer at first capture (truncated) - not PHI. */
  referrer: string;
  /** First path seen this session (e.g. /, /waitlist/) - not PHI. */
  landing_path: string;
};

export type AttributionSnapshot = Partial<UtmParams> & {
  /** Current path at submit time. */
  page_path?: string;
};

/** Max length per handoff / UTM value stored in sessionStorage. */
const ATTR_VALUE_MAX = 256;

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
  search: string = typeof window !== "undefined" ? window.location.search : "",
): Partial<UtmParams> {
  const params = new URLSearchParams(repairMangledUtmSearch(search));
  const result: Partial<UtmParams> = {};
  for (const key of BASK_HANDOFF_PARAM_KEYS) {
    const val = params.get(key);
    if (val) result[key] = val.slice(0, ATTR_VALUE_MAX);
  }
  const cta = params.get("cta_id");
  if (cta) result.cta_id = cta.slice(0, 64);
  return result;
}

/**
 * Params to append on Bask intake links: click IDs + all five utm_* keys.
 * Merges sessionStorage (survives in-site navigation) with the current URL
 * (covers the landing page before/without a prior capture).
 * Never includes PHI - only public ad/attribution query keys.
 */
export function getBaskHandoffParams(): Partial<
  Record<BaskHandoffParamKey, string>
> {
  const pending = getPendingUtms();
  const fromUrl =
    typeof window !== "undefined"
      ? readUtmsFromUrl()
      : ({} as Partial<UtmParams>);
  // URL overlays pending so a fresh land with new click ids wins; navigating
  // away (no params in URL) keeps session values from pending.
  const merged: Partial<UtmParams> = { ...pending, ...fromUrl };
  const out: Partial<Record<BaskHandoffParamKey, string>> = {};
  for (const key of BASK_HANDOFF_PARAM_KEYS) {
    const val = merged[key];
    if (val) out[key] = val;
  }
  return out;
}

export function storePendingUtms(utms: Partial<UtmParams>): void {
  if (Object.keys(utms).length === 0) return;
  try {
    const existing = getPendingUtms();
    // Don't overwrite an existing landing page slug / first-touch fields with empty
    const merged = { ...existing, ...utms };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(merged));
  } catch {
    // sessionStorage unavailable - ignore
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
 * Safe for sessionStorage (no PHI). Works without a backend - Formspree / GA
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
 * lead row shows where the visitor came from - no backend required.
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
    utm_term: pending.utm_term,
    utm_content: pending.utm_content,
    fbclid: pending.fbclid,
    gclid: pending.gclid,
    cta_id: pending.cta_id,
    referrer: pending.referrer,
    landing_path: pending.landing_path,
    page_path,
  };
}
