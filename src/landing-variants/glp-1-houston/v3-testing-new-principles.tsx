import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  Pill,
  Play,
  Star,
  Stethoscope,
  Syringe,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { LandingVariant } from "../types";
import { trackPageViewed } from "@/lib/analytics";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading } from "@/components/site/primitives";
import {
  TreatmentFaqSection,
  TreatmentPricingCard,
} from "@/components/site/TreatmentPageBlocks";
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { MedicalTeamSection } from "@/components/site/MedicalTeamSection";
import { EASE_OUT } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import { cn } from "@/lib/utils";
import { resolveVialImagery, type MedicationId } from "@/lib/treatment-imagery";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatUsd,
  getPlan,
  promoFirstMonthUsd,
  semaThreeMonthPromoTotalUsd,
  type CompoundedMedicationPricing,
} from "@/lib/medication-pricing";
import { GOOGLE_RATING_VALUE } from "@/lib/google-business";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import {
  CASH_PAY_POINTS,
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

/**
 * Patient story video, hosted on YouTube. Paste the video id (the part after
 * v= in the watch URL) below; while it is empty the whole section renders
 * nothing. Do not add paraphrased quotes or results claims next to it; the
 * video speaks for itself and the disclaimer below it is required.
 */
const PATIENT_STORY_YOUTUBE_ID = "ZRzKvDBRjYs";
const PATIENT_STORY_POSTER = "/videos/patient-story-glp1-poster.jpg";

/**
 * Click-to-load YouTube embed: no YouTube JS or cookies load until the
 * visitor taps play, which keeps the page fast on mobile.
 */
function PatientStoryVideo({ videoId }: { videoId: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl bg-foreground shadow-lift ring-1 ring-border/60">
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?autoplay=1&rel=0&playsinline=1`}
          title="Beema Health patient and founder story"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Play the Beema Health patient and founder story"
          className="group absolute inset-0 size-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <img
            src={PATIENT_STORY_POSTER}
            alt="Still frame from the Beema Health patient and founder story video"
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/20 transition-colors group-hover:bg-foreground/30">
            <span className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lift transition-transform group-hover:scale-105 md:size-20">
              <Play className="size-7 fill-current md:size-8" aria-hidden />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * Lead copy, about 300 characters: opens with the true cost of waiting, then
 * benefits (80%), then one feature. No results claims, no guarantee.
 */
const HERO_LEAD =
  "Get a plan built around your health history. A licensed provider reviews it and, if appropriate, ships compounded GLP-1 medication to your door. One monthly price covers it. Starting your intake is free.";

/**
 * Below-the-fold sections skip layout and paint until they near the viewport
 * (CSS content-visibility). Keeps them in the DOM for SEO and anchor links.
 */
const LAZY_SECTION =
  "[content-visibility:auto] [contain-intrinsic-size:auto_640px]";

const INCLUDED_CALLOUTS = [
  {
    icon: Stethoscope,
    title: "Provider care",
    body: "A licensed provider reviews your history and follows up.",
  },
  {
    icon: Pill,
    title: "Medication",
    body: "Compounded in a U.S. 503A-licensed pharmacy.",
  },
  {
    icon: Syringe,
    title: "Supplies",
    body: "What you need to start is part of the plan.",
  },
  {
    icon: Truck,
    title: "Expedited shipping",
    body: "Delivered to your door in Houston.",
  },
] as const;

/** Only claims that are true today (see src/lib/trust-signals.ts). */
const PROOF_STATS = [
  { value: GOOGLE_RATING_VALUE, label: "Google rating", stars: true },
  { value: "50 states", label: "Providers licensed per state", stars: false },
  { value: "503A", label: "U.S. licensed pharmacies", stars: false },
  { value: "$0", label: "Membership fees", stars: false },
] as const;

function IncludedCallout({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="font-bold text-foreground">{title}</p>
        <p className="mt-0.5 text-sm leading-snug text-muted-foreground">
          {body}
        </p>
      </div>
    </li>
  );
}

function Glp1HoustonVariantB() {
  const market: Glp1Market = "houston";
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

  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: reduceMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT },
  } as const;

  // Same figures as dualCompoundedShortPricingLine(), split into tiles.
  const tirzStarter = COMPOUNDED_TIRZEPATIDE_PRICING.starterPack;
  const priceTiles = [
    {
      name: "Semaglutide",
      price: formatUsd(promoFirstMonthUsd(COMPOUNDED_SEMAGLUTIDE_PRICING)),
      unit: "first month",
      detail: `Then ${formatUsd(COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd)}/mo · ${formatUsd(
        semaThreeMonthPromoTotalUsd(),
      )} for 3 months`,
    },
    {
      name: "Tirzepatide",
      price: `from ${formatUsd(
        tirzStarter
          ? tirzStarter.monthlyEquivalentUsd
          : getPlan(COMPOUNDED_TIRZEPATIDE_PRICING, 12).monthlyUsd,
      )}`,
      unit: "per month",
      detail: tirzStarter
        ? `${formatUsd(tirzStarter.totalUsd)} for ${tirzStarter.months} months`
        : null,
    },
  ];

  return (
    <MarketingLayout>
      <section className="bg-background pb-12 pt-6 md:pb-20 md:pt-14">
        <div className="veya-container">
          <div className="grid items-center gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-balance text-[1.7rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  Online GLP-1 weight-loss care in Houston
                </h1>
                {/* Desktop seal beside the heading; mobile gets it in the trust row below. */}
                <LegitScriptSeal className="hidden w-20 lg:inline-block [&_img]:h-auto [&_img]:w-full" />
                {/* Small clarity shot so the product is visible on a phone without scrolling. */}
                <div
                  aria-hidden
                  className="relative -mt-1 h-28 w-24 shrink-0 sm:h-32 sm:w-28 lg:hidden"
                >
                  <img
                    src={tirzImagery.src}
                    alt=""
                    width={tirzImagery.width}
                    height={tirzImagery.height}
                    className="absolute right-0 top-0 h-[62%] w-auto object-contain drop-shadow-lg"
                  />
                  <img
                    src={semaImagery.src}
                    alt=""
                    width={semaImagery.width}
                    height={semaImagery.height}
                    className="absolute bottom-0 left-0 h-[72%] w-auto object-contain drop-shadow-xl"
                  />
                </div>
              </div>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
                {HERO_LEAD}
              </p>

              <div className="mt-5">
                <Button asChild size="xl" className="w-full sm:w-auto">
                  <Link
                    to={heroCta.to}
                    search={heroCta.search}
                    onClick={heroCta.onClick}
                  >
                    {heroCta.label} <ArrowRight />
                  </Link>
                </Button>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {priceTiles.map((tile) => (
                  <div
                    key={tile.name}
                    className="rounded-2xl border border-border bg-card p-4 shadow-soft"
                  >
                    <p className="text-xs font-semibold text-muted-foreground md:text-sm">
                      {tile.name}
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                      {tile.price}
                    </p>
                    <p className="text-xs text-muted-foreground md:text-sm">
                      {tile.unit}
                    </p>
                    {tile.detail ? (
                      <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground md:text-xs">
                        {tile.detail}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
                Cash-pay when prescribed. New-patient pricing shown; details
                below. Prescribing is up to your provider and is never
                guaranteed. Product images are illustrative.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                {/* Mobile: seal and Google rating share the row as equal halves. Desktop: seal sits by the heading, so this wrapper collapses. */}
                <div className="grid w-full grid-cols-2 items-center gap-3 lg:contents">
                  <LegitScriptSeal className="w-16 justify-self-center lg:hidden [&_img]:h-auto [&_img]:w-full" />
                  <span className="inline-flex flex-col items-center gap-1 font-semibold text-foreground lg:flex-row lg:gap-1.5">
                    <span aria-hidden className="flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className="size-4 fill-primary stroke-primary"
                        />
                      ))}
                    </span>
                    {GOOGLE_RATING_VALUE} on Google
                  </span>
                </div>
                <span className="w-full text-center text-muted-foreground lg:w-auto lg:text-left">
                  You won&apos;t be charged anything if you&apos;re not
                  prescribed
                </span>
              </div>
            </div>

            {/* Large clarity shot (desktop). Plain wrapper: LCP image, no initial opacity (see treatment-pages.md). */}
            <div className="relative mx-auto hidden w-full max-w-md lg:mx-0 lg:block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
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
      </section>

      <section
        aria-label="Beema Health at a glance"
        className="border-y border-border bg-muted/40"
      >
        <dl className="veya-container grid grid-cols-2 gap-y-6 py-7 md:grid-cols-4 md:py-9">
          {PROOF_STATS.map((stat) => (
            <div key={stat.label} className="px-2 text-center">
              <dd className="flex items-center justify-center gap-1.5 text-2xl font-bold text-foreground md:text-3xl">
                {stat.value}
                {stat.stars ? (
                  <Star
                    className="size-5 fill-primary stroke-primary"
                    aria-hidden
                  />
                ) : null}
              </dd>
              <dt className="mt-1 text-xs text-muted-foreground md:text-sm">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </section>

      <Section id="whats-included" className="scroll-mt-20">
        <motion.div {...reveal}>
          <SectionHeading
            title="One monthly price covers your care"
            description="Everything below is included in your plan when a licensed provider prescribes. No membership fee, no insurance paperwork."
          />
        </motion.div>
        <motion.figure
          {...reveal}
          aria-label="What your monthly plan includes"
          className="mx-auto mt-10 max-w-5xl"
        >
          <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
            <ul className="order-2 grid gap-4 sm:grid-cols-2 lg:order-1 lg:grid-cols-1">
              {INCLUDED_CALLOUTS.slice(0, 2).map((c) => (
                <IncludedCallout key={c.title} {...c} />
              ))}
            </ul>
            <div className="order-1 mx-auto w-full max-w-[16rem] lg:order-2 lg:max-w-xs">
              <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
                <img
                  src={tirzImagery.src}
                  alt={tirzImagery.alt}
                  width={tirzImagery.width}
                  height={tirzImagery.height}
                  loading="lazy"
                  decoding="async"
                  className="absolute right-[8%] top-[6%] h-[58%] w-auto object-contain drop-shadow-xl"
                />
                <img
                  src={semaImagery.src}
                  alt={semaImagery.alt}
                  width={semaImagery.width}
                  height={semaImagery.height}
                  loading="lazy"
                  decoding="async"
                  className="absolute bottom-[5%] left-[6%] h-[66%] w-auto object-contain drop-shadow-2xl"
                />
              </div>
            </div>
            <ul className="order-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              {INCLUDED_CALLOUTS.slice(2).map((c) => (
                <IncludedCallout key={c.title} {...c} />
              ))}
            </ul>
          </div>
          <figcaption className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
            Included when prescribed. Prescribing is up to your provider and is
            never guaranteed. Cash-pay only. Product images are illustrative.
          </figcaption>
        </motion.figure>
      </Section>

      {PATIENT_STORY_YOUTUBE_ID ? (
        <Section
          id="patient-story"
          className={cn("scroll-mt-20", LAZY_SECTION)}
        >
          <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <motion.div {...reveal}>
              <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
                Watch the Beema Health patient and founder story
              </h2>
              <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                Hear about Beema Health care in their own words, then see if it
                is right for you.
              </p>
              <div className="mt-6 hidden lg:block">
                <Button asChild size="lg">
                  <Link
                    to={midCta.to}
                    search={midCta.search}
                    onClick={midCta.onClick}
                  >
                    {midCta.label} <ArrowRight />
                  </Link>
                </Button>
              </div>
            </motion.div>
            <motion.div {...reveal}>
              <PatientStoryVideo videoId={PATIENT_STORY_YOUTUBE_ID} />
              <p className="mt-3 text-pretty text-xs leading-relaxed text-muted-foreground">
                Results vary and are not typical or guaranteed. Treatment
                depends on a licensed provider&apos;s review of your health
                history.
              </p>
            </motion.div>
          </div>
        </Section>
      ) : null}

      <Section className="bg-muted/40 py-14 md:py-20">
        <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Your plan starts with a free intake
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Starting your intake is free, and you won&apos;t be charged anything
            if you&apos;re not prescribed. A licensed provider reviews your
            health history and decides what is right for you. If treatment is
            appropriate, one monthly price covers your care, medication,
            supplies, and shipping.
          </p>
          <Button asChild size="xl" className="mt-8 w-full sm:w-auto">
            <Link
              to={midCta.to}
              search={midCta.search}
              onClick={midCta.onClick}
            >
              {midCta.label} <ArrowRight />
            </Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Prescribing is never guaranteed.
          </p>
        </motion.div>
      </Section>

      <Section id="cash-pricing">
        <motion.div {...reveal}>
          <SectionHeading
            title="GLP-1 weight-loss pricing in Houston"
            description="Clear cash-pay rates for compounded options. No membership fee. Your licensed provider decides what medication and dose is appropriate for you - pricing below is cash-pay when prescribed."
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
          initial={false}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.35, ease: EASE_OUT }}
          className="mx-auto mt-6 max-w-xl lg:max-w-4xl"
        >
          <TreatmentPricingCard
            compact
            pricing={MEDICATION_PICKER[selectedMedication].pricing}
            imagery={vialImagery[selectedMedication]}
            cta={midCta}
          />
        </motion.div>
        <ul className="mx-auto mt-8 max-w-2xl space-y-2">
          {CASH_PAY_POINTS.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2 text-sm text-foreground"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
              {point}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Compare options:{" "}
          <Link
            to="/semaglutide/"
            className="font-semibold text-foreground underline-offset-4 hover:underline"
          >
            compounded semaglutide
          </Link>{" "}
          and{" "}
          <Link
            to="/tirzepatide/"
            className="font-semibold text-foreground underline-offset-4 hover:underline"
          >
            compounded tirzepatide
          </Link>
          .
        </p>
      </Section>

      <HowItWorksSteps
        eyebrow={null}
        title="How online GLP-1 care works in Houston"
        showCareFollowUpNote
      />

      {/* Team media license: no CTA or pricing adjacent, so keep this section standalone. */}
      <MedicalTeamSection className={cn("pt-0", LAZY_SECTION)} />

      <Section className={cn("bg-muted/40 py-14 md:py-20", LAZY_SECTION)}>
        <motion.div
          {...reveal}
          className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-start"
        >
          <MapPin
            className="size-8 shrink-0 text-accent-foreground"
            aria-hidden
          />
          <div>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              {copy.servingTitle}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
              {copy.servingBody}
            </p>
          </div>
        </motion.div>
      </Section>

      <Section className={LAZY_SECTION}>
        <SectionHeading
          title="GLP-1 care, pricing, and getting started"
          description={copy.faqDescription}
        />
        <div className="mt-10">
          <TreatmentFaqSection items={copy.faqItems} />
        </div>
      </Section>

      <Section className={cn("pt-0", LAZY_SECTION)}>
        <div className="rounded-4xl bg-primary px-6 py-12 text-center text-primary-foreground md:px-12 md:py-16">
          <h2 className="text-balance text-3xl font-bold md:text-4xl">
            Ready to see if GLP-1 care is right for you?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            {copy.footerCtaBody}
          </p>
          <Button
            asChild
            size="xl"
            className="mt-8 w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 sm:w-auto"
          >
            <Link
              to={footerCta.to}
              search={footerCta.search}
              onClick={footerCta.onClick}
            >
              {footerCta.label} <ArrowRight />
            </Link>
          </Button>
          <p className="mt-4 text-xs text-primary-foreground/70">
            Cash-pay only. Prescribing is never guaranteed.
          </p>
        </div>
      </Section>
      <MoneyPageGuides path="/glp-1-houston/" />
    </MarketingLayout>
  );
}

export const variant: LandingVariant = {
  id: "v3-testing-new-principles",
  label: "Testing new principles",
  Component: Glp1HoustonVariantB,
};
