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
import {
  ArrowRight,
  ClipboardCheck,
  MessageCircle,
  Pill,
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
import { TreatmentBreadcrumb } from "@/components/site/TreatmentPageBlocks";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";

const TITLE = "How it works | Beema Health";
const DESCRIPTION =
  "From a 5-minute eligibility check to licensed provider review: how Beema Health telehealth weight-loss care works, step by step.";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      {
        property: "og:description",
        content:
          "A direct path from eligibility to provider review. No membership fee, no prescription guarantees.",
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

const STEPS_TOTAL = 5;

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Complete your eligibility check",
    text: "Answer a short set of questions about your health history, weight-loss goals, and where you live. This eligibility check takes about 5 minutes and screens for factors that could make GLP-1 treatment inadvisable, before you create an account or share more detailed medical information. There's no payment required and no commitment to continue — it's the fastest way to find out whether telehealth weight-loss care through Beema Health is a realistic option based on your state, your goals, and basics like your BMI. If your initial answers indicate treatment likely isn't a fit, or Beema doesn't yet serve your state, we'll let you know clearly rather than routing you further into a process that isn't right for you.",
  },
  {
    icon: Send,
    title: "Submit your medical intake",
    text: "If the eligibility check suggests you may be a fit, create a secure account and complete a more detailed medical questionnaire covering your health history, current medications, allergies, and any prior weight-loss treatment. Save your progress at any point and finish at your own pace. Expect questions about medication dosages, known allergies, and any conditions that could affect eligibility — because your provider's decision is based entirely on what you submit here, complete and accurate answers matter more than speed.",
  },
  {
    icon: Stethoscope,
    title: "Licensed provider review",
    text: "An independently licensed provider — never an algorithm — reviews your intake and evaluates your health history, medications, and eligibility factors like BMI to decide whether a GLP-1 treatment plan may be clinically appropriate for you. This is an individualized medical judgment, and it's never guaranteed: some patients aren't good candidates, and a provider may decline to prescribe or ask for more information. If they need anything else from you, they'll ask directly through your dashboard rather than declining outright. See our safety and eligibility page for more on what's reviewed.",
  },
  {
    icon: Pill,
    title: "Prescription decision and pharmacy fulfillment",
    text: "If your provider determines treatment is clinically appropriate, your prescription moves to a licensed pharmacy for fulfillment. For compounded medications like compounded semaglutide or compounded tirzepatide, a licensed compounding pharmacy prepares your specific dose; other medications ship from a licensed dispensing pharmacy. Expedited shipping means your medication typically arrives without you having to coordinate separate deliveries, and you'll see the status move from provider approval to pharmacy processing to shipment in your dashboard. Exact timing depends on your provider's review and pharmacy processing, so we can't promise a specific delivery date — and, as with every step here, prescribing is never guaranteed.",
  },
];

const AFTER = [
  {
    icon: MessageCircle,
    title: "Stay connected",
    text: "Clear communication tracks your status and provides updates to your dashboard, so you always know where things stand — whether your intake is under review, your prescription is being filled, or your next refill is on the way. If your provider needs more information or your circumstances change, you'll hear from your care team directly rather than being left to guess.",
  },
  {
    icon: RefreshCcw,
    title: "Timely refills",
    text: "As treatment continues, refill coordination keeps your progress moving forward instead of leaving you to track pharmacy timing yourself. Your provider can also reassess your plan over time — adjusting dosage or addressing side effects — based on how you're responding, so care stays personalized rather than a one-time prescription with nothing after.",
  },
];

function HowItWorksPage() {
  const cta = resolveCta(CTA_IDS.how_it_works);
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
          <div className="mb-6 flex justify-center">
            <TreatmentBreadcrumb current="How It Works" />
          </div>
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
          {/*
              LCP-critical: this became the page's largest text block after
              an earlier round's content expansion, so it's the measured LCP
              element. A whileInView reveal delays first paint on
              IntersectionObserver + JS hydration timing — same fix already
              applied to the hero text and to safety.tsx's clinical-oversight
              card. Unanimated here.
            */}
          <p className="mx-auto max-w-2xl text-center text-base leading-relaxed text-muted-foreground">
            Getting started with Beema Health follows {STEPS_TOTAL} steps, from
            your first eligibility check to ongoing care after treatment begins.
            Here&rsquo;s exactly what happens at each stage, in the order it
            happens — no platform membership fee, no hidden steps, and no
            guaranteed prescription along the way.
          </p>

          <ol className="mt-10 grid w-full gap-5 md:grid-cols-2 lg:grid-cols-4">
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
                      Step {i + 1} of {STEPS_TOTAL}
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <HexBadge>
                        <s.icon className="size-5" />
                      </HexBadge>
                      <h2 className="text-lg font-semibold text-foreground">
                        {s.title}
                      </h2>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {s.text}
                    </p>
                  </SurfaceCard>
                </motion.div>
              </li>
            ))}
          </ol>

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
                It depends. The eligibility check itself takes about 5 minutes,
                but some patients also finish the medical intake in one sitting
                while others take longer to gather medication and health history
                details first. Provider review and pharmacy fulfillment happen
                after that, and both depend on factors outside our control —
                provider volume, your state&rsquo;s requirements, and how
                quickly a pharmacy can prepare your medication. We intentionally
                don&rsquo;t promise a specific number of days for the whole
                process, because doing so before a licensed provider has
                evaluated your case would get ahead of a medical decision that
                has to stay independent.
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
              eyebrow={`Step ${STEPS_TOTAL} of ${STEPS_TOTAL}`}
              title="Ongoing follow-up care"
              description="Treatment doesn't stop once your first prescription ships. Your care team and dashboard keep working with you as your treatment continues — tracking status, coordinating refills, and staying available if your provider needs to check in or adjust your plan."
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
        </div>
      </Section>
    </MarketingLayout>
  );
}
