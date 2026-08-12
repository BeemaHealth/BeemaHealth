import { useState, type ReactNode } from "react";
import { CircleHelp, Link as LinkIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { cn } from "@/lib/utils";
import {
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatUsd,
  getPlan,
  hasStarterPack,
  isPromoEligibleMonths,
  isSemaThreeMonthPromoPlan,
  planMonthlyWithCouponUsd,
  planTotalWithCouponUsd,
  promoFirstMonthUsd,
  PROMO_CODE_DISCOUNT_USD,
  semaThreeMonthPromoTotalUsd,
  semaglutidePricingDetailsCopy,
  starterPackTitle,
  STARTER_PACK_INTAKE_HINT,
  tirzepatidePricingDetailsCopy,
  type CompoundedMedicationPricing,
  type PlanLengthMonths,
} from "@/lib/medication-pricing";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Selection =
  | { kind: "starter" }
  | { kind: "plan"; months: PlanLengthMonths };

type CompoundedPriceLockupProps = {
  pricing: CompoundedMedicationPricing;
  className?: string;
  /**
   * Larger type for treatment-page heroes / mid-page pricing cards.
   * Cards keep the default compact size.
   */
  size?: "default" | "lg";
  /**
   * Interactive plan tabs (starter / 1 / 3 / 6 / 12). Default true on
   * treatment cards; homepage / lineup cards can pass false for a compact
   * teaser that still links out for full pricing.
   */
  interactive?: boolean;
};

/**
 * Cash-pay lockup for medication cards and treatment pricing sections.
 *
 * Interactive mode: select starter pack (tirz only) or 1/3/6/12-month plans
 * and see per-month rate, prepaid total, savings, and coupon math.
 */
export function CompoundedPriceLockup({
  pricing,
  className,
  size = "default",
  interactive = true,
}: CompoundedPriceLockupProps) {
  if (!interactive) {
    return (
      <CompactTeaserLockup
        pricing={pricing}
        className={className}
        size={size}
      />
    );
  }

  return (
    <PlanSelectorLockup pricing={pricing} className={className} size={size} />
  );
}

function stopCardNavigation(
  event: ReactMouseEvent | ReactPointerEvent | ReactKeyboardEvent,
) {
  event.stopPropagation();
}

function SaveAmount({ amount }: { amount: number }) {
  return <span className="font-bold text-foreground">{formatUsd(amount)}</span>;
}

function PricingDetailsButton({
  pricing,
}: {
  pricing: CompoundedMedicationPricing;
}) {
  const isTirz = hasStarterPack(pricing);
  const tirzDetails = tirzepatidePricingDetailsCopy();
  const semaDetails = semaglutidePricingDetailsCopy();
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const sema = pricing;
  const t3 = getPlan(tirz, 3);
  const t6 = getPlan(tirz, 6);
  const t12 = getPlan(tirz, 12);
  const s1 = getPlan(sema, 1);
  const s6 = getPlan(sema, 6);
  const s12 = getPlan(sema, 12);
  const m1 = getPlan(tirz, 1);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative z-10 inline-flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={
            isTirz
              ? "How tirzepatide pricing works"
              : "How semaglutide pricing works"
          }
          onClick={stopCardNavigation}
          onPointerDown={stopCardNavigation}
          onKeyDown={stopCardNavigation}
        >
          <CircleHelp className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-50 w-[min(100vw-2rem,22rem)] space-y-3 p-4 text-xs leading-relaxed text-muted-foreground"
        onClick={stopCardNavigation}
        onPointerDown={stopCardNavigation}
      >
        <p className="text-sm font-semibold text-foreground">
          {isTirz
            ? "How tirzepatide pricing works"
            : "How semaglutide pricing works"}
        </p>
        <div className="space-y-2">
          {isTirz ? (
            <>
              <p>
                <span className="font-medium text-foreground">
                  Starter pack.
                </span>{" "}
                {tirzDetails.starter}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Maintenance plans.
                </span>{" "}
                Standard / maintenance: {formatUsd(m1.monthlyUsd)}/mo billed
                monthly; {formatUsd(t3.monthlyUsd)}/mo on a 3-month plan (
                {formatUsd(t3.totalUsd)} total, Save{" "}
                <SaveAmount amount={t3.savingsUsd} />
                ); {formatUsd(t6.monthlyUsd)}/mo on a 6-month plan (Save{" "}
                <SaveAmount amount={t6.savingsUsd} />
                ); or {formatUsd(t12.monthlyUsd)}/mo annually (Save{" "}
                <SaveAmount amount={t12.savingsUsd} />
                ).
              </p>
              <p>
                <span className="font-medium text-foreground">Coupon.</span>{" "}
                {tirzDetails.coupon}
              </p>
            </>
          ) : (
            <>
              <p>
                <span className="font-medium text-foreground">Plans.</span>{" "}
                Compounded semaglutide: {formatUsd(s1.monthlyUsd)}/mo billed
                monthly; on a 3-month plan,{" "}
                {formatUsd(promoFirstMonthUsd(sema))} first month with code{" "}
                {sema.promoCode}, then {formatUsd(s1.monthlyUsd)}/mo for months
                2 and 3; {formatUsd(s6.monthlyUsd)}/mo on a 6-month plan (Save{" "}
                <SaveAmount amount={s6.savingsUsd} />
                ); or {formatUsd(s12.monthlyUsd)}/mo annually (Save{" "}
                <SaveAmount amount={s12.savingsUsd} />
                ).
              </p>
              <p>
                <span className="font-medium text-foreground">Coupon.</span>{" "}
                {semaDetails.coupon}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Compare tirzepatide.
                </span>{" "}
                Want larger multi-month savings? Compounded tirzepatide
                maintenance: Save <SaveAmount amount={t3.savingsUsd} /> /{" "}
                <SaveAmount amount={t6.savingsUsd} /> /{" "}
                <SaveAmount amount={t12.savingsUsd} /> on 3- / 6- / 12-month
                plans, and new patients can start with the{" "}
                {starterPackTitle(tirz.starterPack)} at{" "}
                {formatUsd(tirz.starterPack.totalUsd)} (
                {formatUsd(tirz.starterPack.monthlyEquivalentUsd)}/mo) for{" "}
                {tirz.starterPack.dosePathLabel}. {STARTER_PACK_INTAKE_HINT}{" "}
                Your licensed provider decides which option, if any, is
                appropriate - prescribing is never guaranteed.
              </p>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const PLAN_TAB_ORDER: PlanLengthMonths[] = [1, 3, 6, 12];

function PlanSelectorLockup({
  pricing,
  className,
  size = "default",
}: CompoundedPriceLockupProps) {
  const hasStarter = hasStarterPack(pricing);
  const [selection, setSelection] = useState<Selection>(
    hasStarter ? { kind: "starter" } : { kind: "plan", months: 3 },
  );
  const large = size === "lg";

  const selectedPlan =
    selection.kind === "plan" ? getPlan(pricing, selection.months) : null;
  const couponOk =
    selectedPlan != null && isPromoEligibleMonths(selectedPlan.months);

  return (
    <div
      className={cn("space-y-4 text-left", className)}
      onClick={stopCardNavigation}
      onPointerDown={stopCardNavigation}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-sm font-semibold text-foreground">
          Explore our pricing
        </p>
        <PricingDetailsButton pricing={pricing} />
      </div>

      <div
        role="tablist"
        aria-label="Plan length"
        className="flex flex-wrap gap-1.5"
      >
        {hasStarter && (
          <PlanTab
            selected={selection.kind === "starter"}
            onSelect={() => setSelection({ kind: "starter" })}
            label="Starter"
            hint="3 mo"
          />
        )}
        {PLAN_TAB_ORDER.map((months) => {
          const plan = getPlan(pricing, months);
          const semaThreeMonth = isSemaThreeMonthPromoPlan(pricing, plan);
          return (
            <PlanTab
              key={months}
              selected={
                selection.kind === "plan" && selection.months === months
              }
              onSelect={() => setSelection({ kind: "plan", months })}
              label={
                months === 1 ? "1 mo" : months === 12 ? "12 mo" : `${months} mo`
              }
              hint={
                semaThreeMonth ? (
                  <>
                    from{" "}
                    <span className="font-bold">
                      {formatUsd(promoFirstMonthUsd(pricing))}
                    </span>
                  </>
                ) : plan.savingsUsd > 0 ? (
                  <>
                    Save <SaveAmount amount={plan.savingsUsd} />
                  </>
                ) : undefined
              }
            />
          );
        })}
      </div>

      {selection.kind === "starter" && hasStarter ? (
        <StarterPackPanel pricing={pricing} large={large} />
      ) : selectedPlan ? (
        <PlanPanel
          pricing={pricing}
          plan={selectedPlan}
          couponOk={couponOk}
          large={large}
        />
      ) : null}

      {!hasStarter && <TirzValueTeaser className="mt-1" />}
    </div>
  );
}

function PlanTab({
  selected,
  onSelect,
  label,
  hint,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  hint?: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={(e) => {
        stopCardNavigation(e);
        onSelect();
      }}
      className={cn(
        "min-h-11 rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected
          ? "bg-primary text-primary-foreground shadow-soft"
          : "bg-background/80 text-foreground ring-1 ring-border/70 hover:bg-muted",
      )}
    >
      <span className="block text-sm font-semibold leading-none">{label}</span>
      {hint ? (
        <span
          className={cn(
            "mt-1 block text-[10px] font-medium leading-none",
            selected ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      ) : null}
    </button>
  );
}

function StarterPackPanel({
  pricing,
  large,
}: {
  pricing: CompoundedMedicationPricing & {
    starterPack: NonNullable<CompoundedMedicationPricing["starterPack"]>;
  };
  large: boolean;
}) {
  const pack = pricing.starterPack;
  return (
    <div className="rounded-xl bg-background/80 px-3.5 py-3 ring-1 ring-border/70">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">
          {starterPackTitle(pack)}
        </p>
        <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          New patients
        </p>
      </div>
      <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn(
            "font-bold tracking-tight text-foreground",
            large ? "text-3xl md:text-4xl" : "text-2xl",
          )}
        >
          {formatUsd(pack.monthlyEquivalentUsd)}
        </span>
        <span className="text-sm text-muted-foreground">/mo</span>
        <span className="text-sm text-muted-foreground">
          · {formatUsd(pack.totalUsd)} for {pack.months} months
          <span className="font-normal">†</span>
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {pack.dosePathLabel}. Typically one-time for brand-new patients
        beginning tirzepatide. {STARTER_PACK_INTAKE_HINT} Checkout coupon does
        not apply to the starter pack.
      </p>
    </div>
  );
}

function PlanPanel({
  pricing,
  plan,
  couponOk,
  large,
}: {
  pricing: CompoundedMedicationPricing;
  plan: ReturnType<typeof getPlan>;
  couponOk: boolean;
  large: boolean;
}) {
  const withCouponMonthly = planMonthlyWithCouponUsd(plan);
  const withCouponTotal = planTotalWithCouponUsd(plan);
  const baseline = pricing.monthlyUsd;
  const semaThreeMonth = isSemaThreeMonthPromoPlan(pricing, plan);
  const firstMonth = promoFirstMonthUsd(pricing);
  const threeMonthPromoTotal = semaThreeMonthPromoTotalUsd(pricing);

  if (semaThreeMonth) {
    return (
      <div className="rounded-xl bg-background/80 px-3.5 py-3 ring-1 ring-border/70">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">{plan.label}</p>
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            First-month promo
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span
            className={cn(
              "font-bold tracking-tight text-foreground",
              large ? "text-3xl md:text-4xl" : "text-2xl",
            )}
          >
            {formatUsd(firstMonth)}
          </span>
          <span className="text-base font-medium text-muted-foreground line-through decoration-muted-foreground/70">
            {formatUsd(baseline)}
          </span>
          <span className="text-sm text-muted-foreground">first month</span>
        </div>

        <p className="mt-1.5 text-xs text-muted-foreground">
          Then {formatUsd(baseline)}/mo for months 2 and 3 ·{" "}
          {formatUsd(threeMonthPromoTotal)} total for 3 months
        </p>

        <div className="mt-3 rounded-lg bg-primary-soft/50 px-3 py-2.5">
          <p className="text-sm leading-snug text-foreground">
            One-time promo code:{" "}
            <span className="font-bold tracking-wide">{pricing.promoCode}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            ${PROMO_CODE_DISCOUNT_USD} off your first month on a 3-month plan.
            Redeemable once per patient. Not valid on a 1-month purchase.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-background/80 px-3.5 py-3 ring-1 ring-border/70">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">{plan.label}</p>
        {plan.savingsUsd > 0 ? (
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
            Save <SaveAmount amount={plan.savingsUsd} />
          </p>
        ) : (
          <p className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Standard rate
          </p>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <span
          className={cn(
            "font-bold tracking-tight text-foreground",
            large ? "text-3xl md:text-4xl" : "text-2xl",
          )}
        >
          {formatUsd(plan.monthlyUsd)}
        </span>
        <span className="text-sm text-muted-foreground">/mo</span>
        {plan.months > 1 && plan.monthlyUsd < baseline ? (
          <span className="text-base font-medium text-muted-foreground line-through decoration-muted-foreground/70">
            {formatUsd(baseline)}
          </span>
        ) : null}
      </div>

      {plan.months > 1 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          {formatUsd(plan.totalUsd)} prepaid for {plan.months} months
          {plan.savingsUsd > 0 ? (
            <>
              {" "}
              · Save <SaveAmount amount={plan.savingsUsd} />
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-1.5 text-xs text-muted-foreground">
          Billed monthly. Multi-month plans unlock lower per-month rates.
        </p>
      )}

      {couponOk ? (
        <div className="mt-3 rounded-lg bg-primary-soft/50 px-3 py-2.5">
          <p className="text-sm leading-snug text-foreground">
            One-time promo code:{" "}
            <span className="font-bold tracking-wide">{pricing.promoCode}</span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Additional ${PROMO_CODE_DISCOUNT_USD} off at checkout →{" "}
            {formatUsd(withCouponTotal)} total ({formatUsd(withCouponMonthly)}
            /mo avg). Redeemable once per patient. Not valid on 1-month
            {hasStarterPack(pricing) ? " or the starter pack" : ""}.
          </p>
        </div>
      ) : plan.months === 1 ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          Checkout coupon applies to 3-, 6-, and 12-month plans only (one-time
          use, once per patient).
        </p>
      ) : null}
    </div>
  );
}

/** Semaglutide-only teaser pointing at tirz savings + starter pack (no outcome claims). */
function TirzValueTeaser({ className }: { className?: string }) {
  const tirz = COMPOUNDED_TIRZEPATIDE_PRICING;
  const pack = tirz.starterPack;
  const m6 = getPlan(tirz, 6);
  const m12 = getPlan(tirz, 12);

  return (
    <div
      className={cn(
        "rounded-xl border border-dashed border-primary/30 bg-primary-soft/20 px-3.5 py-3",
        className,
      )}
    >
      <p className="text-sm font-semibold text-foreground">
        Larger multi-month savings on tirzepatide
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        Maintenance plans: Save up to <SaveAmount amount={m12.savingsUsd} /> on
        annual (
        <span className="line-through decoration-muted-foreground/70">
          {formatUsd(tirz.monthlyUsd)}
        </span>{" "}
        → {formatUsd(m12.monthlyUsd)}/mo), or {formatUsd(m6.monthlyUsd)}/mo on 6
        months. New patients can start with the {starterPackTitle(pack)} at{" "}
        {formatUsd(pack.totalUsd)} ({formatUsd(pack.monthlyEquivalentUsd)}/mo){" "}
        for {pack.dosePathLabel}. {STARTER_PACK_INTAKE_HINT} Your provider
        decides which option, if any, fits - prescribing is never guaranteed.
      </p>
      <Link
        to="/tirzepatide/"
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary underline-offset-2 hover:underline"
        onClick={stopCardNavigation}
        onPointerDown={stopCardNavigation}
      >
        See tirzepatide pricing <LinkIcon className="size-3" aria-hidden />
      </Link>
    </div>
  );
}

/** Compact non-interactive teaser for homepage / lineup cards. */
function CompactTeaserLockup({
  pricing,
  className,
  size = "default",
}: CompoundedPriceLockupProps) {
  const large = size === "lg";
  const hasStarter = hasStarterPack(pricing);
  const leadMonthly = hasStarter
    ? pricing.starterPack.monthlyEquivalentUsd
    : promoFirstMonthUsd(pricing);
  const maintenance = getPlan(pricing, 1).monthlyUsd;

  return (
    <div className={cn("space-y-2 text-left", className)}>
      <div className="flex items-center gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span
            className={cn(
              "font-bold tracking-tight text-foreground",
              large ? "text-3xl md:text-4xl" : "text-2xl",
            )}
          >
            {formatUsd(leadMonthly)}
          </span>
          <span className="text-sm text-muted-foreground">
            /mo
            {hasStarter ? " starter" : " first month"}
            <span className="font-normal">†</span>
          </span>
        </div>
        <PricingDetailsButton pricing={pricing} />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {hasStarter
          ? `${starterPackTitle(pricing.starterPack)} ${formatUsd(pricing.starterPack.totalUsd)}, or maintenance from ${formatUsd(getPlan(pricing, 6).monthlyUsd)}/mo on longer plans (monthly ${formatUsd(maintenance)}).`
          : `${formatUsd(promoFirstMonthUsd(pricing))} first month on a 3-month plan with code ${pricing.promoCode}, then ${formatUsd(maintenance)}/mo for months 2 and 3. Longer plans from ${formatUsd(getPlan(pricing, 12).monthlyUsd)}/mo.`}{" "}
        See the medication page for the full 1/3/6/12 plan selector.
      </p>
    </div>
  );
}
