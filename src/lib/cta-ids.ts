/** Stable CTA identifiers for funnel / waitlist attribution (routing unchanged). */
export const CTA_IDS = {
  nav_header: "nav_header",
  nav_mobile: "nav_mobile",
  footer: "footer",
  home_hero: "home_hero",
  home_mid: "home_mid",
  pricing_hero: "pricing_hero",
  pricing_footer: "pricing_footer",
  weight_loss_hero: "weight_loss_hero",
  weight_loss_footer: "weight_loss_footer",
  how_it_works: "how_it_works",
  faq: "faq",
  safety: "safety",
  contact: "contact",
  about: "about",
  landing_page: "landing_page",
  login_prompt: "login_prompt",
} as const;

export type CtaId = (typeof CTA_IDS)[keyof typeof CTA_IDS];

/** Waitlist route — trailing slash matches sitemap-style canonical URLs. */
export const WAITLIST_PATH = "/waitlist/" as const;

/** @deprecated Prefer WAITLIST_PATH — alias kept so old imports keep working. */
export const QUALIFY_PATH = WAITLIST_PATH;

/** Search object for `<Link to={WAITLIST_PATH} search={waitlistSearch(id)} />`. */
export function waitlistSearch(ctaId: CtaId): { cta_id: CtaId } {
  return { cta_id: ctaId };
}

/** @deprecated Prefer waitlistSearch */
export const qualifySearch = waitlistSearch;

/**
 * Full path+search string for raw anchors / non-Link navigation.
 * Slash before `?` so the path matches the GitHub Pages canonical form.
 */
export function waitlistHref(ctaId: CtaId): string {
  return `${WAITLIST_PATH}?cta_id=${encodeURIComponent(ctaId)}`;
}

/** @deprecated Prefer waitlistHref */
export const qualifyHref = waitlistHref;
