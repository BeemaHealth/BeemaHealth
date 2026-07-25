import { Link } from "@tanstack/react-router";
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
import { cn } from "@/lib/utils";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatCompoundedPriceLine,
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
        "border-primary/30 bg-primary-soft/30 text-center",
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-foreground">
        Transparent pricing
      </p>
      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-4xl font-bold text-foreground">
            ${pricing.firstMonthUsd}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">First month</p>
        </div>
        <div>
          <p className="text-4xl font-bold text-foreground">
            ${pricing.ongoingUsd}
            <span className="text-base font-medium text-muted-foreground">
              /mo
            </span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Months 2 and 3</p>
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-md text-xs leading-relaxed text-muted-foreground">
        Your first month includes a $100 early-adopter discount. Months 2 and 3,
        and any month after if you continue treatment, are priced at the
        standard ${pricing.ongoingUsd}/mo rate shown above. Medication-only cash
        pricing, with no platform membership fee. Pricing and treatment
        availability may vary based on clinical appropriateness, prescription,
        pharmacy fulfillment, and state requirements.
      </p>
    </SurfaceCard>
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
