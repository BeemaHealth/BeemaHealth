/**
 * Cash-pay list prices for compounded GLP-1 options shown on marketing pages.
 * Keep FAQ copy and treatment cards in sync via these values.
 *
 * Pricing structure: `monthlyUsd` is the flat, all-inclusive cash-pay rate
 * (provider care, medication, supplies, and expedited shipping) that applies
 * from month 1 for any purchase length, including a 1-month purchase. Dose
 * adjustments within the same medication do not change this rate. There is no
 * automatic discount and no separate platform membership fee.
 *
 * The only discount is a one-time $100 promo code (`PROMO_CODE_DISCOUNT_USD`),
 * redeemable once per patient, and only when purchasing a 3-month plan
 * (`PROMO_CODE_MIN_MONTHS`). It reduces month 1 only, see
 * `promoFirstMonthUsd()`. A 1-month purchase is never eligible for the promo
 * code and always bills at `monthlyUsd`.
 */
export const PROMO_CODE_DISCOUNT_USD = 100;
export const PROMO_CODE_MIN_MONTHS = 3;

export const COMPOUNDED_SEMAGLUTIDE_PRICING = {
  monthlyUsd: 199,
} as const;

export const COMPOUNDED_TIRZEPATIDE_PRICING = {
  monthlyUsd: 297,
} as const;

export type CompoundedMedicationPricing = {
  monthlyUsd: number;
};

/** Discounted month-1 price when the one-time, 3-month-only promo code is applied. */
export function promoFirstMonthUsd(
  pricing: CompoundedMedicationPricing,
): number {
  return pricing.monthlyUsd - PROMO_CODE_DISCOUNT_USD;
}

/**
 * e.g. "$199/mo, or $99 your first month with a one-time $100 promo code
 * on a 3-month plan"
 */
export function formatCompoundedPriceLine(
  pricing: CompoundedMedicationPricing,
): string {
  return `$${pricing.monthlyUsd}/mo, or $${promoFirstMonthUsd(pricing)} your first month with a one-time $${PROMO_CODE_DISCOUNT_USD} promo code on a ${PROMO_CODE_MIN_MONTHS}-month plan`;
}

/** Short card headline for the standard rate, e.g. "$199/mo". */
export function formatStartingAtPerMonth(
  pricing: CompoundedMedicationPricing,
): string {
  return `$${pricing.monthlyUsd}/mo`;
}

/**
 * Concise dual-med teaser for checklist / marquee / footer chips.
 * e.g. "Semaglutide $199/mo · Tirzepatide $297/mo"
 */
export function dualCompoundedShortPricingLine(): string {
  return `Semaglutide $${COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd}/mo · Tirzepatide $${COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd}/mo`;
}

/**
 * Promo-first dual-med chip for the homepage hero checklist / marquee.
 * Shows both the discounted first-month price and the ongoing monthly rate.
 * e.g. "Semaglutide $99 then $199/mo · Tirzepatide $197 then $297/mo"
 */
export function dualCompoundedPromoShortPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  return `Semaglutide $${promoFirstMonthUsd(sema)} then $${sema.monthlyUsd}/mo · Tirzepatide $${promoFirstMonthUsd(tirz)} then $${tirz.monthlyUsd}/mo`;
}

/**
 * Full dual-med pricing + promo teaser for hero / page lead-ins.
 * Shows both the discounted first-month prices and the ongoing monthly rates,
 * then names the one-time 3-month promo that unlocks the first-month discount.
 * e.g. "Semaglutide $99 first month then $199/mo, Tirzepatide $197 first month
 * then $297/mo, with a one-time $100 promo code on a 3-month plan"
 */
export function dualCompoundedHeroPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  return `Semaglutide $${promoFirstMonthUsd(sema)} first month then $${sema.monthlyUsd}/mo, Tirzepatide $${promoFirstMonthUsd(tirz)} first month then $${tirz.monthlyUsd}/mo, with a one-time $${PROMO_CODE_DISCOUNT_USD} promo code on a ${PROMO_CODE_MIN_MONTHS}-month plan`;
}

/**
 * Long-form single-medication pricing sentence for FAQ / route body copy.
 * e.g. "Compounded semaglutide is $199/month, billed monthly with no
 * long-term contract. A one-time $100 promo code brings your first month
 * to $99 when you purchase a 3-month plan; it can't be combined with a
 * 1-month purchase and can only be used once per patient."
 */
export function compoundedMonthlyPricingSentence(
  medicationLabel: string,
  pricing: CompoundedMedicationPricing,
): string {
  return `${medicationLabel} is $${pricing.monthlyUsd}/month, billed monthly with no long-term contract. A one-time $${PROMO_CODE_DISCOUNT_USD} promo code brings your first month to $${promoFirstMonthUsd(pricing)} when you purchase a ${PROMO_CODE_MIN_MONTHS}-month plan; it can't be combined with a 1-month purchase and can only be used once per patient.`;
}

/** FAQ / long-form pricing paragraph (both meds, no membership fee). */
export function dualCompoundedFaqPricingParagraph(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  return `Beema Health uses transparent all-inclusive cash-pay pricing with no platform membership fee. ${compoundedMonthlyPricingSentence("Compounded semaglutide", sema)} ${compoundedMonthlyPricingSentence("Compounded tirzepatide", tirz)} Each listed rate covers provider care, medication, supplies, and expedited shipping; dose adjustments within the same medication do not change the monthly price. A prescription is never guaranteed: a licensed clinician decides whether treatment is appropriate.`;
}
