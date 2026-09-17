import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CheckCircle2, HeartPulse, Pill } from "lucide-react";
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
  TreatmentHeroArt,
  TreatmentIncludedDropdown,
  SimpleTreatmentPricingCard,
  type TreatmentFaqItem,
} from "@/components/site/TreatmentPageBlocks";
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import {
  ED_SILDENAFIL_PRICING,
  ED_TADALAFIL_PER_PILL_USD,
  ED_TADALAFIL_PRICING,
  formatPerPillStartingAt,
  formatSimpleStartingAt,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";

const TITLE = "Generic ED Treatment Online | Beema Health";
const DESCRIPTION = `Tadalafil (generic Cialis) and sildenafil (generic Viagra), reviewed by licensed providers. Nationwide telehealth care from ${formatPerPillStartingAt(ED_TADALAFIL_PER_PILL_USD)}. Prescribing is never guaranteed.`;
const SERVICE_DESCRIPTION =
  "Nationwide telehealth service connecting eligible adult men with independent licensed providers for ED medication evaluation and ongoing care. Completing intake does not guarantee a prescription.";

const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What's the difference between Tadalafil and Sildenafil?",
    a: "Tadalafil and sildenafil are the FDA-approved generic versions of Cialis and Viagra - they work similarly but differ in how quickly they take effect and how long they last. Your licensed provider reviews your intake and recommends which option and dose may be appropriate for your case; prescribing either is never guaranteed. Looking for a dissolve-under-the-tongue combination formulation instead? See ED Mints, a separate compounded product.",
  },
  {
    q: "Is Beema's ED treatment the same as generic Viagra or Cialis?",
    a: "Yes, for tadalafil and sildenafil. Beema's tadalafil and sildenafil are the FDA-approved generic versions of Cialis and Viagra - the identical active ingredient, strength, and intended use as the brand-name products, dispensed by a licensed pharmacy, not a compounded formulation. ED Mints is different: a compounded combination formulation, not sold as a single commercial product by any manufacturer.",
  },
  {
    q: "How does online ED care through Beema work?",
    a: "Care starts with creating a secure account and completing a medical intake covering your health history, current medications, and goals, at your own pace. A licensed provider reviews your intake and independently decides whether tadalafil or sildenafil may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability.",
  },
  {
    q: "How much does ED treatment cost through Beema?",
    a: `Tadalafil is ${formatSimpleStartingAt(ED_TADALAFIL_PRICING)} and sildenafil is ${formatSimpleStartingAt(ED_SILDENAFIL_PRICING)}, each with a lower-cost quarterly option. Both cover your provider consultation, medication, and shipping. Questions about your plan? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Does Beema serve patients nationwide?",
    a: "Yes, Beema Health is available to patients in all 50 U.S. states. Eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history and current medications, including cardiovascular history.",
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
  "Adult men, 18 and older",
  "Eligibility considers cardiovascular history and current medications",
  "Final approval and formulation selection rests with a licensed provider",
];

export const Route = createFileRoute("/ed")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/ed") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/ed") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Generic ED Treatment", path: "/ed" },
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
            name: "Generic ED Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/ed",
            serviceType: "Erectile dysfunction treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-08-27",
            offer: {
              introPrice: ED_TADALAFIL_PRICING.monthlyUsd,
              recurringPrice: ED_TADALAFIL_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: EdPage,
});

function EdPage() {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("ed");
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
          <TreatmentBreadcrumb current="Generic ED Treatment" />
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <SectionHeading
                as="h1"
                align="left"
                eyebrow="Nationwide telehealth ED care"
                title={
                  <>
                    <LineReveal>Generic ED Treatment, </LineReveal>
                    <LineReveal delay={0.1}>
                      discreet and FDA-approved.
                    </LineReveal>
                  </>
                }
                description="Beema Health connects eligible adults with independent licensed providers for individualized ED care. Completing intake does not guarantee a prescription."
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
                    <Link to="/ed/" hash="pricing">
                      Compare formulations <ArrowRight />
                    </Link>
                  </Button>
                </HoverLiftButton>
                <Button asChild size="xl" variant="outline">
                  <Link to="/ed/" hash="how-it-works">
                    How it works
                  </Link>
                </Button>
              </motion.div>
              <p className="mt-6 max-w-md text-2xl font-bold text-foreground">
                From {formatPerPillStartingAt(ED_TADALAFIL_PER_PILL_USD)}
              </p>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                Medication eligibility, formulation, and availability are
                determined by a licensed provider and applicable law.
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
              <TreatmentHeroArt icon={Pill} label="Generic ED Treatment" />
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
          title="What is generic ED treatment?"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            These medicines work by relaxing blood vessels so more blood can
            flow to the penis. That can make it easier to get and keep an
            erection when you're sexually aroused. They don't cause arousal by
            themselves - you still need to be sexually stimulated for them to
            work.
          </p>
          <p>
            Beema offers two options: tadalafil and sildenafil, the FDA-approved
            generic versions of Cialis and Viagra - the identical active
            ingredients, strengths, and intended uses as the brand-name
            products, dispensed by a licensed pharmacy, not compounded
            formulations. Looking for a dissolve-under-the-tongue combination
            formulation instead? See{" "}
            <Link to="/ed-mints/" className="text-primary underline">
              ED Mints
            </Link>
            , a separate compounded product.
          </p>
          <p>
            Which option, if any, may be appropriate for you is a decision your
            licensed provider makes individually, based on your health history
            and current medications. Completing intake does not guarantee a
            prescription.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/ed/" hash="faq">
              View FAQ <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      <HowItWorksSteps
        className="bg-muted/40"
        eyebrow="How it works"
        title="How Beema's ED care works"
        showCareFollowUpNote
      />

      <Section id="pricing" className="pt-0">
        <SectionHeading
          align="left"
          title="Choose your formulation"
          description="Your provider decides which formulation, if any, is clinically appropriate - this is a starting point, not a self-selected order."
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <SimpleTreatmentPricingCard
            label="tadalafil"
            pricing={ED_TADALAFIL_PRICING}
            cta={{ label: "Explore Tadalafil", to: "/tadalafil/" }}
          />
          <SimpleTreatmentPricingCard
            label="sildenafil"
            pricing={ED_SILDENAFIL_PRICING}
            cta={{ label: "Explore Sildenafil", to: "/sildenafil/" }}
          />
        </div>
        <div className="mt-8">
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-foreground">
              Who may be eligible
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Not everyone qualifies. Your provider weighs cardiovascular
              history, current medications, and applicable state law before
              making an independent decision.
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
              <HeartPulse className="size-6 shrink-0 text-accent-foreground" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Prescription medical care
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  These medications are prescription products and aren't
                  appropriate for everyone, including people on certain nitrate
                  medications or with certain cardiovascular conditions. They
                  are the FDA-approved generic versions of Cialis and Viagra,
                  dispensed by a licensed pharmacy.
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
                  Include your full medical history, possible contraindications,
                  side effects, and any medication interactions, especially
                  nitrates, in your intake questionnaire. After you complete
                  intake and pay, you can ask follow-up questions. Before then,
                  email{" "}
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
              <LineReveal>Ready to get started?</LineReveal>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              Pick a formulation to see full pricing and start your medical
              intake. A licensed provider makes every clinical decision
              independently, prescribing is never guaranteed.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <HoverLiftButton>
                <Button
                  asChild
                  size="xl"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  <Link to="/tadalafil/">
                    Explore Tadalafil <ArrowRight />
                  </Link>
                </Button>
              </HoverLiftButton>
              <HoverLiftButton>
                <Button
                  asChild
                  size="xl"
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                >
                  <Link to="/sildenafil/">
                    Explore Sildenafil <ArrowRight />
                  </Link>
                </Button>
              </HoverLiftButton>
            </div>
          </div>
        </div>
      </Section>
      <MoneyPageGuides path="/ed/" />
    </MarketingLayout>
  );
}
