import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CheckCircle2, HeartPulse } from "lucide-react";
import { MedicalTeamSection } from "@/components/site/MedicalTeamSection";
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
} from "@/components/site/TreatmentPageBlocks";
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import { GoogleRatingBadge } from "@/components/site/GoogleRatingBadge";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { EdMintsPickerModal } from "@/components/site/EdMintsPicker";
import {
  ED_MINTS_RDT_PRICING,
  formatSimpleQuarterlyStartingAt,
} from "@/lib/simple-treatment-pricing";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import edMintsHeroPhoto from "@/assets/treatments/ed-mints-dissolvable-tablet.webp";
import { FAQ_ITEMS } from "./shared";
import type { LandingVariant } from "../types";
import { cn } from "@/lib/utils";

/**
 * Below-the-fold sections skip layout and paint until they near the viewport
 * (CSS content-visibility). Keeps them in the DOM for SEO and anchor links.
 */
const LAZY_SECTION =
  "[content-visibility:auto] [contain-intrinsic-size:auto_640px]";

/**
 * Boston paid-search landing page (2026-09-27) - Google Ads keyword ->
 * landing-page alignment for "ed treatment boston" / "ed medication
 * boston" style queries. Mirrors /ed-mints's copy, components, product
 * data (both formulations), pricing, and Bask intake, with genuinely
 * localized hero/FAQ copy rather than a mechanical "nationwide" -> "Boston"
 * swap. Self-canonicalizes; never canonicalize back to /ed-mints. See
 * docs/features/treatment-pages.md "City ED pages" and /ed-mints.tsx (the
 * nationwide page, unchanged). Reuses `EdMintsPickerModal` as-is - its
 * Continue button still resolves to `ed_mints_rdt_hero`/`ed_mints_odt_hero`
 * for per-formulation attribution, matching the nationwide page's behavior.
 */

const WHATS_INCLUDED = [
  "Prescription Formulation",
  "Doctor Consultation & Visit",
  "Ongoing Doctor Care",
  "Shipping",
  "Dedicated Human Customer Support",
  { label: "Free learning resources", to: "/learn/" },
];

const ELIGIBILITY_POINTS = [
  "Adult men, 18 and older",
  "Eligibility considers cardiovascular history and current medications",
  "Final approval and formulation selection rests with a licensed provider",
];

function EdMintsBostonControl() {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerInitial, setPickerInitial] = useState<"rdt" | "odt">("odt");
  const reduceMotion = useReducedMotion();

  const openPicker = (preselect: "rdt" | "odt" = "odt") => {
    setPickerInitial(preselect);
    setPickerOpen(true);
  };

  return (
    <MarketingLayout>
      <EdMintsPickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initialSelected={pickerInitial}
      />

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
          <TreatmentBreadcrumb current="ED Mints in Boston" />
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <div className="relative pr-20 sm:pr-24">
                <LegitScriptSeal className="absolute right-0 top-0 w-16 [&_img]:h-auto [&_img]:w-full sm:w-20" />
                <SectionHeading
                  as="h1"
                  align="left"
                  eyebrow="Boston online ED care"
                  title={
                    <>
                      <LineReveal>ED Mints, </LineReveal>
                      <LineReveal delay={0.1}>for Boston patients.</LineReveal>
                    </>
                  }
                  description="Beema Health connects eligible adults in Boston with licensed medical providers for personalized erectile dysfunction treatment. Complete your visit online and, if prescribed, medication is delivered discreetly to your door."
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
                  <Button size="xl" onClick={() => openPicker()}>
                    Get Started <ArrowRight />
                  </Button>
                </HoverLiftButton>
                <Button asChild size="xl" variant="outline">
                  <Link to="/ed-mints-boston/" hash="how-it-works">
                    How it works
                  </Link>
                </Button>
              </motion.div>
              <p className="mt-6 max-w-md text-2xl font-bold text-foreground">
                From {formatSimpleQuarterlyStartingAt(ED_MINTS_RDT_PRICING)}
              </p>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                Medication eligibility, formulation, and availability are
                determined by a licensed provider and applicable law. Same price
                for either formulation.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm">
              {/*
                Not motion-animated: this is the page's LCP element (preloaded,
                fetchPriority="high"). See docs/features/treatment-pages.md,
                "Hero photo is never motion-animated" - same fix applied to
                /ed-mints applies here, since this hero reuses that photo.
              */}
              <div className="relative aspect-square overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
                <img
                  src={edMintsHeroPhoto}
                  alt="Beema Health ED Mints - dissolvable ED tablet for Boston patients, embossed with the Beema Health logo"
                  width={1024}
                  height={1024}
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </div>
              <motion.div
                initial={false}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.5,
                  delay: reduceMotion ? 0 : 0.3,
                  ease: EASE_OUT,
                }}
              >
                <TreatmentIncludedDropdown
                  items={WHATS_INCLUDED}
                  className="mt-6 w-full"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeading
          align="left"
          title="What are ED Mints?"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            ED Mints are compounded combination formulations that dissolve under
            the tongue instead of being swallowed with water. Most patients take
            one about 30 minutes before sexual activity, and no more than one
            dose in a 24-hour period. They don't cause arousal by themselves -
            you still need to be sexually stimulated for them to work.
          </p>
          <p>
            Beema Health offers two ED Mints formulations, each a combination
            not sold as a single commercial product and prepared at an
            FDA-registered 503B outsourcing facility. These formulations are not
            FDA-approved and are considered only when legally available and
            clinically appropriate. Which option, if any, may be appropriate for
            you is a decision your licensed provider makes individually.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/ed-mints-boston/" hash="faq">
              View FAQ <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <SurfaceCard>
            <h3 className="text-base font-semibold text-foreground">
              Tadalafil + Sildenafil 12mg/60mg RDT
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              A rapidly dissolving tablet combining tadalafil and sildenafil
              into one dose.
            </p>
          </SurfaceCard>
          <SurfaceCard>
            <h3 className="text-base font-semibold text-foreground">
              Sildenafil 50mg/Tadalafil 20mg/Oxytocin 125 IU ODT
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              An orally dissolving tablet combining sildenafil, tadalafil, and
              oxytocin into one dose.
            </p>
          </SurfaceCard>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeading
          align="left"
          eyebrow="Serving Boston"
          title="Telehealth ED care for Boston, Massachusetts"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            If you're in Boston, or anywhere else in Massachusetts, you can
            complete Beema Health's medical intake entirely online, from home -
            there is no physical Boston office or in-person clinic to visit. A
            licensed provider reviews your case by telehealth and decides, on an
            individual basis, whether an ED Mints formulation may be appropriate
            for you. When prescribed, medication ships to your Boston address.
          </p>
          <p>
            Licensed providers can evaluate adults in all 50 US states,
            including Massachusetts. Looking for the nationwide version of this
            page instead? See{" "}
            <Link to="/ed-mints/" className="text-primary underline">
              ED Mints
            </Link>
            .
          </p>
        </div>
      </Section>

      <HowItWorksSteps
        className="bg-muted/40"
        eyebrow="How it works"
        title="How Beema Health's ED Mints care works"
        showCareFollowUpNote
      />

      <Section id="formulations" className="pt-0">
        <SectionHeading
          align="left"
          title="Choose your formulation"
          description={`Your provider decides which formulation, if any, is clinically appropriate - this is a starting point, not a self-selected order. Both are ${formatSimpleQuarterlyStartingAt(ED_MINTS_RDT_PRICING)}, and each has its own intake.`}
          className="mx-0 max-w-2xl"
        />
        <div className="mt-8 flex justify-center">
          <HoverLiftButton>
            <Button size="xl" onClick={() => openPicker()}>
              Get Started <ArrowRight />
            </Button>
          </HoverLiftButton>
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

      <Section className={cn("bg-muted/40 pt-0", LAZY_SECTION)}>
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
                  These formulations are prescription products and aren't
                  appropriate for everyone, including people on certain nitrate
                  medications or with certain cardiovascular conditions. They
                  are compounded at an FDA-registered 503B outsourcing facility,
                  not FDA-approved, and considered only when legally available
                  and clinically appropriate.
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
      </Section>

      <MedicalTeamSection className={cn("pt-0", LAZY_SECTION)} />

      <Section
        id="faq"
        className={cn("scroll-mt-20 bg-muted/40 pt-0", LAZY_SECTION)}
      >
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

      <Section className={cn("pt-0", LAZY_SECTION)}>
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
                size="xl"
                className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                onClick={() => openPicker()}
              >
                Get Started <ArrowRight />
              </Button>
            </HoverLiftButton>
          </div>
        </div>
      </Section>
      <MoneyPageGuides path="/ed-mints-boston/" />
    </MarketingLayout>
  );
}

export const variant: LandingVariant = {
  id: "v1-control",
  label: "Control (original page)",
  Component: EdMintsBostonControl,
};
