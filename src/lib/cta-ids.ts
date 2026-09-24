import { isBaskIntakeUrl, trackIntakeHandoff } from "@/lib/gtm";
import { getBaskHandoffParams } from "@/lib/utm";

/** Stable CTA identifiers for funnel / conversion attribution. */
export const CTA_IDS = {
  footer: "footer",
  home_hero: "home_hero",
  home_mid: "home_mid",
  pricing_hero: "pricing_hero",
  pricing_footer: "pricing_footer",
  weight_loss_hero: "weight_loss_hero",
  weight_loss_footer: "weight_loss_footer",
  sexual_health_hero: "sexual_health_hero",
  sexual_health_footer: "sexual_health_footer",
  hair_hero: "hair_hero",
  hair_footer: "hair_footer",
  wellness_hero: "wellness_hero",
  wellness_footer: "wellness_footer",
  glp1_hero: "glp1_hero",
  glp1_mid: "glp1_mid",
  glp1_footer: "glp1_footer",
  tirzepatide_hero: "tirzepatide_hero",

  tirzepatide_footer: "tirzepatide_footer",
  tirzepatide_bmi: "tirzepatide_bmi",
  semaglutide_hero: "semaglutide_hero",
  semaglutide_footer: "semaglutide_footer",
  semaglutide_bmi: "semaglutide_bmi",
  trt_hero: "trt_hero",
  trt_footer: "trt_footer",
  ed_hero: "ed_hero",
  ed_footer: "ed_footer",
  tadalafil_hero: "tadalafil_hero",
  tadalafil_footer: "tadalafil_footer",
  sildenafil_hero: "sildenafil_hero",
  sildenafil_footer: "sildenafil_footer",
  oral_finasteride_hero: "oral_finasteride_hero",
  oral_finasteride_footer: "oral_finasteride_footer",
  oral_minoxidil_men_hero: "oral_minoxidil_men_hero",
  oral_minoxidil_men_footer: "oral_minoxidil_men_footer",
  oral_minoxidil_women_hero: "oral_minoxidil_women_hero",
  oral_minoxidil_women_footer: "oral_minoxidil_women_footer",
  hairloss_spray_men_hero: "hairloss_spray_men_hero",
  hairloss_spray_men_footer: "hairloss_spray_men_footer",
  hairloss_spray_women_hero: "hairloss_spray_women_hero",
  hairloss_spray_women_footer: "hairloss_spray_women_footer",
  ed_mints_rdt_hero: "ed_mints_rdt_hero",
  ed_mints_rdt_footer: "ed_mints_rdt_footer",
  ed_mints_odt_hero: "ed_mints_odt_hero",
  ed_mints_odt_footer: "ed_mints_odt_footer",
  nad_hero: "nad_hero",
  nad_footer: "nad_footer",
  sermorelin_hero: "sermorelin_hero",
  sermorelin_footer: "sermorelin_footer",
  how_it_works: "how_it_works",
  faq: "faq",
  safety: "safety",
  contact: "contact",
  about: "about",
  learn_initial_research: "learn_initial_research",
  learn_initial_research_bmi: "learn_initial_research_bmi",
  learn_resistance_training: "learn_resistance_training",
  learn_rest_intervals: "learn_rest_intervals",
  learn_sema_vs_tirz: "learn_sema_vs_tirz",
  learn_weight_loss: "learn_weight_loss",
  recipes_hub: "recipes_hub",
  recipe_detail: "recipe_detail",
  landing_page: "landing_page",
  login_prompt: "login_prompt",
} as const;

export type CtaId = (typeof CTA_IDS)[keyof typeof CTA_IDS];

/**
 * Patient portal login (Hive) - a separate app on its own subdomain, not
 * part of this marketing site's routing. Not a CTA_IDS entry: it's an
 * account action, not a funnel-conversion click.
 */
export const HIVE_LOGIN_URL = "https://hive.beemahealth.com" as const;

/** Waitlist route - trailing slash matches sitemap-style canonical URLs. */
export const WAITLIST_PATH = "/waitlist/" as const;

/** @deprecated Prefer WAITLIST_PATH - alias kept so old imports keep working. */
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
 * Beema Health is live: every marketing CTA sitewide sends visitors to Bask's
 * hosted intake (one questionnaire - not a separate eligibility product).
 * Leftover in-repo waitlist/qualify/intake routes are legacy - see
 * docs/BACKEND-DEFERRED.md.
 *
 * `resolveCta(id)` is the ONLY place that decision should be made.
 * Every CTA button/link in the app calls this instead of hardcoding
 * WAITLIST_PATH or a label - so repointing the site (fully or one CTA
 * at a time) is a one-file edit here, not a hunt through every
 * route/component.
 *
 * To change what a CTA does:
 * - Change every CTA at once → edit DEFAULT_CTA_TARGET.
 * - Change one CTA (e.g. tirzepatide_hero → a medication-specific
 *     intake URL) → add an entry to CTA_OVERRIDES keyed by the CtaId.
 *     `to` may be an internal path or a full external URL (Bask lives
 *     on a different domain) - both render correctly via TanStack
 *     Router's <Link>.
 */
type CtaTarget = { label: string; to: string };

const DEFAULT_CTA_TARGET: CtaTarget = {
  label: "Get Started",
  to: "https://q.beemahealth.com/start-online-visit/weightloss",
};

/**
 * Bask intake base for the 5 non-GLP-1 product lines added 2026-08-27.
 * ASSUMED URL SHAPE, not yet confirmed against Bask's actual routing -
 * mirrors the only known-good pattern (DEFAULT_CTA_TARGET's
 * `/start-online-visit/weightloss`). Verify each `/start-online-visit/{slug}`
 * path resolves on Bask before this branch merges; a wrong slug silently
 * misroutes every conversion for that product.
 */
const BASK_INTAKE_BASE = "https://q.beemahealth.com/start-online-visit";

/**
 * ED Mints (2026-09-03) - two distinct combo products on /ed-mints, each
 * with its OWN confirmed Bask questionnaire flow, not /ed's shared intake.
 * RDT = "Tadalafil + Sildenafil" (starts with tadalafil); ODT =
 * "Sildenafil + Tadalafil + Oxytocin" (starts with sildenafil) - matches the
 * ordering in MINT_OPTIONS in ed-mints.tsx.
 */
const ED_MINTS_RDT_INTAKE_URL =
  "https://q.beemahealth.com/start-online-visit/edmint1";
const ED_MINTS_ODT_INTAKE_URL =
  "https://q.beemahealth.com/start-online-visit/edmint2";

/**
 * Confirmed production Bask questionnaire URLs (2026-09-03), replacing the
 * earlier `${BASK_INTAKE_BASE}/{hairloss|ed}` guesses for these 3 products.
 * Each dedicated money page (/tadalafil, /sildenafil, /oral-finasteride)
 * routes its "Get Started" CTA straight here - see the money-page
 * architecture note above CTA_OVERRIDES.
 */
const FINASTERIDE_INTAKE_URL =
  "https://q.beemahealth.com/start-online-visit/finasteride";
const TADALAFIL_INTAKE_URL =
  "https://q.beemahealth.com/start-online-visit/tadalafil";
const SILDENAFIL_INTAKE_URL =
  "https://q.beemahealth.com/start-online-visit/sildenafil";

/**
 * Confirmed production Bask questionnaire URLs (2026-09-09) for Oral
 * Minoxidil and the two sex-specific Hair Loss Sprays. Oral Minoxidil is one
 * product/one price/one Bask questionnaire for both sexes (see
 * HAIRLOSS_ORAL_MINOXIDIL_PRICING) - `ORAL_MINOXIDIL_INTAKE_URL` below is
 * reused by two separate money pages, `/oral-minoxidil-men` and
 * `/oral-minoxidil-women` (split 2026-09-09, per Matt, so each page's copy
 * stays single-sex - women's copy never mentions the men's product and vice
 * versa - even though both hand off to the same questionnaire). The two
 * sprays have genuinely separate questionnaires and pages
 * (`/hair-loss-spray-men`, `/hair-loss-spray-women`).
 */
const ORAL_MINOXIDIL_INTAKE_URL =
  "https://q.beemahealth.com/start-online-visit/oralminoxidil";
const HAIRLOSS_SPRAY_WOMEN_INTAKE_URL =
  "https://q.beemahealth.com/start-online-visit/hairlossspraywomen";
const HAIRLOSS_SPRAY_MEN_INTAKE_URL =
  "https://q.beemahealth.com/start-online-visit/hairlossspraymen";

/**
 * Confirmed production Bask questionnaire URL (2026-09-16) for NAD+, given
 * directly by Matt at relaunch - replaces the earlier
 * `${BASK_INTAKE_BASE}/nad` guess (same literal URL, now a named, confirmed
 * const like the others above rather than an inline guess).
 */
const NAD_INTAKE_URL = "https://q.beemahealth.com/start-online-visit/nad";

/**
 * Confirmed production Bask questionnaire URL (2026-09-17) for Sermorelin,
 * given directly by Matt at relaunch - replaces the earlier
 * `${BASK_INTAKE_BASE}/sermorelin` guess (same literal URL, now a named,
 * confirmed const like the others above rather than an inline guess).
 */
const SERMORELIN_INTAKE_URL =
  "https://q.beemahealth.com/start-online-visit/sermorelin";

/**
 * Money-page architecture (2026-09-03): each product that has a confirmed
 * Bask URL gets its own dedicated landing page (/tadalafil, /sildenafil,
 * /oral-finasteride, /ed-mints, /tirzepatide, /semaglutide) whose CTA goes
 * straight to that product's questionnaire - nav dropdowns link directly to
 * these pages, never through an intermediate page first. `/ed`,
 * `/sexual-health`, `/hair-loss`, and `/weight-loss` are overview/comparison
 * pages one level up - they explain and compare, then link onward to the
 * money page for the actual "Get Started" click. `ed_hero`/`ed_footer` stay
 * defined below (unused by any live page now that `/ed` links onward instead
 * of converting directly) so the entries aren't lost if that changes again.
 * `hairloss_hero`/`hairloss_footer` (the old `/hairloss` overview page's
 * unused CTAs) were removed 2026-09-04 when `/hairloss` was merged into
 * `/hair-loss` - that page never shipped to production, so there was nothing
 * to preserve. `hair_hero`/`hair_footer` below are `/hair-loss`'s hub CTAs,
 * kept under their original `hair_*` id so funnel attribution stays stable.
 */
const CTA_OVERRIDES: Partial<Record<CtaId, CtaTarget>> = {
  // home_hero has no override (2026-09-04): the hero button now opens
  // GetStartedModal instead of linking straight to Bask, so `resolveCta`
  // is only reached per-product inside the modal, and each product uses
  // its own CtaId (tirzepatide_hero, tadalafil_hero, etc.) - see
  // src/components/site/GetStartedModal.tsx and docs/features/homepage.md.
  recipes_hub: {
    label: "See if a GLP-1 treatment plan could be right for you",
    to: DEFAULT_CTA_TARGET.to,
  },
  recipe_detail: {
    label: "Start an online visit",
    to: DEFAULT_CTA_TARGET.to,
  },
  learn_weight_loss: {
    label: "See if a provider-reviewed plan could be right for you",
    to: DEFAULT_CTA_TARGET.to,
  },
  trt_hero: { label: "Get Started", to: `${BASK_INTAKE_BASE}/trt` },
  trt_footer: { label: "Get Started", to: `${BASK_INTAKE_BASE}/trt` },
  ed_hero: { label: "Get Started", to: `${BASK_INTAKE_BASE}/ed` },
  ed_footer: { label: "Get Started", to: `${BASK_INTAKE_BASE}/ed` },
  tadalafil_hero: { label: "Get Started", to: TADALAFIL_INTAKE_URL },
  tadalafil_footer: { label: "Get Started", to: TADALAFIL_INTAKE_URL },
  sildenafil_hero: { label: "Get Started", to: SILDENAFIL_INTAKE_URL },
  sildenafil_footer: { label: "Get Started", to: SILDENAFIL_INTAKE_URL },
  oral_finasteride_hero: { label: "Get Started", to: FINASTERIDE_INTAKE_URL },
  oral_finasteride_footer: {
    label: "Get Started",
    to: FINASTERIDE_INTAKE_URL,
  },
  oral_minoxidil_men_hero: {
    label: "Get Started",
    to: ORAL_MINOXIDIL_INTAKE_URL,
  },
  oral_minoxidil_men_footer: {
    label: "Get Started",
    to: ORAL_MINOXIDIL_INTAKE_URL,
  },
  oral_minoxidil_women_hero: {
    label: "Get Started",
    to: ORAL_MINOXIDIL_INTAKE_URL,
  },
  oral_minoxidil_women_footer: {
    label: "Get Started",
    to: ORAL_MINOXIDIL_INTAKE_URL,
  },
  hairloss_spray_men_hero: {
    label: "Get Started",
    to: HAIRLOSS_SPRAY_MEN_INTAKE_URL,
  },
  hairloss_spray_men_footer: {
    label: "Get Started",
    to: HAIRLOSS_SPRAY_MEN_INTAKE_URL,
  },
  hairloss_spray_women_hero: {
    label: "Get Started",
    to: HAIRLOSS_SPRAY_WOMEN_INTAKE_URL,
  },
  hairloss_spray_women_footer: {
    label: "Get Started",
    to: HAIRLOSS_SPRAY_WOMEN_INTAKE_URL,
  },
  ed_mints_rdt_hero: { label: "Get Started", to: ED_MINTS_RDT_INTAKE_URL },
  ed_mints_rdt_footer: { label: "Get Started", to: ED_MINTS_RDT_INTAKE_URL },
  ed_mints_odt_hero: { label: "Get Started", to: ED_MINTS_ODT_INTAKE_URL },
  ed_mints_odt_footer: { label: "Get Started", to: ED_MINTS_ODT_INTAKE_URL },
  nad_hero: { label: "Get Started", to: NAD_INTAKE_URL },
  nad_footer: { label: "Get Started", to: NAD_INTAKE_URL },
  sermorelin_hero: { label: "Get Started", to: SERMORELIN_INTAKE_URL },
  sermorelin_footer: { label: "Get Started", to: SERMORELIN_INTAKE_URL },
  /**
   * Category hub pages (2026-08-27) mix multiple products each, so there's
   * no single correct Bask intake path - these default to one product in
   * the category rather than falling through to DEFAULT_CTA_TARGET (the
   * weight-loss intake), which would be actively wrong here, not just
   * unverified. Pick is arbitrary (now pointed at a confirmed URL instead of
   * a guessed one, 2026-09-03) and should be revisited once Bask confirms
   * whether a category-level intake exists.
   */
  sexual_health_hero: { label: "Get Started", to: TADALAFIL_INTAKE_URL },
  sexual_health_footer: { label: "Get Started", to: TADALAFIL_INTAKE_URL },
  hair_hero: { label: "Get Started", to: FINASTERIDE_INTAKE_URL },
  hair_footer: { label: "Get Started", to: FINASTERIDE_INTAKE_URL },
  wellness_hero: { label: "Get Started", to: NAD_INTAKE_URL },
  wellness_footer: { label: "Get Started", to: NAD_INTAKE_URL },
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
 * uses `to` verbatim - so Bask handoff params must live on `to` itself.
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
 * dataLayer (event + cta_location only - no PHI) when the destination is
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
