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
  HAIRLOSS_TOPICAL_WOMEN_PRICING,
  formatSimpleQuarterlyStartingAt,
  simplePerDaySentence,
  simplePricingSentence,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import hairLossSprayWomenPhoto from "@/assets/treatments/hair-loss-spray-women-bottle.webp";

const TITLE = "Hair Loss Spray for Women Online | Beema Health";
const DESCRIPTION = `Compounded topical hair loss spray with minoxidil, tretinoin, fluocinolone, biotin, and melatonin, for women, reviewed by licensed providers. Nationwide telehealth care from ${formatSimpleQuarterlyStartingAt(HAIRLOSS_TOPICAL_WOMEN_PRICING)}. Prescribing is never guaranteed.`;
const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adult women with independent licensed providers for compounded topical hair loss spray evaluation and ongoing care. Completing intake does not guarantee a prescription.";

const REQUIRED_COMPOUND_SENTENCE =
  "Compounded hair loss spray is not FDA-approved and is considered only when legally available and clinically appropriate.";

/**
 * Formulation, matching the pharmacy's compound label: "Minoxidil 7% /
 * Tretinoin 0.025% / Fluocinolone 0.025% / Biotin 0.8% / Melatonin 0.5%
 * Hair Spray, 60 mL" (per Matt, 2026-09-10) - strengths intentionally
 * omitted from this marketing-page sentence (per Matt, 2026-09-10); see the
 * formulation table in docs/features/treatment-pages.md for the exact
 * percentages.
 */
const FORMULATION_SENTENCE =
  "This 5-in-1 combination includes minoxidil, tretinoin, fluocinolone, biotin, and melatonin in a 60 mL bottle, without finasteride.";

const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is Beema's hair loss spray for women and how does it work?",
    a: `This is a topical spray, applied directly to the scalp. ${FORMULATION_SENTENCE} Delivering these active ingredients topically is intended to target hair follicles and support the scalp environment around them. Results vary and can take several months to become noticeable.`,
  },
  {
    q: "Is Beema's hair loss spray FDA-approved?",
    a: `${REQUIRED_COMPOUND_SENTENCE} It is not the same as, and is not claimed to be clinically proven to produce the same results as, any FDA-approved product.`,
  },
  {
    q: "Does this spray contain finasteride?",
    a: `No. ${FORMULATION_SENTENCE} Your provider will confirm the ingredients are appropriate for you during intake.`,
  },
  {
    q: "How does online hair loss care through Beema work?",
    a: "Care starts with creating a secure account and completing a medical intake covering your health history, hair loss pattern, and goals, at your own pace. A licensed provider reviews your intake and independently decides whether this spray may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does the hair loss spray cost through Beema?",
    a: `${simplePricingSentence("Beema's hair loss spray for women", HAIRLOSS_TOPICAL_WOMEN_PRICING)} Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema serve patients nationwide?",
    a: "Yes, Beema Health is available to patients in all 50 U.S. states. Eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history and current medications.",
  },
];

const WHATS_INCLUDED = [
  "Prescription Formulation",
  "Doctor Consultation & Visit",
  "Ongoing Doctor Care",
  "Shipping",
  { label: "Free learning resources", to: "/learn/" },
];

const ELIGIBILITY_POINTS = [
  "Women, 18 and older",
  "5-in-1: minoxidil, tretinoin, fluocinolone, biotin, melatonin",
  "No finasteride",
  "Final approval rests with a licensed provider",
];

export const Route = createFileRoute("/hair-loss-spray-women")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/hair-loss-spray-women") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/hair-loss-spray-women") },
      ...bootImagePreloadLinks("/hair-loss-spray-women"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            {
              name: "Hair Loss Spray for Women",
              path: "/hair-loss-spray-women",
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
            name: "Hair Loss Spray for Women Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/hair-loss-spray-women",
            serviceType: "Hair loss treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-13",
            offer: {
              introPrice: HAIRLOSS_TOPICAL_WOMEN_PRICING.monthlyUsd,
              recurringPrice: HAIRLOSS_TOPICAL_WOMEN_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: HairLossSprayWomenPage,
});

function HairLossSprayWomenPage() {
  const heroCta = resolveCta(CTA_IDS.hairloss_spray_women_hero);
  const footerCta = resolveCta(CTA_IDS.hairloss_spray_women_footer);
  const reduceMotion = useReducedMotion();
  const perDayNote = simplePerDaySentence(HAIRLOSS_TOPICAL_WOMEN_PRICING);

  useEffect(() => {
    trackPageViewed("hairloss_spray_women");
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
          <TreatmentBreadcrumb current="Hair Loss Spray for Women" />
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <SectionHeading
                as="h1"
                align="left"
                eyebrow="Nationwide telehealth hair loss care"
                title={
                  <>
                    <LineReveal>Hair Loss Spray, </LineReveal>
                    <LineReveal delay={0.1}>for women.</LineReveal>
                  </>
                }
                description={
                  <>
                    Beema Health connects eligible women with independent
                    licensed providers for a{" "}
                    <strong className="font-semibold text-foreground">
                      5-in-1
                    </strong>{" "}
                    compounded topical spray combining minoxidil, tretinoin,
                    fluocinolone, biotin, and melatonin. Completing intake does
                    not guarantee a prescription.
                  </>
                }
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
                  <Link to="/hair-loss-spray-women/" hash="how-it-works">
                    How it works
                  </Link>
                </Button>
              </motion.div>
              <p className="mt-6 flex max-w-md flex-wrap items-center gap-x-3 gap-y-1 text-2xl font-bold text-foreground">
                From{" "}
                {formatSimpleQuarterlyStartingAt(
                  HAIRLOSS_TOPICAL_WOMEN_PRICING,
                )}
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
                  src={hairLossSprayWomenPhoto}
                  alt="Bottle of Beema Health compounded hair loss spray with minoxidil, tretinoin, fluocinolone, biotin, and melatonin, for women"
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
          title="What is Beema's hair loss spray for women?"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            This is a topical spray, applied directly to the scalp.{" "}
            {FORMULATION_SENTENCE} Delivering these active ingredients topically
            is intended to target hair follicles and support the scalp
            environment around them. Results vary and can take several months to
            become noticeable.
          </p>
          <p>
            Beema's hair loss spray is a compounded formulation, for women only.{" "}
            {REQUIRED_COMPOUND_SENTENCE}
          </p>
          <p>
            Whether this spray, or another formulation, may be appropriate for
            you is a decision your licensed provider makes individually based on
            your health history and hair loss pattern.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/hair-loss-spray-women/" hash="faq">
              View FAQ <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      <HowItWorksSteps
        className="bg-muted/40"
        eyebrow="How it works"
        title="How Beema's hair loss spray care works"
        showCareFollowUpNote
      />

      <Section id="pricing" className="pt-0">
        <SectionHeading
          align="left"
          title="Transparent pricing"
          description="Your provider decides whether this spray is clinically appropriate - this is a starting point, not a self-selected order."
          className="mx-0 max-w-2xl"
        />
        <div className="mx-auto mt-8 max-w-xl">
          <SimpleTreatmentPricingCard
            label="hair loss spray"
            title="Hair Loss Spray (Women)"
            badge="Rx"
            pricing={HAIRLOSS_TOPICAL_WOMEN_PRICING}
            perDayNote={perDayNote}
            interactive
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
                  Compounded, not FDA-approved
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {REQUIRED_COMPOUND_SENTENCE} It isn't appropriate for
                  everyone.
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
      <MoneyPageGuides path="/hair-loss-spray-women/" />
    </MarketingLayout>
  );
}
