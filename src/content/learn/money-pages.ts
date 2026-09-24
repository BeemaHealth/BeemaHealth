/**
 * Commercial money pages that learn content may interlink.
 * Only routes that actually exist on the marketing site belong here.
 * Learn pages must not impersonate these URLs' commercial H1s.
 */
export type LearnMoneyPage = {
  href: string;
  label: string;
};

export const LEARN_MONEY_PAGES: Readonly<Record<string, LearnMoneyPage>> = {
  "/weight-loss/": {
    href: "/weight-loss/",
    label: "Medical weight-loss program",
  },
  "/semaglutide/": {
    href: "/semaglutide/",
    label: "Compounded semaglutide",
  },
  "/tirzepatide/": {
    href: "/tirzepatide/",
    label: "Compounded tirzepatide",
  },
  "/glp-1/": {
    href: "/glp-1/",
    label: "Cash-pay GLP-1 care",
  },
  "/glp-1-houston/": {
    href: "/glp-1-houston/",
    label: "GLP-1 care for Houston",
  },
  "/oral-finasteride/": {
    href: "/oral-finasteride/",
    label: "Oral finasteride",
  },
  "/ed/": {
    href: "/ed/",
    label: "Generic ED treatment",
  },
  "/tadalafil/": {
    href: "/tadalafil/",
    label: "Tadalafil (generic Cialis)",
  },
  "/sildenafil/": {
    href: "/sildenafil/",
    label: "Sildenafil (generic Viagra)",
  },
  "/ed-mints/": {
    href: "/ed-mints/",
    label: "ED Mints",
  },
  "/nad-plus/": {
    href: "/nad-plus/",
    label: "Compounded NAD+",
  },
  "/sermorelin/": {
    href: "/sermorelin/",
    label: "Compounded sermorelin",
  },
  "/sexual-health/": {
    href: "/sexual-health/",
    label: "Sexual health program",
  },
  "/hair-loss/": {
    href: "/hair-loss/",
    label: "Hair loss program",
  },
  "/how-it-works/": {
    href: "/how-it-works/",
    label: "How care works",
  },
  "/safety/": {
    href: "/safety/",
    label: "Safety and eligibility",
  },
};

function withTrailingSlash(href: string): string {
  if (href === "/") return href;
  return href.endsWith("/") ? href : `${href}/`;
}

/** Keep hrefs whose routes exist. Skip unknown or retired paths. */
export function resolveMoneyPageHrefs(
  hrefs: readonly string[],
): LearnMoneyPage[] {
  const seen = new Set<string>();
  const pages: LearnMoneyPage[] = [];
  for (const raw of hrefs) {
    const href = withTrailingSlash(raw);
    const page = LEARN_MONEY_PAGES[href];
    if (!page || seen.has(page.href)) continue;
    seen.add(page.href);
    pages.push(page);
  }
  return pages;
}
