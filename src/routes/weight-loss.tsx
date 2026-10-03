import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  ChefHat,
  MapPin,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  Eyebrow,
  FloatingHexagons,
  HexBadge,
  HexMotif,
  HoverLiftButton,
  Section,
  SectionHeading,
  SurfaceCard,
} from "@/components/site/primitives";
import {
  TreatmentBreadcrumb,
  TreatmentComparisonTable,
  TreatmentFaqSection,
  TreatmentPricingCard,
} from "@/components/site/TreatmentPageBlocks";
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import { GoogleRatingBadge } from "@/components/site/GoogleRatingBadge";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { COMPOUNDED_DISCLOSURE } from "@/lib/compounded-disclosure";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import { RECIPES } from "@/lib/recipes";
import { cn } from "@/lib/utils";
import { resolveVialImagery, type MedicationId } from "@/lib/treatment-imagery";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  type CompoundedMedicationPricing,
} from "@/lib/medication-pricing";
import {
  WEIGHT_LOSS_CASH_PAY_POINTS,
  WEIGHT_LOSS_FAQ,
  WEIGHT_LOSS_HERO,
  WEIGHT_LOSS_LINK,
  WEIGHT_LOSS_SERVING_POINTS,
  weightLossHead,
} from "@/lib/weight-loss-page";

const MEDICATION_PICKER: Record<
  MedicationId,
  { label: string; pricing: CompoundedMedicationPricing }
> = {
  semaglutide: {
    label: "Semaglutide",
    pricing: COMPOUNDED_SEMAGLUTIDE_PRICING,
  },
  tirzepatide: {
    label: "Tirzepatide",
    pricing: COMPOUNDED_TIRZEPATIDE_PRICING,
  },
};

export const Route = createFileRoute("/weight-loss")({
  head: () => weightLossHead(),
  component: WeightLossPage,
});

function WeightLossPage() {
  const heroCta = resolveCta(CTA_IDS.weight_loss_hero);
  const footerCta = resolveCta(CTA_IDS.weight_loss_footer);
  const reduceMotion = useReducedMotion();
  const semaImagery = resolveVialImagery("semaglutide");
  const tirzImagery = resolveVialImagery("tirzepatide");
  const vialImagery: Record<MedicationId, typeof semaImagery> = {
    semaglutide: semaImagery,
    tirzepatide: tirzImagery,
  };
  const [selectedMedication, setSelectedMedication] =
    useState<MedicationId>("tirzepatide");

  useEffect(() => {
    trackPageViewed("weight_loss");
  }, []);

  return (
    <MarketingLayout>
      <Section className="relative overflow-hidden bg-grad-hero pb-10 md:pb-24">
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
          <TreatmentBreadcrumb current="Weight Loss" />
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <div className="relative max-w-xl pr-20 sm:pr-24">
                <LegitScriptSeal className="absolute right-0 top-0 w-16 [&_img]:h-auto [&_img]:w-full sm:w-20" />
                <Eyebrow>{WEIGHT_LOSS_HERO.eyebrow}</Eyebrow>
                <h1 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-foreground md:text-4xl lg:text-[2.75rem]">
                  <LineReveal>{WEIGHT_LOSS_HERO.titleLine1}</LineReveal>
                  <LineReveal delay={0.1}>
                    {WEIGHT_LOSS_HERO.titleLine2}
                  </LineReveal>
                </h1>
              </div>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                {WEIGHT_LOSS_HERO.description}
              </p>
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
                className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
                initial={reduceMotion ? false : { opacity: 0, y: 18 }}
                animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.6,
                  delay: reduceMotion ? 0 : 0.5,
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
                  <Link to={WEIGHT_LOSS_LINK} hash="how-it-works">
                    How care works
                  </Link>
                </Button>
              </motion.div>
            </div>
            {/*
              Plain wrapper, no motion, at full opacity immediately. The
              front vial carries fetchPriority="high" as the LCP candidate.
              A motion wrapper with opacity 0 would hide it until hydrate.
            */}
            <div className="relative mx-auto w-full max-w-sm lg:mx-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
                <div
                  aria-hidden
                  className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 opacity-70"
                />
                <img
                  src={tirzImagery.src}
                  alt={tirzImagery.alt}
                  width={tirzImagery.width}
                  height={tirzImagery.height}
                  className="absolute right-[8%] top-[6%] h-[58%] w-auto object-contain drop-shadow-xl"
                />
                <img
                  src={semaImagery.src}
                  alt={semaImagery.alt}
                  width={semaImagery.width}
                  height={semaImagery.height}
                  fetchPriority="high"
                  className="absolute bottom-[5%] left-[6%] h-[66%] w-auto object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="cash-pricing">
        <SectionHeading
          eyebrow="Cash pricing"
          title="Clear cash-pay rates for compounded options"
          description="No membership fee. Your licensed provider decides what medication and dose is appropriate for you - pricing below is cash-pay when prescribed."
        />
        <div className="mt-10 flex justify-center">
          <div
            role="tablist"
            aria-label="Choose a medication"
            className="inline-flex gap-1.5 rounded-full bg-muted p-1.5"
          >
            {(Object.keys(MEDICATION_PICKER) as MedicationId[]).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selectedMedication === id}
                onClick={() => setSelectedMedication(id)}
                className={cn(
                  "min-h-11 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selectedMedication === id
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {MEDICATION_PICKER[id].label}
              </button>
            ))}
          </div>
        </div>
        <div className="mx-auto mt-6 max-w-xl lg:max-w-4xl">
          <TreatmentPricingCard
            key={selectedMedication}
            pricing={MEDICATION_PICKER[selectedMedication].pricing}
            imagery={vialImagery[selectedMedication]}
            cta={heroCta}
          />
        </div>
        <ul className="mx-auto mt-8 max-w-2xl space-y-2">
          {WEIGHT_LOSS_CASH_PAY_POINTS.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <Wallet className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
              {point}
            </li>
          ))}
        </ul>
        <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {COMPOUNDED_DISCLOSURE}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/semaglutide/">Compounded Semaglutide</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/tirzepatide/">Compounded Tirzepatide</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/glp-1/">GLP-1 care</Link>
          </Button>
        </div>
      </Section>

      <Section className="pt-0">
        <TreatmentComparisonTable />
      </Section>

      <HowItWorksSteps
        eyebrow="How weight-loss care works"
        title={<LineReveal>From online intake to ongoing care</LineReveal>}
        showCareFollowUpNote
      />

      <Section className="relative overflow-hidden bg-muted/40">
        <HexMotif className="pointer-events-none absolute -right-10 top-8 z-0 w-48 text-primary/10 md:w-64" />
        <SurfaceCard className="relative z-10 grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start">
          <HexBadge className="size-14">
            <MapPin className="size-6" aria-hidden />
          </HexBadge>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
              Nationwide telehealth
            </p>
            <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
              Online care that&apos;s human and built for success.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
              Availability depends on your state. Most US states allow online
              clinic visits, but some do not. Where it applies, you complete
              Beema Health&apos;s medical intake online and a licensed provider
              reviews your case by telehealth. When clinically appropriate and
              legally available, compounded semaglutide or tirzepatide may be
              prescribed and shipped to you. Beema Health does not serve
              patients outside the United States.
            </p>
            <ul className="mt-5 space-y-2">
              {WEIGHT_LOSS_SERVING_POINTS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/safety/">Safety & eligibility</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/glp-1-houston/">GLP-1 care in Houston</Link>
              </Button>
            </div>
          </div>
        </SurfaceCard>
      </Section>

      <Section className="pt-0">
        <SurfaceCard className="grid items-center gap-8 bg-primary-soft/60 lg:grid-cols-[1fr_auto]">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-accent-foreground">
              <ChefHat className="size-5" aria-hidden />
              Free recipe collection
            </p>
            <h2 className="mt-3 text-3xl font-bold text-foreground">
              Practical meal ideas, available to everyone
            </h2>
            <p className="mt-4 max-w-3xl leading-relaxed text-muted-foreground">
              A practical educational resource we provide as part of the Beema
              Health experience - free to browse whether or not you&apos;re a
              patient.
            </p>
            <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">
              No intake is required to access all {RECIPES.length} recipes.
            </p>
          </div>
          <Button asChild size="lg" variant="outline">
            <Link to="/recipes/">
              Browse free recipes <ArrowRight aria-hidden />
            </Link>
          </Button>
        </SurfaceCard>
      </Section>

      <Section>
        <div className="mb-8 flex justify-center">
          <HexBadge className="size-11">
            <ShieldCheck className="size-5" aria-hidden />
          </HexBadge>
        </div>
        <SectionHeading
          eyebrow="FAQ"
          title="Medical weight loss, pricing, and getting started"
          description="Straight answers for adults comparing online medical weight-loss care."
        />
        <div className="mt-10">
          <TreatmentFaqSection items={WEIGHT_LOSS_FAQ} />
        </div>
      </Section>

      <Section className="pt-0">
        <div className="relative overflow-hidden rounded-4xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
          <div
            aria-hidden
            className="bg-mesh-primary-depth mesh-drift pointer-events-none absolute inset-0 z-0"
          />
          <HexMotif className="float-slow pointer-events-none absolute -left-8 -top-8 z-0 w-40 text-primary-foreground/10 md:w-56" />
          <HexMotif className="float-slower pointer-events-none absolute -bottom-10 -right-8 z-0 w-48 text-primary-foreground/10 md:w-64" />
          <div className="relative z-10">
            <h2 className="text-3xl font-bold">
              <LineReveal>Get started online</LineReveal>
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
              Complete medical intake from home. No payment required to start. A
              prescription is never guaranteed.
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
      <MoneyPageGuides path="/weight-loss/" />
    </MarketingLayout>
  );
}
