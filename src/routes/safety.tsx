import { useEffect } from "react";
import { canonicalUrl } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ShieldCheck, AlertTriangle, Phone, ArrowRight } from "lucide-react";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  Eyebrow,
  MagneticButton,
  Section,
  SurfaceCard,
} from "@/components/site/primitives";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, qualifyHref } from "@/lib/cta-ids";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety & Eligibility — Beema Health" },
      {
        name: "description",
        content:
          "Eligibility, contraindications, side effects, and emergency warning signs explained in plain language. Clinicians make independent medical decisions.",
      },
      { property: "og:title", content: "Safety & Eligibility — Beema Health" },
      {
        property: "og:description",
        content:
          "Plain-language safety information for weight-management care.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/safety") }],
  }),
  component: SafetyPage,
});

/**
 * Gentle fade-up entrance shared by the info cards on this page. Kept
 * restrained (no rotation, modest offsets) since this is serious medical
 * content, not a playful marketing moment.
 */
function useCardMotion(reduceMotion: boolean, delay = 0) {
  return {
    initial: reduceMotion ? undefined : { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 } as const,
    transition: {
      duration: reduceMotion ? 0 : 0.55,
      delay: reduceMotion ? 0 : delay,
      ease: EASE_OUT,
    },
  };
}

function SafetyPage() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("safety");
  }, []);
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero relative overflow-hidden">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0 opacity-70"
        />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
        />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <motion.div
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE_OUT }}
          >
            <Eyebrow>Safety & eligibility</Eyebrow>
          </motion.div>
          <h2 className="mt-4 text-balance text-3xl font-bold text-foreground md:text-4xl">
            <LineReveal>Plain-language, safety, </LineReveal>
            <LineReveal delay={0.1}>no fine-print games</LineReveal>
          </h2>
          <motion.p
            className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg"
            initial={reduceMotion ? undefined : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.55,
              delay: reduceMotion ? 0 : 0.25,
              ease: EASE_OUT,
            }}
          >
            We believe you should fully understand your care. Here's how
            eligibility, reasons for not prescribing a GLP-1, and side effects
            work — in simple terms.
          </motion.p>
        </div>
      </Section>

      <Section className="pt-0">
        <div className="grid gap-6 md:grid-cols-2">
          <motion.div {...useCardMotion(Boolean(reduceMotion), 0)}>
            <SurfaceCard>
              <h3 className="text-lg font-semibold text-foreground">
                Who may be eligible
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Eligibility depends on your medical history, current health, and
                a clinician's independent evaluation. We'll calculate your BMI
                during intake and ask about conditions that affect safety.
              </p>
            </SurfaceCard>
          </motion.div>
          <motion.div {...useCardMotion(Boolean(reduceMotion), 0.08)}>
            <SurfaceCard>
              <h3 className="text-lg font-semibold text-foreground">
                Common contraindications
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Some histories may make certain medications unsafe — for example
                a personal/family history of medullary thyroid cancer or MEN2,
                pancreatitis, certain gallbladder issues, pregnancy or
                breastfeeding, or a history of eating disorders. Your clinician
                will review these carefully.
              </p>
            </SurfaceCard>
          </motion.div>
        </div>

        <motion.div
          className="mt-6"
          {...useCardMotion(Boolean(reduceMotion), 0.16)}
        >
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-foreground">
              Possible side effects
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Common side effects can include nausea, reduced appetite, and
              digestive changes, especially early in the process. Most of these
              side effects are manageable — message your care team and we'll
              help. We track side effects over time so your clinician can adjust
              your plan to optimize your results.
            </p>
          </SurfaceCard>
        </motion.div>

        <motion.div
          className="mt-6"
          {...useCardMotion(Boolean(reduceMotion), 0.24)}
        >
          <SurfaceCard className="border-destructive/40 bg-destructive/5">
            <div className="flex gap-4">
              <AlertTriangle className="size-6 shrink-0 text-destructive" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Emergency warning signs
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Seek emergency care for severe abdominal pain, persistent
                  vomiting, signs of an allergic reaction (swelling, trouble
                  breathing), or other severe symptoms.
                </p>
                <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">
                  <Phone className="size-4" /> If this is an emergency, call
                  911.
                </p>
              </div>
            </div>
          </SurfaceCard>
        </motion.div>

        <motion.div
          className="mt-6"
          {...useCardMotion(Boolean(reduceMotion), 0.32)}
        >
          <SurfaceCard className="border-primary/30 bg-primary-soft/30">
            <div className="flex gap-4">
              <ShieldCheck className="size-6 shrink-0 text-accent-foreground" />
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Clinical independence
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Clinical decisions are made independently by licensed
                  providers based on a clinical evaluation. Completing intake
                  does not guarantee a prescription, and Beema Health does not
                  influence medical judgment.
                </p>
              </div>
            </div>
          </SurfaceCard>
        </motion.div>

        <motion.div
          className="mt-10 text-center"
          initial={reduceMotion ? undefined : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{
            duration: reduceMotion ? 0 : 0.55,
            delay: reduceMotion ? 0 : 0.1,
            ease: EASE_OUT,
          }}
        >
          <MagneticButton>
            <Button asChild size="xl">
              <Link to={qualifyHref(CTA_IDS.safety)}>
                See if you qualify <ArrowRight />
              </Link>
            </Button>
          </MagneticButton>
        </motion.div>
      </Section>
    </MarketingLayout>
  );
}
