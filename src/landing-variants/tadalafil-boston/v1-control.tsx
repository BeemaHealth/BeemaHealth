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
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  ED_TADALAFIL_PER_PILL_USD,
  formatPerPillStartingAt,
} from "@/lib/simple-treatment-pricing";
import { SUPPORT_EMAIL } from "@/lib/contact-info";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import tadalafilPhoto from "@/assets/treatments/tadalafil-oral-tablets-bottle.webp";
import { FAQ_ITEMS } from "./shared";
import type { LandingVariant } from "../types";

/**
 * Boston paid-search landing page (2026-09-27) - Google Ads keyword ->
 * landing-page alignment for "tadalafil boston" / "cialis boston" style
 * queries. Mirrors /tadalafil's copy, components, product data, pricing,
 * and Bask intake, with genuinely localized hero/FAQ copy rather than a
 * mechanical "nationwide" -> "Boston" swap. Self-canonicalizes; never
 * canonicalize back to /tadalafil. See docs/features/treatment-pages.md
 * "City ED pages" and /tadalafil.tsx (the nationwide page, unchanged).
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
  "Final approval rests with a licensed provider",
];

function TadalafilBostonControl() {
  const heroCta = resolveCta(CTA_IDS.tadalafil_boston_hero);
  const footerCta = resolveCta(CTA_IDS.tadalafil_boston_footer);
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
        <div className="relative z-10">
          <TreatmentBreadcrumb current="Tadalafil in Boston" />
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <div className="relative pr-20 sm:pr-24">
                <LegitScriptSeal className="absolute right-0 top-0 w-16 [&_img]:h-auto [&_img]:w-full sm:w-20" />
                <SectionHeading
                  as="h1"
                  align="left"
                  eyebrow="Boston telehealth ED care"
                  title={
                    <>
                      <LineReveal>Tadalafil treatment </LineReveal>
                      <LineReveal delay={0.1}>for Boston patients.</LineReveal>
                    </>
                  }
                  description="Beema Health connects eligible adults in Boston with licensed medical providers for tadalafil-based erectile dysfunction care. Complete your visit online and, if prescribed, medication is delivered discreetly to your door."
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
                  <Link to="/tadalafil-boston/" hash="how-it-works">
                    How it works
                  </Link>
                </Button>
              </motion.div>
              <p className="mt-6 max-w-md text-2xl font-bold text-foreground">
                From {formatPerPillStartingAt(ED_TADALAFIL_PER_PILL_USD)}
              </p>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-muted-foreground">
                Medication eligibility and availability are determined by a
                licensed provider and applicable law.
              </p>
            </div>
            <div className="mx-auto w-full max-w-sm">
              {/*
                Not motion-animated: this is the page's LCP element (preloaded,
                fetchPriority="high"). See docs/features/treatment-pages.md,
                "Hero photo is never motion-animated" - same fix applied to
                /tadalafil applies here, since this hero reuses that photo.
              */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
                <img
                  src={tadalafilPhoto}
                  alt="Bottle of Beema Health tadalafil oral tablets, generic Cialis"
                  width={720}
                  height={900}
                  fetchPriority="high"
                  className="absolute inset-0 h-full w-full object-contain"
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
          title="What is tadalafil?"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            Tadalafil works by relaxing blood vessels so more blood can flow to
            the penis. That can make it easier to get and keep an erection when
            you're sexually aroused. It doesn't cause arousal by itself - you
            still need to be sexually stimulated for it to work. Tadalafil is
            known for a longer duration of action than other ED medications,
            which is why some patients take a low dose daily rather than only as
            needed.
          </p>
          <p>
            Beema Health's tadalafil is the FDA-approved generic version of
            Cialis - the identical active ingredient, strength, and intended use
            as the brand-name product, dispensed by a licensed pharmacy, not a
            compounded formulation. Looking for sildenafil instead? See{" "}
            <Link to="/sildenafil-boston/" className="text-primary underline">
              Sildenafil in Boston
            </Link>
            . Looking for a dissolve-under-the-tongue combination formulation?
            See{" "}
            <Link to="/ed-mints-boston/" className="text-primary underline">
              ED Mints in Boston
            </Link>
            , a separate compounded product.
          </p>
          <p>
            Whether tadalafil may be appropriate for you is a decision your
            licensed provider makes individually, based on your health history
            and current medications. Completing intake does not guarantee a
            prescription.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to="/tadalafil-boston/" hash="faq">
              View FAQ <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </Section>

      <Section className="pt-0">
        <SectionHeading
          align="left"
          eyebrow="Serving Boston"
          title="Telehealth tadalafil care for Boston, Massachusetts"
          className="mx-0 max-w-2xl"
        />
        <div className="mt-6 max-w-2xl space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            If you're in Boston, or anywhere else in Massachusetts, you can
            complete Beema Health's medical intake entirely online, from home -
            there is no physical Boston office or in-person clinic to visit. A
            licensed provider reviews your case by telehealth and decides, on an
            individual basis, whether tadalafil may be appropriate for you. When
            prescribed, medication ships to your Boston address.
          </p>
          <p>
            Licensed providers can evaluate adults in all 50 US states,
            including Massachusetts. Looking for the nationwide version of this
            page instead? See{" "}
            <Link to="/tadalafil/" className="text-primary underline">
              Tadalafil
            </Link>
            .
          </p>
        </div>
      </Section>

      <HowItWorksSteps
        className="bg-muted/40"
        eyebrow="How it works"
        title="How Beema Health's tadalafil care works"
        showCareFollowUpNote
      />

      <Section className="pt-0">
        <SurfaceCard>
          <h3 className="text-lg font-semibold text-foreground">
            Who may be eligible
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Not everyone qualifies. Your provider weighs cardiovascular history,
            current medications, and applicable state law before making an
            independent decision.
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
                  This medication is a prescription product and isn't
                  appropriate for everyone, including people on certain nitrate
                  medications or with certain cardiovascular conditions. It is
                  the FDA-approved generic version of Cialis, dispensed by a
                  licensed pharmacy.
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

      <MedicalTeamSection className="pt-0" />

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
      <MoneyPageGuides path="/tadalafil-boston/" />
    </MarketingLayout>
  );
}

export const variant: LandingVariant = {
  id: "v1-control",
  label: "Control (original page)",
  Component: TadalafilBostonControl,
};
