import { motion, useReducedMotion } from "motion/react";
import { BadgeDollarSign, Headset, Stethoscope } from "lucide-react";
import { Section } from "@/components/site/primitives";
import { EASE_OUT } from "@/components/home/home-motion";
import { SUPPORT_HOURS_DISPLAY } from "@/lib/contact-info";
import { TRUST_SIGNALS } from "@/lib/trust-signals";

/**
 * The three headline reasons to trust Beema Health, in the left-aligned
 * accent-bar + three-column format. Copy sticks to claims that are true
 * today: cash pricing with no hidden fees, a human support team on stated
 * hours, and provider-reviewed care where a prescription is never promised.
 */
const PILLARS = [
  {
    icon: BadgeDollarSign,
    title: "Pricing without the fine print",
    text: "You see the full cost before you check out. Our cash pricing is posted up front, with no hidden fees added later.",
  },
  {
    icon: Stethoscope,
    title: "Care led by licensed providers",
    text: "A licensed provider looks over each intake and decides if treatment fits your health. Compounded medications are prepared by USA 503A-licensed pharmacies.",
  },
  {
    icon: Headset,
    title: "A real person when you need one",
    text: `Our care team is here ${SUPPORT_HOURS_DISPLAY.replace("Every day, ", "every day, ")}. Refill and plan questions are answered by a member of our team.`,
  },
] as const;

/**
 * Pillars already covered by the three columns above, so they are not
 * repeated in the verified-claims row.
 */
const COVERED_BY_PILLARS = new Set(["Transparent pricing"]);

/**
 * Homepage trust band. Sits right after the hero so trust signals land
 * before any deeper page scroll: the three pillars first, then the verified
 * claims from `lib/trust-signals.ts` as a compact row directly beneath.
 */
export function TrustSignals() {
  const reduceMotion = useReducedMotion();
  const claims = TRUST_SIGNALS.filter(
    ({ label }) => !COVERED_BY_PILLARS.has(label),
  );

  return (
    <Section>
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-12 w-2 rounded-full bg-primary" />
        <h2 className="text-3xl font-bold text-foreground md:text-4xl">
          Why Trust Beema Health
        </h2>
      </div>

      <div className="mt-10 grid gap-10 md:grid-cols-3 md:gap-8">
        {PILLARS.map(({ icon: Icon, title, text }, index) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{
              duration: reduceMotion ? 0 : 0.5,
              delay: reduceMotion ? 0 : index * 0.08,
              ease: EASE_OUT,
            }}
          >
            <div className="flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
                <Icon className="size-7" aria-hidden strokeWidth={1.6} />
              </span>
              <h3 className="text-balance text-lg font-semibold leading-snug text-accent-foreground">
                {title}
              </h3>
            </div>
            <p className="mt-4 text-pretty text-sm leading-relaxed text-foreground/80 md:text-base">
              {text}
            </p>
          </motion.div>
        ))}
      </div>

      <ul className="mt-12 grid gap-3 border-t border-border pt-8 sm:grid-cols-2 lg:grid-cols-4">
        {claims.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-3 text-sm font-medium text-foreground"
          >
            <Icon
              className="size-5 shrink-0 text-accent-foreground"
              aria-hidden
            />
            {label}
          </li>
        ))}
      </ul>
    </Section>
  );
}
