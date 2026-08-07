import { cn } from "@/lib/utils";
import {
  hasStarterPack,
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
 * Cash-pay lockup for medication cards.
 *
 * - Default (semaglutide): big promo first-month price, strikethrough list
 *   price, and a $100-off callout with the checkout promo code in bold.
 * - With `starterPack` (tirzepatide): leads with the new-patient starter
 *   pack ($599 / $199/mo), then shows the promo code as a secondary path.
 */
export function CompoundedPriceLockup({
  pricing,
  className,
  size = "default",
}: CompoundedPriceLockupProps) {
  if (hasStarterPack(pricing)) {
    return (
      <StarterPackLockup pricing={pricing} className={className} size={size} />
    );
  }

  return (
    <PromoCodeLockup pricing={pricing} className={className} size={size} />
  );
}

function StarterPackLockup({
  pricing,
  className,
  size = "default",
}: CompoundedPriceLockupProps & {
  pricing: CompoundedMedicationPricing & {
    starterPack: NonNullable<CompoundedMedicationPricing["starterPack"]>;
  };
}) {
  const pack = pricing.starterPack;
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
          ${pack.monthlyEquivalentUsd}
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
          /mo starter pack
          <span className="font-normal">†</span>
        </span>
      </div>

      <div className="rounded-xl bg-background/80 px-3.5 py-3 ring-1 ring-border/70">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            New-patient starter pack
          </p>
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Brand new only
          </p>
        </div>
        <p className="mt-2 text-sm leading-snug text-foreground">
          <span className="font-bold">${pack.totalUsd}</span> for {pack.months}{" "}
          months{" "}
          <span className="text-muted-foreground">
            (${pack.monthlyEquivalentUsd}/mo)
          </span>
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          For brand-new patients only. Then ${monthly}/mo. Complete intake to
          join and lock in this starter rate at checkout.
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Alternate: promo code{" "}
          <span className="font-bold text-foreground">{pricing.promoCode}</span>{" "}
          for ${PROMO_CODE_DISCOUNT_USD} off your first month on a{" "}
          {PROMO_CODE_MIN_MONTHS}-month plan.
        </p>
      </div>
    </div>
  );
}

function PromoCodeLockup({
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
        <p className="mt-2 text-sm leading-snug text-foreground">
          Promo code:{" "}
          <span className="font-bold tracking-wide">{pricing.promoCode}</span>
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Use at checkout. Then ${monthly}/mo. One-time code on a{" "}
          {PROMO_CODE_MIN_MONTHS}-month plan, redeemable once per patient.
        </p>
      </div>
    </div>
  );
}
