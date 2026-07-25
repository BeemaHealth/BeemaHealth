/**
 * Cash-pay list prices for compounded GLP-1 options shown on marketing pages.
 * Keep FAQ copy and treatment cards in sync via these values.
 *
 * Pricing structure: `firstMonthUsd` (the $100-off early-adopter price, see
 * `EARLY_ADOPTER_DISCOUNT` in marketing-copy.ts) applies to month 1 only.
 * `ongoingUsd` is the standard rate for months 2 and 3, and continues
 * indefinitely at that same rate for as long as the patient keeps refilling
 * after that.
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

/** e.g. "$99 first month, then $199/mo for months 2 and 3" */
export function formatCompoundedPriceLine(
  pricing: CompoundedMedicationPricing,
): string {
  return `$${pricing.firstMonthUsd} first month, then $${pricing.ongoingUsd}/mo for months 2 and 3`;
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
 * Full dual-med first-month + months 2-3 line for hero / page lead-ins.
 * e.g. "Semaglutide from $99/mo first month, then $199/mo for months 2 and 3; Tirzepatide from $197/mo first month, then $297/mo for months 2 and 3"
 */
export function dualCompoundedHeroPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  return `Semaglutide from $${sema.firstMonthUsd}/mo first month, then $${sema.ongoingUsd}/mo for months 2 and 3; Tirzepatide from $${tirz.firstMonthUsd}/mo first month, then $${tirz.ongoingUsd}/mo for months 2 and 3`;
}

/**
 * Long-form single-medication pricing sentence for FAQ / route body copy.
 * e.g. "Compounded semaglutide is $99 for the first month, then $199/month
 * for months 2 and 3, continuing at $199/month if you keep refilling after that."
 */
export function compoundedMonthlyPricingSentence(
  medicationLabel: string,
  pricing: CompoundedMedicationPricing,
): string {
  return `${medicationLabel} is $${pricing.firstMonthUsd} for the first month, then $${pricing.ongoingUsd}/month for months 2 and 3, continuing at $${pricing.ongoingUsd}/month if you keep refilling after that.`;
}

/** FAQ / long-form pricing paragraph (both meds, no membership fee). */
export function dualCompoundedFaqPricingParagraph(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  return `Beema Health uses transparent cash-pay medication pricing with no platform membership fee. ${compoundedMonthlyPricingSentence("Compounded semaglutide", sema)} ${compoundedMonthlyPricingSentence("Compounded tirzepatide", tirz)} Shipping and labs, when applicable, are shown separately before any charge. A prescription is never guaranteed: a licensed clinician decides whether treatment is appropriate.`;
}
