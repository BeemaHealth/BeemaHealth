import { formatUsd } from "@/lib/medication-pricing";

/**
 * Cash-pay list prices for compounded non-GLP-1 treatments: TRT
 * (enclomiphene), hairloss, ED, NAD+, and sermorelin.
 *
 * Kept separate from medication-pricing.ts on purpose: that file's whole
 * shape (1/3/6/12-month tiers, one-time promo code, tirz starter pack) is
 * built for the two GLP-1 medications. These products bill Monthly, with
 * an optional Quarterly plan, and have no promo code - forcing them into the
 * GLP-1 shape would mean every GLP-1 helper grows branches for products that
 * don't have a starter pack or coupon.
 *
 * FIRST PASS PRICING (2026-08-27, hairloss/ED expanded 2026-08-28): set at
 * roughly 1.5x landed cost (pharmacy + dispense + shipping + doctor's fee,
 * exactly as summed in the "Beema Pricing" cost sheet), charm-rounded. TRT,
 * hairloss, and ED costs come from that sheet. NAD+ and sermorelin have no
 * entry in that sheet at all - their prices are telehealth market-rate
 * estimates instead, cross-checked against Bask catalog price ranges
 * ($65-$240 for NAD+, $85-$264 for sermorelin variants), not derived from a
 * landed cost. Revisit both once real pharmacy costs exist. Dose does not
 * change price, matching the semaglutide/tirzepatide convention.
 *
 * TRT, NAD+, and sermorelin are PAUSED (2026-08-28, see
 * docs/features/treatment-pages.md) - their consts stay defined below but
 * are unused by any live route. Only Hairloss and ED are live.
 */

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export type SimpleQuarterlyPlan = {
  /** Prepaid total for the 3-month plan. */
  totalUsd: number;
  /** totalUsd / 3, for "~$X/mo" display. */
  monthlyEquivalentUsd: number;
  /** Dollars saved vs. paying the monthly rate for 3 months. */
  savingsUsd: number;
};

export type SimpleCompoundedPricing = {
  /** 1-month cash-pay rate. */
  monthlyUsd: number;
  /** Omitted when no quarterly SKU exists for this product (e.g. TRT). */
  quarterly?: SimpleQuarterlyPlan;
};

function quarterlyPlan(
  totalUsd: number,
  monthlyBaselineUsd: number,
): SimpleQuarterlyPlan {
  return {
    totalUsd,
    monthlyEquivalentUsd: roundMoney(totalUsd / 3),
    savingsUsd: roundMoney(monthlyBaselineUsd * 3 - totalUsd),
  };
}

/**
 * PAUSED 2026-08-28 - not selling TRT for now, and per the naming rule in
 * docs/features/treatment-pages.md, when it returns it must not be
 * marketed as "TRT" (enclomiphene is pharmacologically distinct - see the
 * "TRT vs enclomiphene" learn article). Kept defined, unused by any live
 * page, so the numbers aren't lost. Enclomiphene, Partell Pharmacy landed
 * cost (25mg, ceiling dose) $112.99 x1.5. No quarterly SKU in the cost sheet.
 */
export const TRT_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 169,
};

/**
 * Hairloss product catalog (restructured 2026-08-28 into Men/Women SKUs -
 * see the /hair-loss route and HAIR_SECTIONS in SiteHeader.tsx). Oral
 * Minoxidil is shared by both sexes (one product, one price).
 */

/**
 * Oral minoxidil, GoGoMeds, for both men and women. Cost-sheet-derived price
 * at launch (monthly $65.99 x1.5 ~= $99, quarterly $71.99 x1.5 ~= $109);
 * repriced 2026-09-09 (per Matt) to $89/mo, then repriced again the same day
 * to a flat $29.67/mo with no quarterly SKU - matching hairloss finasteride's
 * pattern below. $29.67/mo clears the "less than $1 a day" bar (see
 * simplePerDaySentence()).
 */
export const HAIRLOSS_ORAL_MINOXIDIL_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 29.67,
};

/**
 * Finasteride 1mg oral, men only. Repriced 2026-09-03 (per Matt) to $29.67/mo -
 * under $1/day, called out on the oral finasteride page via
 * simplePerDaySentence(). No quarterly SKU.
 */
export const HAIRLOSS_FINASTERIDE_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 29.67,
};

/**
 * "Oral Hair Loss Compound (Women)", Partell - a second, distinct women's
 * oral product alongside plain oral minoxidil. The exact ingredient
 * difference from oral minoxidil is not yet confirmed with the pharmacy -
 * do not invent a clinical distinction in marketing copy beyond what's
 * confirmed. Cost sheet gave
 * quantity-based cost (qty 30/90/180), not monthly/quarterly - qty30
 * (~1 month supply) cost $96.49 x1.5, charm-rounded.
 */
export const HAIRLOSS_WOMENS_COMPOUND_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 149,
};

/** Topical spray with finasteride, Pharmacy Hub, men only. Monthly cost $85.99 x1.5; quarterly cost $147.99 x1.5. */
export const HAIRLOSS_TOPICAL_MEN_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 129,
  quarterly: quarterlyPlan(219, 129),
};

/** Topical spray with biotin/melatonin (no finasteride), Pharmacy Hub, women only. Monthly cost $83.99 x1.5; quarterly cost $141.99 x1.5. */
export const HAIRLOSS_TOPICAL_WOMEN_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 129,
  quarterly: quarterlyPlan(209, 129),
};

/**
 * ED product catalog (restructured 2026-08-28 into 3 named products - see
 * the /ed route). Tadalafil and sildenafil shared a landed-cost-derived price
 * at launch; repriced independently 2026-09-03 (per Matt) to $49.67/mo and
 * $43/mo respectively. The other combo SKU in the catalog ("Sildenafil
 * 50mg/Tadalafil 20mg/Oxytocin 125 IU ODT") has no pricing yet and is not
 * sold - only the RDT combo below is live.
 */

/** Single-ingredient tadalafil, Health Warehouse. */
export const ED_TADALAFIL_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 49.67,
  quarterly: quarterlyPlan(89, 49.67),
};

/** Single-ingredient sildenafil, Health Warehouse. */
export const ED_SILDENAFIL_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 43,
  quarterly: quarterlyPlan(89, 43),
};

/**
 * Per-pill "starting at" price for the tadalafil/sildenafil oral tablets
 * (2026-09-03, per Matt) - used as the hero teaser instead of the monthly
 * rate, the same way ED Mints' hero teaser uses a quarterly-equivalent price
 * instead of the 1-month rate. Billing itself is unchanged (still the
 * monthly or quarterly plan above) - the "Transparent pricing" card and FAQ
 * keep showing the real monthly/quarterly numbers. Oral tablets only - ED
 * Mints (the combo products) are not priced per pill.
 */
export const ED_TADALAFIL_PER_PILL_USD = 1.66;
export const ED_SILDENAFIL_PER_PILL_USD = 2.69;

/** e.g. "$1.66/pill". */
export function formatPerPillStartingAt(amountUsd: number): string {
  return `${formatUsd(amountUsd)}/pill`;
}

/**
 * SUPERSEDED 2026-09-03 - the combo SKU moved off /ed onto its own
 * comparison page, /ed-mints (see ED_MINTS_RDT_PRICING below), with its own
 * dedicated Bask intake rather than sharing /ed's. Kept defined, unused by
 * any live route, so the old numbers aren't lost. Tadalafil + sildenafil
 * 12mg/60mg RDT combo, Pharmacy Hub. Monthly cost $85.39 x1.5; quarterly cost
 * ~$107.79 x1.5.
 */
export const ED_COMBO_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 129,
  quarterly: quarterlyPlan(159, 129),
};

/**
 * ED Mints (2026-09-03): two dissolve-under-the-tongue combo formulations,
 * each sold on /ed-mints with its own dedicated Bask questionnaire flow
 * (see ED_MINTS_RDT_INTAKE_URL / ED_MINTS_ODT_INTAKE_URL in cta-ids.ts) -
 * not the shared /ed intake. Pricing from the "Tadalafil & Sildenafil
 * combo's" cost sheet (2026-09-03): both products land at the same Beema
 * price, $149/mo or $199 billed quarterly.
 */

/** Tadalafil + Sildenafil 12mg/60mg RDT (rapidly dissolving tablet). */
export const ED_MINTS_RDT_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 149,
  quarterly: quarterlyPlan(199, 149),
};

/** Sildenafil 50mg/Tadalafil 20mg/Oxytocin 125 IU ODT (orally dissolving tablet). */
export const ED_MINTS_ODT_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 149,
  quarterly: quarterlyPlan(199, 149),
};

/**
 * PAUSED 2026-08-28 - not selling NAD+ for now. Kept defined, unused by any
 * live page. No cost-sheet entry - market-rate estimate, cross-checked
 * against Bask's own $65-$240 variant range.
 */
export const NAD_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 149,
};

/**
 * PAUSED 2026-08-28 - not selling sermorelin for now. Kept defined, unused
 * by any live page. No cost-sheet entry - market-rate estimate, cross-
 * checked against Bask's own $189 suggested retail / up to $264 variant range.
 */
export const SERMORELIN_PRICING: SimpleCompoundedPricing = {
  monthlyUsd: 199,
};

/** Short card headline, e.g. "$169/mo". */
export function formatSimpleStartingAt(
  pricing: SimpleCompoundedPricing,
): string {
  return `${formatUsd(pricing.monthlyUsd)}/mo`;
}

/**
 * Quarterly monthly-equivalent headline, e.g. "$66.33/mo" (2026-09-03, per
 * Matt - ED Mints' hero teaser leads with this instead of the 1-month rate,
 * since the 1-month rate reads as "the high price"). Falls back to
 * `formatSimpleStartingAt()` for a product with no quarterly plan.
 */
export function formatSimpleQuarterlyStartingAt(
  pricing: SimpleCompoundedPricing,
): string {
  if (!pricing.quarterly) return formatSimpleStartingAt(pricing);
  return `${formatUsd(pricing.quarterly.monthlyEquivalentUsd)}/mo`;
}

/**
 * "Less than $1 a day" callout, shown only when the monthly rate actually
 * clears that bar (30-day month). Returns undefined otherwise so callers
 * never render a false claim - e.g. tadalafil/sildenafil at $43-50/mo do not
 * qualify.
 */
export function simplePerDaySentence(
  pricing: SimpleCompoundedPricing,
): string | undefined {
  if (pricing.monthlyUsd / 30 >= 1) return undefined;
  return "Less than $1 a day.";
}

/**
 * Long-form single-treatment pricing sentence for FAQ / route body copy.
 * Mirrors compoundedMonthlyPricingSentence() in medication-pricing.ts, but
 * without any promo-code or starter-pack language, since these products
 * don't have either.
 */
export function simplePricingSentence(
  treatmentLabel: string,
  pricing: SimpleCompoundedPricing,
): string {
  const monthlySentence = `${treatmentLabel} is ${formatUsd(pricing.monthlyUsd)}/month, billed monthly.`;
  if (!pricing.quarterly) {
    return `${monthlySentence} That's all-inclusive cash-pay pricing with no separate platform membership fee.`;
  }
  const q = pricing.quarterly;
  return `${monthlySentence} A quarterly plan is ${formatUsd(q.totalUsd)} total, billed every 3 months (about ${formatUsd(q.monthlyEquivalentUsd)}/mo, saving ${formatUsd(q.savingsUsd)} vs. paying monthly). Both are all-inclusive cash-pay pricing with no separate platform membership fee.`;
}

/** Whitelist of every USD amount these 5 products' pricing can explain - mirrors listKnownPricingUsdAmounts() in medication-pricing.ts. */
export function listKnownSimpleTreatmentPricingUsdAmounts(): number[] {
  const amounts = new Set<number>();
  for (const pricing of [
    TRT_PRICING,
    HAIRLOSS_ORAL_MINOXIDIL_PRICING,
    HAIRLOSS_FINASTERIDE_PRICING,
    HAIRLOSS_WOMENS_COMPOUND_PRICING,
    HAIRLOSS_TOPICAL_MEN_PRICING,
    HAIRLOSS_TOPICAL_WOMEN_PRICING,
    ED_TADALAFIL_PRICING,
    ED_SILDENAFIL_PRICING,
    ED_COMBO_PRICING,
    ED_MINTS_RDT_PRICING,
    ED_MINTS_ODT_PRICING,
    NAD_PRICING,
    SERMORELIN_PRICING,
  ]) {
    amounts.add(roundMoney(pricing.monthlyUsd));
    if (pricing.quarterly) {
      amounts.add(roundMoney(pricing.quarterly.totalUsd));
      amounts.add(roundMoney(pricing.quarterly.monthlyEquivalentUsd));
      amounts.add(roundMoney(pricing.quarterly.savingsUsd));
    }
  }
  return [...amounts].sort((a, b) => a - b);
}
