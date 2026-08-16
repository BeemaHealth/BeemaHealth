import { useEffect } from "react";
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
  FloatingHexagons,
  HexBadge,
  HexMotif,
  MagneticButton,
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
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
} from "@/lib/medication-pricing";
import {
  CASH_PAY_POINTS,
  SERVING_POINTS,
  getGlp1Copy,
  type Glp1Market,
} from "@/lib/glp-1-landing";

export function Glp1LandingPage({ market }: { market: Glp1Market }) {
  const copy = getGlp1Copy(market);
  const heroCta = resolveCta(CTA_IDS.glp1_hero);
  const midCta = resolveCta(CTA_IDS.glp1_mid);
  const footerCta = resolveCta(CTA_IDS.glp1_footer);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed(copy.analyticsPage);
  }, [copy.analyticsPage]);

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
          <div className="mb-6 flex flex-col items-center gap-4">
            <TreatmentBreadcrumb current={copy.breadcrumbName} />
            <LegitScriptSeal />
          </div>
          <SectionHeading
            as="h1"
            eyebrow={copy.heroEyebrow}
            title={
              <>
                <LineReveal>{copy.heroTitleLine1}</LineReveal>
                <LineReveal delay={0.1}>{copy.heroTitleLine2}</LineReveal>
              </>
            }
            description={copy.heroDescription}
          />
          <motion.div
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
            initial={reduceMotion ? false : { opacity: 0, y: 18 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.6,
              delay: reduceMotion ? 0 : 0.55,
              ease: EASE_OUT,
            }}
          >
            <MagneticButton>
              <Button asChild size="xl">
                <Link
                  to={heroCta.to}
                  search={heroCta.search}
                  onClick={heroCta.onClick}
                >
                  {heroCta.label} <ArrowRight />
                </Link>
              </Button>
            </MagneticButton>
            <Button asChild size="xl" variant="outline">
              <Link to={copy.linkPath} hash="how-it-works">
                How care works
              </Link>
            </Button>
          </motion.div>
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
            description="No membership fee. Your licensed provider decides whether compounded semaglutide or compounded tirzepatide is appropriate - pricing below is cash-pay when prescribed."
          />
        </motion.div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="flex h-full flex-col gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              Compounded Semaglutide
            </h3>
            <TreatmentPricingCard
              pricing={COMPOUNDED_SEMAGLUTIDE_PRICING}
              className="h-full"
            />
          </div>
          <div className="flex h-full flex-col gap-3">
            <h3 className="text-lg font-semibold text-foreground">
              Compounded Tirzepatide
            </h3>
            <TreatmentPricingCard
              pricing={COMPOUNDED_TIRZEPATIDE_PRICING}
              className="h-full"
            />
          </div>
        </div>
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
                <MagneticButton>
                  <Button asChild>
                    <Link
                      to={midCta.to}
                      search={midCta.search}
                      onClick={midCta.onClick}
                    >
                      {midCta.label} <ArrowRight />
                    </Link>
                  </Button>
                </MagneticButton>
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
            <MagneticButton className="mt-8">
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
            </MagneticButton>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}
