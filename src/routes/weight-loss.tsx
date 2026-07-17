import { useEffect, useRef } from "react";
import { canonicalUrl } from "@/lib/seo";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Scale,
  Stethoscope,
  Syringe,
} from "lucide-react";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { TreatmentLineup } from "@/components/site/TreatmentLineup";
import {
  FloatingHexagons,
  HexBadge,
  HexMotif,
  MagneticButton,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, QUALIFY_PATH, qualifySearch } from "@/lib/cta-ids";

export const Route = createFileRoute("/weight-loss")({
  head: () => ({
    meta: [
      { title: "Weight Loss — Beema Health" },
      {
        name: "description",
        content:
          "Medical weight-loss care with Zepbound, Wegovy, and affordable compounded options when clinically appropriate. Reviewed by licensed providers.",
      },
      { property: "og:title", content: "Weight Loss — Beema Health" },
      {
        property: "og:description",
        content:
          "Provider-reviewed GLP-1 weight-loss options with clear pricing and follow-through.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/weight-loss") }],
  }),
  component: WeightLossPage,
});

const BENEFITS = [
  {
    icon: Stethoscope,
    title: "Licensed provider review",
    text: "Every patient is reviewed by a licensed clinician who makes independent medical decisions.",
  },
  {
    icon: Syringe,
    title: "Proven GLP-1 pathways",
    text: "Compounded Semaglutide and Compounded Tirzepatide when clinically appropriate and legally available.",
  },
  {
    icon: Scale,
    title: "Built for follow-through",
    text: "Refill coordination, progress tracking, and ongoing support from first visit to success — not just a one-time script.",
  },
];

function WeightLossPage() {
  useEffect(() => {
    trackPageViewed("weight_loss");
  }, []);

  const reduceMotion = useReducedMotion();

  // The page's one scroll-parallax accent: a faint hexagon drifting behind
  // the "who this is for" card as it scrolls through the viewport.
  const whoRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: whoRef,
    offset: ["start end", "end start"],
  });
  const hexY = useTransform(
    scrollYProgress,
    [0, 1],
    [reduceMotion ? 0 : 50, reduceMotion ? 0 : -50],
  );

  return (
    <MarketingLayout>
      <Section className="relative overflow-hidden bg-grad-hero">
        <div
          aria-hidden
          className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 z-0"
        />
        <div
          aria-hidden
          className="bg-grain pointer-events-none absolute inset-0 z-0 text-foreground/[0.035]"
        />
        <FloatingHexagons className="z-0" />
        <div className="relative z-10">
          <SectionHeading
            eyebrow="Medical weight loss"
            title={
              <>
                <LineReveal>GLP-1 care guided by </LineReveal>
                <LineReveal delay={0.1}>medical professionals</LineReveal>
              </>
            }
            description="Beema Health focuses on evidence-based weight-loss treatments — reviewed by licensed providers, with clear, transparent pricing"
          />
          <motion.div
            className="mt-10 text-center"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              delay: reduceMotion ? 0 : 0.55,
              ease: EASE_OUT,
            }}
          >
            <MagneticButton>
              <Button asChild size="xl">
                <Link
                  to={QUALIFY_PATH}
                  search={qualifySearch(CTA_IDS.weight_loss_hero)}
                >
                  See if you qualify <ArrowRight />
                </Link>
              </Button>
            </MagneticButton>
          </motion.div>
        </div>
      </Section>

      <TreatmentLineup />

      <Section>
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        >
          <SectionHeading
            eyebrow="Why Beema Health"
            title="Weight-loss care that respects your time and trust"
            description="No hype, no fake urgency — just a calm path from eligibility to provider review."
          />
        </motion.div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.title}
              className="h-full"
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, y: 32, rotate: i % 2 === 0 ? -1.5 : 1.5 }
              }
              whileInView={
                reduceMotion ? undefined : { opacity: 1, y: 0, rotate: 0 }
              }
              viewport={{ once: true, amount: 0.3 }}
              whileHover={reduceMotion ? undefined : { y: -6 }}
              transition={{
                duration: reduceMotion ? 0 : 0.55,
                delay: reduceMotion ? 0 : i * 0.1,
                ease: EASE_OUT,
              }}
            >
              <SurfaceCard className="flex h-full flex-col p-6 transition-shadow hover:shadow-lift">
                <HexBadge className="size-11">
                  <b.icon className="size-5" />
                </HexBadge>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {b.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {b.text}
                </p>
              </SurfaceCard>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section className="relative overflow-hidden bg-muted/40 pt-0">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -left-16 top-1/2 z-0 hidden w-72 -translate-y-1/2 text-primary/10 md:block md:w-96"
          style={reduceMotion ? undefined : { y: hexY }}
        >
          <HexMotif className="w-full" />
        </motion.div>
        <motion.div
          ref={whoRef}
          className="relative z-10"
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        >
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-foreground">
              Who this is for
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Beema Health is here for adults seeking medical weight-loss
              support. During your eligibility check, we review BMI, health
              history, and any factors that might make a GLP-1 treatment plan
              inadvisable. A licensed provider decides whether treatment may be
              appropriate — prescribing is never guaranteed.
            </p>
            <ul className="mt-5 space-y-2">
              {[
                "Adults 18 and older",
                "Adults with BMI and health history suitable for review",
                "Patients seeking cash-pay compounded Semaglutide or Tirzepatide options",
              ].map((t, i) => (
                <motion.li
                  key={t}
                  className="flex items-start gap-2 text-sm text-foreground"
                  initial={reduceMotion ? false : { opacity: 0, x: -12 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.5 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.4,
                    delay: reduceMotion ? 0 : i * 0.08,
                    ease: EASE_OUT,
                  }}
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                  {t}
                </motion.li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <MagneticButton>
                <Button asChild variant="outline">
                  <Link to="/safety/">Safety & eligibility</Link>
                </Button>
              </MagneticButton>
              {/* Pricing page disabled — pricing model not finalized yet.
              <Button asChild variant="outline">
                <Link to="/pricing/">See pricing</Link>
              </Button>
              */}
            </div>
          </SurfaceCard>
        </motion.div>
      </Section>

      <Section className="pt-0">
        <div className="relative overflow-hidden rounded-4xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
          <div
            aria-hidden
            className="bg-mesh-primary-depth mesh-drift pointer-events-none absolute inset-0 z-0"
          />
          <HexMotif className="float-slow pointer-events-none absolute -left-8 -top-8 z-0 w-40 text-primary-foreground/10 md:w-56" />
          <HexMotif className="float-slower pointer-events-none absolute -bottom-10 -right-8 z-0 w-48 text-primary-foreground/10 md:w-64" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold">
              <LineReveal>Ready to see if you qualify?</LineReveal>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              The eligibility check takes about 5 minutes. No payment required
              to start.
            </p>
            <MagneticButton className="mt-8">
              <Button
                asChild
                size="xl"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link
                  to={QUALIFY_PATH}
                  search={qualifySearch(CTA_IDS.weight_loss_footer)}
                >
                  See if you qualify <ArrowRight />
                </Link>
              </Button>
            </MagneticButton>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}
