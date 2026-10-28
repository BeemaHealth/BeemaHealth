import {
  ED_MINTS_RDT_PRICING,
  ED_SILDENAFIL_DOSE_PLANS,
  ED_TADALAFIL_DOSE_PLANS,
  type EdDosePlan,
} from "@/lib/simple-treatment-pricing";

/**
 * Dose-level ED pricing for the sexual-health page, derived from the shared
 * pricing library (which holds Matt's ED pricing sheet figures). Nothing is
 * hardcoded here.
 */

export type PlanLine = {
  dose: string;
  /** Tablets in the fill, when the sheet lists a quantity. */
  tablets?: number;
  usd: number;
};

export type ProductPricing = {
  /** 3-month plan lines, one per dose. */
  quarterly: readonly PlanLine[];
  /** 1-month plan lines, one per dose. */
  monthly: readonly PlanLine[];
  /** Optional per-month equivalent shown beside the 3-month plan. */
  quarterlyPerMonthUsd?: number;
};

function fromDosePlans(plans: readonly EdDosePlan[]): ProductPricing {
  return {
    quarterly: plans.map((p) => ({
      dose: p.dose,
      tablets: p.quarterly.tablets,
      usd: p.quarterly.usd,
    })),
    monthly: plans.map((p) => ({
      dose: p.dose,
      tablets: p.monthly.tablets,
      usd: p.monthly.usd,
    })),
  };
}

export const TADALAFIL_PRICING = fromDosePlans(ED_TADALAFIL_DOSE_PLANS);
export const SILDENAFIL_PRICING = fromDosePlans(ED_SILDENAFIL_DOSE_PLANS);

export const ED_MINTS_PRICING: ProductPricing = {
  quarterly: [
    {
      dose: "Either formulation",
      usd: ED_MINTS_RDT_PRICING.quarterly?.totalUsd ?? 0,
    },
  ],
  monthly: [
    { dose: "Either formulation", usd: ED_MINTS_RDT_PRICING.monthlyUsd },
  ],
  quarterlyPerMonthUsd: ED_MINTS_RDT_PRICING.quarterly?.monthlyEquivalentUsd,
};

export const PRODUCT_PRICING = {
  tadalafil: TADALAFIL_PRICING,
  sildenafil: SILDENAFIL_PRICING,
  "ed-mints": ED_MINTS_PRICING,
} as const;
