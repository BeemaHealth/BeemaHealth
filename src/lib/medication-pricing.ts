/**
 * Cash-pay list prices for compounded GLP-1 options shown on marketing pages.
 * Keep FAQ copy and treatment cards in sync via these values.
 */
export const COMPOUNDED_SEMAGLUTIDE_PRICING = {
  firstMonthUsd: 99,
  ongoingUsd: 199,
} as const;

export const COMPOUNDED_TIRZEPATIDE_PRICING = {
  firstMonthUsd: 197,
  ongoingUsd: 297,
} as const;

export type CompoundedMedicationPricing = {
  firstMonthUsd: number;
  ongoingUsd: number;
};

/** e.g. "$99 first month, then $199/mo" */
export function formatCompoundedPriceLine(
  pricing: CompoundedMedicationPricing,
): string {
  return `$${pricing.firstMonthUsd} first month, then $${pricing.ongoingUsd}/mo`;
}

/** Short card headline, e.g. "Starting at $99/mo" */
export function formatStartingAtPerMonth(
  pricing: CompoundedMedicationPricing,
): string {
  return `Starting at $${pricing.firstMonthUsd}/mo`;
}

/**
 * Concise dual-med teaser for hero checklist / marquee chips.
 * e.g. "Semaglutide from $99/mo · Tirzepatide from $197/mo"
 */
export function dualCompoundedShortPricingLine(): string {
  return `Semaglutide from $${COMPOUNDED_SEMAGLUTIDE_PRICING.firstMonthUsd}/mo · Tirzepatide from $${COMPOUNDED_TIRZEPATIDE_PRICING.firstMonthUsd}/mo`;
}

/**
 * Full dual-med first-month + ongoing line for hero / page lead-ins.
 * e.g. "Semaglutide from $99/mo first month ($199 after); Tirzepatide from $197/mo first month ($297 after)"
 */
export function dualCompoundedHeroPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  return `Semaglutide from $${sema.firstMonthUsd}/mo first month ($${sema.ongoingUsd} after); Tirzepatide from $${tirz.firstMonthUsd}/mo first month ($${tirz.ongoingUsd} after)`;
}

/** FAQ / long-form pricing paragraph (both meds, no membership fee). */
export function dualCompoundedFaqPricingParagraph(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  return `Beema Health uses transparent cash-pay medication pricing with no platform membership fee. Compounded semaglutide is $${sema.firstMonthUsd} for the first month, then $${sema.ongoingUsd}/month after. Compounded tirzepatide is $${tirz.firstMonthUsd} for the first month, then $${tirz.ongoingUsd}/month after. Shipping and labs, when applicable, are shown separately before any charge. A prescription is never guaranteed: a licensed clinician decides whether treatment is appropriate.`;
}
