import { useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
          className="relative z-10 inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

/** Tabs shown in the box. 6- and 12-month plans live in the "See all plans" modal. */
const PLAN_TAB_ORDER: PlanLengthMonths[] = [1, 3];

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

  return (
    <div
      className={cn("space-y-4 text-left", className)}
      onClick={stopCardNavigation}
      onPointerDown={stopCardNavigation}
    >
      <p className="text-sm font-semibold text-foreground">
        Explore our pricing
      </p>

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
        {PLAN_TAB_ORDER.map((months) => (
          <PlanTab
            key={months}
            selected={selection.kind === "plan" && selection.months === months}
            onSelect={() => setSelection({ kind: "plan", months })}
            label={`${months} mo`}
          />
        ))}
      </div>

      {selection.kind === "starter" && hasStarter ? (
        <StarterPackPanel pricing={pricing} large={large} />
      ) : selectedPlan ? (
        <PlanPanel pricing={pricing} plan={selectedPlan} large={large} />
      ) : null}

      <AllPlansDialog pricing={pricing} />
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
        "min-h-11 cursor-pointer rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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

function PriceFigure({
  amount,
  suffix,
  strike,
  large,
}: {
  amount: number;
  suffix: string;
  strike?: number;
  large: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span
        className={cn(
          "font-bold tracking-tight text-foreground",
          large ? "text-3xl md:text-4xl" : "text-2xl",
        )}
      >
        {formatUsd(amount)}
      </span>
      <span className="text-sm text-muted-foreground">{suffix}</span>
      {strike != null ? (
        <span className="text-base font-medium text-muted-foreground line-through decoration-muted-foreground/70">
          {formatUsd(strike)}
        </span>
      ) : null}
    </div>
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
      <PriceFigure
        amount={pack.monthlyEquivalentUsd}
        suffix="/mo"
        large={large}
      />
      <p className="mt-1.5 text-sm text-foreground">
        {formatUsd(pack.totalUsd)} total for {pack.months} months
      </p>
      <p className="mt-1.5 text-sm text-foreground">
        {pack.dosePathLabel.charAt(0).toUpperCase() +
          pack.dosePathLabel.slice(1)}
      </p>
      <p className="mt-1.5 text-sm font-bold text-foreground">
        New patient starter pack
      </p>
    </div>
  );
}

function PlanPanel({
  pricing,
  plan,
  large,
}: {
  pricing: CompoundedMedicationPricing;
  plan: ReturnType<typeof getPlan>;
  large: boolean;
}) {
  const baseline = pricing.monthlyUsd;

  if (isSemaThreeMonthPromoPlan(pricing, plan)) {
    return (
      <div className="rounded-xl bg-background/80 px-3.5 py-3 ring-1 ring-border/70">
        <PriceFigure
          amount={promoFirstMonthUsd(pricing)}
          suffix="first month"
          strike={baseline}
          large={large}
        />
        <p className="mt-1.5 text-sm text-foreground">
          Then {formatUsd(baseline)}/mo for months 2 and 3 ·{" "}
          {formatUsd(semaThreeMonthPromoTotalUsd(pricing))} total for 3 months
        </p>
        <p className="mt-1.5 text-sm font-bold text-foreground">
          Use code {pricing.promoCode} at checkout
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-background/80 px-3.5 py-3 ring-1 ring-border/70">
      <PriceFigure
        amount={plan.monthlyUsd}
        suffix="/mo"
        strike={
          plan.months > 1 && plan.monthlyUsd < baseline ? baseline : undefined
        }
        large={large}
      />
      {plan.months > 1 ? (
        <p className="mt-1.5 text-sm text-foreground">
          {formatUsd(plan.totalUsd)} total for {plan.months} months
        </p>
      ) : (
        <p className="mt-1.5 text-sm text-foreground">Billed monthly</p>
      )}
      {plan.savingsUsd > 0 ? (
        <p className="mt-1.5 text-sm font-bold text-foreground">
          Save {formatUsd(plan.savingsUsd)}
        </p>
      ) : null}
    </div>
  );
}

/** "See all plans" button and the modal with every plan in detail. */
function AllPlansDialog({ pricing }: { pricing: CompoundedMedicationPricing }) {
  const isTirz = hasStarterPack(pricing);
  const medName = isTirz ? "tirzepatide" : "semaglutide";
  const tirzDetails = tirzepatidePricingDetailsCopy();
  const semaDetails = semaglutidePricingDetailsCopy();
  const months: PlanLengthMonths[] = [1, 3, 6, 12];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={stopCardNavigation}
        >
          See all plans
        </button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] max-w-lg overflow-y-auto"
        onClick={stopCardNavigation}
        onPointerDown={stopCardNavigation}
      >
        <DialogHeader>
          <DialogTitle>All {medName} plans</DialogTitle>
          <DialogDescription>
            All-inclusive cash-pay pricing: provider care, medication, supplies,
            and expedited shipping. No membership fee. Dose does not change the
            monthly rate.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-3">
          {isTirz ? (
            <li className="rounded-xl bg-muted/40 px-4 py-3 ring-1 ring-border/70">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">
                  {starterPackTitle(pricing.starterPack)}
                </p>
                <p className="text-sm font-bold text-foreground">
                  {formatUsd(pricing.starterPack.monthlyEquivalentUsd)}/mo
                </p>
              </div>
              <p className="mt-1 text-sm text-foreground">
                {formatUsd(pricing.starterPack.totalUsd)} total for{" "}
                {pricing.starterPack.months} months
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {tirzDetails.starter}
              </p>
            </li>
          ) : null}
          {months.map((m) => {
            const plan = getPlan(pricing, m);
            const promoPlan = isSemaThreeMonthPromoPlan(pricing, plan);
            return (
              <li
                key={m}
                className="rounded-xl bg-muted/40 px-4 py-3 ring-1 ring-border/70"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {plan.label}
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {promoPlan
                      ? `${formatUsd(promoFirstMonthUsd(pricing))} first month`
                      : `${formatUsd(plan.monthlyUsd)}/mo`}
                  </p>
                </div>
                <p className="mt-1 text-sm text-foreground">
                  {promoPlan
                    ? `Then ${formatUsd(pricing.monthlyUsd)}/mo for months 2 and 3 · ${formatUsd(semaThreeMonthPromoTotalUsd(pricing))} total`
                    : m === 1
                      ? "Billed monthly"
                      : `${formatUsd(plan.totalUsd)} prepaid for ${m} months`}
                </p>
                {plan.savingsUsd > 0 ? (
                  <p className="mt-1 text-sm font-bold text-foreground">
                    Save {formatUsd(plan.savingsUsd)}
                  </p>
                ) : null}
                {isPromoEligibleMonths(m) && !promoPlan ? (
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    Code {pricing.promoCode} takes an additional $
                    {PROMO_CODE_DISCOUNT_USD} off at checkout (
                    {formatUsd(planTotalWithCouponUsd(plan))} total).
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {isTirz ? tirzDetails.coupon : semaDetails.coupon} Your licensed
          provider decides which option, if any, is appropriate. Prescribing is
          never guaranteed.
        </p>
      </DialogContent>
    </Dialog>
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
