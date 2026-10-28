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
import nadPhoto from "@/assets/treatments/nad-injection-vial.webp";
import sermorelinPhoto from "@/assets/treatments/sermorelin-injection-vial.webp";

/**
 * Homepage isn't only a weight-loss company (2026-08-27) - GLP-1 stays the
 * flagship showcase above (TreatmentShowcase, and every "Get Started" CTA
 * defaults to the GLP-1 intake, see cta-ids.ts DEFAULT_CTA_TARGET), but
 * Sexual Health, Wellness and Hair need a real homepage presence too, not
 * just a header/footer link. This also fixes a real SEO gap: those hubs had
 * zero homepage inbound links before this.
 *
 * Order (2026-10-27, per Matt): Sexual Health, then Wellness (NAD+ and
 * sermorelin, back now that both are live), then Hair Loss on its own row
 * underneath. The Wellness card carries no price line: the homepage does not
 * restate NAD+ or sermorelin prices, each product page owns its own.
 *
 * Real product photography (2026-09-04, per Matt) replaces the earlier
 * Lucide icon placeholders - the same ED Mints RDT pill shot used on
 * /ed-mints, the finasteride bottle used on /oral-finasteride, and the NAD+
 * and sermorelin vials used on their own pages. Weight Loss has no card in
 * this section (it gets its own TreatmentShowcase above).
 *
 * Sexual Health's price line is the per-pill "starting at" price (see
 * formatPerPillStartingAt in simple-treatment-pricing.ts). Hair's price line
 * uses HAIRLOSS_FINASTERIDE_PRICING to match the finasteride photo and the
 * only live hair product this card links through to.
 */
const SEXUAL_HEALTH = {
  id: "sexual-health",
  name: "Sexual Health",
  description:
    "ED treatment: generic tadalafil and sildenafil, and compounded ED mints.",
  image: edPillPhoto,
  imageAlt:
    "Beema Health ED Mints tadalafil and sildenafil rapidly dissolving tablet",
  priceLine: `From ${formatPerPillStartingAt(ED_TADALAFIL_PER_PILL_USD)}`,
  to: "/sexual-health/",
} as const;

const WELLNESS = {
  id: "wellness",
  name: "Wellness",
  description: "Compounded NAD+ and sermorelin injections.",
  products: [
    {
      name: "NAD+",
      image: nadPhoto,
      imageAlt: "Vial of Beema Health compounded NAD+ injection",
      to: "/nad-plus/",
    },
    {
      name: "Sermorelin",
      image: sermorelinPhoto,
      imageAlt: "Vial of Beema Health compounded sermorelin injection",
      to: "/sermorelin/",
    },
  ],
} as const;

const HAIR_LOSS = {
  id: "hair-loss",
  name: "Hair Loss",
  description: "Compounded oral and topical hair loss treatment.",
  image: finasteridePhoto,
  imageAlt: "Bottle of Beema Health oral finasteride tablets, generic Propecia",
  priceLine: `From ${formatSimpleStartingAt(HAIRLOSS_FINASTERIDE_PRICING)}`,
  to: "/hair-loss/",
} as const;

const cardClass =
  "group flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function CategoryCard({
  category,
  className,
}: {
  category: typeof SEXUAL_HEALTH | typeof HAIR_LOSS;
  className?: string;
}) {
  return (
    <Link
      to={category.to}
      aria-label={`Explore ${category.name}`}
      className={`${cardClass} ${className ?? ""}`}
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
  );
}

function WellnessCard() {
  return (
    <div className="flex flex-col rounded-3xl border border-border bg-card p-6 shadow-soft">
      <h3 className="text-lg font-semibold text-foreground">{WELLNESS.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {WELLNESS.description}
      </p>
      <div className="mt-4 grid flex-1 grid-cols-2 gap-3">
        {WELLNESS.products.map((product) => (
          <Link
            key={product.name}
            to={product.to}
            aria-label={`Explore ${product.name}`}
            className="group flex flex-col items-center justify-between gap-2 rounded-2xl border border-border bg-background p-3 text-center transition-shadow hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <img
              src={product.image}
              alt={product.imageAlt}
              width={200}
              height={200}
              loading="lazy"
              className="h-20 w-20 shrink-0 object-contain"
            />
            <span className="text-sm font-semibold text-foreground">
              {product.name}
            </span>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent-foreground">
              Explore
              <ArrowRight
                className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
                aria-hidden
              />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function WellnessLineupSection() {
  return (
    <section className="bg-background py-16 md:py-24">
      <div className="veya-container">
        <Reveal>
          <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            More than weight loss
          </h2>
          <p className="mt-3 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground">
            Beema Health also offers treatment for sexual health, wellness, and
            hair loss, each reviewed by a licensed provider.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          <CategoryCard category={SEXUAL_HEALTH} />
          <WellnessCard />
          <CategoryCard category={HAIR_LOSS} className="md:col-span-2" />
        </div>
      </div>
    </section>
  );
}
