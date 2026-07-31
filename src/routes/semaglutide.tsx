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
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  compoundedMonthlyPricingSentence,
} from "@/lib/medication-pricing";
import { CompoundedPriceLockup } from "@/components/site/CompoundedPriceLockup";
import { resolveVialImagery } from "@/lib/treatment-imagery";

const VIAL_IMAGERY = resolveVialImagery("semaglutide");

const TITLE = "Compounded Semaglutide for Weight Loss | Beema Health";
const DESCRIPTION = `Compounded semaglutide for medical weight loss, personalized by licensed providers. Nationwide telehealth care at $${COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd}/mo. Prescribing is never guaranteed.`;
const SERVICE_DESCRIPTION =
  "Nationwide telehealth medical weight-loss service connecting eligible adults with independent licensed providers for compounded semaglutide evaluation and ongoing care. Completing intake does not guarantee a prescription.";

const FAQ_ITEMS: TreatmentFaqItem[] = [
  {
    q: "What is compounded semaglutide?",
    a: "Compounded semaglutide is a GLP-1 medication prepared by a licensed compounding pharmacy rather than manufactured and sold under a brand name. It's used in medical weight-management care, and because it isn't reviewed and approved by the FDA the same way a branded drug is, its formulation, strength, and preparation can differ from an FDA-approved branded medication. Beema only makes compounded semaglutide available when it's legally permitted in your state and a licensed provider determines it's clinically appropriate for your individual case. To be considered, you'll complete a short eligibility check, create a secure account, and finish a medical intake questionnaire covering your health history, current medications, and goals. A licensed provider then reviews that information and independently decides whether compounded semaglutide, compounded tirzepatide, or another option makes sense for you. Because it's a prescription medication, your provider's individual judgment always determines eligibility, dosage, and whether treatment is appropriate at all.",
  },
  {
    q: "Is semaglutide right for me?",
    a: "Whether semaglutide is right for you depends on several factors your licensed provider reviews individually: your BMI, health history, current medications, and any potential contraindications or interactions. During your medical intake questionnaire, you'll share detailed information about your health so your provider can make an informed, independent clinical decision, prescribing is never guaranteed, and not everyone who applies will be approved. Provider approval also depends on applicable state law, since medication availability can vary by state. If semaglutide isn't the right fit for you, your provider may discuss compounded tirzepatide or another approach as part of Beema's broader weight-loss program instead. The most reliable way to find out if semaglutide is appropriate for your situation is to complete the short eligibility check and full intake so a licensed provider can evaluate your case directly.",
  },
  {
    q: "How does online semaglutide care through Beema work?",
    a: "Care starts with a short eligibility check, about five minutes, covering your health, location, and weight-loss goals. If you appear eligible, you'll create a secure account and complete a medical intake questionnaire that asks about your health history, current medications, and treatment goals in more depth; you can save your progress and return to it anytime. A licensed provider then reviews your intake and makes an independent clinical decision about whether compounded semaglutide is appropriate for you, prescribing is never guaranteed. Beema's clinical provider network is led by Dr. Sean Arora, MD, of Arora Health & Aesthetics, though the specific clinician assigned to your case may vary by state licensure and availability. If approved, your plan includes prescription medication, ongoing doctor care, supplies like alcohol pads and syringes, and expedited shipping, with follow-up visits so your provider can monitor your progress and adjust care as needed.",
  },
  {
    q: "How much does semaglutide cost through Beema?",
    a: `${compoundedMonthlyPricingSentence("Compounded semaglutide through Beema", COMPOUNDED_SEMAGLUTIDE_PRICING)} It's medication-only cash pricing with no platform membership fee, and your provider's dosage recommendation can affect the final cost. Your plan is designed to cover everything needed for standard care: prescription medication, ongoing doctor care, alcohol pads, a doctor consultation and visit, syringes, and expedited shipping, so there typically aren't unexpected add-on fees. Because dosage is determined individually by your provider based on your health history and treatment response, some patients may see a different total cost than another patient at a different dose. If cost is a concern, ask about promo code eligibility and plan-length options during your medical intake.`,
  },
  {
    q: "Does Beema serve patients nationwide?",
    a: "Yes, Beema Health is available to patients in all 50 U.S. states, so you can start your eligibility check and medical intake no matter where you live. That said, whether compounded semaglutide specifically is available to you still depends on your state's rules around compounded medications and on pharmacy fulfillment in your area, since compounding regulations and sourcing can vary from state to state. Even where compounded semaglutide is available, eligibility is always an individual clinical decision made by a licensed provider after reviewing your health history, current medications, and BMI, it isn't guaranteed just because you're in a covered state. If compounded semaglutide isn't an option where you live or for your specific case, your provider may discuss compounded tirzepatide or another approach as part of Beema's broader weight-loss program. Completing the short eligibility check is the fastest way to find out what's available to you.",
  },
  {
    q: "Is compounded semaglutide FDA-approved?",
    a: "No, compounded semaglutide is not FDA-approved. Unlike the branded, FDA-approved version of semaglutide, compounded versions are prepared individually by a licensed compounding pharmacy and are not manufactured, tested, or reviewed by the FDA the same way. Beema only makes compounded semaglutide available when it's legally permitted under applicable state and federal rules and when a licensed provider independently determines it's clinically appropriate for your specific case. It should not be assumed to be identical in formulation, strength, or effect to an FDA-approved branded medication, even though both are the same class of medication. Your provider will discuss this distinction with you, along with your medical history, potential contraindications, and side effects, before recommending or prescribing compounded semaglutide. For more detail on how eligibility, safety, and warning signs are evaluated, see Beema's safety and eligibility information, which covers these considerations in more depth.",
  },
  {
    q: "How quickly can treatment begin?",
    a: "How quickly treatment can begin depends on a few things you influence and a few your provider and pharmacy control. On your end, it depends on how quickly you complete the short eligibility check and the full medical intake questionnaire, since incomplete or inaccurate information can slow provider review. From there, timing depends on how fast a licensed provider can review your case and make an independent clinical decision, and, if approved, how quickly the pharmacy can fulfill and ship your prescription with expedited shipping. Because prescribing is never guaranteed and depends on your individual health history, current medications, and applicable state law, Beema can't guarantee a specific start date or that treatment will be approved at all. If you're switching from another provider, sharing your current dose accurately can also help your provider determine your correct starting dose without unnecessary delay.",
  },
  {
    q: "Can I switch to Beema if I'm already on semaglutide elsewhere?",
    a: "Yes. If you're already taking semaglutide through another provider, your medical intake questionnaire asks about your current provider, medication, and dose so your Beema provider can review your treatment history as part of their independent clinical evaluation. The goal is to help your provider aim to continue you at a comparable dose rather than starting your titration over from the beginning, though the final dosing decision always rests with your licensed provider based on your full health picture. Accuracy matters here: the dose and history you report is the information your provider relies on to determine what's appropriate for you going forward, so double-check those details before submitting your intake. As with any new patient, your provider will also review your broader health history, current medications, and any contraindications before confirming your plan. If you have questions about switching, you can also review Beema's safety and eligibility information for more context on how transitions are evaluated.",
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

const WHATS_INCLUDED = [
  "Prescription Medication",
  "Ongoing Doctor Care",
  "Alcohol Pads",
  "Doctor Consultation & Visit",
  "Syringes",
  "Expedited Shipping",
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
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceJsonLd({
            name: "Compounded Semaglutide Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/semaglutide",
            serviceType: "Medical weight-loss telehealth service",
            reviewedByClinicalLead: true,
            dateModified: "2026-07-31",
            offer: { introPrice: 99, recurringPrice: 199 },
          }),
        ),
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
              <CompoundedPriceLockup
                className="mt-6 max-w-md"
                pricing={COMPOUNDED_SEMAGLUTIDE_PRICING}
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
                width={VIAL_IMAGERY.width}
                height={VIAL_IMAGERY.height}
                fetchPriority="high"
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
          <p>
            Not sure semaglutide is the right fit? Learn about our{" "}
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
            ctaId={CTA_IDS.semaglutide_bmi}
            medicationLabel="semaglutide"
          />
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
        <p className="mt-6 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Clinical oversight: Beema Health&rsquo;s clinical provider network is
          led by {SEAN_ARORA_PROVIDER.displayName},{" "}
          {SEAN_ARORA_PROVIDER.credentials}, {SEAN_ARORA_PROVIDER.role} of{" "}
          {CLINICAL_PROVIDER_GROUP}. Licensed clinicians make every treatment
          decision independently, the clinician assigned to your care may vary
          by state licensure and availability.
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Medically reviewed on July 31, 2026.
        </p>
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
