import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  Send,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { canonicalUrl, breadcrumbJsonLd, faqPageJsonLd } from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  FloatingHexagons,
  HexBadge,
  MagneticButton,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import {
  TreatmentBreadcrumb,
  TreatmentComparisonTable,
  TreatmentFaqSection,
  TreatmentPricingCard,
  type TreatmentFaqItem,
} from "@/components/site/TreatmentPageBlocks";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  compoundedMonthlyPricingSentence,
  promoFirstMonthUsd,
} from "@/lib/medication-pricing";
import compoundedSemaglutideVialImg from "@/assets/treatments/compounded-semaglutide-vial.png";

const TITLE = "Compounded Semaglutide for Weight Loss | Beema Health";
const DESCRIPTION = `Compounded semaglutide for medical weight loss, personalized by licensed providers. Nationwide telehealth care at $${COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd}/mo. Prescribing is never guaranteed.`;

const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is compounded semaglutide?",
    a: "Compounded semaglutide is semaglutide prepared by a licensed compounding pharmacy rather than sold under a brand name. It's used in medical weight-management care only when legally available and clinically appropriate, and it's a different product from an FDA-approved branded medication.",
  },
  {
    q: "Is semaglutide right for me?",
    a: "It depends on your BMI, health history, current medications, and your provider's independent clinical judgment during intake. Not everyone who applies will be prescribed semaglutide.",
  },
  {
    q: "How does online semaglutide care through Beema work?",
    a: "You start with a short eligibility check, create an account, and complete a medical intake questionnaire. A licensed provider then reviews your information and makes an independent decision about your care.",
  },
  {
    q: "How much does semaglutide cost through Beema?",
    a: `${compoundedMonthlyPricingSentence("Compounded semaglutide through Beema", COMPOUNDED_SEMAGLUTIDE_PRICING)} It's medication-only cash pricing with no platform membership fee. Your provider's dosage recommendation can affect the final cost.`,
  },
  {
    q: "Does Beema serve patients nationwide?",
    a: "Yes, Beema is built as a nationwide telehealth platform. That said, medication availability still depends on your state's rules and pharmacy fulfillment, and eligibility is always an individual clinical decision.",
  },
  {
    q: "Is compounded semaglutide FDA-approved?",
    a: "No. Compounded semaglutide is not FDA-approved. It's considered only when legally available and clinically appropriate, and it should not be assumed to be identical to an FDA-approved branded medication.",
  },
  {
    q: "How quickly can treatment begin?",
    a: "It depends on how quickly you finish intake, how fast your provider can review it, and pharmacy fulfillment timing. We can't guarantee a specific start date or that treatment will be approved at all.",
  },
];

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "See if you qualify",
    text: "A short set of questions about your health, location, and goals, about 5 minutes.",
  },
  {
    icon: Send,
    title: "Complete your medical intake",
    text: "Create your account and fill out a secure questionnaire, save your progress anytime.",
  },
  {
    icon: Stethoscope,
    title: "Your provider reviews your case",
    text: "A licensed provider independently decides whether semaglutide may be appropriate for you.",
  },
];

const ELIGIBILITY_POINTS = [
  "Adults 18 and older",
  "Eligibility considers BMI, health history, and current medications",
  "Final approval rests with a licensed provider and depends on applicable state law",
];

export const Route = createFileRoute("/semaglutide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/semaglutide") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/semaglutide") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Compounded Semaglutide", path: "/semaglutide" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(FAQ_ITEMS)),
      },
    ],
  }),
  component: SemaglutidePage,
});

function SemaglutidePage() {
  const heroCta = resolveCta(CTA_IDS.semaglutide_hero);
  const footerCta = resolveCta(CTA_IDS.semaglutide_footer);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("semaglutide");
  }, []);

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
          <TreatmentBreadcrumb current="Compounded Semaglutide" />
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <SectionHeading
                as="h1"
                align="left"
                eyebrow="Nationwide telehealth weight-loss care"
                title={
                  <>
                    <LineReveal>Compounded Semaglutide, </LineReveal>
                    <LineReveal delay={0.1}>
                      personalized around you.
                    </LineReveal>
                  </>
                }
                description="Beema Health connects eligible adults with independent licensed providers for individualized medical weight-management care. Completing intake does not guarantee a prescription."
                className="mx-0 max-w-xl text-left"
              />
              <motion.div
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.6,
                  delay: reduceMotion ? 0 : 0.4,
                  ease: EASE_OUT,
                }}
              >
                <MagneticButton>
                  <Button asChild size="xl">
                    <Link to={heroCta.to} search={heroCta.search}>
                      {heroCta.label} <ArrowRight />
                    </Link>
                  </Button>
                </MagneticButton>
                <Button asChild size="xl" variant="outline">
                  <Link to="/how-it-works/">How it works</Link>
                </Button>
              </motion.div>
              <div className="mt-6 text-sm text-foreground">
                <span className="font-semibold">
                  ${COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd}/month
                </span>{" "}
                <span className="text-muted-foreground">
                  · or ${promoFirstMonthUsd(COMPOUNDED_SEMAGLUTIDE_PRICING)}{" "}
                  first month with a one-time 3-month promo code
                </span>
              </div>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                Medication eligibility and availability are determined by a
                licensed provider and applicable law.
              </p>
            </div>
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
              animate={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
              transition={{
                duration: reduceMotion ? 0 : 0.7,
                delay: reduceMotion ? 0 : 0.2,
                ease: EASE_OUT,
              }}
              className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-4xl bg-primary-soft shadow-lift"
            >
              <img
                src={compoundedSemaglutideVialImg}
                alt="Beema Health compounded semaglutide injection vial"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            </motion.div>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        >
          <SectionHeading
            align="left"
            title="What is semaglutide?"
            className="mx-0 max-w-2xl"
          />
        </motion.div>
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Semaglutide is a GLP-1 medication used in medical weight-management
            care. Like tirzepatide, it comes in an FDA-approved branded form
            and, separately, as a compounded version made by a licensed
            compounding pharmacy.
          </p>
          <p>
            Compounded semaglutide is a different product from the branded
            version, it is not FDA-approved and is considered only when legally
            available and clinically appropriate. Whether it's an appropriate
            option for you is a decision your licensed provider makes
            individually.
          </p>
        </div>
      </Section>

      <Section className="bg-muted/40 pt-0">
        <SectionHeading
          align="left"
          title="How Beema's semaglutide care works"
          className="mx-0 max-w-2xl"
        />
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
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
      </Section>

      <Section className="pt-0">
        <div className="grid gap-10 lg:grid-cols-2">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
          >
            <SurfaceCard className="h-full">
              <h3 className="text-lg font-semibold text-foreground">
                Who may be eligible
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Not everyone qualifies for semaglutide. Your provider weighs
                BMI, health history, current medications, and applicable state
                law before making an independent decision.
              </p>
              <ul className="mt-5 space-y-2">
                {ELIGIBILITY_POINTS.map((t) => (
                  <li
                    key={t}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                    {t}
                  </li>
                ))}
              </ul>
            </SurfaceCard>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              delay: reduceMotion ? 0 : 0.1,
              ease: EASE_OUT,
            }}
          >
            <TreatmentPricingCard
              pricing={COMPOUNDED_SEMAGLUTIDE_PRICING}
              className="h-full"
            />
          </motion.div>
        </div>
      </Section>

      <Section className="bg-muted/40 pt-0">
        <SectionHeading
          align="left"
          title="Safety and important information"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <SurfaceCard>
            <div className="flex gap-4">
              <ShieldCheck className="size-6 shrink-0 text-accent-foreground" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Prescription medical care
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Semaglutide is a prescription medication and isn't appropriate
                  for everyone. Compounded semaglutide is not FDA-approved and
                  is considered only when legally available and clinically
                  appropriate. It should not be assumed identical to branded
                  semaglutide.
                </p>
              </div>
            </div>
          </SurfaceCard>
          <SurfaceCard>
            <div className="flex gap-4">
              <HeartPulse className="size-6 shrink-0 text-accent-foreground" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Talk to your provider
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Share your full medical history, possible contraindications,
                  side effects, and any medication interactions with your
                  provider. For more on eligibility, contraindications, and
                  warning signs, see{" "}
                  <Link to="/safety/" className="text-primary underline">
                    Safety &amp; eligibility
                  </Link>
                  .
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeading
          align="left"
          title="Semaglutide vs. tirzepatide"
          description="Both are GLP-1 medications used in medical weight-management care. Neither is universally better, your provider decides what's appropriate for you."
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8">
          <TreatmentComparisonTable highlight="semaglutide" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Want to compare the other option?{" "}
          <Link to="/tirzepatide/" className="text-primary underline">
            See compounded tirzepatide details
          </Link>
          .
        </p>
      </Section>

      <Section className="bg-muted/40 pt-0">
        <SectionHeading
          align="left"
          title="Frequently asked questions"
          description={
            <>
              For broader questions about pricing, shipping, and refills, see
              our full{" "}
              <Link to="/faq/" className="text-primary underline">
                FAQ
              </Link>
              .
            </>
          }
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8">
          <TreatmentFaqSection items={FAQ_ITEMS} />
        </div>
      </Section>

      <Section className="pt-0">
        <div className="relative overflow-hidden rounded-4xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
          <div
            aria-hidden
            className="bg-mesh-primary-depth mesh-drift pointer-events-none absolute inset-0 z-0"
          />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold">
              <LineReveal>Start with a quick eligibility check.</LineReveal>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              Takes about 5 minutes. A licensed provider makes every clinical
              decision independently, prescribing is never guaranteed.
            </p>
            <MagneticButton className="mt-8">
              <Button
                asChild
                size="xl"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link to={footerCta.to} search={footerCta.search}>
                  {footerCta.label} <ArrowRight />
                </Link>
              </Button>
            </MagneticButton>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}
