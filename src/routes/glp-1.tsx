import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  breadcrumbJsonLd,
  canonicalUrl,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  FloatingHexagons,
  HexBadge,
  HexMotif,
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
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  dualCompoundedFaqPricingParagraph,
  dualCompoundedHeroPricingLine,
  dualCompoundedShortPricingLine,
} from "@/lib/medication-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";

/** §F1.1 required sentences — reuse verbatim where compounded status is explained. */
const COMPOUNDED_SEMA_REQUIRED =
  "Compounded semaglutide is not FDA-approved and is considered only when legally available and clinically appropriate.";
const COMPOUNDED_TIRZ_REQUIRED =
  "Compounded tirzepatide is not FDA-approved and is considered only when legally available and clinically appropriate.";
const COMPOUNDED_DISCLOSURE = `${COMPOUNDED_SEMA_REQUIRED} ${COMPOUNDED_TIRZ_REQUIRED}`;

const TITLE = "GLP-1 Weight Loss Care in Houston | Cash-Pay | Beema Health";
const DESCRIPTION = `Houston adults can start online GLP-1 weight-loss care with transparent cash pricing: ${dualCompoundedShortPricingLine()}. ${COMPOUNDED_DISCLOSURE} Prescribing is never guaranteed.`;
const SERVICE_DESCRIPTION = `Telehealth GLP-1 medical weight-loss care from Beema Health for adults in Houston and nationwide. Licensed providers may prescribe compounded semaglutide or compounded tirzepatide when clinically appropriate and legally available. ${COMPOUNDED_DISCLOSURE} Prescribing is never guaranteed.`;

const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is GLP-1 care at Beema Health?",
    a: `GLP-1 care at Beema Health is provider-reviewed medical weight-loss care delivered by telehealth. After you complete an online medical intake, a licensed clinician reviews your health history and decides whether compounded semaglutide, compounded tirzepatide, or another approach is appropriate. ${COMPOUNDED_DISCLOSURE} Completing intake does not guarantee a prescription.`,
  },
  {
    q: "Does Beema Health serve Houston?",
    a: "Yes. Beema Health serves adults in Houston and across all 50 U.S. states through telehealth. You complete intake online from home; a licensed provider reviews your case remotely. Medication availability still depends on applicable state rules and pharmacy fulfillment, and eligibility is always an individual clinical decision—never guaranteed just because you live in Houston.",
  },
  {
    q: "How much does cash-pay GLP-1 treatment cost?",
    a: `${dualCompoundedFaqPricingParagraph()} ${patientQuestionsGuidance()}`,
  },
  {
    q: "How does online GLP-1 care work?",
    a: "You start with a free online medical intake—no payment required to begin. A licensed provider reviews your answers and decides whether treatment may be appropriate. If approved and a compounded medication is prescribed, your plan includes provider care, medication, supplies, and expedited shipping, with follow-up as your care continues. Prescribing is never guaranteed.",
  },
  {
    q: "What is the difference between compounded semaglutide and tirzepatide?",
    a: `Both are compounded options that a licensed provider may consider for medical weight management when clinically appropriate and legally available. Semaglutide acts on the GLP-1 pathway; tirzepatide is a dual GLP-1/GIP receptor agonist. Your provider decides which option, if any, fits your health history. ${COMPOUNDED_DISCLOSURE} Explore medication-specific details on our compounded semaglutide and compounded tirzepatide pages.`,
  },
  {
    q: "How do I get started online?",
    a: "Select Get Started to open Beema’s secure online medical intake. Share your health history, current medications, and goals. A licensed provider reviews your case and decides next steps. No payment is required to start the intake, and a prescription is never guaranteed.",
  },
];

const CASH_PAY_POINTS = [
  "Transparent cash pricing—no insurance hoop-jumping to begin intake",
  "All-inclusive monthly rates cover provider care, medication, supplies, and expedited shipping when prescribed",
  "No platform membership fee; prescribing is never guaranteed",
];

export const Route = createFileRoute("/glp-1")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/glp-1") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/glp-1") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "GLP-1 Care", path: "/glp-1" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(FAQ_ITEMS)),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceJsonLd({
            name: "GLP-1 Telehealth Weight-Loss Care",
            description: SERVICE_DESCRIPTION,
            path: "/glp-1",
            serviceType: "GLP-1 medical weight-loss telehealth service",
            reviewedByClinicalLead: true,
            dateModified: "2026-08-11",
          }),
        ),
      },
    ],
  }),
  component: Glp1Page,
});

function Glp1Page() {
  const heroCta = resolveCta(CTA_IDS.glp1_hero);
  const midCta = resolveCta(CTA_IDS.glp1_mid);
  const footerCta = resolveCta(CTA_IDS.glp1_footer);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("glp_1");
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
          <div className="mb-6 flex flex-col items-center gap-4">
            <TreatmentBreadcrumb current="GLP-1 Care" />
            <LegitScriptSeal />
          </div>
          <SectionHeading
            as="h1"
            eyebrow="Houston · Cash-pay GLP-1 care"
            title={
              <>
                <LineReveal>GLP-1 weight-loss care </LineReveal>
                <LineReveal delay={0.1}>for Houston, online</LineReveal>
              </>
            }
            description={`Provider-reviewed telehealth care with transparent cash pricing: ${dualCompoundedHeroPricingLine()}. ${COMPOUNDED_DISCLOSURE} Prescribing is never guaranteed.`}
          />
          <motion.div
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
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
                  to={heroCta.to}
                  search={heroCta.search}
                  onClick={heroCta.onClick}
                >
                  {heroCta.label} <ArrowRight />
                </Link>
              </Button>
            </MagneticButton>
            <Button asChild size="xl" variant="outline">
              <Link to="/how-it-works/">How care works</Link>
            </Button>
          </motion.div>
        </div>
      </Section>

      <Section id="cash-pricing">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        >
          <SectionHeading
            eyebrow="GLP-1 cash pricing"
            title="Clear cash-pay rates for compounded options"
            description="No membership fee. Your licensed provider decides whether compounded semaglutide or compounded tirzepatide is appropriate—pricing below is cash-pay when prescribed."
          />
        </motion.div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="flex h-full flex-col gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              Compounded Semaglutide
            </h3>
            <TreatmentPricingCard
              pricing={COMPOUNDED_SEMAGLUTIDE_PRICING}
              className="h-full"
            />
          </div>
          <div className="flex h-full flex-col gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              Compounded Tirzepatide
            </h3>
            <TreatmentPricingCard
              pricing={COMPOUNDED_TIRZEPATIDE_PRICING}
              className="h-full"
            />
          </div>
        </div>
        <ul className="mx-auto mt-8 max-w-2xl space-y-2">
          {CASH_PAY_POINTS.map((point, i) => (
            <motion.li
              key={point}
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
              <Wallet className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
              {point}
            </motion.li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/semaglutide/">Compounded Semaglutide</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/tirzepatide/">Compounded Tirzepatide</Link>
          </Button>
        </div>
      </Section>

      <Section className="pt-0">
        <TreatmentComparisonTable />
      </Section>

      <HowItWorksSteps
        eyebrow="How GLP-1 care works"
        title={<LineReveal>From online intake to ongoing care</LineReveal>}
        showCareFollowUpNote
      />

      <Section className="relative overflow-hidden bg-muted/40">
        <HexMotif className="pointer-events-none absolute -right-10 top-8 z-0 w-48 text-primary/10 md:w-64" />
        <motion.div
          className="relative z-10"
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        >
          <SurfaceCard className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start">
            <HexBadge className="size-14">
              <MapPin className="size-6" aria-hidden />
            </HexBadge>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
                Serving Houston
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
                Cash-pay GLP-1 care without a clinic visit
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                If you&apos;re in Houston—or anywhere in Texas—you can complete
                Beema Health&apos;s medical intake online. A licensed provider
                reviews your case by telehealth. When clinically appropriate and
                legally available, compounded GLP-1 options may be prescribed
                and shipped to you. Beema Health serves patients nationwide,
                including Houston.
              </p>
              <ul className="mt-5 space-y-2">
                {[
                  "Adults 18+ seeking medical weight-loss support",
                  "BMI and health history reviewed during intake",
                  "Cash-pay compounded semaglutide or tirzepatide when appropriate",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <MagneticButton>
                  <Button asChild>
                    <Link
                      to={midCta.to}
                      search={midCta.search}
                      onClick={midCta.onClick}
                    >
                      {midCta.label} <ArrowRight />
                    </Link>
                  </Button>
                </MagneticButton>
                <Button asChild variant="outline">
                  <Link to="/safety/">Safety & eligibility</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/weight-loss/">Weight-loss program</Link>
                </Button>
              </div>
            </div>
          </SurfaceCard>
        </motion.div>
      </Section>

      <Section>
        <div className="mb-8 flex justify-center">
          <HexBadge className="size-11">
            <ShieldCheck className="size-5" aria-hidden />
          </HexBadge>
        </div>
        <SectionHeading
          eyebrow="FAQ"
          title="GLP-1 care, pricing, and getting started"
          description="Straight answers for Houston adults comparing cash-pay GLP-1 options online."
        />
        <div className="mt-10">
          <TreatmentFaqSection items={FAQ_ITEMS} />
        </div>
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
              <LineReveal>Get started online</LineReveal>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              Houston patients can complete medical intake from home. No payment
              required to start. A prescription is never guaranteed.
            </p>
            <MagneticButton className="mt-8">
              <Button
                asChild
                size="xl"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              >
                <Link
                  to={footerCta.to}
                  search={footerCta.search}
                  onClick={footerCta.onClick}
                >
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
