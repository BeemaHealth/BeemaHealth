import { isBaskIntakeUrl, trackIntakeHandoff } from "@/lib/gtm";
import { getBaskHandoffParams } from "@/lib/utm";

/** Stable CTA identifiers for funnel / conversion attribution. */
export const CTA_IDS = {
  nav_mobile: "nav_mobile",
  footer: "footer",
  home_hero: "home_hero",
  home_mid: "home_mid",
  pricing_hero: "pricing_hero",
  pricing_footer: "pricing_footer",
  weight_loss_hero: "weight_loss_hero",
  weight_loss_footer: "weight_loss_footer",
  glp1_hero: "glp1_hero",
  glp1_mid: "glp1_mid",
  glp1_footer: "glp1_footer",
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
  learn_initial_research: "learn_initial_research",
  learn_initial_research_bmi: "learn_initial_research_bmi",
  recipes_hub: "recipes_hub",
  recipe_detail: "recipe_detail",
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
 * hosted intake (one questionnaire — not a separate eligibility product).
 * Leftover in-repo waitlist/qualify/intake routes are legacy — see
 * docs/BACKEND-DEFERRED.md.
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
 *     `to` may be an internal path or a full external URL (Bask lives
 *     on a different domain) — both render correctly via TanStack
 *     Router's <Link>.
 */
type CtaTarget = { label: string; to: string };

const DEFAULT_CTA_TARGET: CtaTarget = {
  label: "Get Started",
  to: "https://q.beemahealth.com/start-online-visit/weightloss",
};

/** Per-CTA overrides for context-specific, compliant labels. */
const CTA_OVERRIDES: Partial<Record<CtaId, CtaTarget>> = {
  recipes_hub: {
    label: "See if a GLP-1 treatment plan could be right for you",
    to: DEFAULT_CTA_TARGET.to,
  },
  recipe_detail: {
    label: "Start an online visit",
    to: DEFAULT_CTA_TARGET.to,
  },
};

/** CTA search params: stable cta_id plus Bask attribution handoff keys. */
export type CtaSearchParams = { cta_id: CtaId } & Record<string, string>;

function isAbsoluteHttpUrl(to: string): boolean {
  try {
    const parsed = new URL(to);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Append attribution query params onto an absolute URL.
 * TanStack <Link> ignores the `search` prop for absolute http(s) hrefs and
 * uses `to` verbatim — so Bask handoff params must live on `to` itself.
 */
export function appendQueryParams(
  url: string,
  params: Record<string, string>,
): string {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value) parsed.searchParams.set(key, value);
  }
  return parsed.toString();
}

/**
 * Build the query object forwarded into Bask (and internal waitlist links):
 * cta_id + fbclid/gclid + all five utm_* params captured on the marketing site.
 */
export function buildCtaSearch(ctaId: CtaId): CtaSearchParams {
  return {
    cta_id: ctaId,
    ...getBaskHandoffParams(),
  };
}

/**
 * Resolve a CTA id to its current label, destination, attribution search
 * params, and click handler. `onClick` pushes `intake_handoff` to the GTM
 * dataLayer (event + cta_location only — no PHI) when the destination is
 * Bask intake (`q.beemahealth.com`). Wire it on every marketing CTA Link.
 *
 * For Bask (absolute) destinations, attribution params are baked into `to`
 * because TanStack Link does not apply `search` to external hrefs.
 */
export function resolveCta(
  ctaId: CtaId,
): CtaTarget & { search: CtaSearchParams; onClick: () => void } {
  const target = CTA_OVERRIDES[ctaId] ?? DEFAULT_CTA_TARGET;
  const search = buildCtaSearch(ctaId);
  const to = isAbsoluteHttpUrl(target.to)
    ? appendQueryParams(target.to, search)
    : target.to;

  return {
    label: target.label,
    to,
    search,
    onClick: () => {
      if (isBaskIntakeUrl(target.to)) {
        // cta_location uses the stable CtaId (e.g. home_hero, footer, pricing_hero).
        trackIntakeHandoff(ctaId);
      }
    },
  };
}
