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
  tirzepatide_hero: "tirzepatide_hero",
  tirzepatide_footer: "tirzepatide_footer",
  semaglutide_hero: "semaglutide_hero",
  semaglutide_footer: "semaglutide_footer",
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

/**
 * ---------------------------------------------------------------------
 * CTA switchboard
 * ---------------------------------------------------------------------
 * Beema is currently pre-launch: every marketing CTA sitewide sends
 * visitors to the waitlist. Once the patient portal (intake, payment,
 * dashboard — built separately from this marketing site) is live, CTAs
 * need to start pointing there instead — possibly a different URL per
 * CTA (e.g. a medication-specific intake link).
 *
 * `resolveCta(id)` is the ONLY place that decision should be made.
 * Every CTA button/link in the app calls this instead of hardcoding
 * WAITLIST_PATH or a label — so flipping the site from waitlist mode to
 * live mode (fully or one CTA at a time) is a one-file edit here, not a
 * hunt through every route/component.
 *
 * To change what a CTA does:
 *   - Change every CTA at once → edit DEFAULT_CTA_TARGET.
 *   - Change one CTA (e.g. tirzepatide_hero → a live intake URL) → add
 *     an entry to CTA_OVERRIDES keyed by the CtaId. `to` may be an
 *     internal path ("/intake/") or a full external URL (the portal
 *     may live on a different domain) — both render correctly via
 *     TanStack Router's <Link>.
 */
type CtaTarget = { label: string; to: string };

const DEFAULT_CTA_TARGET: CtaTarget = {
  label: "Join waitlist",
  to: WAITLIST_PATH,
};

/** Per-CTA overrides. Empty today — every CtaId falls back to DEFAULT_CTA_TARGET. */
const CTA_OVERRIDES: Partial<Record<CtaId, CtaTarget>> = {};

/** Resolve a CTA id to its current label, destination, and attribution search params. */
export function resolveCta(
  ctaId: CtaId,
): CtaTarget & { search: { cta_id: CtaId } } {
  const target = CTA_OVERRIDES[ctaId] ?? DEFAULT_CTA_TARGET;
  return { ...target, search: { cta_id: ctaId } };
}
