/** Stable CTA identifiers for funnel attribution (routing unchanged). */
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

/** Qualify route path — trailing slash matches sitemap-style canonical URLs. */
export const QUALIFY_PATH = "/qualify/" as const;

/** Search object for `<Link to={QUALIFY_PATH} search={qualifySearch(id)} />`. */
export function qualifySearch(ctaId: CtaId): { cta_id: CtaId } {
  return { cta_id: ctaId };
}

/**
 * Full path+search string for raw anchors / non-Link navigation.
 * Slash before `?` so the path matches the GitHub Pages canonical form.
 */
export function qualifyHref(ctaId: CtaId): string {
  return `${QUALIFY_PATH}?cta_id=${encodeURIComponent(ctaId)}`;
}
