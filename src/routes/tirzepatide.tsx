import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
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
import { COMPOUNDED_TIRZEPATIDE_PRICING } from "@/lib/medication-pricing";
import compoundedTirzepatideVialImg from "@/assets/treatments/compounded-tirzepatide-vial.png";

const TITLE = "Compounded Tirzepatide for Weight Loss | Beema Health";
const DESCRIPTION =
  "Compounded tirzepatide for medical weight loss, reviewed by licensed providers. Nationwide telehealth care from $197 the first month. Prescribing is never guaranteed.";

const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is compounded tirzepatide?",
    a: "Compounded tirzepatide is tirzepatide prepared by a licensed compounding pharmacy rather than sold under a brand name. It's considered in medical weight-management care only when legally available and clinically appropriate, and it is not the same product as an FDA-approved branded medication.",
  },
  {
    q: "Is tirzepatide right for me?",
    a: "That depends on your BMI, health history, current medications, and a licensed provider's independent clinical judgment. Completing an eligibility check and intake doesn't guarantee that tirzepatide, or any treatment, will be prescribed.",
  },
  {
    q: "How does online tirzepatide care through Beema work?",
    a: "You complete a brief eligibility check, create an account and submit a medical intake, and a licensed provider reviews your information to decide whether treatment may be appropriate for you.",
  },
  {
    q: "How much does tirzepatide cost through Beema?",
    a: `Compounded tirzepatide through Beema is $${COMPOUNDED_TIRZEPATIDE_PRICING.firstMonthUsd} for the first month, then $${COMPOUNDED_TIRZEPATIDE_PRICING.ongoingUsd}/month after, medication-only cash pricing with no platform membership fee. Final cost can depend on your provider's dosage recommendation.`,
  },
  {
    q: "Does Beema serve patients nationwide?",
    a: "Beema is a nationwide telehealth platform connecting patients with independently licensed providers. Medication availability and eligibility still depend on your state's requirements and your provider's clinical decision.",
  },
  {
    q: "Is compounded tirzepatide FDA-approved?",
    a: "No. Compounded tirzepatide is not FDA-approved. It's considered only when legally available and clinically appropriate, and it is not identical to an FDA-approved branded medication.",
  },
  {
    q: "How quickly can treatment begin?",
    a: "Timing depends on how quickly you complete intake, your provider's review, and pharmacy fulfillment. We can't promise a specific start date, and prescribing is never guaranteed.",
  },
];

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Complete a brief eligibility check",
    text: "Answer a few questions about your health, location, and goals. Takes about 5 minutes.",
  },
  {
    icon: Send,
    title: "Submit your medical intake",
    text: "Create an account and complete a secure medical questionnaire at your own pace.",
  },
  {
    icon: Stethoscope,
    title: "Licensed provider review",
    text: "A licensed provider reviews your intake and decides whether tirzepatide may be appropriate. Prescribing is never guaranteed.",
  },
];

const ELIGIBILITY_POINTS = [
  "Adults 18 and older",
  "Eligibility depends on BMI, health history, and current medications",
  "A licensed provider makes the final decision, based on your intake and applicable state law",
];

export const Route = createFileRoute("/tirzepatide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/tirzepatide") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/tirzepatide") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Compounded Tirzepatide", path: "/tirzepatide" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(FAQ_ITEMS)),
      },
    ],
  }),
  component: TirzepatidePage,
});

function TirzepatidePage() {
  const heroCta = resolveCta(CTA_IDS.tirzepatide_hero);
  const footerCta = resolveCta(CTA_IDS.tirzepatide_footer);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("tirzepatide");
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
          <TreatmentBreadcrumb current="Compounded Tirzepatide" />
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <SectionHeading
                as="h1"
                align="left"
                eyebrow="Nationwide telehealth weight-loss care"
                title={
                  <>
                    <LineReveal>Compounded Tirzepatide, guided </LineReveal>
                    <LineReveal delay={0.1}>
                      by licensed medical professionals.
                    </LineReveal>
                  </>
                }
                description="Beema Health connects eligible adults with independent licensed providers for personalized medical weight-management care. Completing intake does not guarantee a prescription."
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
                  ${COMPOUNDED_TIRZEPATIDE_PRICING.firstMonthUsd} first month
                </span>{" "}
                <span className="text-muted-foreground">
                  · ${COMPOUNDED_TIRZEPATIDE_PRICING.ongoingUsd}/month after
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
                src={compoundedTirzepatideVialImg}
                alt="Beema Health compounded tirzepatide injection vial"
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
            title="What is tirzepatide?"
            className="mx-0 max-w-2xl"
          />
        </motion.div>
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Tirzepatide is a GLP-1/GIP medication used in medical
            weight-management care. It's available both as an FDA-approved
            branded medication and, separately, as a compounded version prepared
            by a licensed compounding pharmacy.
          </p>
          <p>
            Compounded tirzepatide is not the same product as the branded
            version, it is not FDA-approved and is considered only when legally
            available and clinically appropriate. A licensed provider decides,
            on a case-by-case basis, whether it may be an appropriate option as
            part of your care.
          </p>
        </div>
      </Section>

      <Section className="bg-muted/40 pt-0">
        <SectionHeading
          align="left"
          title="How Beema's tirzepatide care works"
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
                Not everyone qualifies. Eligibility is based on BMI, health
                history, current medications, a licensed provider's independent
                judgment, and applicable state law.
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
              pricing={COMPOUNDED_TIRZEPATIDE_PRICING}
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
                  Tirzepatide is a prescription medication and is not
                  appropriate for everyone. Compounded tirzepatide is not
                  FDA-approved and is considered only when legally available and
                  clinically appropriate. It is not identical to branded
                  tirzepatide.
                </p>
              </div>
            </div>
          </SurfaceCard>
          <SurfaceCard>
            <div className="flex gap-4">
              <Stethoscope className="size-6 shrink-0 text-accent-foreground" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Talk to your provider
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Discuss your full medical history, potential
                  contraindications, side effects, and any medication
                  interactions with your provider. For more detail on
                  eligibility, contraindications, and warning signs, see{" "}
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
          title="Tirzepatide vs. semaglutide"
          description="Both are GLP-1 medications used in medical weight-management care. Neither is universally better, appropriateness is an individual clinical decision."
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8">
          <TreatmentComparisonTable highlight="tirzepatide" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Curious about the alternative?{" "}
          <Link to="/semaglutide/" className="text-primary underline">
            See compounded semaglutide details
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
              More general questions about pricing, shipping, and refills? Visit
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
