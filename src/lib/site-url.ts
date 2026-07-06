/**
 * Canonical frontend origin for shareable patient-facing links.
 *
 * Set per environment in `.env.dev`, `.env.staging`, or `.env.production`:
 * `VITE_FRONTEND_URL` (mirrors backend `FRONTEND_URL`).
 */
const configuredBase = import.meta.env.VITE_FRONTEND_URL?.trim() ?? "";

function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getFrontendBaseUrl(): string {
  if (configuredBase) {
    return normalizeBaseUrl(configuredBase);
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:8080";
}

export function landingPageUrl(slug: string): string {
  return `${getFrontendBaseUrl()}/lp/${encodeURIComponent(slug)}`;
}

/** Display form without scheme — e.g. `beemahealth/lp/foo`. */
export function landingPageDisplayUrl(slug: string): string {
  return landingPageUrl(slug).replace(/^https?:\/\//, "");
}
