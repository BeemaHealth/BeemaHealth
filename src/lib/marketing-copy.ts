/**
 * Shared marketing / promo copy: single source of truth so homepage, nav,
 * and footer never invent conflicting incentive amounts. Deliberately
 * framed as a standing promo, not a "new company" / early-adopter pitch —
 * Beema reads as an established provider, not a startup still filling seats.
 */

import { SUPPORT_EMAIL } from "@/lib/contact-info";

/**
 * Dual-med offer line shown next to marketing CTAs.
 * Semaglutide: one-time $100 promo code on a 3-month plan.
 * Tirzepatide: new-patient starter pack ($599 / $199/mo) leads; Tirz100
 * remains an alternate path. Numbers live in `medication-pricing.ts`.
 */
export const FIRST_MONTH_PROMO_LINE =
  "sema-off100 for $100 off semaglutide, or a $599 tirzepatide new-patient starter pack ($199/mo)" as const;

/**
 * Short label for tight UI (nav chip, button microcopy).
 * Keep in sync with {@link FIRST_MONTH_PROMO_LINE}.
 */
export const FIRST_MONTH_PROMO_SHORT =
  "Tirz starter $199/mo · sema-off100" as const;

/**
 * Primary waitlist CTA button label sitewide (nav, hero, footer, mid-page).
 * Links still go to `/qualify` with `cta_id`; only the display text lives here.
 */
export const WAITLIST_CTA_LABEL = "Join waitlist" as const;

/**
 * How patients get answers: intake is a questionnaire only (no live Q&A
 * inside it). Follow-up questions open after intake + payment; before that,
 * email support.
 */
export function patientQuestionsGuidance(): string {
  return `The medical intake is a questionnaire only; you can't ask questions inside it. After you complete intake and pay, you can ask us additional questions. If you'd like to chat before then, email us at ${SUPPORT_EMAIL}.`;
}

/** @see WAITLIST_DISPLAY_COUNT_FALLBACK in waitlist-count.ts */
export {
  WAITLIST_DISPLAY_COUNT_FALLBACK,
  getWaitlistDisplayCount,
  getWaitlistDisplayCountSeed,
} from "@/lib/waitlist-count";

/** Sentence fragment used under homepage / footer CTAs. */
export function promoIncentiveLine(): string {
  return `Save with ${FIRST_MONTH_PROMO_LINE}`;
}

/** Qualify page body copy referencing the same incentive. */
export function waitlistIncentiveBody(): string {
  return `Join the waitlist and we'll email you as soon as we're live. Sign up now for ${FIRST_MONTH_PROMO_LINE}.`;
}

/** Success-state copy after waitlist submit. */
export function waitlistSuccessIncentiveLine(): string {
  return `when we launch. You'll get ${FIRST_MONTH_PROMO_LINE}.`;
}

/** Formatted social-proof string for the qualify page. */
export function waitlistSocialProofLine(count: number): string {
  return `${count.toLocaleString("en-US")} people already on the waitlist`;
}
