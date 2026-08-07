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
 * Tirzepatide pricing paths (not stacked):
 * 1. **Starter pack** (`starterPack`): $597 covering doses 1 → 2 → 3 for
 *    brand-new patients beginning tirzepatide ($199/mo equivalent).
 * 2. **Standard / maintenance** (`monthlyUsd`): $297/mo. Patients on
 *    maintenance — or anyone not taking the starter pack — can use promo
 *    code `Tirz100` for $100 off the first month on a 3-month plan only.
 *
 * Semaglutide uses only the promo-code path (`sema-off100`).
 */
export const PROMO_CODE_DISCOUNT_USD = 100;
export const PROMO_CODE_MIN_MONTHS = 3;

export type NewPatientStarterPack = {
  /** Prepaid total for the starter pack (e.g. 597). */
  totalUsd: number;
  /** Effective monthly rate during the pack (e.g. 199). */
  monthlyEquivalentUsd: number;
  /** Pack length in months / starter doses (e.g. 3). */
  months: number;
  /**
   * Short dose-path label for UI, including strengths.
   * e.g. "doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg)".
   * Starter packs cover the initial titration sequence, not maintenance.
   */
  dosePathLabel: string;
};

export const COMPOUNDED_SEMAGLUTIDE_PRICING = {
  monthlyUsd: 199,
  promoCode: "sema-off100",
} as const satisfies CompoundedMedicationPricing;

export const COMPOUNDED_TIRZEPATIDE_PRICING = {
  monthlyUsd: 297,
  promoCode: "Tirz100",
  starterPack: {
    totalUsd: 597,
    monthlyEquivalentUsd: 199,
    months: 3,
    dosePathLabel: "doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg)",
  },
} as const satisfies CompoundedMedicationPricing;

export type CompoundedMedicationPricing = {
  monthlyUsd: number;
  promoCode: string;
  /** New-patient starter titration pack; currently tirzepatide only. */
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

/** e.g. "3-month starter pack" */
export function starterPackTitle(pack: NewPatientStarterPack): string {
  return `${pack.months}-month starter pack`;
}

/**
 * e.g. sema: "$199/mo, or $99 your first month with promo code sema-off100
 * ($100 off on a 3-month plan)"
 * tirz: "3-month starter pack $597 for doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg)
 * ($199/mo); standard / maintenance $297/mo, or $197 first month with promo
 * code Tirz100 ($100 off on a 3-month plan)"
 */
export function formatCompoundedPriceLine(
  pricing: CompoundedMedicationPricing,
): string {
  const promoLine = `$${promoFirstMonthUsd(pricing)} your first month with promo code ${pricing.promoCode} ($${PROMO_CODE_DISCOUNT_USD} off on a ${PROMO_CODE_MIN_MONTHS}-month plan)`;
  if (pricing.starterPack) {
    const pack = pricing.starterPack;
    return `${starterPackTitle(pack)} $${pack.totalUsd} for ${pack.dosePathLabel} ($${pack.monthlyEquivalentUsd}/mo); standard / maintenance $${pricing.monthlyUsd}/mo, or ${promoLine}`;
  }
  return `$${pricing.monthlyUsd}/mo, or ${promoLine}`;
}

/** Short card headline for the lead rate, e.g. "$199/mo". */
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
 * Tirzepatide names starter pack and standard/maintenance when present.
 */
export function dualCompoundedPromoShortPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const tirzLead = tirz.starterPack
    ? `Tirzepatide ${tirz.starterPack.months}-mo starter $${tirz.starterPack.totalUsd} or $${tirz.monthlyUsd}/mo`
    : `Tirzepatide $${promoFirstMonthUsd(tirz)} then $${tirz.monthlyUsd}/mo`;
  return `Semaglutide $${promoFirstMonthUsd(sema)} then $${sema.monthlyUsd}/mo · ${tirzLead}`;
}

/**
 * Full dual-med pricing teaser for hero / page lead-ins.
 * Tirzepatide states starter pack and standard/maintenance as separate paths.
 */
export function dualCompoundedHeroPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const semaPart = `Semaglutide $${promoFirstMonthUsd(sema)} first month then $${sema.monthlyUsd}/mo (code ${sema.promoCode})`;
  const tirzPart = tirz.starterPack
    ? `Tirzepatide ${starterPackTitle(tirz.starterPack)} $${tirz.starterPack.totalUsd} for ${tirz.starterPack.dosePathLabel}, or standard / maintenance $${tirz.monthlyUsd}/mo (code ${tirz.promoCode} for $${PROMO_CODE_DISCOUNT_USD} off first month on a ${PROMO_CODE_MIN_MONTHS}-month plan)`
    : `Tirzepatide $${promoFirstMonthUsd(tirz)} first month then $${tirz.monthlyUsd}/mo (code ${tirz.promoCode})`;
  return `${semaPart}, ${tirzPart}`;
}

/**
 * Long-form single-medication pricing sentence for FAQ / route body copy.
 * Tirzepatide frames starter pack and standard/maintenance as separate
 * paths that are not combined.
 */
export function compoundedMonthlyPricingSentence(
  medicationLabel: string,
  pricing: CompoundedMedicationPricing,
): string {
  const promoSentence = `Promo code ${pricing.promoCode} is a one-time $${PROMO_CODE_DISCOUNT_USD} discount that brings your first month to $${promoFirstMonthUsd(pricing)} when you purchase a ${PROMO_CODE_MIN_MONTHS}-month plan; it can't be combined with a 1-month purchase and can only be used once per patient.`;

  if (pricing.starterPack) {
    const pack = pricing.starterPack;
    return `${medicationLabel} pricing: ${starterPackTitle(pack)} - brand-new patients beginning tirzepatide can get ${pack.dosePathLabel} for $${pack.totalUsd} over ${pack.months} months ($${pack.monthlyEquivalentUsd}/month). Standard or maintenance - $${pricing.monthlyUsd}/month, billed monthly with no long-term contract. If you're on maintenance or not taking the starter pack, ${promoSentence} The starter pack and the $${PROMO_CODE_DISCOUNT_USD}-off promo code can't be used together.`;
  }

  return `${medicationLabel} is $${pricing.monthlyUsd}/month, billed monthly with no long-term contract. ${promoSentence}`;
}

/** FAQ / long-form pricing paragraph (both meds, no membership fee). */
export function dualCompoundedFaqPricingParagraph(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  return `Beema Health uses transparent all-inclusive cash-pay pricing with no platform membership fee. ${compoundedMonthlyPricingSentence("Compounded semaglutide", sema)} ${compoundedMonthlyPricingSentence("Compounded tirzepatide", tirz)} Each listed rate covers provider care, medication, supplies, and expedited shipping; dose adjustments within the same medication do not change the monthly price. A prescription is never guaranteed: a licensed clinician decides whether treatment is appropriate.`;
}
