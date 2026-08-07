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
 * Discounts / new-patient offers:
 * - One-time $100 promo code (`PROMO_CODE_DISCOUNT_USD`), redeemable once per
 *   patient, only on a 3-month plan (`PROMO_CODE_MIN_MONTHS`). Each medication
 *   has its own checkout code in `promoCode` (semaglutide: `sema-off100`,
 *   tirzepatide: `Tirz100`). It reduces month 1 only — see
 *   `promoFirstMonthUsd()`. A 1-month purchase is never eligible.
 * - Tirzepatide also has a **new-patient starter pack** (`starterPack`):
 *   $599 for 3 months ($199/mo equivalent), for brand-new patients only.
 *   After the starter pack, the standard `$297/mo` rate applies.
 */
export const PROMO_CODE_DISCOUNT_USD = 100;
export const PROMO_CODE_MIN_MONTHS = 3;

export type NewPatientStarterPack = {
  /** Prepaid total for the starter pack (e.g. 599). */
  totalUsd: number;
  /** Effective monthly rate during the pack (e.g. 199). */
  monthlyEquivalentUsd: number;
  /** Pack length in months (e.g. 3). */
  months: number;
};

export const COMPOUNDED_SEMAGLUTIDE_PRICING = {
  monthlyUsd: 199,
  promoCode: "sema-off100",
} as const satisfies CompoundedMedicationPricing;

export const COMPOUNDED_TIRZEPATIDE_PRICING = {
  monthlyUsd: 297,
  promoCode: "Tirz100",
  starterPack: {
    totalUsd: 599,
    monthlyEquivalentUsd: 199,
    months: 3,
  },
} as const satisfies CompoundedMedicationPricing;

export type CompoundedMedicationPricing = {
  monthlyUsd: number;
  promoCode: string;
  /** New-patient-only multi-month pack; currently tirzepatide only. */
  starterPack?: NewPatientStarterPack;
};

/** Discounted month-1 price when the one-time, 3-month-only promo code is applied. */
export function promoFirstMonthUsd(
  pricing: CompoundedMedicationPricing,
): number {
  return pricing.monthlyUsd - PROMO_CODE_DISCOUNT_USD;
}

export function hasStarterPack(
  pricing: CompoundedMedicationPricing,
): pricing is CompoundedMedicationPricing & {
  starterPack: NewPatientStarterPack;
} {
  return pricing.starterPack != null;
}

/**
 * e.g. sema: "$199/mo, or $99 your first month with promo code sema-off100
 * ($100 off on a 3-month plan)"
 * tirz: "New-patient starter pack $599 ($199/mo for 3 months), then $297/mo;
 * or $197 your first month with promo code Tirz100 ($100 off on a 3-month plan)"
 */
export function formatCompoundedPriceLine(
  pricing: CompoundedMedicationPricing,
): string {
  const promoLine = `$${promoFirstMonthUsd(pricing)} your first month with promo code ${pricing.promoCode} ($${PROMO_CODE_DISCOUNT_USD} off on a ${PROMO_CODE_MIN_MONTHS}-month plan)`;
  if (pricing.starterPack) {
    const pack = pricing.starterPack;
    return `New-patient starter pack $${pack.totalUsd} ($${pack.monthlyEquivalentUsd}/mo for ${pack.months} months), then $${pricing.monthlyUsd}/mo; or ${promoLine}`;
  }
  return `$${pricing.monthlyUsd}/mo, or ${promoLine}`;
}

/** Short card headline for the standard rate, e.g. "$199/mo". */
export function formatStartingAtPerMonth(
  pricing: CompoundedMedicationPricing,
): string {
  if (pricing.starterPack) {
    return `$${pricing.starterPack.monthlyEquivalentUsd}/mo`;
  }
  return `$${pricing.monthlyUsd}/mo`;
}

/**
 * Concise dual-med teaser for checklist / marquee / footer chips.
 * e.g. "Semaglutide $199/mo · Tirzepatide from $199/mo"
 */
export function dualCompoundedShortPricingLine(): string {
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const tirzLead = tirz.starterPack
    ? `from $${tirz.starterPack.monthlyEquivalentUsd}/mo`
    : `$${tirz.monthlyUsd}/mo`;
  return `Semaglutide $${COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd}/mo · Tirzepatide ${tirzLead}`;
}

/**
 * Promo-first dual-med chip for the homepage hero checklist / marquee.
 * Tirzepatide leads with the new-patient starter pack when present.
 * e.g. "Semaglutide $99 then $199/mo · Tirzepatide starter $199/mo ($599)"
 */
export function dualCompoundedPromoShortPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const tirzLead = tirz.starterPack
    ? `Tirzepatide starter $${tirz.starterPack.monthlyEquivalentUsd}/mo ($${tirz.starterPack.totalUsd})`
    : `Tirzepatide $${promoFirstMonthUsd(tirz)} then $${tirz.monthlyUsd}/mo`;
  return `Semaglutide $${promoFirstMonthUsd(sema)} then $${sema.monthlyUsd}/mo · ${tirzLead}`;
}

/**
 * Full dual-med pricing + promo teaser for hero / page lead-ins.
 * Tirzepatide leads with the new-patient starter pack when present.
 */
export function dualCompoundedHeroPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const semaPart = `Semaglutide $${promoFirstMonthUsd(sema)} first month then $${sema.monthlyUsd}/mo (code ${sema.promoCode})`;
  const tirzPart = tirz.starterPack
    ? `Tirzepatide new-patient starter pack $${tirz.starterPack.totalUsd} ($${tirz.starterPack.monthlyEquivalentUsd}/mo for ${tirz.starterPack.months} months), then $${tirz.monthlyUsd}/mo`
    : `Tirzepatide $${promoFirstMonthUsd(tirz)} first month then $${tirz.monthlyUsd}/mo (code ${tirz.promoCode})`;
  return `${semaPart}, ${tirzPart}`;
}

/**
 * Long-form single-medication pricing sentence for FAQ / route body copy.
 * When a starter pack is present, that new-patient offer leads; the $100
 * promo code remains available as an alternate 3-month path.
 */
export function compoundedMonthlyPricingSentence(
  medicationLabel: string,
  pricing: CompoundedMedicationPricing,
): string {
  const promoSentence = `Promo code ${pricing.promoCode} is a one-time $${PROMO_CODE_DISCOUNT_USD} discount that brings your first month to $${promoFirstMonthUsd(pricing)} when you purchase a ${PROMO_CODE_MIN_MONTHS}-month plan; it can't be combined with a 1-month purchase and can only be used once per patient.`;

  if (pricing.starterPack) {
    const pack = pricing.starterPack;
    return `${medicationLabel} is normally $${pricing.monthlyUsd}/month, billed monthly with no long-term contract. Brand-new patients can start with a ${pack.months}-month starter pack for $${pack.totalUsd} ($${pack.monthlyEquivalentUsd}/month), then continue at $${pricing.monthlyUsd}/month. ${promoSentence}`;
  }

  return `${medicationLabel} is $${pricing.monthlyUsd}/month, billed monthly with no long-term contract. ${promoSentence}`;
}

/** FAQ / long-form pricing paragraph (both meds, no membership fee). */
export function dualCompoundedFaqPricingParagraph(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  return `Beema Health uses transparent all-inclusive cash-pay pricing with no platform membership fee. ${compoundedMonthlyPricingSentence("Compounded semaglutide", sema)} ${compoundedMonthlyPricingSentence("Compounded tirzepatide", tirz)} Each listed rate covers provider care, medication, supplies, and expedited shipping; dose adjustments within the same medication do not change the monthly price. A prescription is never guaranteed: a licensed clinician decides whether treatment is appropriate.`;
}
