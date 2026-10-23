import type { PageDef } from "./types.ts";

export const PAGES: PageDef[] = [
  {
    id: "glp-1-houston",
    path: "/glp-1-houston/",
    market: "Houston",
    title: "GLP-1 Houston",
    routeFile: "src/routes/glp-1-houston.tsx",
  },
  {
    id: "semaglutide-houston",
    path: "/semaglutide-houston/",
    market: "Houston",
    title: "Semaglutide Houston",
    routeFile: "src/routes/semaglutide-houston.tsx",
  },
  {
    id: "tirzepatide-houston",
    path: "/tirzepatide-houston/",
    market: "Houston",
    title: "Tirzepatide Houston",
    routeFile: "src/routes/tirzepatide-houston.tsx",
  },
  {
    id: "sildenafil-boston",
    path: "/sildenafil-boston/",
    market: "Boston",
    title: "Sildenafil Boston",
    routeFile: "src/routes/sildenafil-boston.tsx",
  },
  {
    id: "tadalafil-boston",
    path: "/tadalafil-boston/",
    market: "Boston",
    title: "Tadalafil Boston",
    routeFile: "src/routes/tadalafil-boston.tsx",
  },
  {
    id: "ed-mints-boston",
    path: "/ed-mints-boston/",
    market: "Boston",
    title: "ED Mints Boston",
    routeFile: "src/routes/ed-mints-boston.tsx",
  },
];

export const TIME_ZONE = "America/Denver";
export const CANONICAL_ORIGIN = "https://beemahealth.com";

/**
 * CTA id prefixes by landing page. Every CTA on a page resolves through
 * resolveCta(CTA_IDS.<prefix>_hero|mid|footer|bmi), so the prefix identifies
 * the page. glp1_* is shared: /glp-1 uses the same ids as /glp-1-houston.
 */
const CTA_PREFIX_TO_PAGE: readonly [string, string][] = [
  ["glp1_", "glp-1-houston"],
  ["semaglutide_houston_", "semaglutide-houston"],
  ["tirzepatide_houston_", "tirzepatide-houston"],
  ["sildenafil_boston_", "sildenafil-boston"],
  ["tadalafil_boston_", "tadalafil-boston"],
  ["ed_mints_boston_", "ed-mints-boston"],
];

/** Landing page a Bask-bound CTA belongs to, or null if untracked or unknown. */
export function pageIdFromCtaId(
  ctaId: string | null | undefined,
): string | null {
  if (!ctaId) return null;
  const hit = CTA_PREFIX_TO_PAGE.find(([prefix]) => ctaId.startsWith(prefix));
  return hit ? hit[1] : null;
}

/** Pages whose attribution is shared with another page, with a plain note. */
export const SHARED_CTA_NOTE: Record<string, string> = {
  "glp-1-houston":
    "The GLP-1 buttons use the same CTA ids on /glp-1, so some of these may come from /glp-1.",
};
