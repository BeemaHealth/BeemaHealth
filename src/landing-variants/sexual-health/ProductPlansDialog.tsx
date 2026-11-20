import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FullScreenMobileDialogContent } from "@/components/site/FullScreenMobileDialog";
import type { resolveCta } from "@/lib/cta-ids";
import { formatUsd } from "@/lib/medication-pricing";
import type { ProductPricing } from "./pricing";

/**
 * "All doses and plans" button for a product card. Opens a popup with the
 * dose-by-dose 3-month and 1-month prices and a "Get started with <drug>"
 * button that goes straight to that drug's questionnaire. The CTA comes from
 * resolveCta() with the product's sexual_health_* id, so the handoff carries
 * that cta_id and the page-wide stamp adds src_page.
 */
export function ProductPlansDialog({
  name,
  pricing,
  cta,
}: {
  name: string;
  pricing: ProductPricing;
  cta: ReturnType<typeof resolveCta>;
}) {
  const [open, setOpen] = useState(false);
  const groups = [
    { label: "3-month plan", lines: pricing.quarterly },
    { label: "1-month plan", lines: pricing.monthly },
  ] as const;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="mt-4 h-11 w-full"
        onClick={() => setOpen(true)}
      >
        All doses and plans
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <FullScreenMobileDialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl sm:text-3xl">
              {name} doses and plans
            </DialogTitle>
            <DialogDescription className="text-center">
              Cash-pay when prescribed. Your provider decides the dose.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <ul className="mt-2 divide-y divide-border rounded-2xl border border-border">
                  {group.lines.map((line) => (
                    <li
                      key={line.dose}
                      className="flex items-baseline justify-between gap-3 px-4 py-3 text-sm"
                    >
                      <span className="text-foreground">
                        {line.dose}
                        {line.tablets ? (
                          <span className="text-muted-foreground">
                            {" "}
                            &middot; {line.tablets} tablets
                          </span>
                        ) : null}
                      </span>
                      <span className="text-base font-bold text-foreground">
                        {formatUsd(line.usd)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Pinned to the bottom of the full-screen sheet so it sits in thumb reach on a phone. */}
          <div className="mt-auto space-y-3 pb-2">
            <Button asChild size="xl" className="w-full">
              <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
                Get started with {name} <ArrowRight />
              </Link>
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              You won&apos;t be charged anything if you&apos;re not prescribed.
              Completing intake does not guarantee a prescription.
            </p>
          </div>
        </FullScreenMobileDialogContent>
      </Dialog>
    </>
  );
}
