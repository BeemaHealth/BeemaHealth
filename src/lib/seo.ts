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

/**
 * Site-wide entity schema, rendered as JSON-LD in the root layout head.
 *
 * GEO note: search and AI retrieval pipelines use this to resolve the
 * "Beema Health" entity. The description must stay factually consistent
 * with public/llms.txt and page copy — LLMs favor sources whose facts
 * never contradict each other.
 */
export const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "MedicalOrganization",
  "@id": `${SITE_URL}/#organization`,
  name: "Beema Health",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/beemahealth-logo.png`,
  description:
    "Beema Health is a US telehealth medical weight-loss service. Licensed providers evaluate patients online and, when clinically appropriate, prescribe GLP-1 medications with transparent cash pricing, US pharmacy fulfillment, and ongoing follow-up care.",
  areaServed: { "@type": "Country", name: "United States" },
  sameAs: [
    "https://www.facebook.com/beemahealth",
    "https://www.instagram.com/beemahealth",
    "https://www.tiktok.com/@beema.health",
    "https://www.reddit.com/r/beemahealth",
    "https://x.com/beemahealth",
    "https://www.linkedin.com/in/beema-health-339219423/",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "support@beemahealth.com",
    url: `${SITE_URL}/contact/`,
    contactType: "Customer Support",
  },
} as const;

export const WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: `${SITE_URL}/`,
  name: "Beema Health",
  publisher: { "@id": `${SITE_URL}/#organization` },
} as const;
