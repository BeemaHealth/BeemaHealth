/** Stable CTA identifiers for funnel / waitlist attribution (routing unchanged). */
export const CTA_IDS = {
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
  tirzepatide_bmi: "tirzepatide_bmi",
  semaglutide_hero: "semaglutide_hero",
  semaglutide_footer: "semaglutide_footer",
  semaglutide_bmi: "semaglutide_bmi",
  how_it_works: "how_it_works",
  faq: "faq",
  safety: "safety",
  contact: "contact",
  about: "about",
  landing_page: "landing_page",
  login_prompt: "login_prompt",
} as const;

export type CtaId = (typeof CTA_IDS)[keyof typeof CTA_IDS];

/**
 * Patient portal login (Hive) — a separate app on its own subdomain, not
 * part of this marketing site's routing. Not a CTA_IDS entry: it's an
 * account action, not a funnel-conversion click.
 */
export const HIVE_LOGIN_URL = "https://hive.beemahealth.com" as const;

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
 * Beema is live: every marketing CTA sitewide sends visitors to Bask's
 * hosted questionnaire (the in-house waitlist/qualify/intake funnel is
 * dormant — see docs/BACKEND-DEFERRED.md). If a different intake URL is
 * ever needed per medication, that's still a per-CTA override below.
 *
 * `resolveCta(id)` is the ONLY place that decision should be made.
 * Every CTA button/link in the app calls this instead of hardcoding
 * WAITLIST_PATH or a label — so repointing the site (fully or one CTA
 * at a time) is a one-file edit here, not a hunt through every
 * route/component.
 *
 * To change what a CTA does:
 *   - Change every CTA at once → edit DEFAULT_CTA_TARGET.
 *   - Change one CTA (e.g. tirzepatide_hero → a medication-specific
 *     intake URL) → add an entry to CTA_OVERRIDES keyed by the CtaId.
 *     `to` may be an internal path ("/intake/") or a full external URL
 *     (Bask lives on a different domain) — both render correctly via
 *     TanStack Router's <Link>.
 */
type CtaTarget = { label: string; to: string };

const DEFAULT_CTA_TARGET: CtaTarget = {
  label: "Get Started",
  to: "https://q.beemahealth.com/start-online-visit/weightloss",
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
