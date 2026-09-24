import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/primitives";
import {
  ED_TADALAFIL_PER_PILL_USD,
  HAIRLOSS_FINASTERIDE_PRICING,
  formatPerPillStartingAt,
  formatSimpleStartingAt,
} from "@/lib/simple-treatment-pricing";
import edPillPhoto from "@/assets/treatments/ed-mints-tadalafil-sildenafil-rdt.webp";
import finasteridePhoto from "@/assets/treatments/finasteride-oral-tablets-bottle.webp";

/**
 * Homepage isn't only a weight-loss company (2026-08-27) - GLP-1 stays the
 * flagship showcase above (TreatmentShowcase, and every "Get Started" CTA
 * defaults to the GLP-1 intake, see cta-ids.ts DEFAULT_CTA_TARGET), but
 * Sexual Health and Hair need a real homepage presence too, not just a
 * header/footer link. This also fixes a real SEO gap: those hubs had zero
 * homepage inbound links before this.
 *
 * Wellness card removed 2026-08-28 - NAD+ and sermorelin (its only
 * products) are both paused. Add it back here once either returns. TRT is
 * also paused, so Sexual Health's description below only mentions ED.
 *
 * Real product photography (2026-09-04, per Matt) replaces the earlier
 * Lucide icon placeholders now that photos exist for these two lines - the
 * same ED Mints RDT pill shot used on /ed-mints (transparent background,
 * bee-embossed) and the finasteride bottle shot used on
 * /oral-finasteride. Weight Loss has no equivalent card in this section
 * (it gets its own TreatmentShowcase above), so there's no icon/photo
 * decision to make there.
 *
 * Sexual Health's price line switched from the monthly rate to the
 * per-pill "starting at" price (2026-09-04, per Matt) - tadalafil/
 * sildenafil are taken as-needed, not daily, so "$1.66/pill" reads better
 * here than "$49.67/mo" (same reasoning as the per-pill teaser already used
 * on the tadalafil/sildenafil money pages themselves, see
 * simple-treatment-pricing.ts's formatPerPillStartingAt docstring).
 *
 * Hair's price line was pointed at HAIRLOSS_ORAL_MINOXIDIL_PRICING, a
 * paused/non-live product (see docs/features/treatment-pages.md - only
 * Oral Finasteride is live) - fixed to HAIRLOSS_FINASTERIDE_PRICING to
 * match the finasteride bottle photo and the only product this card
 * actually links through to.
 */
const CATEGORIES = [
  {
    id: "sexual-health",
    name: "Sexual Health",
    description: "Compounded ED treatment.",
    image: edPillPhoto,
    imageAlt:
      "Beema Health ED Mints tadalafil and sildenafil rapidly dissolving tablet",
    priceLine: `From ${formatPerPillStartingAt(ED_TADALAFIL_PER_PILL_USD)}`,
    to: "/sexual-health/",
  },
  {
    id: "hair-loss",
    name: "Hair Loss",
    description: "Compounded oral and topical hair loss treatment.",
    image: finasteridePhoto,
    imageAlt:
      "Bottle of Beema Health oral finasteride tablets, generic Propecia",
    priceLine: `From ${formatSimpleStartingAt(HAIRLOSS_FINASTERIDE_PRICING)}`,
    to: "/hair-loss/",
  },
] as const;

export function WellnessLineupSection() {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="veya-container">
        <Reveal>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            More than weight loss
          </h2>
          <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
            Beema Health also offers compounded treatment for sexual health and
            hair loss, each reviewed by a licensed provider.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {CATEGORIES.map((category) => (
            <Link
              key={category.id}
              to={category.to}
              aria-label={`Explore ${category.name}`}
              className="group flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-lg font-semibold text-foreground">
                  {category.name}
                </h3>
                <img
                  src={category.image}
                  alt={category.imageAlt}
                  width={200}
                  height={200}
                  loading="lazy"
                  className="h-16 w-16 shrink-0 object-contain"
                />
              </div>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {category.description}
              </p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">
                  {category.priceLine}
                </span>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-foreground">
                  Explore
                  <ArrowRight
                    className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
                    aria-hidden
                  />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
