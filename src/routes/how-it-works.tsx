import { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { canonicalUrl } from "@/lib/seo";
import {
  ArrowRight,
  ClipboardCheck,
  MessageCircle,
  RefreshCcw,
  Send,
  Stethoscope,
} from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  FloatingHexagons,
  HexBadge,
  HexMotif,
  InfinityMotif,
  MagneticButton,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, QUALIFY_PATH, qualifySearch } from "@/lib/cta-ids";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works | Beema Health" },
      {
        name: "description",
        content:
          "From a 5-minute eligibility check to licensed provider review: how Beema Health telehealth weight-loss care works, step by step.",
      },
      { property: "og:title", content: "How it works | Beema Health" },
      {
        property: "og:description",
        content:
          "A direct path from eligibility to provider review. No membership fee, no prescription guarantees.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/how-it-works") }],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Complete your eligibility check",
    text: "Answer a few brief questions about your health, location, and health goals. This takes about 5 minutes.",
  },
  {
    icon: Send,
    title: "Submit your medical intake",
    text: "Create an account and complete a secure medical questionnaire. Save at any point and continue at your convenience.",
  },
  {
    icon: Stethoscope,
    title: "Provider review",
    text: "A licensed provider reviews your intake and determines recommended treatment. Prescribing is never guaranteed.",
  },
];

const AFTER = [
  {
    icon: MessageCircle,
    title: "Stay connected",
    text: "Clear communication tracks your status and provides updates to your dashboard.",
  },
  {
    icon: RefreshCcw,
    title: "Timely Refills",
    text: "As treatment continues, refill coordination keeps your progress moving forward.",
  },
];

function HowItWorksPage() {
  const reduceMotion = useReducedMotion();

  // The page's one scroll-parallax accent: a faint hexagon drifting behind
  // the steps/ink-band/CTA column as it scrolls through the viewport.
  const stepsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: stepsRef,
    offset: ["start end", "end start"],
  });
  const hexY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, reduceMotion ? 0 : -70],
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
            as="h1"
            eyebrow="How it works"
            title={
              <>
                <LineReveal>A direct path from intake </LineReveal>
                <LineReveal delay={0.1}>to provider review</LineReveal>
              </>
            }
            description="Medication-only pricing with no platform membership fee, just the essentials from eligibility to provider review."
          />
        </div>
      </Section>

      <Section className="relative overflow-hidden pt-0">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-0 z-0 hidden w-72 text-primary/10 md:block md:w-96"
          style={reduceMotion ? undefined : { y: hexY }}
        >
          <HexMotif className="w-full" />
        </motion.div>

        <div ref={stepsRef} className="relative z-10">
          <ol className="grid w-full gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="h-full">
                <motion.div
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
                    <p className="text-sm font-semibold text-muted-foreground">
                      Step {i + 1}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <HexBadge>
                        <s.icon className="size-5" />
                      </HexBadge>
                      <h3 className="text-lg font-semibold text-foreground">
                        {s.title}
                      </h3>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {s.text}
                    </p>
                  </SurfaceCard>
                </motion.div>
              </li>
            ))}
          </ol>

          <div className="relative mt-10 overflow-hidden rounded-4xl bg-grad-ink px-6 py-10 text-ink-foreground md:px-12">
            <div
              aria-hidden
              className="bg-mesh-glow-dark mesh-drift-reverse pointer-events-none absolute inset-0 z-0"
            />
            <InfinityMotif
              animateDraw
              className="float-slow pointer-events-none absolute -bottom-6 -right-10 z-0 w-64 text-primary/20 md:w-80"
            />
            <div className="relative z-10 grid gap-6 md:grid-cols-2">
              {AFTER.map((a, i) => (
                <motion.div
                  key={a.title}
                  className="flex items-start gap-4"
                  initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{
                    duration: reduceMotion ? 0 : 0.55,
                    delay: reduceMotion ? 0 : i * 0.1,
                    ease: EASE_OUT,
                  }}
                >
                  <span className="clip-hex grid size-11 shrink-0 place-items-center bg-primary/15 text-primary">
                    <a.icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{a.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-foreground/70">
                      {a.text}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="mt-10 text-center">
            <MagneticButton>
              <Button asChild size="lg">
                <Link
                  to={QUALIFY_PATH}
                  search={qualifySearch(CTA_IDS.how_it_works)}
                >
                  See if you qualify <ArrowRight />
                </Link>
              </Button>
            </MagneticButton>
            <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">
              A licensed provider makes every clinical decision independently.
              Completing intake does not guarantee a prescription.
            </p>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}
