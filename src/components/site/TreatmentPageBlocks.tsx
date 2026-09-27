import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, type LucideIcon } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HexBadge, HexMotif, SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { CompoundedPriceLockup } from "@/components/site/CompoundedPriceLockup";
import { cn } from "@/lib/utils";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatUsd,
  getPlan,
  hasStarterPack,
  promoFirstMonthUsd,
  PROMO_CODE_DISCOUNT_USD,
  starterPackTitle,
  STARTER_PACK_INTAKE_HINT,
  type CompoundedMedicationPricing,
} from "@/lib/medication-pricing";
import {
  formatSimpleQuarterlyStartingAt,
  type SimpleCompoundedPricing,
} from "@/lib/simple-treatment-pricing";
import type { VialImagery } from "@/lib/treatment-imagery";

/**
 * Shared building blocks for the per-medication treatment pages
 * (/tirzepatide, /semaglutide, and the 5 non-GLP-1 money pages). Kept
 * together like site/primitives.tsx - small, page-agnostic pieces; copy/data
 * stays local to each route file.
 */

/** Visible two-level breadcrumb (Home / <medication>). Keep in sync with the
 * BreadcrumbList JSON-LD built via breadcrumbJsonLd() in each route's head(). */
export function TreatmentBreadcrumb({ current }: { current: string }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{current}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export type TreatmentPricingCardCta = {
  to: string;
  search?: Record<string, string>;
  onClick?: () => void;
  label: string;
};

export function TreatmentPricingCard({
  pricing,
  className,
  imagery,
  cta,
}: {
  pricing: CompoundedMedicationPricing;
  className?: string;
  /** Optional photo - used where a page shows more than one medication's
   * card and needs the photo to switch with it (e.g. Glp1LandingPage's
   * product picker). Stacks above the pricing content on mobile, becomes a
   * full-height side panel at `lg:` so it doesn't get cropped as tight. */
  imagery?: VialImagery;
  /** Optional "Get Started" link rendered at the bottom of the card. */
  cta?: TreatmentPricingCardCta;
}) {
  const pricingContent = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
        Transparent pricing
      </p>
      <CompoundedPriceLockup className="mt-5" pricing={pricing} size="lg" />
      <p className="mt-6 max-w-md text-xs leading-relaxed text-muted-foreground">
        {hasStarterPack(pricing) ? (
          <>
            <span className="font-semibold text-foreground">
              {starterPackTitle(pricing.starterPack)}
            </span>
            : brand-new patients beginning tirzepatide get{" "}
            {pricing.starterPack.dosePathLabel} for{" "}
            <span className="font-bold text-foreground">
              {formatUsd(pricing.starterPack.totalUsd)}
            </span>{" "}
            over {pricing.starterPack.months} months (
            {formatUsd(pricing.starterPack.monthlyEquivalentUsd)}/mo).{" "}
            {STARTER_PACK_INTAKE_HINT}{" "}
            <span className="font-semibold text-foreground">
              Standard / maintenance
            </span>
            : {formatUsd(pricing.monthlyUsd)}/mo monthly;{" "}
            {formatUsd(getPlan(pricing, 3).monthlyUsd)}/mo on 3 months (Save{" "}
            <span className="font-bold text-foreground">
              {formatUsd(getPlan(pricing, 3).savingsUsd)}
            </span>
            ); {formatUsd(getPlan(pricing, 6).monthlyUsd)}/mo on 6 months (Save{" "}
            <span className="font-bold text-foreground">
              {formatUsd(getPlan(pricing, 6).savingsUsd)}
            </span>
            ); {formatUsd(getPlan(pricing, 12).monthlyUsd)}/mo annually (Save{" "}
            <span className="font-bold text-foreground">
              {formatUsd(getPlan(pricing, 12).savingsUsd)}
            </span>
            ). Promo code{" "}
            <span className="font-bold text-foreground">
              {pricing.promoCode}
            </span>{" "}
            takes an additional ${PROMO_CODE_DISCOUNT_USD} off 3-, 6-, and
            12-month maintenance plans at checkout (one-time use, once per
            patient) - not valid on the starter pack or a 1-month purchase.
          </>
        ) : (
          <>
            On a 3-month plan, one-time code{" "}
            <span className="font-bold text-foreground">
              {pricing.promoCode}
            </span>{" "}
            brings your first month to{" "}
            <span className="font-bold text-foreground">
              {formatUsd(promoFirstMonthUsd(pricing))}
            </span>
            , then {formatUsd(pricing.monthlyUsd)}/mo for months 2 and 3. Use
            the plan tabs for 6- and 12-month rates (Save up to{" "}
            <span className="font-bold text-foreground">
              {formatUsd(getPlan(pricing, 12).savingsUsd)}
            </span>
            ). The same code can take an additional ${PROMO_CODE_DISCOUNT_USD}{" "}
            off 6- and 12-month plans at checkout - not valid on a 1-month
            purchase.
          </>
        )}{" "}
        All-inclusive cash-pay pricing: provider care, medication, supplies, and
        expedited shipping are included. No separate platform membership fee.
        Dose does not change the monthly rate. Treatment availability may vary
        based on clinical appropriateness, prescription, pharmacy fulfillment,
        and state requirements.
      </p>
      {cta ? (
        <Button asChild size="lg" className="mt-6 w-full">
          <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
            {cta.label} <ArrowRight />
          </Link>
        </Button>
      ) : null}
    </>
  );

  if (imagery) {
    return (
      <SurfaceCard
        className={cn(
          "overflow-hidden border-primary/30 bg-primary-soft/30 p-0 text-left",
          className,
        )}
      >
        <div className="lg:grid lg:grid-cols-[minmax(0,44%)_minmax(0,56%)] lg:items-stretch">
          <div className="relative min-h-[260px] overflow-hidden bg-primary-soft sm:min-h-[320px] lg:min-h-0">
            <img
              src={imagery.src}
              alt={imagery.alt}
              width={imagery.width}
              height={imagery.height}
              className="absolute inset-0 h-full w-full object-contain p-8 sm:p-10 lg:p-10"
            />
          </div>
          <div className="p-6 md:p-8">{pricingContent}</div>
        </div>
      </SurfaceCard>
    );
  }

  return (
    <SurfaceCard
      className={cn(
        "border-primary/30 bg-primary-soft/30 text-left",
        className,
      )}
    >
      {pricingContent}
    </SurfaceCard>
  );
}

/**
 * Single-item "What's included" dropdown for the treatment page hero. Each
 * page passes its own item order (see WHATS_INCLUDED in the route files) -
 * deliberately not a shared constant, so the two pages don't render an
 * identical list in an identical order.
 *
 * Items may be plain labels or `{ label, to }` links (e.g. free recipes).
 */
export type TreatmentIncludedItem =
  | string
  | {
      label: string;
      /** Internal path for TanStack Router `Link` (e.g. "/recipes/"). */
      to: string;
    };

export function TreatmentIncludedDropdown({
  items,
  className,
}: {
  items: readonly TreatmentIncludedItem[];
  className?: string;
}) {
  // Closed until we know the viewport - avoids opening briefly on mobile SSR/hydrate.
  const [value, setValue] = useState("");

  useEffect(() => {
    // Tailwind `md` (768px): open by default on desktop; still collapsible.
    if (window.matchMedia("(min-width: 768px)").matches) {
      setValue("whats-included");
    }
  }, []);

  return (
    <Accordion
      type="single"
      collapsible
      value={value}
      onValueChange={setValue}
      className={cn("w-full", className)}
    >
      <AccordionItem
        value="whats-included"
        className="rounded-2xl border border-border bg-card px-5"
      >
        <AccordionTrigger className="text-left text-sm font-semibold text-foreground">
          What&apos;s included
        </AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-2 pt-1">
            {items.map((item) => {
              const label = typeof item === "string" ? item : item.label;
              const to = typeof item === "string" ? undefined : item.to;
              return (
                <li
                  key={label}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                  {to ? (
                    <Link
                      to={to}
                      className="font-medium text-primary underline-offset-2 hover:underline"
                    >
                      {label}
                    </Link>
                  ) : (
                    label
                  )}
                </li>
              );
            })}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

type ComparisonId = "tirzepatide" | "semaglutide";

type ComparisonRow = {
  label: string;
  tirzepatide: ReactNode;
  semaglutide: ReactNode;
  /** Bolder, tinted treatment for the price row - same row used in both layouts. */
  emphasis?: boolean;
};

const COMPARISON_NAMES: Record<ComparisonId, string> = {
  tirzepatide: "Compounded Tirzepatide",
  semaglutide: "Compounded Semaglutide",
};

const COMPARISON_ROWS: ComparisonRow[] = [
  {
    label: "Active medication",
    tirzepatide: "Tirzepatide",
    semaglutide: "Semaglutide",
  },
  {
    label: "Mechanism (high level)",
    tirzepatide: "Dual GLP-1/GIP receptor agonist",
    semaglutide: "GLP-1 receptor agonist",
  },
  {
    label: "Appropriateness",
    tirzepatide: "Decided individually by a licensed provider",
    semaglutide: "Decided individually by a licensed provider",
  },
  {
    label: "Beema Health starting price",
    tirzepatide: `From ${formatUsd(COMPOUNDED_TIRZEPATIDE_PRICING.starterPack!.monthlyEquivalentUsd)}/mo`,
    semaglutide: `From ${formatUsd(promoFirstMonthUsd(COMPOUNDED_SEMAGLUTIDE_PRICING))}/mo first month`,
    emphasis: true,
  },
];

/**
 * Tirzepatide vs. semaglutide comparison. `highlight` bolds one side.
 *
 * Renders two layouts from the same `COMPARISON_ROWS` data (both in the
 * initial HTML - nothing is client-fetched or hidden from crawlers):
 * a real `<table>` at `md:` and up, and a pair of stacked spec cards below
 * `md:` so mobile never needs horizontal scroll to read a comparison.
 */
export function TreatmentComparisonTable({
  highlight,
}: {
  highlight?: ComparisonId;
}) {
  const headCls = (id: ComparisonId) =>
    cn(
      "py-4 text-sm font-bold md:text-base",
      highlight === id ? "text-accent-foreground" : "text-foreground",
    );

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-soft">
      <div className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-b-2 border-border bg-muted/60 hover:bg-muted/60">
              <TableHead className="w-1/4"></TableHead>
              <TableHead className={headCls("tirzepatide")}>
                {COMPARISON_NAMES.tirzepatide}
              </TableHead>
              <TableHead className={headCls("semaglutide")}>
                {COMPARISON_NAMES.semaglutide}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {COMPARISON_ROWS.map((row) => (
              <TableRow
                key={row.label}
                className={cn(
                  row.emphasis &&
                    "border-b-0 bg-primary-soft/40 hover:bg-primary-soft/50",
                )}
              >
                <TableCell
                  className={cn(
                    "font-semibold text-foreground",
                    row.emphasis ? "py-4" : "py-3.5",
                  )}
                >
                  {row.label}
                </TableCell>
                <TableCell
                  className={cn(
                    row.emphasis
                      ? "py-4 text-base font-bold text-foreground"
                      : "py-3.5 text-muted-foreground",
                  )}
                >
                  {row.tirzepatide}
                </TableCell>
                <TableCell
                  className={cn(
                    row.emphasis
                      ? "py-4 text-base font-bold text-foreground"
                      : "py-3.5 text-muted-foreground",
                  )}
                >
                  {row.semaglutide}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: one spec card per medication instead of a cramped 3-column table. */}
      <div className="divide-y divide-border md:hidden">
        {(["tirzepatide", "semaglutide"] as const).map((id) => (
          <div
            key={id}
            className={cn("p-5", highlight === id && "bg-primary-soft/30")}
          >
            <h3
              className={cn(
                "text-base font-bold",
                highlight === id ? "text-accent-foreground" : "text-foreground",
              )}
            >
              {COMPARISON_NAMES[id]}
            </h3>
            <dl className="mt-3 space-y-3 text-sm">
              {COMPARISON_ROWS.map((row) => (
                <div
                  key={row.label}
                  className={cn(
                    row.emphasis &&
                      "-mx-2 rounded-xl bg-background/80 px-2 py-2 ring-1 ring-border/70",
                  )}
                >
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {row.label}
                  </dt>
                  <dd
                    className={cn(
                      "mt-1 leading-snug",
                      row.emphasis
                        ? "text-base font-bold text-foreground"
                        : "text-foreground",
                    )}
                  >
                    {id === "tirzepatide" ? row.tirzepatide : row.semaglutide}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}

export type TreatmentFaqItem = { q: string; a: string };

export function TreatmentFaqSection({
  items,
}: {
  items: readonly TreatmentFaqItem[];
}) {
  return (
    <Accordion type="single" collapsible className="mx-auto max-w-3xl">
      {items.map((item, i) => (
        <AccordionItem
          key={item.q}
          value={`faq-${i}`}
          className="mb-3 rounded-2xl border border-border bg-card px-5"
        >
          <AccordionTrigger className="text-left text-base font-medium text-foreground">
            {item.q}
          </AccordionTrigger>
          <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
            {item.a}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/**
 * Branded hero visual for the 5 non-GLP-1 treatment pages (TRT, hairloss,
 * ED, NAD+, sermorelin). No product photography exists for these lines, and
 * a fabricated "photorealistic" pill/vial photo would risk misrepresenting
 * real packaging - a deceptive-imagery problem well beyond a stock-photo
 * placeholder. This renders a flat, on-brand illustration (hex badge + icon
 * + wordmark) instead of a photo. Swap for real product photography later by
 * replacing this component's usage in each route, the same way
 * treatment-imagery.ts's VIAL_IMAGERY_MODE switchboard works for sema/tirz.
 */
export function TreatmentHeroArt({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-4xl bg-primary-soft shadow-lift",
        className,
      )}
    >
      <div
        aria-hidden
        className="bg-mesh-glow pointer-events-none absolute inset-0 opacity-70"
      />
      <HexMotif className="pointer-events-none absolute -left-8 -top-8 w-32 text-primary/15" />
      <HexMotif className="pointer-events-none absolute -bottom-10 -right-10 w-40 text-primary/15" />
      <HexBadge className="relative z-10 size-24">
        <Icon className="size-11" aria-hidden />
      </HexBadge>
      <p className="relative z-10 mt-5 text-sm font-bold uppercase tracking-[0.2em] text-primary">
        Beema Health
      </p>
      <p className="relative z-10 mt-1 max-w-[70%] text-center text-base font-semibold text-foreground">
        {label}
      </p>
    </div>
  );
}

type SimpleTreatmentPricingCardProps = {
  /** e.g. "TRT", "hairloss", "ED" - used in the disclosure sentence. */
  label: string;
  /** Optional visible product name/heading, e.g. "Finasteride (Generic Propecia®)" - for pages showing several distinctly-named products side by side. */
  title?: string;
  /** Optional short tag next to `title`, e.g. "Rx". Only rendered when `title` is also set. */
  badge?: string;
  pricing: SimpleCompoundedPricing;
  /** Optional per-product "Get Started" CTA, e.g. `resolveCta(CTA_IDS.ed_mints_rdt_hero)` - for pages where each product routes to its own Bask intake. */
  cta?: {
    label: string;
    to: string;
    search?: Record<string, string>;
    onClick?: () => void;
  };
  /** Optional highlighted callout next to the price, e.g. `simplePerDaySentence(pricing)` - only pass a truthy value when the claim is actually true. */
  perDayNote?: string;
  className?: string;
  /**
   * Opt-in 3-month/1-month plan tabs (2026-09-13, per Matt - hair loss
   * spray). Only takes effect when `pricing.quarterly` is set; otherwise
   * falls back to the static single-price layout below. Default false so
   * every other caller (oral finasteride, oral minoxidil) keeps its current
   * plain-price card unchanged.
   */
  interactive?: boolean;
};

/**
 * Pricing card for the 5 non-GLP-1 treatment pages. Deliberately separate
 * from TreatmentPricingCard: no promo code, no starter pack, and an optional
 * quarterly plan instead of the 1/3/6/12-month tier selector. See
 * simple-treatment-pricing.ts for why these products use a different shape.
 */
export function SimpleTreatmentPricingCard({
  label,
  title,
  badge,
  pricing,
  cta,
  perDayNote,
  className,
  interactive = false,
}: SimpleTreatmentPricingCardProps) {
  if (interactive && pricing.quarterly) {
    return (
      <InteractiveSimplePricingCard
        label={label}
        title={title}
        badge={badge}
        pricing={pricing}
        cta={cta}
        className={className}
      />
    );
  }

  return (
    <SurfaceCard
      className={cn(
        "border-primary/30 bg-primary-soft/30 text-left",
        className,
      )}
    >
      {title ? (
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {badge ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
              {badge}
            </span>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
        Transparent pricing
      </p>
      <div className="mt-5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          {formatUsd(pricing.monthlyUsd)}
        </span>
        <span className="text-sm text-muted-foreground">/mo</span>
        {perDayNote ? (
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
            {perDayNote}
          </span>
        ) : null}
      </div>
      {pricing.quarterly ? (
        <p className="mt-2 text-sm text-muted-foreground">
          or{" "}
          <span className="font-bold text-foreground">
            {formatUsd(pricing.quarterly.totalUsd)}
          </span>{" "}
          billed quarterly (about{" "}
          {formatUsd(pricing.quarterly.monthlyEquivalentUsd)}/mo) -{" "}
          <span className="font-semibold text-foreground">
            Save {formatUsd(pricing.quarterly.savingsUsd)}
          </span>{" "}
          vs. paying monthly
        </p>
      ) : null}
      <p className="mt-6 max-w-md text-xs leading-relaxed text-muted-foreground">
        All-inclusive cash-pay pricing for {label}: provider care, medication,
        supplies, and shipping are included. No separate platform membership
        fee. Dose does not change the monthly rate. Treatment availability may
        vary based on clinical appropriateness, prescription, pharmacy
        fulfillment, and state requirements.
      </p>
      {cta ? (
        <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
          <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
            {cta.label} <ArrowRight className="size-4" />
          </Link>
        </Button>
      ) : null}
    </SurfaceCard>
  );
}

/** Small plan-length tab button, styled to match CompoundedPriceLockup's PlanTab. */
function SimplePlanTab({
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
      onClick={onSelect}
      className={cn(
        "min-h-11 flex-1 cursor-pointer rounded-xl px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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

/**
 * Interactive 3-month/1-month version of SimpleTreatmentPricingCard
 * (2026-09-13, per Matt - hair loss spray). 3 months is the default
 * selection, featuring the lower monthly-equivalent rate; 1 month is
 * available as an explicit alternate tab, never the default and never
 * described as "billed monthly" - that cadence detail isn't confirmed, so
 * only the price itself is stated (see simple-treatment-pricing.ts).
 */
function InteractiveSimplePricingCard({
  label,
  title,
  badge,
  pricing,
  cta,
  className,
}: Omit<SimpleTreatmentPricingCardProps, "perDayNote" | "interactive">) {
  const [months, setMonths] = useState<1 | 3>(3);
  const q = pricing.quarterly;
  const isThreeMonth = months === 3;

  if (!q) return null;

  return (
    <SurfaceCard
      className={cn(
        "border-primary/30 bg-primary-soft/30 text-left",
        className,
      )}
    >
      {title ? (
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {badge ? (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-foreground">
              {badge}
            </span>
          ) : null}
        </div>
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
        Transparent pricing
      </p>

      <div
        role="tablist"
        aria-label="Plan length"
        className="mt-4 flex gap-1.5"
      >
        <SimplePlanTab
          selected={isThreeMonth}
          onSelect={() => setMonths(3)}
          label="3 months"
          hint={
            <>
              Save <span className="font-bold">{formatUsd(q.savingsUsd)}</span>
            </>
          }
        />
        <SimplePlanTab
          selected={!isThreeMonth}
          onSelect={() => setMonths(1)}
          label="1 month"
        />
      </div>

      <div className="mt-4 rounded-xl bg-background/80 px-3.5 py-3 ring-1 ring-border/70">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {formatUsd(
              isThreeMonth ? q.monthlyEquivalentUsd : pricing.monthlyUsd,
            )}
          </span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </div>
        {isThreeMonth ? (
          <p className="mt-1.5 text-xs text-muted-foreground">
            {formatUsd(q.totalUsd)} for 3 months · Save{" "}
            <span className="font-bold text-foreground">
              {formatUsd(q.savingsUsd)}
            </span>{" "}
            vs. paying monthly
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground">1-month plan.</p>
        )}
      </div>

      <p className="mt-6 max-w-md text-xs leading-relaxed text-muted-foreground">
        All-inclusive cash-pay pricing for {label}: provider care, medication,
        supplies, and shipping are included. No separate platform membership
        fee. Dose does not change the monthly rate. Treatment availability may
        vary based on clinical appropriateness, prescription, pharmacy
        fulfillment, and state requirements.
      </p>
      {cta ? (
        <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
          <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
            {cta.label} <ArrowRight className="size-4" />
          </Link>
        </Button>
      ) : null}
    </SurfaceCard>
  );
}

export type CategoryLineupItem = {
  id: string;
  name: string;
  /** e.g. "Once-daily oral", "Weekly injection, if prescribed". */
  form: string;
  pricing: SimpleCompoundedPricing;
  icon: LucideIcon;
  /**
   * Real product photo, when this medication has one - takes over the
   * card's image slot from the icon/mesh-glow placeholder below. Reuses the
   * same photography already shot for the medication's own money page
   * (e.g. `/tadalafil`'s bottle shot), so `icon` stays required as the
   * fallback for lineups whose products have no photography yet.
   */
  image?: { src: string; alt: string; width: number; height: number };
  /** Own indexable landing page for this specific medication. */
  to: string;
  /** Optional highlighted tag next to the price, e.g. `simplePerDaySentence(pricing)` - only pass a truthy value when the claim is actually true. */
  perDayNote?: string;
};

/**
 * Card grid for a category hub page (/sexual-health, /hair, /wellness),
 * linking out to each category's specific medication pages. Deliberately
 * separate from TreatmentLineup.tsx (the /weight-loss version): that
 * component is hardcoded to the two GLP-1 medications' photo imagery and
 * `CompoundedPriceLockup`. This uses `TreatmentHeroArt`-style icon art and
 * the simpler pricing shape instead - items whose product has real
 * photography pass `image` to swap in a photo instead (see
 * `CategoryLineupItem.image`).
 */
export function SimpleCategoryLineup({
  items,
}: {
  items: readonly CategoryLineupItem[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8">
      {items.map((item) => (
        <Link
          key={item.id}
          to={item.to}
          aria-label={`Explore ${item.name}`}
          className="group flex flex-col overflow-hidden rounded-3xl bg-primary-soft shadow-lift outline-none transition-shadow hover:shadow-lift focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden">
            <div
              aria-hidden
              className="bg-mesh-glow pointer-events-none absolute inset-0 opacity-70"
            />
            {item.image ? (
              <img
                src={item.image.src}
                alt={item.image.alt}
                width={item.image.width}
                height={item.image.height}
                loading="lazy"
                className="relative z-10 h-full w-full object-contain p-6"
              />
            ) : (
              <>
                <HexMotif className="pointer-events-none absolute -left-6 -top-6 w-24 text-primary/15" />
                <HexBadge className="relative z-10 size-16">
                  <item.icon className="size-7" aria-hidden />
                </HexBadge>
              </>
            )}
          </div>
          <div className="space-y-2 px-6 pb-4 pt-5 md:px-8">
            <h3 className="text-xl font-bold text-foreground md:text-2xl">
              {item.name}
            </h3>
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-semibold text-foreground">
              {formatSimpleQuarterlyStartingAt(item.pricing)}
              {item.perDayNote ? (
                <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                  {item.perDayNote}
                </span>
              ) : null}
            </p>
            <p className="text-sm font-medium text-foreground/80">
              {item.form}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-6 pb-6 text-sm font-semibold text-accent-foreground md:px-8">
            <span>Explore {item.name}</span>
            <ArrowRight className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1" />
          </div>
        </Link>
      ))}
    </div>
  );
}
