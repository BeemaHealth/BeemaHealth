const SESSION_KEY = "beemahealth_pending_utms";

export type UtmParams = {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  landing_page_slug: string;
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
  return result;
}

export function storePendingUtms(utms: Partial<UtmParams>): void {
  if (Object.keys(utms).length === 0) return;
  try {
    const existing = getPendingUtms();
    // Don't overwrite an existing landing page slug with empty
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

export function capturePageUtms(): void {
  const utms = readUtmsFromUrl();
  if (Object.keys(utms).length > 0) storePendingUtms(utms);
}
