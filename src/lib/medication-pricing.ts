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
 * 1. **Starter pack** (`starterPack`): $597 ($199/mo × 3) for new patients,
 *    typically one-time, covering doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg).
 * 2. **Standard / maintenance** after the starter (or instead of it):
 *    monthly $297/mo; 6-month $285/mo; annual $776/mo; quarterly (3-month)
 *    fill $791 total ($100 off vs 3 × $297). Promo code `Tirz100` is the
 *    first-month $100-off path on a 3-month plan (same $791 quarterly math).
 *
 * Semaglutide uses only the promo-code path (`sema-off100`).
 */
export const PROMO_CODE_DISCOUNT_USD = 100;
export const PROMO_CODE_MIN_MONTHS = 3;

export type NewPatientStarterPack = {
  /** Prepaid total for the starter pack (e.g. 597 = 199 × 3). */
  totalUsd: number;
  /** Effective monthly rate during the pack (e.g. 199). */
  monthlyEquivalentUsd: number;
  /** Pack length in months / starter doses (e.g. 3). */
  months: number;
  /**
   * Short dose-path label for UI, including strengths.
   * e.g. "doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg)".
   */
  dosePathLabel: string;
};

/**
 * Ongoing tirzepatide rates after the new-patient starter pack
 * (or when the starter pack is not used).
 */
export type TirzepatideContinuationPricing = {
  /** Per-month rate on a 6-month plan. */
  sixMonthMonthlyUsd: number;
  /** Per-month rate on an annual plan. */
  annualMonthlyUsd: number;
  /**
   * Prepaid total for a continuing 3-month (quarterly) fill.
   * Equals `3 × monthlyUsd − PROMO_CODE_DISCOUNT_USD` ($100 off vs monthly).
   */
  quarterlyTotalUsd: number;
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
  continuation: {
    sixMonthMonthlyUsd: 285,
    annualMonthlyUsd: 776,
    quarterlyTotalUsd: 791,
  },
} as const satisfies CompoundedMedicationPricing;

export type CompoundedMedicationPricing = {
  monthlyUsd: number;
  promoCode: string;
  /** New-patient starter titration pack; currently tirzepatide only. */
  starterPack?: NewPatientStarterPack;
  /** Post-starter / maintenance plan rates; tirzepatide only. */
  continuation?: TirzepatideContinuationPricing;
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
 * Full tirzepatide pricing explanation for the card "?" disclosure.
 * Keep the on-card UI short; put the complete story here.
 */
export function tirzepatidePricingDetailsCopy(
  pricing: typeof COMPOUNDED_TIRZEPATIDE_PRICING = COMPOUNDED_TIRZEPATIDE_PRICING,
): {
  starter: string;
  continuation: string;
  quarterly: string;
} {
  const pack = pricing.starterPack;
  const cont = pricing.continuation;
  const monthlyTimesQuarter =
    pricing.monthlyUsd * pack.months - PROMO_CODE_DISCOUNT_USD;

  return {
    starter: `New-patient ${starterPackTitle(pack)}: $${pack.monthlyEquivalentUsd}/mo for ${pack.months} months ($${pack.totalUsd} total). Typically one-time. Covers ${pack.dosePathLabel}.`,
    continuation: `After the starter pack (or if you don't take it): $${pricing.monthlyUsd}/mo billed monthly; $${cont.sixMonthMonthlyUsd}/mo on a 6-month plan; or $${cont.annualMonthlyUsd}/mo on an annual plan.`,
    quarterly: `Staying on a quarterly (${pack.months}-month) plan after the starter is $${cont.quarterlyTotalUsd} for ${pack.months} months - $${PROMO_CODE_DISCOUNT_USD} off versus ${pack.months} × $${pricing.monthlyUsd} ($${monthlyTimesQuarter} matches promo code ${pricing.promoCode} on a ${PROMO_CODE_MIN_MONTHS}-month plan). The starter pack and that promo code can't be used together.`,
  };
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
 * Semaglutide leads with the promo first-month rate ($99 with code on a
 * 3-month plan); tirzepatide leads with the starter-pack monthly rate.
 * e.g. "Semaglutide from $99/mo · Tirzepatide from $199/mo"
 */
export function dualCompoundedShortPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const tirzLead = tirz.starterPack
    ? `from $${tirz.starterPack.monthlyEquivalentUsd}/mo`
    : `$${tirz.monthlyUsd}/mo`;
  return `Semaglutide from $${promoFirstMonthUsd(sema)}/mo · Tirzepatide ${tirzLead}`;
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
    const cont = pricing.continuation;
    const contLine = cont
      ? ` After that, maintenance is $${pricing.monthlyUsd}/mo monthly, $${cont.sixMonthMonthlyUsd}/mo on a 6-month plan, $${cont.annualMonthlyUsd}/mo annually, or $${cont.quarterlyTotalUsd} for a continuing ${pack.months}-month (quarterly) fill.`
      : "";
    return `${medicationLabel} pricing: ${starterPackTitle(pack)} - brand-new patients beginning tirzepatide can get ${pack.dosePathLabel} for $${pack.totalUsd} over ${pack.months} months ($${pack.monthlyEquivalentUsd}/month); typically one-time.${contLine} If you're on maintenance or not taking the starter pack, ${promoSentence} The starter pack and the $${PROMO_CODE_DISCOUNT_USD}-off promo code can't be used together.`;
  }

  return `${medicationLabel} is $${pricing.monthlyUsd}/month, billed monthly with no long-term contract. ${promoSentence}`;
}

/** FAQ / long-form pricing paragraph (both meds, no membership fee). */
export function dualCompoundedFaqPricingParagraph(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  return `Beema Health uses transparent all-inclusive cash-pay pricing with no platform membership fee. ${compoundedMonthlyPricingSentence("Compounded semaglutide", sema)} ${compoundedMonthlyPricingSentence("Compounded tirzepatide", tirz)} Each listed rate covers provider care, medication, supplies, and expedited shipping; dose adjustments within the same medication do not change the monthly price. A prescription is never guaranteed: a licensed clinician decides whether treatment is appropriate.`;
}
