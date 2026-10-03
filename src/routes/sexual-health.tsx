import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Pill,
  ShieldCheck,
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
  SimpleCategoryLineup,
  TreatmentBreadcrumb,
  TreatmentFaqSection,
  type CategoryLineupItem,
} from "@/components/site/TreatmentPageBlocks";
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import { GoogleRatingBadge } from "@/components/site/GoogleRatingBadge";
import { EASE_OUT, LineReveal } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  COMPOUNDED_ED_MINTS_REQUIRED,
  GENERIC_SILDENAFIL_REQUIRED,
  GENERIC_TADALAFIL_REQUIRED,
} from "@/lib/compounded-disclosure";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import {
  ED_MINTS_RDT_PRICING,
  ED_SILDENAFIL_PRICING,
  ED_TADALAFIL_PRICING,
} from "@/lib/simple-treatment-pricing";
import {
  SEXUAL_HEALTH_FAQ,
  SEXUAL_HEALTH_HERO,
  SEXUAL_HEALTH_LINK,
  SEXUAL_HEALTH_SERVING_POINTS,
  sexualHealthHead,
} from "@/lib/sexual-health-page";
import tadalafilPhoto from "@/assets/treatments/tadalafil-oral-tablets-bottle.webp";
import sildenafilPhoto from "@/assets/treatments/sildenafil-oral-tablets-bottle.webp";
import edMintsHeroPhoto from "@/assets/treatments/ed-mints-dissolvable-tablet.webp";

export const Route = createFileRoute("/sexual-health")({
  head: () => sexualHealthHead(),
  component: SexualHealthPage,
});

/**
 * TRT is paused. This hub is ED-only until it returns. ED Mints links to
 * /ed-mints (both formulations, same price), so ED_MINTS_RDT_PRICING is the
 * card price. Photos match each money page.
 */
const LINEUP: CategoryLineupItem[] = [
  {
    id: "ed-mints",
    name: "ED Mints",
    form: "Dissolves under the tongue, no water needed",
    pricing: ED_MINTS_RDT_PRICING,
    icon: Pill,
    image: {
      src: edMintsHeroPhoto,
      alt: "Beema Health ED Mints - dissolvable erectile dysfunction tablet embossed with the Beema Health logo",
      width: 1024,
      height: 1024,
    },
    to: "/ed-mints/",
  },
  {
    id: "ed-tadalafil",
    name: "Tadalafil",
    form: "Oral tablet, generic Cialis, taken as needed or daily",
    pricing: ED_TADALAFIL_PRICING,
    icon: Pill,
    image: {
      src: tadalafilPhoto,
      alt: "Bottle of Beema Health tadalafil oral tablets, generic Cialis",
      width: 720,
      height: 900,
    },
    to: "/tadalafil/",
  },
  {
    id: "ed-sildenafil",
    name: "Sildenafil",
    form: "Oral tablet, generic Viagra, taken as needed",
    pricing: ED_SILDENAFIL_PRICING,
    icon: Pill,
    image: {
      src: sildenafilPhoto,
      alt: "Bottle of Beema Health sildenafil oral tablets, generic Viagra",
      width: 720,
      height: 900,
    },
    to: "/sildenafil/",
  },
];

function SexualHealthPage() {
  const heroCta = resolveCta(CTA_IDS.sexual_health_hero);
  const footerCta = resolveCta(CTA_IDS.sexual_health_footer);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    trackPageViewed("sexual_health");
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
          <TreatmentBreadcrumb current="Sexual Health" />
          <div className="mt-8 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            <div>
              <div className="relative max-w-xl pr-20 sm:pr-24">
                <LegitScriptSeal className="absolute right-0 top-0 w-16 [&_img]:h-auto [&_img]:w-full sm:w-20" />
                <Eyebrow>{SEXUAL_HEALTH_HERO.eyebrow}</Eyebrow>
                <h1 className="mt-4 text-balance text-3xl font-bold leading-[1.1] tracking-tight text-foreground md:text-4xl lg:text-[2.75rem]">
                  <LineReveal>{SEXUAL_HEALTH_HERO.titleLine1}</LineReveal>
                  <LineReveal delay={0.1}>
                    {SEXUAL_HEALTH_HERO.titleLine2}
                  </LineReveal>
                </h1>
              </div>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                {SEXUAL_HEALTH_HERO.description}
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
                    <Link to={SEXUAL_HEALTH_LINK} hash="formulations">
                      Compare formulations <ArrowRight />
                    </Link>
                  </Button>
                </HoverLiftButton>
                <Button asChild size="xl" variant="outline">
                  <Link
                    to={heroCta.to}
                    search={heroCta.search}
                    onClick={heroCta.onClick}
                  >
                    {heroCta.label}
                  </Link>
                </Button>
              </motion.div>
            </div>
            <div className="relative mx-auto w-full max-w-sm lg:mx-0">
              <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
                <div
                  aria-hidden
                  className="bg-mesh-glow mesh-drift pointer-events-none absolute inset-0 opacity-70"
                />
                <img
                  src={edMintsHeroPhoto}
                  alt="Beema Health ED Mints - dissolvable erectile dysfunction tablet embossed with the Beema Health logo"
                  width={1024}
                  height={1024}
                  className="absolute right-[6%] top-[5%] h-[42%] w-auto object-contain drop-shadow-xl"
                />
                <img
                  src={sildenafilPhoto}
                  alt="Bottle of Beema Health sildenafil oral tablets, generic Viagra"
                  width={720}
                  height={900}
                  className="absolute right-[4%] bottom-[6%] h-[48%] w-auto object-contain drop-shadow-xl"
                />
                <img
                  src={tadalafilPhoto}
                  alt="Bottle of Beema Health tadalafil oral tablets, generic Cialis"
                  width={720}
                  height={900}
                  fetchPriority="high"
                  className="absolute bottom-[8%] left-[4%] h-[62%] w-auto object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="formulations" className="bg-muted/40">
        <SectionHeading
          align="left"
          eyebrow="Choose a formulation"
          title="ED treatment options"
          description="Your provider decides which formulation, if any, is clinically appropriate. Each option has its own page and online visit."
          className="mx-0 max-w-2xl"
        />
        <div className="mt-10">
          <SimpleCategoryLineup items={LINEUP} />
        </div>
        <div className="mt-8 max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
          <p>{GENERIC_TADALAFIL_REQUIRED}</p>
          <p>{GENERIC_SILDENAFIL_REQUIRED}</p>
          <p>{COMPOUNDED_ED_MINTS_REQUIRED}</p>
        </div>
        <p className="mt-6">
          <Link
            to="/ed/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-foreground underline-offset-4 hover:underline"
          >
            Compare tadalafil and sildenafil
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </p>
      </Section>

      <HowItWorksSteps
        eyebrow="How ED care works"
        title={
          <LineReveal>From online intake to a provider decision</LineReveal>
        }
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
              clinic visits, but some do not. Where it applies, adult men
              complete intake online. A licensed provider reviews health history
              and current medications, including cardiovascular history, and
              decides whether treatment may be appropriate. Prescribing is never
              guaranteed. Beema Health does not serve patients outside the
              United States.
            </p>
            <ul className="mt-5 space-y-2">
              {SEXUAL_HEALTH_SERVING_POINTS.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Button asChild variant="outline">
                <Link to="/safety/">Safety & eligibility</Link>
              </Button>
            </div>
          </div>
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
          title="ED treatment, pricing, and getting started"
          description="Straight answers for men comparing online ED treatment."
        />
        <div className="mt-10">
          <TreatmentFaqSection items={SEXUAL_HEALTH_FAQ} />
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
              Complete intake from home. No payment required to start. A
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
      <MoneyPageGuides path="/sexual-health/" />
    </MarketingLayout>
  );
}
