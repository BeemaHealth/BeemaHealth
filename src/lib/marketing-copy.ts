/**
 * Shared marketing / waitlist copy — single source of truth so homepage,
 * nav, footer, and /qualify never invent conflicting incentive amounts.
 *
 * MARKETING CONFIRMATION REQUIRED: `EARLY_ADOPTER_DISCOUNT` is a placeholder
 * until Nikki/Matt confirm the live early-adopter offer. Update only here.
 */

/** Concrete early-adopter incentive shown next to qualify / waitlist CTAs. */
export const EARLY_ADOPTER_DISCOUNT = "$100 off first month" as const;

/**
 * Short label for tight UI (nav chip, button microcopy).
 * Keep in sync with {@link EARLY_ADOPTER_DISCOUNT}.
 */
export const EARLY_ADOPTER_DISCOUNT_SHORT = "$100 off" as const;

/**
 * Primary waitlist CTA button label sitewide (nav, hero, footer, mid-page).
 * Links still go to `/qualify` with `cta_id` — only the display text lives here.
 */
export const WAITLIST_CTA_LABEL = "Join waitlist" as const;

/** @see WAITLIST_DISPLAY_COUNT_FALLBACK in waitlist-count.ts */
export {
  WAITLIST_DISPLAY_COUNT_FALLBACK,
  getWaitlistDisplayCount,
  getWaitlistDisplayCountSeed,
} from "@/lib/waitlist-count";

/** Sentence fragment used under homepage / footer CTAs. */
export function earlyAdopterIncentiveLine(): string {
  return `Early adopters get ${EARLY_ADOPTER_DISCOUNT}`;
}

/** Qualify page body copy referencing the same incentive. */
export function waitlistIncentiveBody(): string {
  return `Join the waitlist and we'll email you as soon as we're live, plus ${EARLY_ADOPTER_DISCOUNT} for signing up now.`;
}

/** Success-state copy after waitlist submit. */
export function waitlistSuccessIncentiveLine(): string {
  return `when we launch, with your ${EARLY_ADOPTER_DISCOUNT}.`;
}

/** Formatted social-proof string for the qualify page. */
export function waitlistSocialProofLine(count: number): string {
  return `${count.toLocaleString("en-US")} people already on the waitlist`;
}
