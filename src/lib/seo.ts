/**
 * Canonical production origin — single source of truth for absolute URLs in
 * canonicals, OG tags, and the sitemap.
 *
 * On any domain change, update together in one release:
 *   - SITE_URL (here)
 *   - public/CNAME
 *   - public/robots.txt (Sitemap: line)
 *   - public/sitemap.xml (all URLs)
 *   - public/llms.txt (all URLs)
 * See docs/marketing/SEO-AEO-GEO-PLAN.md (G9 cutover checklist).
 */
export const SITE_URL = "https://beemahealth.com";

/** Absolute URL for a site asset or file, e.g. absoluteUrl("/beema-mark.png"). */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/**
 * Canonical URL for an indexable page, e.g. canonicalUrl("/weight-loss").
 *
 * GitHub Pages serves prerendered pages as directory indexes and 301s the
 * bare path to the trailing-slash form (/weight-loss → /weight-loss/), so
 * canonicals and public/sitemap.xml must use the trailing-slash URL — it is
 * the one that returns 200. Use absoluteUrl() for assets, never this.
 */
export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path.endsWith("/") ? path : `${path}/`}`;
}
