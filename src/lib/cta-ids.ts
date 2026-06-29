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
  landing_page: "landing_page",
  login_prompt: "login_prompt",
} as const;

export type CtaId = (typeof CTA_IDS)[keyof typeof CTA_IDS];

export function qualifyHref(ctaId: CtaId): string {
  return `/qualify?cta_id=${encodeURIComponent(ctaId)}`;
}
