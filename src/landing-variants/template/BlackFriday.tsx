import { createContext, useContext, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Copy, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BPC_157_CAPSULES_PRICING,
  BPC_157_PRICING,
  BPC_TB500_GHK_CU_PRICING,
  ED_MINTS_RDT_PRICING,
  ED_SILDENAFIL_DOSE_PLANS,
  ED_SILDENAFIL_PRICING,
  ED_TADALAFIL_DOSE_PLANS,
  ED_TADALAFIL_PRICING,
  GHK_CU_PRICING,
  HAIRLOSS_FINASTERIDE_PRICING,
  HAIRLOSS_ORAL_MINOXIDIL_PRICING,
  HAIRLOSS_TOPICAL_MEN_PRICING,
  HAIRLOSS_TOPICAL_WOMEN_PRICING,
  MOTS_C_PRICING,
  NAD_PRICING,
  SERMORELIN_PRICING,
  type SimpleCompoundedPricing,
} from "@/lib/simple-treatment-pricing";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatUsd,
  getPlan,
} from "@/lib/medication-pricing";
import { cn } from "@/lib/utils";
import type { LandingVariant } from "../types";

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

/**
 * A promotional event (Black Friday, Cyber Monday, Christmas) that reuses the
 * same offers, codes and layout. The event only changes the name shown in
 * headlines and copy, the end date, and the gradient on the name. Event
 * variants wrap a Black Friday variant with `withPromoEvent`.
 */
export type PromoEventId = "black-friday" | "cyber-monday" | "christmas";

export type PromoEvent = {
  id: PromoEventId;
  name: string;
  /** Shown as "through {endsLabel}". */
  endsLabel: string;
  /** Tailwind gradient classes for the event name. */
  gradient: string;
};

const BF_GOLD_GRADIENT =
  "bg-gradient-to-r from-[color-mix(in_oklab,var(--primary)_40%,var(--foreground))] to-primary";

export const PROMO_EVENTS: Record<PromoEventId, PromoEvent> = {
  "black-friday": {
    id: "black-friday",
    name: "Black Friday",
    endsLabel: BLACK_FRIDAY_ENDS_LABEL,
    gradient: BF_GOLD_GRADIENT,
  },
  "cyber-monday": {
    id: "cyber-monday",
    name: "Cyber Monday",
    endsLabel: "December 1",
    gradient: BF_GOLD_GRADIENT,
  },
  christmas: {
    id: "christmas",
    name: "Christmas",
    // Matt gave no Christmas end date (2026-11-20); confirm before launch.
    endsLabel: "December 25",
    gradient: BF_GOLD_GRADIENT,
  },
};

const PromoEventContext = createContext<PromoEvent>(
  PROMO_EVENTS["black-friday"],
);

export function PromoEventProvider({
  event,
  children,
}: {
  event: PromoEventId;
  children: React.ReactNode;
}) {
  return (
    <PromoEventContext.Provider value={PROMO_EVENTS[event]}>
      {children}
    </PromoEventContext.Provider>
  );
}

/** The active promotional event (Black Friday unless a wrapper says otherwise). */
export function usePromoEvent(): PromoEvent {
  return useContext(PromoEventContext);
}

/**
 * Returns a Component that renders `base` inside the given event. Lets
 * Cyber Monday and Christmas variants reuse a Black Friday variant as is.
 */
export function withPromoEvent(
  base: LandingVariant,
  event: PromoEventId,
): LandingVariant["Component"] {
  const Base = base.Component;
  return function PromoEventVariant() {
    return (
      <PromoEventProvider event={event}>
        <Base />
      </PromoEventProvider>
    );
  };
}

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
  /**
   * Lead with the monthly cost after the coupon (the first plan's deal price
   * divided by its months), with the prepaid total as supporting detail.
   */
  monthlyFocus?: boolean;
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
    monthlyFocus: true,
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
    monthlyFocus: true,
    plans: edMintsPlans(50),
  },
  // Lowest-dose plans; "All doses and plans" shows every dose with the coupon.
  sildenafil: simpleOffer(
    "sildenafil",
    30,
    "BeemaHealth30offSildenafil",
    ED_SILDENAFIL_PRICING,
  ),
  tadalafil: simpleOffer(
    "tadalafil",
    30,
    "BeemaHealth30offTadalafil",
    ED_TADALAFIL_PRICING,
  ),
} as const satisfies Record<string, BlackFridayOffer>;

/**
 * Per-pill price on the lowest-dose 3-month plan, before and after the
 * sildenafil/tadalafil code. Pills are priced as one a day, so a deal under
 * $1 reads "Less than $1 a day" (same bar as simplePerDaySentence).
 */
export function edBfPerPill(product: "sildenafil" | "tadalafil"): {
  regular: string;
  deal: string;
  dealUnderDollar: boolean;
} {
  const q = (
    product === "tadalafil" ? ED_TADALAFIL_DOSE_PLANS : ED_SILDENAFIL_DOSE_PLANS
  )[0]!.quarterly;
  const regular = roundUsd(q.usd / q.tablets);
  const deal = roundUsd(
    (q.usd - BLACK_FRIDAY_OFFERS[product].discountUsd) / q.tablets,
  );
  const under = deal < 1;
  return {
    regular: `${formatUsd(regular)}/pill`,
    deal: under ? "Less than $1 a day" : `${formatUsd(deal)}/pill`,
    dealUnderDollar: under,
  };
}

function roundUsd(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Offer for a simple (monthly plus optional 3-month) product. `only` limits
 * the coupon to one plan (the BPC codes are plan specific); otherwise the
 * discount is shown on every plan the product sells.
 */
function simpleOffer(
  product: string,
  discountUsd: number,
  code: string,
  pricing: SimpleCompoundedPricing,
  only?: "1-month" | "3-month",
): BlackFridayOffer {
  const plans: BlackFridayPlan[] = [];
  const q = pricing.quarterly;
  if (q && only !== "1-month")
    plans.push({
      label: "3-month plan",
      regularUsd: q.totalUsd,
      dealUsd: roundUsd(q.totalUsd - discountUsd),
    });
  if (only !== "3-month")
    plans.push({
      label: "1-month plan",
      regularUsd: pricing.monthlyUsd,
      dealUsd: roundUsd(pricing.monthlyUsd - discountUsd),
    });
  return {
    product,
    discountUsd,
    code,
    appliesTo: `eligible ${product} orders`,
    monthlyFocus: true,
    plans,
  };
}

/**
 * Oral finasteride and minoxidil are sold only as a 3-month plan (3 x the
 * listed monthly rate, $89 per Matt 2026-11-19), so the offer has that plan
 * only: $89 less the code.
 */
function threeMonthOnlyOffer(
  product: string,
  discountUsd: number,
  code: string,
  pricing: SimpleCompoundedPricing,
): BlackFridayOffer {
  const regularUsd = Math.round(pricing.monthlyUsd * 3);
  return {
    product,
    discountUsd,
    code,
    appliesTo: `the 3-month ${product} plan`,
    monthlyFocus: true,
    plans: [
      {
        label: "3-month plan",
        regularUsd,
        dealUsd: regularUsd - discountUsd,
      },
    ],
  };
}

/**
 * Black Friday offers for the nationwide product pages (codes from Matt,
 * 2026-11-19). MOTS-C, BPC-157 and GHK-Cu amounts are taken from their code
 * names ($100, $50 monthly / $100 quarterly, $100).
 */
export const BLACK_FRIDAY_PRODUCT_OFFERS = {
  finasteride: threeMonthOnlyOffer(
    "finasteride",
    20,
    "BeemaHealth20offHairPills",
    HAIRLOSS_FINASTERIDE_PRICING,
  ),
  minoxidil: threeMonthOnlyOffer(
    "oral minoxidil",
    20,
    "BeemaHealth20offHairPills",
    HAIRLOSS_ORAL_MINOXIDIL_PRICING,
  ),
  hairSprayMen: simpleOffer(
    "hair loss spray",
    40,
    "BeemaHealth40offHairSpray",
    HAIRLOSS_TOPICAL_MEN_PRICING,
  ),
  hairSprayWomen: simpleOffer(
    "hair loss spray",
    40,
    "BeemaHealth40offHairSpray",
    HAIRLOSS_TOPICAL_WOMEN_PRICING,
  ),
  nad: simpleOffer("NAD+", 50, "BeemaHealth50offNAD", NAD_PRICING),
  sermorelin: simpleOffer(
    "sermorelin",
    100,
    "BeemaHealth100offSermorelin",
    SERMORELIN_PRICING,
    "3-month",
  ),
  motsC: simpleOffer("MOTS-C", 100, "BeemaMOTS100off", MOTS_C_PRICING),
  ghkCu: simpleOffer("GHK-Cu", 100, "BeemaHealthghk100off", GHK_CU_PRICING),
  /** Quarterly code first: it is the headline offer. */
  bpc157: [
    simpleOffer(
      "BPC-157",
      100,
      "BH100offBPCQuarterly",
      BPC_157_PRICING,
      "3-month",
    ),
    simpleOffer("BPC-157", 50, "BH50offBPCMonthly", BPC_157_PRICING, "1-month"),
  ],
  bpc157Capsules: [
    simpleOffer(
      "BPC-157 capsules",
      100,
      "BH100offBPCQuarterly",
      BPC_157_CAPSULES_PRICING,
      "3-month",
    ),
    simpleOffer(
      "BPC-157 capsules",
      50,
      "BH50offBPCMonthly",
      BPC_157_CAPSULES_PRICING,
      "1-month",
    ),
  ],
  bpcTb500GhkCu: [
    simpleOffer(
      "BPC-157 / TB-500 / GHK-Cu",
      100,
      "BH100offBPCQuarterly",
      BPC_TB500_GHK_CU_PRICING,
      "3-month",
    ),
    simpleOffer(
      "BPC-157 / TB-500 / GHK-Cu",
      50,
      "BH50offBPCMonthly",
      BPC_TB500_GHK_CU_PRICING,
      "1-month",
    ),
  ],
} as const;

export const BLACK_FRIDAY_TERMS =
  "This is a one-time code: it applies to this purchase only, and later payments return to the regular price. One redemption per patient. Can't be combined with other offers. Enter the code at checkout.";

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
  const ev = usePromoEvent();
  return (
    <div
      className={cn(
        "relative mx-auto mb-10 max-w-4xl overflow-hidden rounded-3xl border-2 border-primary bg-card text-foreground shadow-soft",
        className,
      )}
    >
      <div className="relative bg-primary px-5 py-2 text-center text-xs font-bold uppercase tracking-widest text-primary-foreground">
        {ev.name} · through {ev.endsLabel}
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
              {offer.plans.map((plan) =>
                offer.monthlyFocus ? (
                  <li key={plan.label} className="text-base">
                    <s className="text-foreground/60">
                      <span className="sr-only">Regular price </span>
                      {formatUsd(plan.regularUsd / planMonths(plan))}/mo
                    </s>{" "}
                    <strong className="text-4xl font-extrabold text-foreground">
                      <span className="sr-only">Now </span>
                      {formatUsd(plan.dealUsd / planMonths(plan))}/mo
                    </strong>{" "}
                    <span className="text-foreground/80">
                      {planMonths(plan) > 1
                        ? `for ${planMonths(plan)} months with code`
                        : "with code"}
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">
                      {formatUsd(plan.dealUsd)} total for the {plan.label}{" "}
                      (regularly {formatUsd(plan.regularUsd)})
                    </span>
                  </li>
                ) : (
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
                ),
              )}
            </ul>
          ) : (
            <p className="mt-4 text-base">On {offer.appliesTo}.</p>
          )}
        </div>
        <div className="rounded-3xl border-2 border-dashed border-primary bg-primary-soft/60 p-5 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/70">
            Your {ev.name} code
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

const planMonths = (plan: BlackFridayPlan) =>
  Number.parseInt(plan.label, 10) || 1;

/** Hero tile fields for an offer (merged into the page's PriceTile). */
export function blackFridayTile(
  offer: BlackFridayOffer,
  endsLabel: string = BLACK_FRIDAY_ENDS_LABEL,
) {
  const [first, ...rest] = offer.plans ?? [];
  if (!first) {
    return {
      price: `${formatUsd(offer.discountUsd)} off`,
      unit: `${offer.product} with code`,
      detail: `Through ${endsLabel}`,
      note: `Code ${offer.code}`,
    };
  }
  if (offer.monthlyFocus) {
    const m = planMonths(first);
    return {
      strike: `${formatUsd(first.regularUsd / m)}/mo`,
      price: `${formatUsd(first.dealUsd / m)}/mo`,
      unit: m > 1 ? `for ${m} months with code` : "with code",
      detail: `${formatUsd(first.dealUsd)} total (regularly ${formatUsd(first.regularUsd)}) · save ${formatUsd(offer.discountUsd)}`,
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
        : `Save ${formatUsd(offer.discountUsd)} through ${endsLabel}`,
    note: `Code ${offer.code}`,
  };
}

/** The event name ("Black Friday" by default) in a gradient for headlines. */
export function BlackFridayText() {
  const ev = usePromoEvent();
  return (
    <span
      className={cn(
        ev.gradient,
        "bg-clip-text text-transparent [-webkit-box-decoration-break:clone] [box-decoration-break:clone]",
      )}
    >
      {ev.name}
    </span>
  );
}

/** Black Friday offers for hub pages that sell several products. */
export function BlackFridayHubOffers({
  offers,
  title,
}: {
  offers: readonly BlackFridayOffer[];
  title?: string;
}) {
  const ev = usePromoEvent();
  return (
    <section className="bg-background pb-4 pt-12 md:pt-16">
      <div className="veya-container">
        <h2 className="text-balance text-center text-3xl font-bold text-foreground md:text-4xl">
          <BlackFridayText /> offers
        </h2>
        <p className="sr-only">{title ?? `${ev.name} offers`}</p>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {offers.map((o) => (
            <BlackFridayDealCard
              key={`${o.code}-${o.product}`}
              offer={o}
              className="mb-0 max-w-none"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export type BlackFridayOffers = BlackFridayOffer | readonly BlackFridayOffer[];

export function asOffers(
  offers: BlackFridayOffers | undefined,
): readonly BlackFridayOffer[] {
  if (!offers) return [];
  return "code" in offers ? [offers] : offers;
}

/** The offer and plan that apply to a plan label such as "3-month plan". */
export function bfPlanFor(
  offers: BlackFridayOffers | undefined,
  label: string,
): { offer: BlackFridayOffer; plan: BlackFridayPlan } | undefined {
  for (const offer of asOffers(offers)) {
    const plan = offer.plans?.find((p) => p.label === label);
    if (plan) return { offer, plan };
  }
  return undefined;
}

/** Compact "Black Friday price" line for cards that are not rebuilt. */
export function BlackFridayPriceLine({
  offer,
  plan,
  className,
}: {
  offer: BlackFridayOffer;
  plan: BlackFridayPlan;
  className?: string;
}) {
  const m = planMonths(plan);
  if (offer.monthlyFocus) {
    return (
      <p
        className={cn(
          "rounded-xl bg-primary-soft/70 px-3 py-2 text-sm text-foreground ring-1 ring-primary/40",
          className,
        )}
      >
        <BlackFridayText />:{" "}
        <s className="text-muted-foreground">
          <span className="sr-only">Regular price </span>
          {formatUsd(plan.regularUsd / m)}/mo
        </s>{" "}
        <strong className="text-xl">
          <span className="sr-only">Now </span>
          {formatUsd(plan.dealUsd / m)}/mo
        </strong>{" "}
        {m > 1 ? `for ${m} months ` : ""}with code{" "}
        <span className="select-all font-mono text-xs font-bold">
          {offer.code}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {formatUsd(plan.dealUsd)} total for the {plan.label} (regularly{" "}
          {formatUsd(plan.regularUsd)})
        </span>
      </p>
    );
  }
  return (
    <p
      className={cn(
        "rounded-xl bg-primary-soft/70 px-3 py-2 text-sm text-foreground ring-1 ring-primary/40",
        className,
      )}
    >
      <BlackFridayText />:{" "}
      <s className="text-muted-foreground">
        <span className="sr-only">Regular price </span>
        {formatUsd(plan.regularUsd)}
      </s>{" "}
      <strong className="text-base">
        <span className="sr-only">Now </span>
        {formatUsd(plan.dealUsd)}
      </strong>{" "}
      for the {plan.label} with code{" "}
      <span className="select-all font-mono text-xs font-bold">
        {offer.code}
      </span>
    </p>
  );
}

/** One-line summary of the GLP-1 pricing for the active event, for hero strips. */
export function promoLine(ev: PromoEvent = PROMO_EVENTS["black-friday"]) {
  return `${ev.name}: Semaglutide ${formatUsd(
    (BLACK_FRIDAY_OFFERS.semaglutide.plans?.[0]?.dealUsd ?? 0) / 3,
  )}/mo, Tirzepatide ${formatUsd(
    (BLACK_FRIDAY_OFFERS.tirzepatide.plans?.[0]?.dealUsd ?? 0) / 3,
  )}/mo on 3-month plans with codes`;
}

/**
 * Rewrites the pricing sentences in FAQ answers that still describe the
 * standing promo codes (sema-off100, Tirz100, starter pack), so a Black Friday
 * variant never shows two different prices. Other answers pass through.
 */
export function useBlackFridayFaq<T extends { q: string; a: string }>(
  items: readonly T[],
): T[] {
  const ev = usePromoEvent();
  const sema = BLACK_FRIDAY_OFFERS.semaglutide;
  const tirz = BLACK_FRIDAY_OFFERS.tirzepatide;
  const sp = sema.plans![0]!;
  const tp = tirz.plans![0]!;
  const s6 = getPlan(COMPOUNDED_SEMAGLUTIDE_PRICING, 6);
  const s12 = getPlan(COMPOUNDED_SEMAGLUTIDE_PRICING, 12);
  const semaText = `On a 3-month plan, ${ev.name} code ${sema.code} takes ${formatUsd(sema.discountUsd)} off through ${ev.endsLabel}: ${formatUsd(sp.dealUsd)} for 3 months instead of ${formatUsd(sp.regularUsd)}, an effective ${formatUsd(sp.dealUsd / 3)}/month. Longer plans are ${formatUsd(s6.monthlyUsd)}/mo on 6 months (save ${formatUsd(s6.savingsUsd)}) or ${formatUsd(s12.monthlyUsd)}/mo annually (save ${formatUsd(s12.savingsUsd)}) at regular pricing. It is a one-time code, can only be redeemed once per patient, and can't be combined with other offers.`;
  const tirzText = `${ev.name} code ${tirz.code} takes ${formatUsd(tirz.discountUsd)} off the 3-month maintenance plan through ${ev.endsLabel}: ${formatUsd(tp.dealUsd)} for 3 months instead of ${formatUsd(tp.regularUsd)}, an effective ${formatUsd(tp.dealUsd / 3)}/month. It is a one-time code, can only be redeemed once per patient, and can't be combined with other offers.`;
  return items.map((item) => {
    if (!/sema-off100|Tirz100/.test(item.a)) return item;
    const a = item.a
      .replace(
        /On a 3-month plan, one-time code sema-off100[\s\S]*?once per patient\./,
        semaText,
      )
      .replace(/Promo code Tirz100[\s\S]*?can't be used together\./, tirzText);
    return { ...item, a };
  });
}

const COMPACT_ROWS = [
  {
    name: "Semaglutide",
    to: "/semaglutide/",
    offer: BLACK_FRIDAY_OFFERS.semaglutide,
  },
  {
    name: "Tirzepatide",
    to: "/tirzepatide/",
    offer: BLACK_FRIDAY_OFFERS.tirzepatide,
  },
  { name: "ED Mints", to: "/ed-mints/", offer: BLACK_FRIDAY_OFFERS.edMints },
  {
    name: "Sildenafil",
    to: "/sildenafil/",
    offer: BLACK_FRIDAY_OFFERS.sildenafil,
  },
  {
    name: "Tadalafil",
    to: "/tadalafil/",
    offer: BLACK_FRIDAY_OFFERS.tadalafil,
  },
  {
    name: "Finasteride",
    to: "/oral-finasteride/",
    offer: BLACK_FRIDAY_PRODUCT_OFFERS.finasteride,
  },
  {
    name: "Oral minoxidil",
    to: "/oral-minoxidil-men/",
    offer: BLACK_FRIDAY_PRODUCT_OFFERS.minoxidil,
  },
  {
    name: "Hair loss spray",
    to: "/hair-loss-spray-men/",
    offer: BLACK_FRIDAY_PRODUCT_OFFERS.hairSprayMen,
  },
  { name: "NAD+", to: "/nad-plus/", offer: BLACK_FRIDAY_PRODUCT_OFFERS.nad },
  {
    name: "Sermorelin",
    to: "/sermorelin/",
    offer: BLACK_FRIDAY_PRODUCT_OFFERS.sermorelin,
  },
  { name: "MOTS-C", to: "/mots-c/", offer: BLACK_FRIDAY_PRODUCT_OFFERS.motsC },
  {
    name: "BPC-157 (3-month)",
    to: "/bpc-157/",
    offer: BLACK_FRIDAY_PRODUCT_OFFERS.bpc157[0],
  },
  {
    name: "BPC-157 (1-month)",
    to: "/bpc-157/",
    offer: BLACK_FRIDAY_PRODUCT_OFFERS.bpc157[1],
  },
  { name: "GHK-Cu", to: "/ghk-cu/", offer: BLACK_FRIDAY_PRODUCT_OFFERS.ghkCu },
] as const;

function SmallCopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code stays visible and selectable.
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Code copied" : `Copy code ${code}`}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-primary-soft hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {copied ? (
        <Check className="size-4" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
    </button>
  );
}

/**
 * Every Black Friday offer in one compact list (name, amount, code, copy), for
 * the homepage where space is tight. Each name links to its product page.
 */
export function BlackFridayCompactOffers() {
  const ev = usePromoEvent();
  return (
    <section className="bg-background pb-4 pt-10 md:pt-14">
      <div className="veya-container">
        <h2 className="text-balance text-center text-2xl font-bold text-foreground md:text-3xl">
          <BlackFridayText /> offers
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
          Through {ev.endsLabel}. {BLACK_FRIDAY_TERMS}
        </p>
        <ul className="mt-6 grid gap-x-6 gap-y-1 rounded-3xl border-2 border-primary bg-card p-3 shadow-soft sm:grid-cols-2 md:p-5 lg:grid-cols-3">
          {COMPACT_ROWS.map(({ name, to, offer }) => (
            <li
              key={`${name}-${offer.code}`}
              className="flex items-center justify-between gap-2 border-b border-border/60 py-2 last:border-b-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  <Link to={to} className="hover:underline">
                    {name}
                  </Link>{" "}
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                    {formatUsd(offer.discountUsd)} off
                  </span>
                </p>
                <p className="select-all truncate font-mono text-xs text-muted-foreground">
                  {offer.code}
                </p>
              </div>
              <SmallCopyButton code={offer.code} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
