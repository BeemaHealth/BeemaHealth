import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  ShieldCheck,
} from "lucide-react";
import { MedicalTeamSection } from "@/components/site/MedicalTeamSection";
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
} from "@/components/site/TreatmentPageBlocks";
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { BmiCalculator } from "@/components/site/BmiCalculator";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import { GoogleRatingBadge } from "@/components/site/GoogleRatingBadge";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { COMPOUNDED_SEMAGLUTIDE_PRICING } from "@/lib/medication-pricing";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { CompoundedPriceLockup } from "@/components/site/CompoundedPriceLockup";
import { resolveVialImagery } from "@/lib/treatment-imagery";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import { learnPath } from "@/content/learn/types";
import { FAQ_ITEMS } from "./shared";
import type { LandingVariant } from "../types";

const VIAL_IMAGERY = resolveVialImagery("semaglutide");

const WHATS_INCLUDED = [
  "Prescription Medication",
  "Ongoing Doctor Care",
  "Alcohol Pads",
  "Doctor Consultation & Visit",
  "Syringes",
  "Expedited Shipping",
  "Dedicated Human Customer Support",
  { label: "Free learning resources", to: "/learn/" },
  { label: "Free recipes", to: "/recipes/" },
];

const ELIGIBILITY_POINTS = [
  "Adults 18 and older",
  "Eligibility considers BMI, health history, and current medications",
  "Final approval rests with a licensed provider",
];

function SemaglutideHoustonControl() {
  const heroCta = resolveCta(CTA_IDS.semaglutide_houston_hero);
  const footerCta = resolveCta(CTA_IDS.semaglutide_houston_footer);
  const reduceMotion = useReducedMotion();

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
          <TreatmentBreadcrumb current="Compounded Semaglutide in Houston" />
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
                      <LineReveal>Semaglutide weight-loss care </LineReveal>
                      <LineReveal delay={0.1}>for Houston patients.</LineReveal>
                    </>
                  }
                  description="Beema Health connects eligible adults in Houston with independent licensed providers for individualized semaglutide weight-management care. Complete your intake online and, if prescribed, medication ships to your door."
                  className="mx-0 max-w-xl text-left"
                />
              </div>
              <motion.div
                className="mt-6"
                initial={false}
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
                initial={false}
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
                  <Link to="/semaglutide-houston/" hash="how-it-works">
                    How it works
                  </Link>
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
            </div>
            <motion.div
              initial={false}
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
            title="Online semaglutide care for Houston patients"
            className="mx-0 max-w-2xl"
          />
        </motion.div>
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Beema Health has no clinic or office in Houston. Instead, a provider
            licensed to treat patients in Texas reviews your medical intake
            online, under the same Texas telemedicine rules that govern an
            in-person visit. If compounded semaglutide is prescribed, it's
            shipped directly to your Houston address rather than picked up in
            person.
          </p>
          <p>
            Semaglutide is a GLP-1 medication used in medical weight-management
            care. Like tirzepatide, it comes in an FDA-approved branded form
            and, separately, as a compounded version made by a licensed
            compounding pharmacy. Compounded semaglutide is not FDA-approved and
            is considered only when legally available and clinically
            appropriate; whether it's an appropriate option for you is a
            decision your licensed provider makes individually.
          </p>
          <p>
            Want the fuller picture of how Texas telemedicine law applies, and
            what Houston's climate means for storing and taking a GLP-1
            medication? See our{" "}
            <Link
              to={learnPath("weight-loss", "semaglutide-in-houston")}
              className="text-primary underline"
            >
              Houston semaglutide guide
            </Link>
            . Looking for care outside Houston?{" "}
            <Link to="/semaglutide/" className="text-primary underline">
              See our nationwide semaglutide program
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
            ctaId={CTA_IDS.semaglutide_houston_bmi}
            medicationLabel="semaglutide"
          />
        </div>
      </Section>

      <HowItWorksSteps
        className="bg-muted/40"
        eyebrow="How it works"
        title="How Beema Health's semaglutide care works for Houston patients"
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
                  . For more on eligibility, contraindications, and warning
                  signs, see{" "}
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

      <MedicalTeamSection className="pt-0" />

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
          <Link to="/tirzepatide-houston/" className="text-primary underline">
            See compounded tirzepatide details for Houston
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
              For broader questions about pricing, shipping, and refills, see
              our full{" "}
              <Link to="/faq/" className="text-primary underline">
                FAQ
              </Link>
              , or browse our{" "}
              <Link to="/recipes/" className="text-primary underline">
                free practical meal ideas
              </Link>
              - available to everyone with no intake required.
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
      <MoneyPageGuides path="/semaglutide-houston/" />
    </MarketingLayout>
  );
}

export const variant: LandingVariant = {
  id: "v1-control",
  label: "Control (original page)",
  Component: SemaglutideHoustonControl,
};
