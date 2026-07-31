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
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
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
  TreatmentIncludedDropdown,
  TreatmentPricingCard,
  type TreatmentFaqItem,
} from "@/components/site/TreatmentPageBlocks";
import { BmiCalculator } from "@/components/site/BmiCalculator";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  COMPOUNDED_TIRZEPATIDE_PRICING,
  compoundedMonthlyPricingSentence,
} from "@/lib/medication-pricing";
import { CompoundedPriceLockup } from "@/components/site/CompoundedPriceLockup";
import { resolveVialImagery } from "@/lib/treatment-imagery";
import {
  CLINICAL_PROVIDER_GROUP,
  SEAN_ARORA_PROVIDER,
} from "@/lib/provider-info";

const VIAL_IMAGERY = resolveVialImagery("tirzepatide");

const TITLE = "Compounded Tirzepatide for Weight Loss | Beema Health";
const DESCRIPTION = `Compounded tirzepatide for medical weight loss, reviewed by licensed providers. Nationwide telehealth care at $${COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd}/mo. Prescribing is never guaranteed.`;

const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is compounded tirzepatide?",
    a: "Tirzepatide is a GLP-1/GIP medication used in medical weight-management care. It's available both as an FDA-approved branded medication and, separately, as a compounded version prepared by a licensed compounding pharmacy rather than sold under a brand name. Compounded tirzepatide is not the same product as the branded version: it is not FDA-approved, and it's considered as part of care only when it is legally available and clinically appropriate for the specific patient. A licensed provider decides, on a case-by-case basis, whether compounded tirzepatide may be an appropriate option, based on your BMI, health history, current medications, and applicable state law. To be considered, you'll complete a brief eligibility check and medical intake, which a licensed provider reviews before making that decision. Completing an eligibility check and medical intake does not guarantee that compounded tirzepatide, or any treatment, will ultimately be prescribed for you.",
  },
  {
    q: "Is tirzepatide right for me?",
    a: "Whether tirzepatide is right for you depends on your BMI, health history, current medications, and a licensed provider's independent clinical judgment, not a fixed checklist. Beema Health's tirzepatide care is intended for adults 18 and older, and eligibility also depends on applicable state law where you live. During the process, you complete a brief eligibility check, create an account, and submit a medical intake describing your health history, current medications, and goals. A licensed provider reviews that information and decides, on a case-by-case basis, whether tirzepatide specifically, or another approach like compounded semaglutide, may be appropriate for your situation. Completing an eligibility check and intake does not guarantee that tirzepatide, or any treatment, will be prescribed, and not everyone who applies will be approved. If you're unsure, our BMI calculator and weight-loss program overview can help you think through whether it's worth starting a conversation with a provider.",
  },
  {
    q: "How does online tirzepatide care through Beema work?",
    a: "Care starts with a brief eligibility check covering your health, location, and goals, which takes about 5 minutes. If you appear to be a potential fit, you create an account and complete a secure medical intake questionnaire at your own pace, covering your health history, current medications, and weight-loss goals in more depth. A licensed provider then reviews your intake and independently decides whether tirzepatide, or another treatment, may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability. If a provider does prescribe treatment, care includes the doctor consultation and visit, the prescription medication, ongoing doctor follow-up, and supplies like syringes and alcohol pads, along with expedited shipping to your door. Beema Health connects patients nationwide with independently licensed providers, though medication availability and eligibility still depend on your state's requirements.",
  },
  {
    q: "How much does tirzepatide cost through Beema?",
    a: `${compoundedMonthlyPricingSentence("Compounded tirzepatide through Beema", COMPOUNDED_TIRZEPATIDE_PRICING)} This is medication-only cash pricing with no separate platform membership fee, and your final cost can vary based on the dosage your provider recommends. Doctor visits, prescription medication, ongoing doctor follow-up care, and supplies like syringes and alcohol pads are included, along with expedited shipping, and any additional costs like labs would be shown separately before you're charged. Because compounded tirzepatide is a prescription medication, a licensed provider must review your medical intake and independently decide it's appropriate before treatment begins; completing intake never guarantees a prescription. If cost is a concern, ask about promo code eligibility and plan-length options during your medical intake.`,
  },
  {
    q: "Does Beema serve patients nationwide?",
    a: "Yes. Beema Health is available to patients in all 50 U.S. states, connecting you with independently licensed providers as part of a nationwide telehealth model. That said, medication availability and eligibility still depend on your state's specific requirements, since compounding regulations and prescribing rules vary by location. They also depend on your assigned provider's independent clinical decision after reviewing your medical intake, health history, current medications, and BMI. The clinician who reviews your case may vary based on state licensure and availability, but every provider in Beema's network is independently licensed and makes treatment decisions using their own clinical judgment, whether that decision concerns tirzepatide, compounded semaglutide, or another approach entirely. Completing an eligibility check and intake from anywhere in the country does not guarantee that tirzepatide, or any other treatment, will ultimately be prescribed for you.",
  },
  {
    q: "Is compounded tirzepatide FDA-approved?",
    a: "No. Compounded tirzepatide is not an FDA-approved medication the way branded tirzepatide is; it's prepared individually by a licensed compounding pharmacy rather than manufactured and approved as a standardized branded drug. Because of that, it is not the same product as an FDA-approved branded medication, and it's considered as part of care only when it is legally available and clinically appropriate for a given patient. A licensed provider weighs your BMI, health history, current medications, and applicable state law before deciding, on a case-by-case basis, whether compounded tirzepatide may be an appropriate option, or whether another approach, such as compounded semaglutide, makes more sense. If you would rather stick with an FDA-approved branded medication, discuss that preference with your provider during your intake review so they can factor it into their independent clinical decision. For more detail on eligibility, contraindications, and warning signs, see Beema's safety and eligibility information.",
  },
  {
    q: "How quickly can treatment begin?",
    a: "How quickly you can start depends on a few factors: how fast you complete the roughly 5-minute eligibility check and the more detailed medical intake questionnaire, how quickly a licensed provider reviews your information and makes an independent clinical decision, and how quickly the pharmacy can fulfill and ship your prescription if one is issued. Because intake is self-paced and provider review takes real clinical judgment rather than an automatic approval, we cannot promise a specific start date for any individual patient. Shipping is expedited once a prescription is issued as part of your included care, but pharmacy timelines can still vary. It's also worth remembering that prescribing is never guaranteed: a licensed provider may determine that tirzepatide, or any treatment, is not appropriate for you based on your health history, current medications, or applicable state law, regardless of how quickly you move through intake. If you're unsure how long to expect, our how-it-works overview walks through each stage in more detail.",
  },
  {
    q: "Can I switch to Beema if I'm already on tirzepatide elsewhere?",
    a: "Yes. If you're already taking tirzepatide with another provider, tell us about your current provider, dose, and how long you've been on treatment during your medical intake. Your Beema provider will factor that history into their independent clinical review, generally with the goal of keeping you on a comparable dose rather than having you restart from scratch, though the final decision is always theirs based on your full health history and current medications. It's important to give accurate, complete details in your intake, since your answers directly shape the dose and treatment plan your provider considers appropriate for you. As with any new patient, completing an eligibility check and intake doesn't guarantee that tirzepatide, or any specific dose, will be prescribed; a licensed provider makes that call after independently reviewing your case, health history, current medications, and applicable state law where you live. Beema serves patients nationwide, though your assigned provider may vary by state licensure.",
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

const WHATS_INCLUDED = [
  "Doctor Consultation & Visit",
  "Prescription Medication",
  "Ongoing Doctor Care",
  "Syringes",
  "Expedited Shipping",
  "Alcohol Pads",
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
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceJsonLd({
            name: "Compounded Tirzepatide Weight-Loss Telehealth Care",
            description: DESCRIPTION,
            path: "/tirzepatide",
            serviceType: "Medical weight-loss telehealth service",
            reviewedByClinicalLead: true,
            offer: {
              introPrice: 197,
              recurringPrice: 297,
            },
          }),
        ),
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
              <CompoundedPriceLockup
                className="mt-6 max-w-md"
                pricing={COMPOUNDED_TIRZEPATIDE_PRICING}
                size="lg"
              />
              <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                Medication eligibility and availability are determined by a
                licensed provider and applicable law.
              </p>
              <TreatmentIncludedDropdown
                items={WHATS_INCLUDED}
                className="mt-6 max-w-md"
              />
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
                src={VIAL_IMAGERY.src}
                alt={VIAL_IMAGERY.alt}
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
          <p>
            Not sure tirzepatide is the right fit? Learn about our{" "}
            <Link to="/weight-loss/" className="text-primary underline">
              weight-loss program
            </Link>{" "}
            to see the full range of options.
          </p>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeading
          align="left"
          title="Check your BMI"
          description="See where your BMI falls, then decide if it's worth a conversation with a licensed provider."
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8">
          <BmiCalculator
            ctaId={CTA_IDS.tirzepatide_bmi}
            medicationLabel="tirzepatide"
          />
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
        <p className="mt-3 flex max-w-2xl items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <Stethoscope className="mt-0.5 size-3.5 shrink-0 text-accent-foreground" />
          <span>
            Clinical oversight: {SEAN_ARORA_PROVIDER.displayName},{" "}
            {SEAN_ARORA_PROVIDER.credentials}, {SEAN_ARORA_PROVIDER.role} of{" "}
            {CLINICAL_PROVIDER_GROUP}, oversees Beema Health's clinical provider
            network. Every licensed provider makes treatment decisions
            independently.
          </span>
        </p>
        <p className="mt-1.5 max-w-2xl text-xs text-muted-foreground/70">
          Medically reviewed on July 31, 2026.
        </p>
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
