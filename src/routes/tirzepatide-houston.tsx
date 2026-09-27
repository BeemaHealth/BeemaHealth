import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
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
  HoverLiftButton,
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
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { BmiCalculator } from "@/components/site/BmiCalculator";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import { GoogleRatingBadge } from "@/components/site/GoogleRatingBadge";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  COMPOUNDED_TIRZEPATIDE_PRICING,
  compoundedMonthlyPricingSentence,
} from "@/lib/medication-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import { LEARN_USA_ONLY_SENTENCE } from "@/lib/learn-trust-copy";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { CompoundedPriceLockup } from "@/components/site/CompoundedPriceLockup";
import { bootImagePreloadLinks } from "@/lib/boot-assets";
import { resolveVialImagery } from "@/lib/treatment-imagery";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import { learnPath } from "@/content/learn/types";
import {
  CLINICAL_PROVIDER_GROUP,
  SEAN_ARORA_PROVIDER,
} from "@/lib/provider-info";

const VIAL_IMAGERY = resolveVialImagery("tirzepatide");

const HOUSTON_AREA_SERVED = [
  {
    "@type": "City",
    name: "Houston",
    containedInPlace: { "@type": "State", name: "Texas" },
  },
  { "@type": "Country", name: "United States" },
];

const STARTER = COMPOUNDED_TIRZEPATIDE_PRICING.starterPack!;
const TITLE =
  "Tirzepatide in Houston, TX | Online Weight Loss Care | Beema Health";
const DESCRIPTION =
  "Explore online tirzepatide weight-loss care for eligible adults in Houston, Texas. Licensed provider review, transparent cash pricing, and medication delivery if prescribed.";
const SERVICE_DESCRIPTION =
  "Telehealth medical weight-loss service connecting eligible adults in Houston, Texas with independent licensed providers for compounded tirzepatide evaluation and ongoing care. Completing intake does not guarantee a prescription.";

const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is compounded tirzepatide?",
    a: "Tirzepatide is a GLP-1/GIP medication used in medical weight-management care. It's available both as an FDA-approved branded medication and, separately, as a compounded version prepared by a licensed compounding pharmacy rather than sold under a brand name. Compounded tirzepatide is not the same product as the branded version: it is not FDA-approved, and it's considered as part of care only when it is legally available and clinically appropriate for the specific patient. A licensed provider decides, on a case-by-case basis, whether compounded tirzepatide may be an appropriate option, based on your BMI, health history, current medications, and applicable state law. To be considered, you'll complete a medical intake, which a licensed provider reviews before making that decision. Completing a medical intake does not guarantee that compounded tirzepatide, or any treatment, will ultimately be prescribed for you.",
  },
  {
    q: "Does Beema Health have a physical office in Houston?",
    a: `No. Beema Health is a telehealth service - there is no Houston clinic or office to visit. Your intake, provider review, and any prescribed medication are handled entirely online, with medication shipped to your Houston address. ${LEARN_USA_ONLY_SENTENCE}`,
  },
  {
    q: "Is tirzepatide right for me?",
    a: "Whether tirzepatide is right for you depends on your BMI, health history, current medications, and a licensed provider's independent clinical judgment, not a fixed checklist. Beema Health's tirzepatide care is intended for adults 18 and older, and eligibility also depends on applicable state law where you live. During the process, you create an account and submit a medical intake describing your health history, current medications, and goals. A licensed provider reviews that information and decides, on a case-by-case basis, whether tirzepatide specifically, or another approach like compounded semaglutide, may be appropriate for your situation. Completing intake does not guarantee that tirzepatide, or any treatment, will be prescribed, and not everyone who applies will be approved. If you're unsure, our BMI calculator and weight-loss program overview can help you think through whether it's worth starting a conversation with a provider.",
  },
  {
    q: "How does online tirzepatide care through Beema Health work for Houston patients?",
    a: "Care starts with creating an account and completing a secure medical intake questionnaire at your own pace, covering your health, location, weight-loss goals, health history, and current medications. A licensed provider then reviews your intake and independently decides whether tirzepatide, or another treatment, may be appropriate for you; prescribing is never guaranteed. Beema Health's clinical provider network is led by Dr. Sean Arora, MD, though the clinician assigned to your case may vary by state licensure and availability. If a provider does prescribe treatment, care includes the doctor consultation and visit, the prescription medication, ongoing doctor follow-up, and supplies like syringes and alcohol pads, along with expedited shipping to your Houston address.",
  },
  {
    q: "How much does tirzepatide cost through Beema Health?",
    a: `${compoundedMonthlyPricingSentence("Compounded tirzepatide through Beema Health", COMPOUNDED_TIRZEPATIDE_PRICING)} Pricing is the same nationwide, including for Houston patients - that listed rate is all-inclusive cash-pay pricing with no separate platform membership fee: it covers doctor visits, prescription medication, ongoing doctor follow-up care, supplies like syringes and alcohol pads, and expedited shipping. Because compounded tirzepatide is a prescription medication, a licensed provider must review your medical intake and independently decide it's appropriate before treatment begins; completing intake never guarantees a prescription. Questions about promo codes or plan length? ${patientQuestionsGuidance()}`,
  },
  {
    q: "Is compounded tirzepatide FDA-approved?",
    a: `No. Compounded tirzepatide is not an FDA-approved medication the way branded tirzepatide is; it's prepared individually by a licensed compounding pharmacy rather than manufactured and approved as a standardized branded drug. Because of that, it is not the same product as an FDA-approved branded medication, and it's considered as part of care only when it is legally available and clinically appropriate for a given patient. A licensed provider weighs your BMI, health history, current medications, and applicable state law before deciding, on a case-by-case basis, whether compounded tirzepatide may be an appropriate option, or whether another approach, such as compounded semaglutide, makes more sense. ${patientQuestionsGuidance()} For more detail on eligibility, contraindications, and warning signs, see Beema Health's safety and eligibility information.`,
  },
  {
    q: "How quickly can treatment begin?",
    a: "How quickly you can start depends on a few factors: how fast you complete your medical intake questionnaire, how quickly a licensed provider reviews your information and makes an independent clinical decision, and how quickly the pharmacy can fulfill and ship your prescription if one is issued. Because intake is self-paced and provider review takes real clinical judgment rather than an automatic approval, we cannot promise a specific start date for any individual patient. Shipping is expedited once a prescription is issued as part of your included care, but pharmacy timelines can still vary. It's also worth remembering that prescribing is never guaranteed: a licensed provider may determine that tirzepatide, or any treatment, is not appropriate for you based on your health history, current medications, or applicable state law, regardless of how quickly you move through intake.",
  },
  {
    q: "Can I switch to Beema Health if I'm already on tirzepatide elsewhere?",
    a: "Yes. If you're already taking tirzepatide with another provider, tell us about your current provider, dose, and how long you've been on treatment during your medical intake. Your Beema Health provider will factor that history into their independent clinical review, generally with the goal of keeping you on a comparable dose rather than having you restart from scratch, though the final decision is always theirs based on your full health history and current medications. It's important to give accurate, complete details in your intake, since your answers directly shape the dose and treatment plan your provider considers appropriate for you. As with any new patient, completing intake doesn't guarantee that tirzepatide, or any specific dose, will be prescribed.",
  },
];

const WHATS_INCLUDED = [
  "Doctor Consultation & Visit",
  "Prescription Medication",
  "Ongoing Doctor Care",
  "Syringes",
  "Expedited Shipping",
  "Alcohol Pads",
  { label: "Free recipes", to: "/recipes/" },
  { label: "Free learning resources", to: "/learn/" },
];

const ELIGIBILITY_POINTS = [
  "Adults 18 and older",
  "Eligibility depends on BMI, health history, and current medications",
  "A licensed provider makes the final decision, based on your intake and applicable state law",
];

export const Route = createFileRoute("/tirzepatide-houston")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/tirzepatide-houston") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/tirzepatide-houston") },
      ...bootImagePreloadLinks("/tirzepatide-houston"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            {
              name: "Compounded Tirzepatide in Houston",
              path: "/tirzepatide-houston",
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
            name: "Compounded Tirzepatide Weight-Loss Telehealth Care in Houston",
            description: SERVICE_DESCRIPTION,
            path: "/tirzepatide-houston",
            serviceType: "Medical weight-loss telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-27",
            areaServed: HOUSTON_AREA_SERVED,
            offer: {
              introPrice: STARTER.monthlyEquivalentUsd,
              recurringPrice: COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: TirzepatideHoustonPage,
});

function TirzepatideHoustonPage() {
  const heroCta = resolveCta(CTA_IDS.tirzepatide_houston_hero);
  const footerCta = resolveCta(CTA_IDS.tirzepatide_houston_footer);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("tirzepatide_houston");
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
          <TreatmentBreadcrumb current="Compounded Tirzepatide in Houston" />
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <div className="relative pr-20 sm:pr-24">
                <LegitScriptSeal className="absolute right-0 top-0 w-16 [&_img]:h-auto [&_img]:w-full sm:w-20" />
                <SectionHeading
                  as="h1"
                  align="left"
                  eyebrow="Houston telehealth weight-loss care"
                  title={
                    <>
                      <LineReveal>Tirzepatide weight-loss care </LineReveal>
                      <LineReveal delay={0.1}>for Houston patients.</LineReveal>
                    </>
                  }
                  description="Beema Health connects eligible adults in Houston with independent licensed providers for individualized tirzepatide weight-management care. Complete your intake online and, if prescribed, medication ships to your door."
                  className="mx-0 max-w-xl text-left"
                />
              </div>
              <motion.div
                className="mt-6"
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.6,
                  delay: reduceMotion ? 0 : 0.35,
                  ease: EASE_OUT,
                }}
              >
                <GoogleRatingBadge />
              </motion.div>
              <motion.div
                className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
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
                  <Link to="/tirzepatide-houston/" hash="how-it-works">
                    How it works
                  </Link>
                </Button>
              </motion.div>
              <CompoundedPriceLockup
                className="mt-6 max-w-md"
                pricing={COMPOUNDED_TIRZEPATIDE_PRICING}
                size="lg"
              />
              <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                To see the starter pack price, mark that you are new to GLP-1
                when asked during intake. Starter pack and Tirz100 can&apos;t be
                used together. Medication eligibility and availability are
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
              <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
                <img
                  src={VIAL_IMAGERY.src}
                  alt={VIAL_IMAGERY.alt}
                  width={VIAL_IMAGERY.width}
                  height={VIAL_IMAGERY.height}
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
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        >
          <SectionHeading
            align="left"
            title="Online tirzepatide care for Houston patients"
            className="mx-0 max-w-2xl"
          />
        </motion.div>
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Beema Health has no clinic or office in Houston. Instead, a provider
            licensed to treat patients in Texas reviews your medical intake
            online, under the same Texas telemedicine rules that govern an
            in-person visit. If compounded tirzepatide is prescribed, it's
            shipped directly to your Houston address rather than picked up in
            person.
          </p>
          <p>
            Tirzepatide is a GLP-1/GIP medication used in medical
            weight-management care. It's available both as an FDA-approved
            branded medication and, separately, as a compounded version prepared
            by a licensed compounding pharmacy. Compounded tirzepatide is not
            the same product as the branded version, it is not FDA-approved and
            is considered only when legally available and clinically
            appropriate.
          </p>
          <p>
            Want the fuller picture of how Texas telemedicine law applies, and
            what Houston's climate means for storing and taking a GLP-1
            medication? See our{" "}
            <Link
              to={learnPath("weight-loss", "tirzepatide-in-houston")}
              className="text-primary underline"
            >
              Houston tirzepatide guide
            </Link>
            . Looking for care outside Houston?{" "}
            <Link to="/tirzepatide/" className="text-primary underline">
              See our nationwide tirzepatide program
            </Link>
            .
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
            ctaId={CTA_IDS.tirzepatide_houston_bmi}
            medicationLabel="tirzepatide"
          />
        </div>
      </Section>

      <HowItWorksSteps
        className="bg-muted/40"
        eyebrow="How it works"
        title="How Beema Health's tirzepatide care works for Houston patients"
        showCareFollowUpNote
      />

      <Section id="pricing" className="pt-0">
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
                  Include your full medical history, potential
                  contraindications, side effects, and any medication
                  interactions in your intake questionnaire. After you complete
                  intake and pay, you can ask follow-up questions. Before then,
                  email{" "}
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="text-primary underline"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                  . For more detail on eligibility, contraindications, and
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
          title="Tirzepatide vs. semaglutide"
          description="Both are GLP-1 medications used in medical weight-management care. Neither is universally better, appropriateness is an individual clinical decision."
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8">
          <TreatmentComparisonTable highlight="tirzepatide" />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Curious about the alternative?{" "}
          <Link to="/semaglutide-houston/" className="text-primary underline">
            See compounded semaglutide details for Houston
          </Link>
          .
        </p>
      </Section>

      <Section id="faq" className="scroll-mt-20 bg-muted/40 pt-0">
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
              , or explore our{" "}
              <Link to="/recipes/" className="text-primary underline">
                free practical meal ideas
              </Link>
              - available to everyone with no intake required.
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
      <MoneyPageGuides path="/tirzepatide-houston/" />
    </MarketingLayout>
  );
}
