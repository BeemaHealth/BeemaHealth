import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  type CompoundedMedicationPricing,
} from "@/lib/medication-pricing";
import { CompoundedPriceLockup } from "@/components/site/CompoundedPriceLockup";
import { HexMotif } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { LineReveal, EASE_OUT } from "@/components/home/home-motion";
import { resolveVialImagery, type VialImagery } from "@/lib/treatment-imagery";

const TIRZ_STARTER = COMPOUNDED_TIRZEPATIDE_PRICING.starterPack!;

type Treatment = {
  id: string;
  /** Full product name, e.g. "Compounded Tirzepatide" - used as the panel heading. */
  name: string;
  /** Short tab label, e.g. "Tirzepatide". */
  tabLabel: string;
  form: string;
  badge: string;
  pricing: CompoundedMedicationPricing;
  imagery: VialImagery;
  /** Own indexable landing page - see docs/features/ (treatment pages). */
  to: string;
};

/**
 * Tirzepatide first (2026-09-13, per Matt): it's the default-selected tab,
 * so it leads the array too - order here is display order, not alphabetical.
 */
const TREATMENTS: Treatment[] = [
  {
    id: "compounded-tirzepatide",
    name: "Compounded Tirzepatide",
    tabLabel: "Tirzepatide",
    form: "Weekly injection, if prescribed",
    badge: "Cash-pay option",
    pricing: COMPOUNDED_TIRZEPATIDE_PRICING,
    imagery: resolveVialImagery("tirzepatide"),
    to: "/tirzepatide/",
  },
  {
    id: "compounded-semaglutide",
    name: "Compounded Semaglutide",
    tabLabel: "Semaglutide",
    form: "Weekly injection, if prescribed",
    badge: "Cash-pay option",
    pricing: COMPOUNDED_SEMAGLUTIDE_PRICING,
    imagery: resolveVialImagery("semaglutide"),
    to: "/semaglutide/",
  },
];

/**
 * GLP-1 showcase (redesigned 2026-09-13, per Matt): the old side-by-side
 * cards cropped the vial photo down to an unreadable sliver of label in a
 * short wide box - readable at a glance only if you already knew what you
 * were looking at. This replaces the two static cards with one tabbed
 * panel: pick a medication (Tirzepatide is the default), see its full,
 * uncropped bottle photo on one side and its real interactive pricing
 * selector (the same `CompoundedPriceLockup` used on the medication's own
 * page) on the other.
 */
export function TreatmentShowcase() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = useState(TREATMENTS[0]!.id);
  const active = TREATMENTS.find((t) => t.id === activeId) ?? TREATMENTS[0]!;

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -16],
  );

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-muted/40 py-16 md:py-24"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 select-none whitespace-nowrap text-center text-[18vw] font-bold leading-none text-outline-primary"
      >
        GLP-1
      </span>

      <div className="veya-container relative z-10">
        <h2 className="max-w-2xl text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
          <LineReveal>GLP-1 weight-loss options</LineReveal>
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          Transparent cash pricing on every plan. Semaglutide starts with a
          first-month promo. Tirzepatide: {TIRZ_STARTER.months}-month starter
          pack ${TIRZ_STARTER.totalUsd} for {TIRZ_STARTER.dosePathLabel}, or $
          {COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd}/mo for maintenance.
        </p>
        <p className="mt-4">
          <Link
            to="/glp-1/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-foreground underline-offset-4 hover:underline"
          >
            Explore GLP-1 care
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </p>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: reduceMotion ? 0 : 0.7, ease: EASE_OUT }}
          className="mt-12"
        >
          <div
            role="tablist"
            aria-label="Choose a GLP-1 medication"
            className="inline-flex gap-1.5 rounded-2xl bg-background/70 p-1.5 shadow-soft ring-1 ring-border/70"
          >
            {TREATMENTS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === active.id}
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  t.id === active.id
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-foreground/70 hover:bg-muted hover:text-foreground",
                )}
              >
                {t.tabLabel}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active.id}
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -14 }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
              className="mt-6 grid overflow-hidden rounded-4xl bg-primary-soft shadow-lift md:min-h-[440px] md:grid-cols-2"
            >
              <div className="relative flex min-w-0 items-center justify-center overflow-hidden p-8 md:p-10">
                <div
                  aria-hidden
                  className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 opacity-70"
                />
                <HexMotif className="pointer-events-none absolute -left-8 -top-10 w-32 text-primary/10" />
                <span className="absolute left-5 top-5 z-10 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  {active.badge}
                </span>
                <motion.img
                  src={active.imagery.src}
                  alt={active.imagery.alt}
                  width={active.imagery.width}
                  height={active.imagery.height}
                  loading="lazy"
                  style={reduceMotion ? undefined : { y: imageY }}
                  className="relative z-10 h-auto w-full max-w-[240px] object-contain drop-shadow-2xl md:max-w-[280px]"
                />
              </div>

              <div className="flex min-w-0 flex-col justify-center p-8 md:p-10 lg:p-12">
                <h3 className="text-2xl font-bold text-foreground md:text-[1.75rem]">
                  {active.name}
                </h3>
                <p className="mt-1 text-sm font-medium text-foreground/70">
                  {active.form}
                </p>
                <div className="mt-6">
                  <CompoundedPriceLockup pricing={active.pricing} size="lg" />
                </div>
                <Button asChild size="lg" className="mt-6 w-full sm:w-auto">
                  <Link to={active.to}>
                    Explore {active.name} <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-muted-foreground">
          <span className="font-medium">†</span> Listed prices are all-inclusive
          cash-pay rates (provider care, medication, supplies, and shipping), if
          prescribed. Treatment availability depends on your intake, clinical
          eligibility, and a licensed provider&apos;s independent decision.
          Compounded semaglutide and compounded tirzepatide are not FDA-approved
          and are only considered when legally available and clinically
          appropriate. Completing intake does not guarantee a prescription.
        </p>
      </div>
    </section>
  );
}
