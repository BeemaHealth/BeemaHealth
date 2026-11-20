import { useState } from "react";
import { Check, Copy, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ED_MINTS_RDT_PRICING } from "@/lib/simple-treatment-pricing";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatUsd,
  getPlan,
} from "@/lib/medication-pricing";
import { cn } from "@/lib/utils";

/**
 * Black Friday 2026 offer blocks for the Houston and Boston ad landers.
 *
 * Coupon amounts and codes come from Matt's Black Friday coupon table
 * (2026-11-19). Regular plan totals are read from the pricing module; only
 * the promotional discount lives here. Patients type the code at Bask
 * checkout (nothing is auto-applied, nothing is stored).
 *
 * Coupon rules (recommended to Bask): one redemption per patient, no stacking,
 * eligible products/plans only. GLP-1 codes apply to the 3-month plan.
 */

/** Static end label. No countdown timer: the no-pressure copy rules apply. */
export const BLACK_FRIDAY_ENDS_LABEL = "December 1";

export type BlackFridayPlan = {
  label: string;
  regularUsd: number;
  dealUsd: number;
};

export type BlackFridayOffer = {
  /** Short product name, e.g. "semaglutide". */
  product: string;
  discountUsd: number;
  code: string;
  /** What the discount applies to, e.g. "the 3-month plan". */
  appliesTo: string;
  /** Plans the code discounts: regular and discounted prepaid total each. */
  plans?: readonly BlackFridayPlan[];
};

function threeMonth(
  pricing:
    | typeof COMPOUNDED_SEMAGLUTIDE_PRICING
    | typeof COMPOUNDED_TIRZEPATIDE_PRICING,
) {
  return getPlan(pricing, 3).totalUsd;
}

function glpOffer(
  product: string,
  discountUsd: number,
  code: string,
  regularUsd: number,
): BlackFridayOffer {
  return {
    product,
    discountUsd,
    code,
    appliesTo: "the 3-month plan",
    plans: [
      {
        label: "3-month plan",
        regularUsd,
        dealUsd: regularUsd - discountUsd,
      },
    ],
  };
}

function edMintsPlans(discountUsd: number): readonly BlackFridayPlan[] {
  const q = ED_MINTS_RDT_PRICING.quarterly;
  const plans: BlackFridayPlan[] = [];
  if (q)
    plans.push({
      label: "3-month plan",
      regularUsd: q.totalUsd,
      dealUsd: q.totalUsd - discountUsd,
    });
  plans.push({
    label: "1-month plan",
    regularUsd: ED_MINTS_RDT_PRICING.monthlyUsd,
    dealUsd: ED_MINTS_RDT_PRICING.monthlyUsd - discountUsd,
  });
  return plans;
}

export const BLACK_FRIDAY_OFFERS = {
  semaglutide: glpOffer(
    "semaglutide",
    300,
    "BeemaHealth300offSema3M",
    // Regular 3-month price for the Black Friday offer is 3 x the monthly
    // rate ($597, per Matt 2026-11-19), not the multi-month plan total.
    COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd * 3,
  ),
  tirzepatide: glpOffer(
    "tirzepatide",
    200,
    "BeemaHealth200offTirz3M",
    threeMonth(COMPOUNDED_TIRZEPATIDE_PRICING),
  ),
  edMints: {
    product: "ED Mints",
    discountUsd: 50,
    code: "BeemaHealth50offEdMints",
    appliesTo: "eligible ED Mints orders",
    plans: edMintsPlans(50),
  },
  sildenafil: {
    product: "sildenafil",
    discountUsd: 30,
    code: "BeemaHealth30offSildenafil",
    appliesTo: "eligible sildenafil orders",
  },
  tadalafil: {
    product: "tadalafil",
    discountUsd: 30,
    code: "BeemaHealth30offTadalafil",
    appliesTo: "eligible tadalafil orders",
  },
} as const satisfies Record<string, BlackFridayOffer>;

export const BLACK_FRIDAY_TERMS =
  "One redemption per patient. Can't be combined with other offers. Applies only to the eligible product and plan shown. Enter the code at checkout.";

function CopyCodeButton({ code, dark }: { code: string; dark?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code is still visible and selectable.
    }
  }
  return (
    <Button
      type="button"
      variant={dark ? "default" : "outline"}
      size="sm"
      onClick={copy}
    >
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Copied" : "Copy code"}
    </Button>
  );
}

/** Big dark deal card shown above the pricing cards. */
export function BlackFridayDealCard({
  offer,
  className,
}: {
  offer: BlackFridayOffer;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto mb-10 max-w-4xl overflow-hidden rounded-3xl border-2 border-primary bg-card text-foreground shadow-soft",
        className,
      )}
    >
      <div className="relative bg-primary px-5 py-2 text-center text-xs font-bold uppercase tracking-widest text-primary-foreground">
        Black Friday · through {BLACK_FRIDAY_ENDS_LABEL}
      </div>
      <div className="relative grid gap-6 p-6 md:grid-cols-[1.2fr_1fr] md:items-center md:p-9">
        <div>
          <p className="text-4xl font-extrabold leading-none tracking-tight text-foreground md:text-5xl">
            {formatUsd(offer.discountUsd)} OFF
          </p>
          <p className="mt-2 text-lg font-bold uppercase tracking-wide md:text-xl">
            {offer.product}
          </p>
          {offer.plans && offer.plans.length > 0 ? (
            <ul className="mt-4 space-y-1.5">
              {offer.plans.map((plan) => (
                <li key={plan.label} className="text-base">
                  <s className="text-foreground/60">
                    <span className="sr-only">Regular price </span>
                    {formatUsd(plan.regularUsd)}
                  </s>{" "}
                  <strong className="text-2xl font-bold text-foreground">
                    <span className="sr-only">Now </span>
                    {formatUsd(plan.dealUsd)}
                  </strong>{" "}
                  <span className="text-foreground/80">
                    for the {plan.label}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-base">On {offer.appliesTo}.</p>
          )}
        </div>
        <div className="rounded-3xl border-2 border-dashed border-primary bg-primary-soft/60 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/70">
            Your Black Friday code
          </p>
          <p className="mt-2 select-all break-all font-mono text-lg font-extrabold text-foreground md:text-xl">
            {offer.code}
          </p>
          <div className="mt-4">
            <CopyCodeButton code={offer.code} dark />
          </div>
          <p className="mt-3 text-[11px] leading-snug text-foreground/70">
            Enter at checkout
          </p>
        </div>
      </div>
      <p className="relative px-6 pb-6 text-xs leading-relaxed text-foreground/70 md:px-9">
        {BLACK_FRIDAY_TERMS} Cash-pay when prescribed; prescribing is never
        guaranteed.
      </p>
    </div>
  );
}

/** Hero tile fields for an offer (merged into the page's PriceTile). */
export function blackFridayTile(offer: BlackFridayOffer) {
  const [first, ...rest] = offer.plans ?? [];
  if (!first) {
    return {
      price: `${formatUsd(offer.discountUsd)} off`,
      unit: `${offer.product} with code`,
      detail: `Through ${BLACK_FRIDAY_ENDS_LABEL}`,
      note: `Code ${offer.code}`,
    };
  }
  return {
    strike: formatUsd(first.regularUsd),
    price: formatUsd(first.dealUsd),
    unit: `for the ${first.label} with code`,
    detail:
      rest.length > 0
        ? `Save ${formatUsd(offer.discountUsd)}. Or ${formatUsd(rest[0]!.dealUsd)} for the ${rest[0]!.label} (regularly ${formatUsd(rest[0]!.regularUsd)})`
        : `Save ${formatUsd(offer.discountUsd)} through ${BLACK_FRIDAY_ENDS_LABEL}`,
    note: `Code ${offer.code}`,
  };
}

/** "Black Friday" in a black-to-honey brand gradient for headlines. */
export function BlackFridayText() {
  return (
    <span className="bg-gradient-to-r from-foreground from-30% to-primary bg-clip-text text-transparent [-webkit-box-decoration-break:clone] [box-decoration-break:clone]">
      Black Friday
    </span>
  );
}
