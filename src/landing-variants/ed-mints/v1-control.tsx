import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, CheckCircle2, HeartPulse } from "lucide-react";
import {
  CLINICAL_PROVIDER_GROUP,
  SEAN_ARORA_PROVIDER,
} from "@/lib/provider-info";
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
import { FAQ_ITEMS, WHATS_INCLUDED, ELIGIBILITY_POINTS } from "./shared";
import type { LandingVariant } from "../types";

function EdMintsControl() {
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
          <TreatmentBreadcrumb current="ED Mints" />
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <SectionHeading
                as="h1"
                align="left"
                eyebrow="Nationwide telehealth ED care"
                title={
                  <>
                    <LineReveal>ED Mints, </LineReveal>
                    <LineReveal delay={0.1}>
                      dissolve-under-the-tongue relief.
                    </LineReveal>
                  </>
                }
                description="Two combination formulations that dissolve under the tongue - no water needed. Completing intake does not guarantee a prescription."
                className="mx-0 max-w-xl text-left"
              />
              <motion.div
                className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
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
                  <Link to="/ed-mints/" hash="how-it-works">
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
                fetchPriority="high"). Animating opacity/scale in leaves it
                invisible in the SSR'd HTML until hydration + the animation
                frame complete, which measured as several extra seconds of
                mobile LCP (2026-09-27 performance audit) - render it visible
                immediately and only animate the non-LCP content below it.
              */}
              <div className="relative aspect-square overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
                <img
                  src={edMintsHeroPhoto}
                  alt="Beema Health ED Mints - blue four-part scored dissolvable erectile dysfunction tablet"
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
            <Link to="/ed-mints/" hash="faq">
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
      <MoneyPageGuides path="/ed-mints/" />
    </MarketingLayout>
  );
}

export const variant: LandingVariant = {
  id: "v1-control",
  label: "Control (original page)",
  Component: EdMintsControl,
};
