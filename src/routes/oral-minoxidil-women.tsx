import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import {
  CLINICAL_PROVIDER_GROUP,
  SEAN_ARORA_PROVIDER,
} from "@/lib/provider-info";
import { trackPageViewed } from "@/lib/analytics";
import { bootImagePreloadLinks } from "@/lib/boot-assets";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  HoverLiftButton,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import {
  TreatmentBreadcrumb,
  TreatmentFaqSection,
  TreatmentIncludedDropdown,
  SimpleTreatmentPricingCard,
  type TreatmentFaqItem,
} from "@/components/site/TreatmentPageBlocks";
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  HAIRLOSS_ORAL_MINOXIDIL_PRICING,
  formatSimpleStartingAt,
  simplePerDaySentence,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import oralMinoxidilPhoto from "@/assets/treatments/oral-minoxidil-tablets-bottle.webp";

const TITLE = "Oral Minoxidil for Women Online | Beema Health";
const DESCRIPTION = `Oral minoxidil, an FDA-approved generic medication used off-label for hair loss, reviewed by licensed providers. Nationwide telehealth care from ${formatSimpleStartingAt(HAIRLOSS_ORAL_MINOXIDIL_PRICING)}. Prescribing is never guaranteed.`;
const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adult women with independent licensed providers for oral minoxidil evaluation and ongoing care. Oral minoxidil is an FDA-approved generic medication; using it for hair loss is a well-established off-label use. Completing intake does not guarantee a prescription.";

const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is oral minoxidil and how does it work?",
    a: "Minoxidil is best known as a topical treatment, but taken as a low-dose oral tablet it can also help support hair growth by improving blood flow to hair follicles and extending the hair growth cycle. It's taken once daily. Results vary and can take several months to become noticeable.",
  },
  {
    q: "Is Beema's oral minoxidil for women FDA-approved?",
    a: "Yes. Oral minoxidil is an FDA-approved generic medication, not a compounded formulation. It was originally approved to treat high blood pressure; using it for hair loss is a well-established off-label use in dermatology, and your licensed provider decides whether it's appropriate for you.",
  },
  {
    q: "Is oral minoxidil safe during pregnancy?",
    a: "Your provider reviews your full health history, including pregnancy status, before deciding whether oral minoxidil may be appropriate for you. Always share your pregnancy status and any plans to become pregnant during intake.",
  },
  {
    q: "How does online hair loss care through Beema work?",
    a: "Care starts with creating a secure account and completing a medical intake covering your health history, hair loss pattern, and goals, at your own pace. A licensed provider reviews your intake and independently decides whether oral minoxidil may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does oral minoxidil cost through Beema?",
    a: `${simplePricingSentence("Oral minoxidil through Beema", HAIRLOSS_ORAL_MINOXIDIL_PRICING)} Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema serve patients nationwide?",
    a: "Yes, Beema Health is available to patients in all 50 U.S. states. Eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history and current medications.",
  },
];

const WHATS_INCLUDED = [
  "Prescription Medication",
  "Doctor Consultation & Visit",
  "Ongoing Doctor Care",
  "Expedited Shipping",
  { label: "Free learning resources", to: "/learn/" },
];

const ELIGIBILITY_POINTS = [
  "Women, 18 and older",
  "Your provider reviews health history, including pregnancy status",
  "Final approval rests with a licensed provider",
];

export const Route = createFileRoute("/oral-minoxidil-women")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/oral-minoxidil-women") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/oral-minoxidil-women") },
      ...bootImagePreloadLinks("/oral-minoxidil-women"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            {
              name: "Oral Minoxidil for Women",
              path: "/oral-minoxidil-women",
            },
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
            name: "Oral Minoxidil for Women Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/oral-minoxidil-women",
            serviceType: "Hair loss treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-11",
            offer: {
              introPrice: HAIRLOSS_ORAL_MINOXIDIL_PRICING.monthlyUsd,
              recurringPrice: HAIRLOSS_ORAL_MINOXIDIL_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: OralMinoxidilWomenPage,
});

function OralMinoxidilWomenPage() {
  const heroCta = resolveCta(CTA_IDS.oral_minoxidil_women_hero);
  const footerCta = resolveCta(CTA_IDS.oral_minoxidil_women_footer);
  const reduceMotion = useReducedMotion();
  const perDayNote = simplePerDaySentence(HAIRLOSS_ORAL_MINOXIDIL_PRICING);

  useEffect(() => {
    trackPageViewed("oral_minoxidil_women");
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
        <div className="relative z-10">
          <TreatmentBreadcrumb current="Oral Minoxidil for Women" />
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <SectionHeading
                as="h1"
                align="left"
                eyebrow="Nationwide telehealth hair loss care"
                title={
                  <>
                    <LineReveal>Oral Minoxidil, </LineReveal>
                    <LineReveal delay={0.1}>for women.</LineReveal>
                  </>
                }
                description="Beema Health connects eligible women with independent licensed providers for oral minoxidil care, an FDA-approved generic medication used off-label for hair loss. Completing intake does not guarantee a prescription."
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
                <HoverLiftButton>
                  <Button asChild size="xl">
                    <Link
                      to={heroCta.to}
                      search={heroCta.search}
                      onClick={heroCta.onClick}
                    >
                      {heroCta.label} <ArrowRight />
                    </Link>
                  </Button>
                </HoverLiftButton>
                <Button asChild size="xl" variant="outline">
                  <Link to="/oral-minoxidil-women/" hash="how-it-works">
                    How it works
                  </Link>
                </Button>
              </motion.div>
              <p className="mt-6 flex max-w-md flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-bold text-foreground">
                From {formatSimpleStartingAt(HAIRLOSS_ORAL_MINOXIDIL_PRICING)}
                {perDayNote ? (
                  <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-accent-foreground">
                    {perDayNote}
                  </span>
                ) : null}
              </p>
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
              className="mx-auto w-full max-w-sm"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
                <img
                  src={oralMinoxidilPhoto}
                  alt="Bottle of Beema Health oral minoxidil tablets, an FDA-approved generic medication"
                  width={720}
                  height={900}
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </div>
              <TreatmentIncludedDropdown
                items={WHATS_INCLUDED}
                className="mt-6 w-full"
              />
            </motion.div>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeading
          align="left"
          title="What is oral minoxidil?"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Minoxidil is best known as a topical treatment, but taken as a
            low-dose oral tablet it can also help support hair growth by
            improving blood flow to hair follicles and extending the hair growth
            cycle. It's taken once daily. Results vary and can take several
            months to become noticeable.
          </p>
          <p>
            Beema's oral minoxidil for women is an FDA-approved generic
            medication, not a compounded formulation. It was originally approved
            to treat high blood pressure; using it for hair loss is a
            well-established off-label use in dermatology.
          </p>
          <p>
            Whether oral minoxidil, or another formulation, may be appropriate
            for you is a decision your licensed provider makes individually
            based on your health history and hair loss pattern.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/oral-minoxidil-women/" hash="faq">
              View FAQ <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      <HowItWorksSteps
        className="bg-muted/40"
        eyebrow="How it works"
        title="How Beema's oral minoxidil care works"
        showCareFollowUpNote
      />

      <Section id="pricing" className="pt-0">
        <SectionHeading
          align="left"
          title="Transparent pricing"
          description="Your provider decides whether oral minoxidil is clinically appropriate - this is a starting point, not a self-selected order."
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8 max-w-sm">
          <SimpleTreatmentPricingCard
            label="oral minoxidil"
            title="Oral Minoxidil (Women)"
            badge="Rx"
            pricing={HAIRLOSS_ORAL_MINOXIDIL_PRICING}
            perDayNote={perDayNote}
          />
        </div>
        <div className="mt-8">
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-foreground">
              Who may be eligible
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Not everyone qualifies. Your provider weighs your hair loss
              pattern, health history, current medications, and applicable state
              law before making an independent decision.
            </p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-3">
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
                  FDA-approved generic medication
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Oral minoxidil is an FDA-approved generic medication, not
                  compounded. It's a prescription medication and isn't
                  appropriate for everyone; using it for hair loss is an
                  off-label use considered only when clinically appropriate.
                </p>
              </div>
            </div>
          </SurfaceCard>
          <SurfaceCard>
            <div className="flex gap-4">
              <ShieldCheck className="size-6 shrink-0 text-accent-foreground" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Talk to your provider
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Include your full medical history, possible contraindications,
                  side effects, and any medication interactions in your intake
                  questionnaire. After you complete intake and pay, you can ask
                  follow-up questions. Before then, email{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-primary underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  . For more on eligibility and warning signs, see{" "}
                  <Link to="/safety/" className="text-primary underline">
                    Safety &amp; eligibility
                  </Link>
                  .
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Clinical oversight: Beema Health&rsquo;s clinical provider network is
          led by {SEAN_ARORA_PROVIDER.displayName},{" "}
          {SEAN_ARORA_PROVIDER.credentials}, {SEAN_ARORA_PROVIDER.role} of{" "}
          {CLINICAL_PROVIDER_GROUP}. Licensed clinicians make every treatment
          decision independently, the clinician assigned to your care may vary
          by state licensure and availability.
        </p>
      </Section>

      <Section id="faq" className="scroll-mt-20 bg-muted/40 pt-0">
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
              <LineReveal>Start with your medical intake.</LineReveal>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              Save your progress and finish at your own pace. A licensed
              provider makes every clinical decision independently, prescribing
              is never guaranteed.
            </p>
            <HoverLiftButton className="mt-8">
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
            </HoverLiftButton>
          </div>
        </div>
      </Section>
      <MoneyPageGuides path="/oral-minoxidil-women/" />
    </MarketingLayout>
  );
}
