import {
  ED_MINTS_ODT_PRICING,
  ED_MINTS_RDT_PRICING,
  type SimpleCompoundedPricing,
} from "@/lib/simple-treatment-pricing";

/**
 * Monthly vs 3-month comparison for the two ED Mints formulations.
 * Prices come from simple-treatment-pricing.ts; tablet counts come from
 * Matt's "Tadalafil & Sildenafil combo's" cost sheet (2026-11-14):
 *   RDT 12mg/60mg:            10 tablets monthly, 32 quarterly
 *   ODT 50mg/20mg/125 IU:      6 tablets monthly, 18 quarterly
 */

export type MintPlanComparison = {
  id: "rdt" | "odt";
  /** Matches MINT_OPTIONS ids so the CTA can reuse each intake link. */
  name: string;
  dose: string;
  /** Active ingredients with strengths, shown as a row in the plan table. */
  ingredients: string[];
  monthly: {
    priceUsd: number;
    tablets: number;
    perTabletUsd: number;
  };
  quarterly: {
    totalUsd: number;
    perMonthUsd: number;
    savingsUsd: number;
    tablets: number;
    perTabletUsd: number;
  };
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function build(
  id: "rdt" | "odt",
  name: string,
  dose: string,
  ingredients: string[],
  pricing: SimpleCompoundedPricing,
  monthlyTablets: number,
  quarterlyTablets: number,
): MintPlanComparison {
  const q = pricing.quarterly;
  if (!q) throw new Error(`ED Mints ${id} pricing has no quarterly plan`);
  return {
    id,
    name,
    dose,
    ingredients,
    monthly: {
      priceUsd: pricing.monthlyUsd,
      tablets: monthlyTablets,
      perTabletUsd: round2(pricing.monthlyUsd / monthlyTablets),
    },
    quarterly: {
      totalUsd: q.totalUsd,
      perMonthUsd: q.monthlyEquivalentUsd,
      savingsUsd: q.savingsUsd,
      tablets: quarterlyTablets,
      perTabletUsd: round2(q.totalUsd / quarterlyTablets),
    },
  };
}

export const MINT_PLAN_COMPARISONS: readonly MintPlanComparison[] = [
  build(
    "rdt",
    "Tadalafil + Sildenafil",
    "12mg / 60mg RDT",
    ["Tadalafil 12mg", "Sildenafil 60mg"],
    ED_MINTS_RDT_PRICING,
    10,
    32,
  ),
  build(
    "odt",
    "Sildenafil + Tadalafil + Oxytocin",
    "50mg / 20mg / 125 IU ODT",
    ["Sildenafil 50mg", "Tadalafil 20mg", "Oxytocin 125 IU"],
    ED_MINTS_ODT_PRICING,
    6,
    18,
  ),
];
