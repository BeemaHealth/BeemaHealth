import { Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
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
import { SurfaceCard } from "@/components/site/primitives";
import { CompoundedPriceLockup } from "@/components/site/CompoundedPriceLockup";
import { cn } from "@/lib/utils";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatCompoundedPriceLine,
  formatUsd,
  getPlan,
  hasStarterPack,
  promoFirstMonthUsd,
  PROMO_CODE_DISCOUNT_USD,
  starterPackTitle,
  STARTER_PACK_INTAKE_HINT,
  type CompoundedMedicationPricing,
} from "@/lib/medication-pricing";

/**
 * Shared building blocks for the per-medication treatment pages
 * (/tirzepatide, /semaglutide). Kept together like site/primitives.tsx -
 * small, page-agnostic pieces; copy/data stays local to each route file.
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

export function TreatmentPricingCard({
  pricing,
  className,
}: {
  pricing: CompoundedMedicationPricing;
  className?: string;
}) {
  return (
    <SurfaceCard
      className={cn(
        "border-primary/30 bg-primary-soft/30 text-left",
        className,
      )}
    >
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
    </SurfaceCard>
  );
}

/**
 * Single-item "What's included" dropdown for the treatment page hero. Each
 * page passes its own item order (see WHATS_INCLUDED in the route files) -
 * deliberately not a shared constant, so the two pages don't render an
 * identical list in an identical order.
 */
export function TreatmentIncludedDropdown({
  items,
  className,
}: {
  items: readonly string[];
  className?: string;
}) {
  return (
    <Accordion type="single" collapsible className={cn("w-full", className)}>
      <AccordionItem
        value="whats-included"
        className="rounded-2xl border border-border bg-card px-5"
      >
        <AccordionTrigger className="text-left text-sm font-semibold text-foreground">
          What&apos;s included
        </AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-2 pt-1">
            {items.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                {item}
              </li>
            ))}
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

/** Tirzepatide vs. semaglutide comparison table. `highlight` bolds one column's header. */
export function TreatmentComparisonTable({
  highlight,
}: {
  highlight?: "tirzepatide" | "semaglutide";
}) {
  const headCls = (id: "tirzepatide" | "semaglutide") =>
    cn(highlight === id && "text-foreground");

  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/4"></TableHead>
            <TableHead className={headCls("tirzepatide")}>
              Compounded Tirzepatide
            </TableHead>
            <TableHead className={headCls("semaglutide")}>
              Compounded Semaglutide
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium text-foreground">
              Active medication
            </TableCell>
            <TableCell>Tirzepatide</TableCell>
            <TableCell>Semaglutide</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium text-foreground">
              Mechanism (high level)
            </TableCell>
            <TableCell>Dual GLP-1/GIP receptor agonist</TableCell>
            <TableCell>GLP-1 receptor agonist</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium text-foreground">
              Appropriateness
            </TableCell>
            <TableCell>Decided individually by a licensed provider</TableCell>
            <TableCell>Decided individually by a licensed provider</TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium text-foreground">
              Beema starting price
            </TableCell>
            <TableCell>
              {formatCompoundedPriceLine(COMPOUNDED_TIRZEPATIDE_PRICING)}
            </TableCell>
            <TableCell>
              {formatCompoundedPriceLine(COMPOUNDED_SEMAGLUTIDE_PRICING)}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
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
