import { cn } from "@/lib/utils";
import {
  hasStarterPack,
  promoFirstMonthUsd,
  PROMO_CODE_DISCOUNT_USD,
  PROMO_CODE_MIN_MONTHS,
  starterPackTitle,
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
 * - Default (semaglutide): big promo first-month price + checkout code.
 * - With `starterPack` (tirzepatide): starter pack (doses 1→2→3) and
 *   standard/maintenance ($297/mo + Tirz100) shown as separate paths.
 */
export function CompoundedPriceLockup({
  pricing,
  className,
  size = "default",
}: CompoundedPriceLockupProps) {
  if (hasStarterPack(pricing)) {
    return (
      <TirzPricingLockup pricing={pricing} className={className} size={size} />
    );
  }

  return (
    <PromoCodeLockup pricing={pricing} className={className} size={size} />
  );
}

function TirzPricingLockup({
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
  const promo = promoFirstMonthUsd(pricing);
  const large = size === "lg";

  return (
    <div className={cn("space-y-3 text-left", className)}>
      <div className="rounded-xl bg-background/80 px-3.5 py-3 ring-1 ring-border/70">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            {starterPackTitle(pack)}
          </p>
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            New patients
          </p>
        </div>
        <div className="mt-2 flex flex-nowrap items-baseline gap-x-2">
          <span
            className={cn(
              "font-bold tracking-tight text-foreground",
              large ? "text-3xl md:text-4xl" : "text-2xl",
            )}
          >
            ${pack.totalUsd}
          </span>
          <span className="shrink-0 text-sm text-muted-foreground">
            for {pack.months} months
            <span className="font-normal">†</span>
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {pack.dosePathLabel}
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          ${pack.monthlyEquivalentUsd}/mo for {pack.months} months. For
          brand-new patients beginning tirzepatide, not maintenance.
        </p>
      </div>

      <div className="rounded-xl bg-background/80 px-3.5 py-3 ring-1 ring-border/70">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">
            Standard / maintenance
          </p>
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            ${monthly}/mo
          </p>
        </div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span
            className={cn(
              "font-bold tracking-tight text-foreground",
              large ? "text-2xl md:text-3xl" : "text-xl",
            )}
          >
            ${promo}
          </span>
          <span className="text-base font-medium text-muted-foreground line-through decoration-muted-foreground/70">
            ${monthly}
          </span>
          <span className="text-sm text-muted-foreground">first month</span>
        </div>
        <p className="mt-2 text-sm leading-snug text-foreground">
          Promo code:{" "}
          <span className="font-bold tracking-wide">{pricing.promoCode}</span>
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          ${PROMO_CODE_DISCOUNT_USD} off your first month on a{" "}
          {PROMO_CODE_MIN_MONTHS}-month plan, then ${monthly}/mo. For
          maintenance dosing, or if you&apos;re not taking the starter pack.
          Can&apos;t be combined with the starter pack.
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
