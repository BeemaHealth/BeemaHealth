import { cn } from "@/lib/utils";
import {
  promoFirstMonthUsd,
  PROMO_CODE_DISCOUNT_USD,
  PROMO_CODE_MIN_MONTHS,
  type CompoundedMedicationPricing,
} from "@/lib/medication-pricing";

type CompoundedPriceLockupProps = {
  pricing: CompoundedMedicationPricing;
  className?: string;
  /**
   * Larger type for treatment-page heroes / mid-page pricing cards.
   * Cards keep the default compact size.
   */
  size?: "default" | "lg";
};

/**
 * Good Life–style cash-pay lockup: big promo first-month price, strikethrough
 * list price, and a $100-off callout. Eligibility stays a 3-month plan —
 * that rule lives in the callout fine print, not in the headline math.
 */
export function CompoundedPriceLockup({
  pricing,
  className,
  size = "default",
}: CompoundedPriceLockupProps) {
  const promo = promoFirstMonthUsd(pricing);
  const monthly = pricing.monthlyUsd;
  const large = size === "lg";

  return (
    <div className={cn("space-y-3 text-left", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span
          className={cn(
            "font-bold tracking-tight text-foreground",
            large ? "text-4xl md:text-5xl" : "text-2xl md:text-3xl",
          )}
        >
          ${promo}
        </span>
        <span
          className={cn(
            "font-medium text-muted-foreground line-through decoration-muted-foreground/70",
            large ? "text-lg md:text-xl" : "text-base md:text-lg",
          )}
        >
          ${monthly}
        </span>
        <span className="text-sm text-muted-foreground">
          first month
          <span className="font-normal">†</span>
        </span>
      </div>

      <div className="rounded-xl bg-background/80 px-3.5 py-3 ring-1 ring-border/70">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            ${PROMO_CODE_DISCOUNT_USD} off first month
          </p>
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Limited-time promo
          </p>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Then ${monthly}/mo. One-time promo code on a {PROMO_CODE_MIN_MONTHS}
          -month plan, redeemable once per patient.
        </p>
      </div>
    </div>
  );
}
