/**
 * Canonical production origin — single source of truth for absolute URLs in
 * canonicals, OG tags, and the sitemap.
 *
 * On any domain change, update together in one release:
 *   - SITE_URL (here)
 *   - public/CNAME
 *   - public/robots.txt (Sitemap: line)
 *   - public/llms.txt (all URLs)
 * See docs/marketing/SEO-AEO-GEO-PLAN.md (G9 cutover checklist).
 */
export const SITE_URL = "https://beemahealth.com";

/** Absolute URL for a site path, e.g. absoluteUrl("/pricing"). */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}
