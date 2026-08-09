import { motion, useReducedMotion } from "motion/react";
import {
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { EASE_OUT } from "@/components/home/home-motion";
import { TRUST_SIGNALS } from "@/lib/trust-signals";
import { cn } from "@/lib/utils";

/**
 * Per-card icon color, matched to what each claim is about rather than
 * cycled mechanically: trust blue for HIPAA/security, green for
 * "verified/value" claims, brand gold for the flagship verification
 * checkmark, warm brown for "place/sourcing" claims. Kept local to this
 * component — the shared `TrustSignal` type has no color field, since
 * footer/waitlist render these icons monochrome.
 */
const ICON_COLOR_CLASSES = [
  "text-trust",
  "text-primary",
  "text-accent-foreground",
  "text-success",
  "text-accent-foreground",
] as const;

/**
 * Homepage trust band — the honest, verifiable claims from
 * `lib/trust-signals.ts` rendered as a prominent icon-card grid. Sits
 * right after the hero so trust signals land before any deeper page
 * scroll, per the site-wide "stronger trust signals" ask.
 */
export function TrustSignals() {
  const reduceMotion = useReducedMotion();

  return (
    <Section>
      <SectionHeading
        eyebrow="Why patients trust Beema Health"
        title="Built on clear standards"
      />

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {TRUST_SIGNALS.map(({ icon: Icon, label, detail }, index) => (
          <motion.div
            key={label}
            className="h-full"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            whileHover={reduceMotion ? undefined : { y: -6 }}
            transition={{
              duration: reduceMotion ? 0 : 0.5,
              delay: reduceMotion ? 0 : index * 0.08,
              ease: EASE_OUT,
            }}
          >
            <SurfaceCard className="group relative flex h-full flex-col items-center border-border/70 p-7 text-center transition-all duration-300 hover:border-primary/30 hover:shadow-lift">
              <Icon
                className={cn(
                  "size-14 transition-transform duration-300 ease-out group-hover:scale-110",
                  ICON_COLOR_CLASSES[index],
                )}
                aria-hidden
                strokeWidth={1.6}
              />
              <h3 className="mt-6 flex min-h-11 items-center text-balance text-base font-semibold leading-snug text-foreground">
                {label}
              </h3>
              <span className="mt-1.5 h-0.5 w-8 rounded-full bg-primary/35 transition-all duration-300 group-hover:w-12 group-hover:bg-primary" />
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {detail}
              </p>
            </SurfaceCard>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
