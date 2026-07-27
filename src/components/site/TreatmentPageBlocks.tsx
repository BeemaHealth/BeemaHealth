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
  promoFirstMonthUsd,
  PROMO_CODE_DISCOUNT_USD,
  PROMO_CODE_MIN_MONTHS,
  type CompoundedMedicationPricing,
} from "@/lib/medication-pricing";

/**
 * Shared building blocks for the per-medication treatment pages
 * (/tirzepatide, /semaglutide). Kept together like site/primitives.tsx —
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
        ${pricing.monthlyUsd}/mo is the standard cash-pay rate, billed monthly
        with no long-term contract. A one-time ${PROMO_CODE_DISCOUNT_USD} promo
        code brings your first month to ${promoFirstMonthUsd(pricing)},
        available only on a {PROMO_CODE_MIN_MONTHS}-month plan purchase and
        redeemable once per patient. A 1-month purchase bills at the full $
        {pricing.monthlyUsd}/mo rate with no promo code discount.
        Medication-only cash pricing, with no platform membership fee. Pricing
        and treatment availability may vary based on clinical appropriateness,
        prescription, pharmacy fulfillment, and state requirements.
      </p>
    </SurfaceCard>
  );
}

/**
 * Single-item "What's included" dropdown for the treatment page hero. Each
 * page passes its own item order (see WHATS_INCLUDED in the route files) —
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
