import type { PageDef } from "./types.ts";

export const PAGES: PageDef[] = [
  {
    id: "glp-1-houston",
    path: "/glp-1-houston/",
    market: "Houston",
    title: "GLP-1 Houston",
    group: "landing",
    variants: true,
    routeFile: "src/routes/glp-1-houston.tsx",
  },
  {
    id: "semaglutide-houston",
    path: "/semaglutide-houston/",
    market: "Houston",
    title: "Semaglutide Houston",
    group: "landing",
    variants: true,
    routeFile: "src/routes/semaglutide-houston.tsx",
  },
  {
    id: "tirzepatide-houston",
    path: "/tirzepatide-houston/",
    market: "Houston",
    title: "Tirzepatide Houston",
    group: "landing",
    variants: true,
    routeFile: "src/routes/tirzepatide-houston.tsx",
  },
  {
    id: "sildenafil-boston",
    path: "/sildenafil-boston/",
    market: "Boston",
    title: "Sildenafil Boston",
    group: "landing",
    variants: true,
    routeFile: "src/routes/sildenafil-boston.tsx",
  },
  {
    id: "tadalafil-boston",
    path: "/tadalafil-boston/",
    market: "Boston",
    title: "Tadalafil Boston",
    group: "landing",
    variants: true,
    routeFile: "src/routes/tadalafil-boston.tsx",
  },
  {
    id: "ed-mints-boston",
    path: "/ed-mints-boston/",
    market: "Boston",
    title: "ED Mints Boston",
    group: "landing",
    variants: true,
    routeFile: "src/routes/ed-mints-boston.tsx",
  },
  {
    id: "sexual-health",
    path: "/sexual-health/",
    group: "landing",
    variants: true,
    title: "Sexual health",
    routeFile: "src/routes/sexual-health.tsx",
  },
];

export const TIME_ZONE = "America/Denver";

/**
 * Product pages and the home page: tracked in GA4 (visitors, handoffs, Bask
 * signups) but with no variant files, experiments or go-live windows. Learn
 * articles and recipes are not tracked here yet.
 */
export const PRODUCT_PAGES: PageDef[] = [
  {
    id: "home",
    path: "/",
    group: "product",
    variants: false,
    title: "Home page",
    routeFile: "src/routes/index.tsx",
  },
  {
    id: "weight-loss",
    path: "/weight-loss/",
    group: "product",
    variants: false,
    title: "Weight loss",
    routeFile: "src/routes/weight-loss.tsx",
  },
  {
    id: "glp-1",
    path: "/glp-1/",
    group: "product",
    variants: false,
    title: "GLP-1",
    routeFile: "src/routes/glp-1.tsx",
  },
  {
    id: "semaglutide",
    path: "/semaglutide/",
    group: "product",
    variants: false,
    title: "Semaglutide",
    routeFile: "src/routes/semaglutide.tsx",
  },
  {
    id: "tirzepatide",
    path: "/tirzepatide/",
    group: "product",
    variants: false,
    title: "Tirzepatide",
    routeFile: "src/routes/tirzepatide.tsx",
  },
  {
    id: "ed",
    path: "/ed/",
    group: "product",
    variants: false,
    title: "ED",
    routeFile: "src/routes/ed.tsx",
  },
  {
    id: "ed-mints",
    path: "/ed-mints/",
    group: "product",
    variants: false,
    title: "ED mints",
    routeFile: "src/routes/ed-mints.tsx",
  },
  {
    id: "tadalafil",
    path: "/tadalafil/",
    group: "product",
    variants: false,
    title: "Tadalafil",
    routeFile: "src/routes/tadalafil.tsx",
  },
  {
    id: "sildenafil",
    path: "/sildenafil/",
    group: "product",
    variants: false,
    title: "Sildenafil",
    routeFile: "src/routes/sildenafil.tsx",
  },
  {
    id: "hair-loss",
    path: "/hair-loss/",
    group: "product",
    variants: false,
    title: "Hair loss",
    routeFile: "src/routes/hair-loss.tsx",
  },
  {
    id: "hair-loss-spray-men",
    path: "/hair-loss-spray-men/",
    group: "product",
    variants: false,
    title: "Hair loss spray (men)",
    routeFile: "src/routes/hair-loss-spray-men.tsx",
  },
  {
    id: "hair-loss-spray-women",
    path: "/hair-loss-spray-women/",
    group: "product",
    variants: false,
    title: "Hair loss spray (women)",
    routeFile: "src/routes/hair-loss-spray-women.tsx",
  },
  {
    id: "oral-finasteride",
    path: "/oral-finasteride/",
    group: "product",
    variants: false,
    title: "Oral finasteride",
    routeFile: "src/routes/oral-finasteride.tsx",
  },
  {
    id: "oral-minoxidil-men",
    path: "/oral-minoxidil-men/",
    group: "product",
    variants: false,
    title: "Oral minoxidil (men)",
    routeFile: "src/routes/oral-minoxidil-men.tsx",
  },
  {
    id: "oral-minoxidil-women",
    path: "/oral-minoxidil-women/",
    group: "product",
    variants: false,
    title: "Oral minoxidil (women)",
    routeFile: "src/routes/oral-minoxidil-women.tsx",
  },
  {
    id: "nad-plus",
    path: "/nad-plus/",
    group: "product",
    variants: false,
    title: "NAD+",
    routeFile: "src/routes/nad-plus.tsx",
  },
  {
    id: "sermorelin",
    path: "/sermorelin/",
    group: "product",
    variants: false,
    title: "Sermorelin",
    routeFile: "src/routes/sermorelin.tsx",
  },
];

/** Every page the lab reads analytics for. Variant tooling uses PAGES only. */
export const TRACKED_PAGES: PageDef[] = [...PAGES, ...PRODUCT_PAGES];

/** Canonical path of a tracked page id ("/" for home), or null. */
export function pagePathFor(pageId: string): string | null {
  return TRACKED_PAGES.find((p) => p.id === pageId)?.path ?? null;
}

const normalizePath = (p: string) =>
  p === "/" || p === "" ? "/" : `/${p.replace(/^\/+|\/+$/g, "")}/`;

/** Page whose path matches a GA4 pagePath ("/semaglutide" and "/semaglutide/" alike). */
export function pageIdFromPagePath(
  pagePath: string,
  pageIds: readonly string[],
): string | null {
  const want = normalizePath(pagePath);
  return (
    TRACKED_PAGES.find((p) => pageIds.includes(p.id) && p.path === want)?.id ??
    null
  );
}

/** GA4 FULL_REGEXP matching exactly the given pages' paths, with or without a trailing slash. */
export function pagePathRegexp(pageIds: readonly string[]): string {
  const alts = TRACKED_PAGES.filter((p) => pageIds.includes(p.id)).map((p) =>
    p.path === "/" ? "/" : `${p.path.replace(/\/$/, "")}/?`,
  );
  return `(${alts.join("|")})`;
}

export const CANONICAL_ORIGIN = "https://beemahealth.com";

/**
 * CTA id prefixes by tracked page. Every CTA on a page resolves through
 * resolveCta(CTA_IDS.<prefix>_hero|mid|footer|bmi), so the prefix identifies
 * the page. The sitewide footer CTA ("footer") belongs to no page.
 */
const CTA_PREFIX_TO_PAGE: readonly [string, string][] = [
  // glp1_* is shared by /glp-1 and /glp-1-houston; it counts toward Houston.
  ["glp1_", "glp-1-houston"],
  // More specific prefixes first (semaglutide_houston_ before semaglutide_).
  ["semaglutide_houston_", "semaglutide-houston"],
  ["semaglutide_", "semaglutide"],
  ["tirzepatide_houston_", "tirzepatide-houston"],
  ["tirzepatide_", "tirzepatide"],
  ["sildenafil_boston_", "sildenafil-boston"],
  ["sildenafil_", "sildenafil"],
  ["tadalafil_boston_", "tadalafil-boston"],
  ["tadalafil_", "tadalafil"],
  ["ed_mints_boston_", "ed-mints-boston"],
  ["ed_mints_", "ed-mints"],
  ["ed_", "ed"],
  ["weight_loss_", "weight-loss"],
  ["sexual_health_", "sexual-health"],
  ["hair_", "hair-loss"],
  ["hairloss_spray_men_", "hair-loss-spray-men"],
  ["hairloss_spray_women_", "hair-loss-spray-women"],
  ["oral_finasteride_", "oral-finasteride"],
  ["oral_minoxidil_men_", "oral-minoxidil-men"],
  ["oral_minoxidil_women_", "oral-minoxidil-women"],
  ["nad_", "nad-plus"],
  ["sermorelin_", "sermorelin"],
  ["home_", "home"],
];

/** Tracked page a Bask-bound CTA belongs to, or null if untracked or unknown. */
export function pageIdFromCtaId(
  ctaId: string | null | undefined,
): string | null {
  if (!ctaId) return null;
  const hit = CTA_PREFIX_TO_PAGE.find(([prefix]) => ctaId.startsWith(prefix));
  return hit ? hit[1] : null;
}

/**
 * Tracked page named by the `src_page` param the site stamps on Bask links
 * (the marketing path the click came from), or null if absent or untracked.
 */
export function pageIdFromSrcPage(
  srcPage: string | null | undefined,
): string | null {
  if (!srcPage) return null;
  return (
    TRACKED_PAGES.find((p) => p.path === normalizePath(srcPage))?.id ?? null
  );
}

/** Pages whose attribution is shared with another page, with a plain note. */
export const SHARED_CTA_NOTE: Record<string, string> = {
  "glp-1-houston":
    "The GLP-1 buttons use the same CTA ids on /glp-1, so all of those signups are counted here and none on the GLP-1 product page.",
  "glp-1":
    "The GLP-1 buttons use the same CTA ids as GLP-1 Houston, so their signups are counted on that landing page, not here.",
};
