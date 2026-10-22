import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BadgeDollarSign,
  Check,
  CheckCircle2,
  ClipboardList,
  MapPin,
  PackageCheck,
  Play,
  Star,
  Video,
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
  type CompoundedMedicationPricing,
} from "@/lib/medication-pricing";
import { GOOGLE_RATING_VALUE } from "@/lib/google-business";
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

const HERO_POINTS = [
  "A licensed provider reviews every case",
  "Cash-pay: no insurance, no membership fee",
  "Medication shipped to your door when prescribed",
] as const;

/** Only claims that are true today (see src/lib/trust-signals.ts). */
const PROOF_STATS = [
  { value: GOOGLE_RATING_VALUE, label: "Google rating", stars: true },
  { value: "50 states", label: "Providers licensed per state", stars: false },
  { value: "503A", label: "U.S. licensed pharmacies", stars: false },
  { value: "$0", label: "Membership fees", stars: false },
] as const;

const WHY_POINTS = [
  {
    icon: ClipboardList,
    title: "A real clinician reviews your history",
    body: "Your licensed provider looks at your health history and decides whether compounded semaglutide, compounded tirzepatide, or neither is appropriate. Completing intake does not guarantee a prescription.",
  },
  {
    icon: BadgeDollarSign,
    title: "Prices that don't change",
    body: "Provider care, medication, supplies, and expedited shipping are included when prescribed. No platform membership fee and no insurance paperwork.",
  },
  {
    icon: Video,
    title: "No waiting room, no commute",
    body: "Start with an online medical intake from your phone. Skip the drive across Houston and the waiting room.",
  },
  {
    icon: PackageCheck,
    title: "Shipped to your door",
    body: "Prescribed medication is compounded in a licensed U.S. pharmacy and shipped to you, with ongoing provider follow-up.",
  },
] as const;

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
    },
    {
      name: "Tirzepatide",
      price: `from ${formatUsd(
        tirzStarter
          ? tirzStarter.monthlyEquivalentUsd
          : getPlan(COMPOUNDED_TIRZEPATIDE_PRICING, 12).monthlyUsd,
      )}`,
      unit: "per month",
    },
  ];

  return (
    <MarketingLayout>
      <section className="bg-background pb-12 pt-6 md:pb-20 md:pt-14">
        <div className="veya-container">
          <div className="grid items-center gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <h1 className="text-balance text-[1.9rem] font-bold leading-[1.1] tracking-tight text-foreground md:text-5xl">
                Online GLP-1 weight-loss care for Houston, from home
              </h1>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                Complete one online intake. A licensed provider reviews your
                history and, if appropriate, prescribes compounded semaglutide
                or tirzepatide, shipped to your door.
              </p>

              <ul className="mt-5 space-y-2.5">
                {HERO_POINTS.map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-[15px] font-medium text-foreground"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              <div className="mt-6 grid grid-cols-2 gap-3">
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
                  </div>
                ))}
              </div>

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

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
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
                <span className="text-muted-foreground">
                  No payment required to start
                </span>
              </div>
              <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
                Cash-pay when prescribed. New-patient pricing shown; details
                below. Prescribing is up to your provider and is never
                guaranteed.
              </p>
            </div>

            {/* Plain wrapper: LCP image, no initial opacity (see treatment-pages.md). */}
            <div className="relative mx-auto w-full max-w-[17rem] sm:max-w-sm lg:mx-0 lg:max-w-md">
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

      {PATIENT_STORY_YOUTUBE_ID ? (
        <Section id="patient-story" className="scroll-mt-20">
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
        <motion.div {...reveal}>
          <SectionHeading title="Why trust Beema Health" />
        </motion.div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {WHY_POINTS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{
                duration: reduceMotion ? 0 : 0.5,
                delay: reduceMotion ? 0 : i * 0.06,
                ease: EASE_OUT,
              }}
              className="rounded-3xl border border-border bg-card p-6 shadow-soft"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-bold text-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </motion.div>
          ))}
        </div>
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
      <MedicalTeamSection className="pt-0" />

      <Section className="bg-muted/40 py-14 md:py-20">
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

      <Section>
        <SectionHeading
          title="GLP-1 care, pricing, and getting started"
          description={copy.faqDescription}
        />
        <div className="mt-10">
          <TreatmentFaqSection items={copy.faqItems} />
        </div>
      </Section>

      <Section className="pt-0">
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
  id: "v2-variant-b",
  label: "Variant B (social proof redesign)",
  Component: Glp1HoustonVariantB,
};
