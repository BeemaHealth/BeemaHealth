import { ArrowRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { HexMotif, MagneticButton } from "@/components/site/primitives";
import { LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, QUALIFY_PATH, qualifySearch } from "@/lib/cta-ids";
import {
  EARLY_ADOPTER_DISCOUNT,
  WAITLIST_CTA_LABEL,
  earlyAdopterIncentiveLine,
} from "@/lib/marketing-copy";

/**
 * Closing homepage CTA — a solid-honey band with a vignette mesh and two
 * floating hexagon outlines behind an oversized "Ready to start?" reveal.
 */
export function FinalCTASection() {
  return (
    <section className="pb-16 md:pb-24">
      <div className="veya-container">
        <div className="relative overflow-hidden rounded-4xl bg-primary px-6 py-16 text-center text-primary-foreground md:px-12 md:py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-mesh-primary-depth mesh-drift"
          />
          <HexMotif className="float-slow pointer-events-none absolute -left-8 -top-8 w-40 text-primary-foreground/10 md:w-56" />
          <HexMotif className="float-slower pointer-events-none absolute -bottom-10 -right-8 w-48 text-primary-foreground/10 md:w-64" />

          <div className="relative">
            <h2 className="text-balance text-4xl font-bold md:text-6xl lg:text-7xl">
              <LineReveal>Ready to start?</LineReveal>
            </h2>

            <p className="mx-auto mt-6 max-w-xl text-pretty text-base leading-relaxed text-primary-foreground/80 md:text-lg">
              Join the waitlist in about a minute. {earlyAdopterIncentiveLine()}{" "}
              when we launch. No payment required to start, and no prescription
              is guaranteed.
            </p>

            <MagneticButton className="mt-8">
              <Button
                asChild
                size="xl"
                className="bg-ink text-ink-foreground hover:bg-ink/85"
              >
                <Link
                  to={QUALIFY_PATH}
                  search={qualifySearch(CTA_IDS.home_mid)}
                >
                  {WAITLIST_CTA_LABEL}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </MagneticButton>
            <p className="mt-4 text-sm font-semibold text-primary-foreground">
              Waitlist perk: {EARLY_ADOPTER_DISCOUNT}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
