import { useRef } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import {
  breadcrumbJsonLd,
  canonicalUrl,
  medicalWebPageJsonLd,
} from "@/lib/seo";
import { ArrowRight, MessageCircle, RefreshCcw } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  FloatingHexagons,
  HexMotif,
  InfinityMotif,
  MagneticButton,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import {
  HOW_IT_WORKS_STEPS_TOTAL,
  HowItWorksSteps,
} from "@/components/site/HowItWorksSteps";
import { TreatmentBreadcrumb } from "@/components/site/TreatmentPageBlocks";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

const TITLE = "How it works | Beema Health";
const DESCRIPTION =
  "From medical intake to prescription delivery: how Beema Health telehealth weight-loss care works, step by step.";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      {
        property: "og:description",
        content:
          "A direct path from intake to prescription delivery. No membership fee, no prescription guarantees.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/how-it-works") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "How It Works", path: "/how-it-works" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          medicalWebPageJsonLd({
            name: "How Beema Health's Telehealth Weight-Loss Care Works",
            description: DESCRIPTION,
            path: "/how-it-works",
            reviewedByClinicalLead: true,
            dateModified: "2026-07-31",
          }),
        ),
      },
    ],
  }),
  component: HowItWorksPage,
});

/** What happens after a provider approves treatment, once the prescription has shipped (step 3 of HowItWorksSteps). */
const AFTER = [
  {
    icon: MessageCircle,
    title: "Stay connected",
    text: `Clear communication tracks your status and provides updates to your dashboard, so you always know where things stand: whether your intake is under review, your prescription is being filled, or your next refill is on the way. ${patientQuestionsGuidance()} If your provider needs more information or your circumstances change, you'll hear from your care team directly rather than being left to guess.`,
  },
  {
    icon: RefreshCcw,
    title: "Timely refills",
    text: "As treatment continues, refill coordination keeps your progress moving forward instead of leaving you to track pharmacy timing yourself. Your provider can also reassess your plan over time, adjusting dosage or addressing side effects, based on how you're responding, so care stays personalized rather than a one-time prescription with nothing after.",
  },
];

function HowItWorksPage() {
  const cta = resolveCta(CTA_IDS.how_it_works);
  const reduceMotion = useReducedMotion();

  // The page's one scroll-parallax accent: a faint hexagon drifting behind
  // the intro text as it scrolls through the viewport.
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
          <div className="mb-6 flex justify-center">
            <TreatmentBreadcrumb current="How It Works" />
          </div>
          <SectionHeading
            as="h1"
            eyebrow="How it works"
            title={
              <>
                <LineReveal>A direct path from intake </LineReveal>
                <LineReveal delay={0.1}>to your door</LineReveal>
              </>
            }
            description="All-inclusive cash-pay pricing with no platform membership fee, from your medical intake to prescription delivery, when treatment is appropriate."
          />
        </div>
      </Section>

      <div ref={stepsRef} className="relative">
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -right-16 top-0 z-0 hidden w-72 text-primary/10 md:block md:w-96"
          style={reduceMotion ? undefined : { y: hexY }}
        >
          <HexMotif className="w-full" />
        </motion.div>

        <HowItWorksSteps />

        <Section className="relative overflow-hidden pt-0">
          <motion.div
            className="mt-8"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE_OUT }}
          >
            <SurfaceCard className="mx-auto max-w-3xl p-6 md:p-8">
              <p className="text-base font-semibold text-foreground">
                How long does this take?
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                It depends. Some patients finish the medical intake in one
                sitting, while others take longer to gather medication and
                health history details first. Provider review and pharmacy
                fulfillment happen after that, and both depend on factors
                outside our control: provider volume, your state&rsquo;s
                requirements, and how quickly a pharmacy can prepare your
                medication. We intentionally don&rsquo;t promise a specific
                number of days for the whole process, because doing so before a
                licensed provider has evaluated your case would get ahead of a
                medical decision that has to stay independent.
              </p>
            </SurfaceCard>
          </motion.div>

          <motion.div
            className="mt-10"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reduceMotion ? 0 : 0.55, ease: EASE_OUT }}
          >
            <SectionHeading
              eyebrow="Ongoing care"
              title="Care doesn't stop at delivery"
              description="Once your prescription ships, your care team and dashboard keep working with you throughout treatment: tracking status, coordinating refills, and staying available if your provider needs to check in or adjust your plan."
            />
          </motion.div>

          <div className="relative mt-6 overflow-hidden rounded-4xl bg-grad-ink px-6 py-10 text-ink-foreground md:px-12">
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
                <Link to={cta.to} search={cta.search}>
                  {cta.label} <ArrowRight />
                </Link>
              </Button>
            </MagneticButton>
            <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-muted-foreground">
              A licensed provider makes every clinical decision independently,
              based on your intake and applicable state law. Completing intake
              does not guarantee a prescription, and Beema does not influence or
              override any provider&rsquo;s clinical judgment.
            </p>
          </div>
        </Section>
      </div>
    </MarketingLayout>
  );
}
