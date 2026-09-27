import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
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
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import { cn } from "@/lib/utils";
import { resolveVialImagery, type MedicationId } from "@/lib/treatment-imagery";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  type CompoundedMedicationPricing,
} from "@/lib/medication-pricing";
import {
  CASH_PAY_POINTS,
  SERVING_POINTS,
  getGlp1Copy,
  type Glp1Market,
} from "@/lib/glp-1-landing";

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

export function Glp1LandingPage({ market }: { market: Glp1Market }) {
  const copy = getGlp1Copy(market);
  const heroCta = resolveCta(CTA_IDS.glp1_hero);
  const midCta = resolveCta(CTA_IDS.glp1_mid);
  const footerCta = resolveCta(CTA_IDS.glp1_footer);
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
    trackPageViewed(copy.analyticsPage);
  }, [copy.analyticsPage]);

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
          <TreatmentBreadcrumb current={copy.breadcrumbName} />
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <div className="relative max-w-xl pr-20 sm:pr-24">
                <LegitScriptSeal className="absolute right-0 top-0 w-16 [&_img]:h-auto [&_img]:w-full sm:w-20" />
                <Eyebrow>{copy.heroEyebrow}</Eyebrow>
                <h1 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-foreground md:text-4xl lg:text-[2.75rem]">
                  <LineReveal>{copy.heroTitleLine1}</LineReveal>
                  <LineReveal delay={0.1}>{copy.heroTitleLine2}</LineReveal>
                </h1>
              </div>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                {copy.heroDescription}
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
                  <Link to={copy.linkPath} hash="how-it-works">
                    How care works
                  </Link>
                </Button>
              </motion.div>
            </div>

            {/*
                Plain wrapper, no motion, at full opacity immediately - this
                image carries fetchPriority="high" as the page's LCP
                candidate. A motion.div with an initial opacity:0 here would
                reintroduce the exact LCP regression fixed sitewide 2026-09-27
                (see docs/features/treatment-pages.md, "Hero photo is never
                motion-animated"): Motion's initial state ships in the SSR'd
                HTML too, so the LCP element would stay invisible until React
                hydrates and the fade/scale animation finishes.
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
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        >
          <SectionHeading
            eyebrow="GLP-1 cash pricing"
            title="Clear cash-pay rates for compounded options"
            description="No membership fee. Your licensed provider decides what medication and dose is appropriate for you - pricing below is cash-pay when prescribed."
          />
        </motion.div>
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
        <motion.div
          key={selectedMedication}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: EASE_OUT }}
          className="mx-auto mt-6 max-w-xl lg:max-w-4xl"
        >
          <TreatmentPricingCard
            pricing={MEDICATION_PICKER[selectedMedication].pricing}
            imagery={vialImagery[selectedMedication]}
            cta={midCta}
          />
        </motion.div>
        <ul className="mx-auto mt-8 max-w-2xl space-y-2">
          {CASH_PAY_POINTS.map((point, i) => (
            <motion.li
              key={point}
              className="flex items-start gap-2 text-sm text-foreground"
              initial={reduceMotion ? false : { opacity: 0, x: -12 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{
                duration: reduceMotion ? 0 : 0.4,
                delay: reduceMotion ? 0 : i * 0.08,
                ease: EASE_OUT,
              }}
            >
              <Wallet className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
              {point}
            </motion.li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline">
            <Link to="/semaglutide/">Compounded Semaglutide</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/tirzepatide/">Compounded Tirzepatide</Link>
          </Button>
        </div>
      </Section>

      <Section className="pt-0">
        <TreatmentComparisonTable />
      </Section>

      <HowItWorksSteps
        eyebrow="How GLP-1 care works"
        title={<LineReveal>From online intake to ongoing care</LineReveal>}
        showCareFollowUpNote
      />

      <Section className="relative overflow-hidden bg-muted/40">
        <HexMotif className="pointer-events-none absolute -right-10 top-8 z-0 w-48 text-primary/10 md:w-64" />
        <motion.div
          className="relative z-10"
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        >
          <SurfaceCard className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start">
            <HexBadge className="size-14">
              <MapPin className="size-6" aria-hidden />
            </HexBadge>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-accent-foreground">
                {copy.servingEyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-bold text-foreground md:text-3xl">
                {copy.servingTitle}
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
                {copy.servingBody}
              </p>
              {copy.servingMarketLink ? (
                <p className="mt-4">
                  <Link
                    to={copy.servingMarketLink.to}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-foreground underline-offset-4 hover:underline"
                  >
                    {copy.servingMarketLink.label}
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </p>
              ) : null}
              <ul className="mt-5 space-y-2">
                {SERVING_POINTS.map((item) => (
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
                <HoverLiftButton>
                  <Button asChild>
                    <Link
                      to={midCta.to}
                      search={midCta.search}
                      onClick={midCta.onClick}
                    >
                      {midCta.label} <ArrowRight />
                    </Link>
                  </Button>
                </HoverLiftButton>
                <Button asChild variant="outline">
                  <Link to="/safety/">Safety & eligibility</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/weight-loss/">Weight-loss program</Link>
                </Button>
              </div>
            </div>
          </SurfaceCard>
        </motion.div>
      </Section>

      <Section>
        <div className="mb-8 flex justify-center">
          <HexBadge className="size-11">
            <ShieldCheck className="size-5" aria-hidden />
          </HexBadge>
        </div>
        <SectionHeading
          eyebrow="FAQ"
          title="GLP-1 care, pricing, and getting started"
          description={copy.faqDescription}
        />
        <div className="mt-10">
          <TreatmentFaqSection items={copy.faqItems} />
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
              {copy.footerCtaBody}
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
      <MoneyPageGuides
        path={market === "houston" ? "/glp-1-houston/" : "/glp-1/"}
      />
    </MarketingLayout>
  );
}
