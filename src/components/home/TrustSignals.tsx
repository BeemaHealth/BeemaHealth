import { motion, useReducedMotion } from "motion/react";
import {
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { EASE_OUT } from "@/components/home/home-motion";
import { TRUST_SIGNALS } from "@/lib/trust-signals";

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
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              duration: reduceMotion ? 0 : 0.5,
              delay: reduceMotion ? 0 : index * 0.08,
              ease: EASE_OUT,
            }}
          >
            <SurfaceCard className="flex h-full flex-col p-6">
              <Icon className="size-6 text-accent-foreground" aria-hidden />
              <h3 className="mt-4 text-base font-semibold text-foreground">
                {label}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                {detail}
              </p>
            </SurfaceCard>
          </motion.div>
        ))}
      </div>
    </Section>
  );
}
