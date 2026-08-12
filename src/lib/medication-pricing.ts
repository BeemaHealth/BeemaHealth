/**
 * Cash-pay list prices for compounded GLP-1 options shown on marketing pages.
 * Keep FAQ copy, treatment cards, and plan selectors in sync via these values.
 *
 * Pricing structure
 * ----------------
 * Each medication has a flat **monthly** cash-pay rate (provider care,
 * medication, supplies, and expedited shipping). Multi-month plans lower the
 * effective per-month rate; those savings are prepaid vs paying monthly.
 *
 * Tirzepatide also has a separate **new-patient starter pack** path
 * (`starterPack`): $597 ($199/mo × 3) covering doses 1 → 2 → 3
 * (2.5mg → 5mg → 7.5mg). Starter pack and multi-month maintenance discounts
 * are not stacked; the checkout coupon does not apply to the starter pack.
 *
 * Checkout coupon (`PROMO_CODE_DISCOUNT_USD`): a one-time-use, once-per-patient
 * additional $100 off on 3 / 6 / 12-month plans only (not 1-month, not the
 * tirz starter pack).
 */

export const PROMO_CODE_DISCOUNT_USD = 100;
/** Coupon applies to these prepaid lengths only (not 1-month, not starter). */
export const PROMO_CODE_ELIGIBLE_MONTHS = [3, 6, 12] as const;
/** @deprecated Prefer PROMO_CODE_ELIGIBLE_MONTHS - kept for older call sites. */
export const PROMO_CODE_MIN_MONTHS = 3;

export type PlanLengthMonths = 1 | 3 | 6 | 12;

export type MedicationPlan = {
  months: PlanLengthMonths;
  /** Effective per-month rate for this plan length. */
  monthlyUsd: number;
  /** Prepaid total for the plan (`monthlyUsd × months`, rounded to cents). */
  totalUsd: number;
  /** Dollars saved vs buying the same length at the 1-month rate. */
  savingsUsd: number;
  label: string;
};

export type NewPatientStarterPack = {
  /** Prepaid total for the starter pack (e.g. 597 = 199 × 3). */
  totalUsd: number;
  /** Effective monthly rate during the pack (e.g. 199). */
  monthlyEquivalentUsd: number;
  /** Pack length in months / starter doses (e.g. 3). */
  months: 3;
  /**
   * Short dose-path label for UI, including strengths.
   * e.g. "doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg)".
   */
  dosePathLabel: string;
};

export type CompoundedMedicationPricing = {
  /** 1-month cash-pay rate (also the baseline for savings math). */
  monthlyUsd: number;
  promoCode: string;
  /** Multi-month plan table keyed by length. Always includes months: 1. */
  plans: readonly MedicationPlan[];
  /** New-patient starter titration pack; currently tirzepatide only. */
  starterPack?: NewPatientStarterPack;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildPlan(
  months: PlanLengthMonths,
  monthlyUsd: number,
  baselineMonthlyUsd: number,
  label: string,
  /** Product-stated savings when float math would drift (e.g. $200 vs $199.98). */
  savingsUsdOverride?: number,
): MedicationPlan {
  const totalUsd = roundMoney(monthlyUsd * months);
  const computedSavings = roundMoney(baselineMonthlyUsd * months - totalUsd);
  const savingsUsd =
    savingsUsdOverride != null ? savingsUsdOverride : computedSavings;
  return { months, monthlyUsd, totalUsd, savingsUsd, label };
}

const SEMA_MONTHLY = 199;
const TIRZ_MONTHLY = 297;

export const COMPOUNDED_SEMAGLUTIDE_PRICING = {
  monthlyUsd: SEMA_MONTHLY,
  promoCode: "sema-off100",
  plans: [
    buildPlan(1, SEMA_MONTHLY, SEMA_MONTHLY, "Monthly"),
    buildPlan(3, 174, SEMA_MONTHLY, "3 months", 75),
    buildPlan(6, 165.67, SEMA_MONTHLY, "6 months", 200),
    buildPlan(12, 155.75, SEMA_MONTHLY, "Annual", 519),
  ],
} as const satisfies CompoundedMedicationPricing;

export const COMPOUNDED_TIRZEPATIDE_PRICING = {
  monthlyUsd: TIRZ_MONTHLY,
  promoCode: "Tirz100",
  starterPack: {
    totalUsd: 597,
    monthlyEquivalentUsd: 199,
    months: 3,
    dosePathLabel: "doses 1 → 2 → 3 (2.5mg → 5mg → 7.5mg)",
  },
  plans: [
    buildPlan(1, TIRZ_MONTHLY, TIRZ_MONTHLY, "Monthly"),
    // Prepaid quarterly total is the source of truth ($791).
    {
      months: 3,
      monthlyUsd: roundMoney(791 / 3),
      totalUsd: 791,
      savingsUsd: 100,
      label: "3 months",
    },
    buildPlan(6, 249.5, TIRZ_MONTHLY, "6 months", 285),
    // Prepaid annual total is the source of truth ($2,788); monthly is derived.
    {
      months: 12,
      monthlyUsd: roundMoney(2788 / 12),
      totalUsd: 2788,
      savingsUsd: 776,
      label: "Annual",
    },
  ],
} as const satisfies CompoundedMedicationPricing;

/**
 * Format a USD amount for UI. Whole dollars render without cents
 * ($297); otherwise up to 2 decimals without trailing zeros ($249.5, $263.67).
 */
export function formatUsd(amount: number): string {
  const rounded = roundMoney(amount);
  if (Number.isInteger(rounded)) return `$${rounded}`;
  const fixed = rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `$${fixed}`;
}

/** @deprecated Alias - prefer {@link formatUsd}. */
export const formatUsdFixed = formatUsd;

export function getPlan(
  pricing: CompoundedMedicationPricing,
  months: PlanLengthMonths,
): MedicationPlan {
  const plan = pricing.plans.find((p) => p.months === months);
  if (!plan) {
    throw new Error(`No ${months}-month plan for this medication`);
  }
  return plan;
}

export function isPromoEligibleMonths(months: number): boolean {
  return (PROMO_CODE_ELIGIBLE_MONTHS as readonly number[]).includes(months);
}

/**
 * Effective average $/mo when the checkout coupon is applied to a prepaid
 * multi-month plan (coupon reduces the prepaid total by $100).
 */
export function planMonthlyWithCouponUsd(plan: MedicationPlan): number {
  if (!isPromoEligibleMonths(plan.months)) return plan.monthlyUsd;
  return roundMoney((plan.totalUsd - PROMO_CODE_DISCOUNT_USD) / plan.months);
}

/** Total prepaid after applying the checkout coupon (eligible plans only). */
export function planTotalWithCouponUsd(plan: MedicationPlan): number {
  if (!isPromoEligibleMonths(plan.months)) return plan.totalUsd;
  return roundMoney(plan.totalUsd - PROMO_CODE_DISCOUNT_USD);
}

/** Discounted month-1 price when the one-time promo code is applied on a 3-month plan. */
export function promoFirstMonthUsd(
  pricing: CompoundedMedicationPricing,
): number {
  return pricing.monthlyUsd - PROMO_CODE_DISCOUNT_USD;
}

/**
 * Semaglutide 3-month plan is advertised as $99 month 1 (with code) then
 * full monthly for months 2-3 - not the flat prepaid multi-month rate.
 */
export function isSemaThreeMonthPromoPlan(
  pricing: CompoundedMedicationPricing,
  plan: MedicationPlan,
): boolean {
  return !hasStarterPack(pricing) && plan.months === 3;
}

/** Prepaid total for the sema $99 + $199 + $199 three-month promo path. */
export function semaThreeMonthPromoTotalUsd(
  pricing: CompoundedMedicationPricing = COMPOUNDED_SEMAGLUTIDE_PRICING,
): number {
  return promoFirstMonthUsd(pricing) + pricing.monthlyUsd * 2;
}

export function hasStarterPack(
  pricing: CompoundedMedicationPricing,
): pricing is CompoundedMedicationPricing & {
  starterPack: NewPatientStarterPack;
} {
  return pricing.starterPack != null;
}

/** How patients qualify to see the tirz starter pack price in Bask intake. */
export const STARTER_PACK_INTAKE_HINT =
  "To be presented this starter price, mark that you are new to GLP-1 when asked during intake." as const;

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
  plans: string;
  coupon: string;
} {
  const pack = pricing.starterPack;
  const m1 = getPlan(pricing, 1);
  const m3 = getPlan(pricing, 3);
  const m6 = getPlan(pricing, 6);
  const m12 = getPlan(pricing, 12);

  return {
    starter: `New-patient ${starterPackTitle(pack)}: ${formatUsdFixed(pack.monthlyEquivalentUsd)}/mo for ${pack.months} months (${formatUsdFixed(pack.totalUsd)} total). Typically one-time. Covers ${pack.dosePathLabel}. ${STARTER_PACK_INTAKE_HINT} The checkout coupon cannot be combined with the starter pack.`,
    plans: `Standard / maintenance: ${formatUsdFixed(m1.monthlyUsd)}/mo billed monthly; ${formatUsdFixed(m3.monthlyUsd)}/mo on a 3-month plan (${formatUsdFixed(m3.totalUsd)} total, Save ${formatUsdFixed(m3.savingsUsd)}); ${formatUsdFixed(m6.monthlyUsd)}/mo on a 6-month plan (Save ${formatUsdFixed(m6.savingsUsd)}); or ${formatUsdFixed(m12.monthlyUsd)}/mo annually (Save ${formatUsdFixed(m12.savingsUsd)}).`,
    coupon: `Promo code ${pricing.promoCode} is a one-time-use code: an additional $${PROMO_CODE_DISCOUNT_USD} off 3-, 6-, and 12-month maintenance plans at checkout, redeemable once per patient. It cannot be used on a 1-month purchase or with the starter pack.`,
  };
}

/**
 * Semaglutide "?" / details copy, including a compliant value comparison to
 * tirzepatide multi-month savings and the starter pack (no clinical claims).
 */
export function semaglutidePricingDetailsCopy(
  pricing: typeof COMPOUNDED_SEMAGLUTIDE_PRICING = COMPOUNDED_SEMAGLUTIDE_PRICING,
  tirz: typeof COMPOUNDED_TIRZEPATIDE_PRICING = COMPOUNDED_TIRZEPATIDE_PRICING,
): {
  plans: string;
  coupon: string;
  compareTirz: string;
} {
  const m1 = getPlan(pricing, 1);
  const m6 = getPlan(pricing, 6);
  const m12 = getPlan(pricing, 12);
  const t3 = getPlan(tirz, 3);
  const t6 = getPlan(tirz, 6);
  const t12 = getPlan(tirz, 12);
  const pack = tirz.starterPack;

  return {
    plans: `Compounded semaglutide: ${formatUsdFixed(m1.monthlyUsd)}/mo billed monthly; on a 3-month plan, ${formatUsdFixed(promoFirstMonthUsd(pricing))} first month with one-time code ${pricing.promoCode}, then ${formatUsdFixed(m1.monthlyUsd)}/mo for months 2 and 3 (${formatUsdFixed(semaThreeMonthPromoTotalUsd(pricing))} total); ${formatUsdFixed(m6.monthlyUsd)}/mo on a 6-month plan (Save ${formatUsdFixed(m6.savingsUsd)}); or ${formatUsdFixed(m12.monthlyUsd)}/mo annually (Save ${formatUsdFixed(m12.savingsUsd)}).`,
    coupon: `Promo code ${pricing.promoCode} is a one-time-use code: $${PROMO_CODE_DISCOUNT_USD} off your first month on a 3-month plan (to ${formatUsdFixed(promoFirstMonthUsd(pricing))}), or an additional $${PROMO_CODE_DISCOUNT_USD} off 6- and 12-month plans at checkout. Redeemable once per patient. It cannot be used on a 1-month purchase.`,
    compareTirz: `Want larger multi-month savings? Compounded tirzepatide maintenance: Save ${formatUsdFixed(t3.savingsUsd)} / ${formatUsdFixed(t6.savingsUsd)} / ${formatUsdFixed(t12.savingsUsd)} on 3- / 6- / 12-month plans, and new patients can start with the ${starterPackTitle(pack)} at ${formatUsdFixed(pack.totalUsd)} (${formatUsdFixed(pack.monthlyEquivalentUsd)}/mo) for ${pack.dosePathLabel}. ${STARTER_PACK_INTAKE_HINT} Your licensed provider decides which option, if any, is appropriate - prescribing is never guaranteed.`,
  };
}

/**
 * e.g. sema: "$199/mo · $99 first month on a 3-month plan with code sema-off100"
 * tirz: "3-month starter pack $597 …; maintenance from $249.50/mo on 6-mo · code Tirz100"
 */
export function formatCompoundedPriceLine(
  pricing: CompoundedMedicationPricing,
): string {
  const m6 = getPlan(pricing, 6);
  if (pricing.starterPack) {
    const pack = pricing.starterPack;
    const couponLine = `one-time code ${pricing.promoCode} for $${PROMO_CODE_DISCOUNT_USD} more off on 3/6/12-month plans (once per patient)`;
    return `${starterPackTitle(pack)} ${formatUsdFixed(pack.totalUsd)} for ${pack.dosePathLabel} (${formatUsdFixed(pack.monthlyEquivalentUsd)}/mo); standard / maintenance ${formatUsdFixed(pricing.monthlyUsd)}/mo, or from ${formatUsdFixed(m6.monthlyUsd)}/mo on a 6-month plan; ${couponLine}`;
  }
  return `${formatUsdFixed(pricing.monthlyUsd)}/mo, or ${formatUsdFixed(promoFirstMonthUsd(pricing))} first month on a 3-month plan with one-time code ${pricing.promoCode}, then ${formatUsdFixed(pricing.monthlyUsd)}/mo for months 2 and 3; from ${formatUsdFixed(m6.monthlyUsd)}/mo on longer plans`;
}

/** Short card headline for the lead rate, e.g. "$199/mo". */
export function formatStartingAtPerMonth(
  pricing: CompoundedMedicationPricing,
): string {
  if (pricing.starterPack) {
    return `${formatUsdFixed(pricing.starterPack.monthlyEquivalentUsd)}/mo`;
  }
  return `${formatUsdFixed(promoFirstMonthUsd(pricing))}/mo`;
}

/**
 * Concise dual-med teaser for checklist / marquee / footer chips.
 * Points readers to medication pages for full 3/6/12 detail.
 */
export function dualCompoundedShortPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const tirzLead = tirz.starterPack
    ? `from ${formatUsdFixed(tirz.starterPack.monthlyEquivalentUsd)}/mo`
    : `from ${formatUsdFixed(getPlan(tirz, 12).monthlyUsd)}/mo`;
  return `Semaglutide from ${formatUsdFixed(promoFirstMonthUsd(sema))}/mo · Tirzepatide ${tirzLead}`;
}

/**
 * Homepage hero teaser only - starter pack lead-in, no plan-table dump.
 * Full rates live on /semaglutide and /tirzepatide.
 */
export function dualCompoundedHomeHeroTeaser(): string {
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const pack = tirz.starterPack;
  return `transparent cash pricing, including a tirzepatide ${starterPackTitle(pack)} from ${formatUsdFixed(pack.monthlyEquivalentUsd)}/mo`;
}

/**
 * Promo-first dual-med chip for the homepage hero checklist / marquee.
 * Homepage stays high-level; full plan math lives on treatment pages.
 */
export function dualCompoundedPromoShortPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const pack = tirz.starterPack;
  return `Semaglutide from ${formatUsdFixed(promoFirstMonthUsd(sema))}/mo · Tirz starter from ${formatUsdFixed(pack.monthlyEquivalentUsd)}/mo`;
}

/**
 * Longer dual-med pricing teaser for ads / category pages that still need
 * both meds named. Prefer {@link dualCompoundedHomeHeroTeaser} on the home hero.
 * Semaglutide always leads with the $99 first-month / 3-month promo - never
 * the annual prepaid rate.
 */
export function dualCompoundedHeroPricingLine(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const pack = tirz.starterPack;
  return `Semaglutide ${formatUsdFixed(promoFirstMonthUsd(sema))} first month on a 3-month plan then ${formatUsdFixed(sema.monthlyUsd)}/mo (code ${sema.promoCode}), Tirzepatide ${starterPackTitle(pack)} from ${formatUsdFixed(pack.monthlyEquivalentUsd)}/mo - see each medication page for full plan details`;
}

/**
 * Long-form single-medication pricing sentence for FAQ / route body copy.
 */
export function compoundedMonthlyPricingSentence(
  medicationLabel: string,
  pricing: CompoundedMedicationPricing,
): string {
  const m1 = getPlan(pricing, 1);
  const m3 = getPlan(pricing, 3);
  const m6 = getPlan(pricing, 6);
  const m12 = getPlan(pricing, 12);
  const couponSentence = `Promo code ${pricing.promoCode} is a one-time-use code for an additional $${PROMO_CODE_DISCOUNT_USD} off 3-, 6-, and 12-month plans at checkout; it can't be combined with a 1-month purchase${pricing.starterPack ? " or the starter pack" : ""}, and can only be redeemed once per patient.`;

  if (pricing.starterPack) {
    const pack = pricing.starterPack;
    return `${medicationLabel} pricing: ${starterPackTitle(pack)} - brand-new patients beginning tirzepatide can get ${pack.dosePathLabel} for ${formatUsdFixed(pack.totalUsd)} over ${pack.months} months (${formatUsdFixed(pack.monthlyEquivalentUsd)}/month); typically one-time. ${STARTER_PACK_INTAKE_HINT} After that, maintenance is ${formatUsdFixed(m1.monthlyUsd)}/mo monthly, ${formatUsdFixed(m3.monthlyUsd)}/mo on a 3-month plan (save ${formatUsdFixed(m3.savingsUsd)}), ${formatUsdFixed(m6.monthlyUsd)}/mo on a 6-month plan (save ${formatUsdFixed(m6.savingsUsd)}), or ${formatUsdFixed(m12.monthlyUsd)}/mo annually (save ${formatUsdFixed(m12.savingsUsd)}). ${couponSentence} The starter pack and the $${PROMO_CODE_DISCOUNT_USD}-off promo code can't be used together.`;
  }

  return `${medicationLabel} is ${formatUsdFixed(m1.monthlyUsd)}/month billed monthly. On a 3-month plan, one-time code ${pricing.promoCode} brings your first month to ${formatUsdFixed(promoFirstMonthUsd(pricing))}, then ${formatUsdFixed(m1.monthlyUsd)}/mo for months 2 and 3 (${formatUsdFixed(semaThreeMonthPromoTotalUsd(pricing))} total). Longer plans are ${formatUsdFixed(m6.monthlyUsd)}/mo on 6 months (save ${formatUsdFixed(m6.savingsUsd)}) or ${formatUsdFixed(m12.monthlyUsd)}/mo annually (save ${formatUsdFixed(m12.savingsUsd)}). Promo code ${pricing.promoCode} can also take an additional $${PROMO_CODE_DISCOUNT_USD} off 6- and 12-month plans at checkout; it can't be combined with a 1-month purchase and can only be redeemed once per patient.`;
}

/** FAQ / long-form pricing paragraph (both meds, no membership fee). */
export function dualCompoundedFaqPricingParagraph(): string {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  return `Beema Health uses transparent all-inclusive cash-pay pricing with no platform membership fee. ${compoundedMonthlyPricingSentence("Compounded semaglutide", sema)} ${compoundedMonthlyPricingSentence("Compounded tirzepatide", tirz)} Each listed rate covers provider care, medication, supplies, and expedited shipping; dose adjustments within the same medication do not change the monthly price. A prescription is never guaranteed: a licensed clinician decides whether treatment is appropriate. Full plan selectors with per-month rates live on the Semaglutide and Tirzepatide pages.`;
}
