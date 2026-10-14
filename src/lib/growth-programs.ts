/**
 * Growth programs (patient story, referral, creator): single source of truth
 * for amounts, destinations, state gating, and compliance strings.
 *
 * Design and open legal questions: docs/features/growth-programs-legal.md.
 * Everything here is copy/config only. The marketing site never stores videos,
 * signed authorizations, or patient data: submission and application flows
 * link OUT to Bask or a BAA-covered vendor via the URLs below.
 */

export type GrowthProgramId = "story" | "referral" | "creator";

/**
 * Pages are built but kept out of search (noindex, no sitemap entry) until the
 * launch gate in docs/features/growth-programs-legal.md section 10 is cleared.
 * Flip to true together with adding the paths to public/sitemap.xml and the
 * sitemap test.
 */
export const GROWTH_PROGRAMS_INDEXABLE = false;

/**
 * Where each program's action button goes. `null` means the destination is not
 * live yet (Bask / vendor answers pending), and the page falls back to a
 * support email instead of pretending a flow exists.
 */
export const GROWTH_PROGRAM_ACTION_URLS: Record<
  GrowthProgramId,
  string | null
> = {
  story: null,
  referral: null,
  creator: null,
};

/**
 * Provisional seed list only (decision for Matt and counsel, not exhaustive).
 * Creators in a restricted state cannot join; see the legal doc section 1.3.
 */
export const PROGRAM_RESTRICTED_STATES: Record<GrowthProgramId, string[]> = {
  story: [],
  referral: [],
  creator: ["FL", "CA", "TX", "IL", "NY"],
};

export const STORY_CREDIT_USD = 100;
/** Unconfirmed: the legal doc suggests $50 each side. Matt to confirm. */
export const REFERRAL_CREDIT_USD = 50;
export const CREATOR_MIN_FOLLOWERS = 5000;

export const STORY_LANDING_PATH = "/share-your-story";
export const REFERRAL_LANDING_PATH = "/refer";
export const CREATOR_LANDING_PATH = "/creators";

export const STORY_TERMS_PATH = "/legal/story-program-terms/" as const;
export const REFERRAL_TERMS_PATH = "/legal/referral-terms/" as const;
export const CREATOR_TERMS_PATH = "/legal/creator-program-terms/" as const;

export const STORY_COMPENSATION_DISCLOSURE =
  "Compensated patient story. Individual results vary and are not typical.";

export const STORY_PAGE_FOOTER_DISCLOSURE = `These stories are shared by patients who received a $${STORY_CREDIT_USD} credit toward their care. Beema Health does not edit stories for sentiment. Care is provided by independently licensed Providers and a prescription is issued only if clinically appropriate.`;

export const REFERRAL_SHARE_NOTICE = `Refer a friend and you each get a $${REFERRAL_CREDIT_USD} credit toward your own Beema Health care after their first paid order. Credits have no cash value. We do not tell you who became a patient. Share only with people you know.`;

export const CREATOR_EARNINGS_DISCLAIMER =
  "Earnings are not guaranteed. Compensation depends on the program terms and on actual, eligible new patients, and many creators earn nothing.";

export const CLINICAL_INDEPENDENCE_NOTE =
  "Taking part is optional and never affects your care, prices, or eligibility. Providers and pharmacies are not compensated for any program, and clinical decisions are made independently.";

/** True when the program is switched off for the given two-letter state code. */
export function isProgramRestrictedInState(
  program: GrowthProgramId,
  stateCode: string,
): boolean {
  const code = stateCode.trim().toUpperCase();
  return PROGRAM_RESTRICTED_STATES[program].includes(code);
}
