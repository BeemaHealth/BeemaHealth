import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Info,
  MapPin,
  Pill,
  Star,
  Stethoscope,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { LandingVariant } from "../types";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading } from "@/components/site/primitives";
import { TreatmentFaqSection } from "@/components/site/TreatmentPageBlocks";
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { MedicalTeamSection } from "@/components/site/MedicalTeamSection";
import { EASE_OUT } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import { GOOGLE_RATING_VALUE } from "@/lib/google-business";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import { cn } from "@/lib/utils";
import { formatUsd } from "@/lib/medication-pricing";
import {
  COMPOUNDED_ED_MINTS_REQUIRED,
  GENERIC_SILDENAFIL_REQUIRED,
  GENERIC_TADALAFIL_REQUIRED,
} from "@/lib/compounded-disclosure";
import {
  ED_MINTS_RDT_PRICING,
  ED_SILDENAFIL_PER_PILL_USD,
  ED_TADALAFIL_PER_PILL_USD,
  formatPerPillStartingAt,
  formatSimpleQuarterlyStartingAt,
} from "@/lib/simple-treatment-pricing";
import { patientQuestionsGuidance } from "@/lib/marketing-copy";
import {
  SEXUAL_HEALTH_FAQ,
  SEXUAL_HEALTH_SERVING_POINTS,
} from "@/lib/sexual-health-page";
import { LEARN_FIFTY_STATE_SENTENCE } from "@/lib/learn-trust-copy";
import tadalafilPhoto from "@/assets/treatments/tadalafil-oral-tablets-bottle.webp";
import sildenafilPhoto from "@/assets/treatments/sildenafil-oral-tablets-bottle.webp";
import edMintsPhoto from "@/assets/treatments/ed-mints-dissolvable-tablet.webp";
import {
  SexualHealthEdMintsPicker,
  SexualHealthStartModal,
} from "./SexualHealthStartModal";
import { PRODUCT_PRICING, type ProductPricing } from "./pricing";
import { ProductPlansDialog } from "./ProductPlansDialog";
import {
  PATIENT_STORY_YOUTUBE_ID,
  PatientStoryVideo,
} from "./PatientStoryVideo";

/**
 * Rebuilt sexual-health landing page (variant of the ED category hub). One
 * page, three products: tadalafil, sildenafil, ED mints. Every "Get Started"
 * opens the product picker; each product card goes straight to that
 * product's questionnaire. All handoffs carry sexual_health_* CTA ids so
 * clicks, signups and purchases are credited to /sexual-health/.
 *
 * Copy follows landing-page-clarity (title <= 40 chars: category + benefit +
 * context; ~300-char lead, 80% benefit) and the compliance skills: no results
 * claims, no guarantee, no fake urgency, prices from the pricing libs, the
 * generic and compounded disclosures verbatim.
 */

const priceAnswer = `Tadalafil is ${formatUsd(PRODUCT_PRICING.tadalafil.quarterly[0].usd)} for a 3-month supply at the lowest dose (${PRODUCT_PRICING.tadalafil.quarterly[0].dose}) and ${formatUsd(PRODUCT_PRICING.tadalafil.quarterly[2].usd)} at the highest (${PRODUCT_PRICING.tadalafil.quarterly[2].dose}). Sildenafil is ${formatUsd(PRODUCT_PRICING.sildenafil.quarterly[0].usd)} for a 3-month supply. One-month plans start at ${formatUsd(PRODUCT_PRICING.sildenafil.monthly[0].usd)}. ED Mints are ${formatUsd(ED_MINTS_RDT_PRICING.monthlyUsd)} per month or ${formatUsd(ED_MINTS_RDT_PRICING.quarterly?.totalUsd ?? 0)} for 3 months, and both formulations are the same price. All pricing is all-inclusive cash-pay with no separate platform membership fee. ${patientQuestionsGuidance()}`;

const FAQ_ITEMS = SEXUAL_HEALTH_FAQ.map((item) =>
  item.q.startsWith("How much does online ED treatment cost")
    ? { ...item, a: priceAnswer }
    : item,
);

const H1 = "Private online ED treatment for men";

/**
 * Below-the-fold sections skip layout and paint until they near the viewport
 * (CSS content-visibility). Keeps them in the DOM for SEO and anchor links.
 */
const LAZY_SECTION =
  "[content-visibility:auto] [contain-intrinsic-size:auto_640px]";

/** ~300 characters: benefit first, one feature, true urgency (free to start). */
const HERO_LEAD =
  "Skip the waiting room and the pharmacy counter. Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, your medication ships to your door. Prescribing is never guaranteed.";

type Product = {
  id: "tadalafil" | "sildenafil" | "ed-mints";
  name: string;
  kind: string;
  blurb: string;
  image: { src: string; alt: string; width: number; height: number };
  pricing: ProductPricing;
  /** Main price shown on the card; the dose-level detail sits in a dropdown. */
  headline: { price: string; unit: string; sub: string };
  learnMore: string;
};

const PRODUCTS: readonly Product[] = [
  {
    id: "tadalafil",
    name: "Tadalafil",
    kind: "Generic Cialis tablet",
    blurb:
      "An oral tablet taken as needed or daily. Known for a longer duration of action than other ED medications.",
    image: {
      src: tadalafilPhoto,
      alt: "Bottle of Beema Health tadalafil oral tablets, generic Cialis",
      width: 720,
      height: 900,
    },
    pricing: PRODUCT_PRICING.tadalafil,
    headline: {
      price: `from ${formatPerPillStartingAt(ED_TADALAFIL_PER_PILL_USD)}`,
      unit: "",
      sub: "On the 3-month plan, lowest dose. Higher doses and 1-month plans below.",
    },
    learnMore: "/tadalafil/",
  },
  {
    id: "sildenafil",
    name: "Sildenafil",
    kind: "Generic Viagra tablet",
    blurb: "An oral tablet taken as needed.",
    image: {
      src: sildenafilPhoto,
      alt: "Bottle of Beema Health sildenafil oral tablets, generic Viagra",
      width: 720,
      height: 900,
    },
    pricing: PRODUCT_PRICING.sildenafil,
    headline: {
      price: `from ${formatPerPillStartingAt(ED_SILDENAFIL_PER_PILL_USD)}`,
      unit: "",
      sub: "On the 3-month plan. 1-month plan below.",
    },
    learnMore: "/sildenafil/",
  },
  {
    id: "ed-mints",
    name: "ED Mints",
    kind: "Compounded dissolving tablet",
    blurb:
      "A combination tablet that dissolves under the tongue. No water needed. Two formulations, same price.",
    image: {
      src: edMintsPhoto,
      alt: "Beema Health ED Mints - dissolvable erectile dysfunction tablet embossed with the Beema Health logo",
      width: 1024,
      height: 1024,
    },
    pricing: PRODUCT_PRICING["ed-mints"],
    headline: {
      price: formatSimpleQuarterlyStartingAt(ED_MINTS_RDT_PRICING),
      unit: "",
      sub: `${formatUsd(ED_MINTS_RDT_PRICING.quarterly?.totalUsd ?? 0)} billed every 3 months. Or ${formatUsd(ED_MINTS_RDT_PRICING.monthlyUsd)} for 1 month.`,
    },
    learnMore: "/ed-mints/",
  },
];

/** Only claims that are true today (see src/lib/trust-signals.ts). */
const PROOF_STATS = [
  { value: GOOGLE_RATING_VALUE, label: "Google rating", stars: true },
  { value: "50 states", label: "Providers licensed per state", stars: false },
  {
    value: "Generic",
    label: "FDA-approved tadalafil and sildenafil",
    stars: false,
  },
  { value: "$0", label: "Membership fees", stars: false },
] as const;

const INCLUDED_CALLOUTS = [
  {
    icon: Stethoscope,
    title: "Provider review",
    body: "A licensed provider reviews your history and decides what is right.",
  },
  {
    icon: Pill,
    title: "Licensed pharmacy",
    body: "Your medication is filled by a licensed pharmacy when prescribed.",
  },
  {
    icon: Truck,
    title: "Shipped to you",
    body: "Delivered to your door. No pharmacy counter.",
  },
  {
    icon: Wallet,
    title: "One cash-pay price",
    body: "No membership fee and no insurance paperwork.",
  },
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

function GoogleRatingLine() {
  return (
    <span className="inline-flex flex-col items-center gap-1 font-semibold text-foreground lg:flex-row lg:gap-1.5">
      <span aria-hidden className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className="size-4 fill-primary stroke-primary" />
        ))}
      </span>
      {GOOGLE_RATING_VALUE} on Google
    </span>
  );
}

function SexualHealthGetStartedModal() {
  const [startOpen, setStartOpen] = useState(false);
  const [edMintsOpen, setEdMintsOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const tadalafilCta = resolveCta(CTA_IDS.sexual_health_tadalafil);
  const sildenafilCta = resolveCta(CTA_IDS.sexual_health_sildenafil);

  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: reduceMotion ? undefined : { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT },
  } as const;

  const openStart = () => setStartOpen(true);

  /** Tadalafil and sildenafil go straight to intake; ED Mints opens its picker. */
  const productAction = (
    product: Product,
    className: string,
    children: ReactNode,
  ) => {
    if (product.id === "ed-mints") {
      return (
        <Button
          type="button"
          size="lg"
          className={className}
          onClick={() => setEdMintsOpen(true)}
        >
          {children}
        </Button>
      );
    }
    const cta = product.id === "tadalafil" ? tadalafilCta : sildenafilCta;
    return (
      <Button asChild size="lg" className={className}>
        <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
          {children}
        </Link>
      </Button>
    );
  };

  return (
    <MarketingLayout>
      {/* 1. Hero: what it is, what it does for me, why now. */}
      <section className="bg-background pb-12 pt-6 md:pb-20 md:pt-14">
        <div className="veya-container">
          <div className="grid items-center gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-balance text-[1.7rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl md:text-5xl">
                  {H1}
                </h1>
                {/* Desktop seal beside the heading; mobile gets it in the trust row below. */}
                <LegitScriptSeal className="hidden w-20 lg:inline-block [&_img]:h-auto [&_img]:w-full" />
                {/* Small clarity shot so the products are visible on a phone without scrolling. */}
                <div
                  aria-hidden
                  className="relative -mt-1 h-28 w-24 shrink-0 sm:h-32 sm:w-28 lg:hidden"
                >
                  <img
                    src={sildenafilPhoto}
                    alt=""
                    width={720}
                    height={900}
                    className="absolute right-0 top-0 h-[62%] w-auto object-contain drop-shadow-lg"
                  />
                  <img
                    src={tadalafilPhoto}
                    alt=""
                    width={720}
                    height={900}
                    className="absolute bottom-0 left-0 h-[74%] w-auto object-contain drop-shadow-xl"
                  />
                </div>
              </div>
              <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
                {HERO_LEAD}
              </p>

              <div className="mt-5">
                <Button
                  type="button"
                  size="xl"
                  className="w-full sm:w-auto"
                  onClick={openStart}
                >
                  Get Started <ArrowRight />
                </Button>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                {/* Mobile: seal and Google rating share the row as equal halves. Desktop: seal sits by the heading, so this wrapper collapses. */}
                <div className="grid w-full grid-cols-2 items-center gap-3 lg:contents">
                  <LegitScriptSeal className="w-[73px] justify-self-center lg:hidden [&_img]:h-auto [&_img]:w-full" />
                  <GoogleRatingLine />
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
                  src={sildenafilPhoto}
                  alt={PRODUCTS[1].image.alt}
                  width={720}
                  height={900}
                  className="absolute right-[6%] top-[5%] h-[56%] w-auto object-contain drop-shadow-xl"
                />
                <img
                  src={edMintsPhoto}
                  alt={PRODUCTS[2].image.alt}
                  width={1024}
                  height={1024}
                  className="absolute bottom-[4%] right-[6%] h-[34%] w-auto object-contain drop-shadow-xl"
                />
                <img
                  src={tadalafilPhoto}
                  alt={PRODUCTS[0].image.alt}
                  width={720}
                  height={900}
                  fetchPriority="high"
                  className="absolute bottom-[5%] left-[5%] h-[68%] w-auto object-contain drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. At-a-glance proof. */}
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

      {/* 3. Founder and patient story. */}
      {PATIENT_STORY_YOUTUBE_ID ? (
        <Section
          id="our-story"
          className={cn("scroll-mt-20 bg-muted/40", LAZY_SECTION)}
        >
          <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
            <motion.div {...reveal}>
              <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
                Hear why we built Beema Health
              </h2>
              <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                Watch the Beema Health patient and founder story in their own
                words, then see if care is right for you.
              </p>
              <div className="mt-6 hidden lg:block">
                <Button type="button" size="lg" onClick={openStart}>
                  Get Started <ArrowRight />
                </Button>
              </div>
            </motion.div>
            <motion.div {...reveal}>
              <PatientStoryVideo videoId={PATIENT_STORY_YOUTUBE_ID} />
              <div
                role="note"
                className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs leading-snug text-muted-foreground"
              >
                <Info
                  className="mt-0.5 size-3.5 shrink-0 text-trust"
                  aria-hidden
                />
                <div className="space-y-2 text-pretty">
                  <p>
                    Individual stories are not typical, and results vary. Weight
                    and blood sugar changes described in the video are one
                    person&apos;s experience and are not guaranteed.
                  </p>
                  <p>
                    For context, in trials of FDA-approved tirzepatide, average
                    weight loss was up to about 20.9% at the highest studied
                    dose at 72 weeks. Compounded medications are not
                    FDA-approved and were not the products studied in those
                    trials.
                  </p>
                  <p>
                    Any change in blood sugar or prediabetes status described in
                    the video is one person&apos;s experience. The FDA has not
                    approved tirzepatide to treat, prevent, or reverse
                    prediabetes, and we make no claim that it does.
                  </p>
                  <p>
                    Treatment depends on a licensed provider&apos;s review of
                    your health history. Prescribing is never guaranteed.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="xl"
                className="mt-6 w-full lg:hidden"
                onClick={openStart}
              >
                Get Started <ArrowRight />
              </Button>
            </motion.div>
          </div>
        </Section>
      ) : null}

      {/* 4. How it works. */}
      <HowItWorksSteps
        eyebrow={null}
        title="How it works"
        showCareFollowUpNote
      />

      {/* 5. The three products, each straight to its own questionnaire. */}
      <Section id="treatments" className="scroll-mt-20">
        <motion.div {...reveal}>
          <SectionHeading
            title="Choose your ED treatment"
            description="Three options with clear cash-pay pricing. Pick the one you want to start with, and a licensed provider decides what, and which dose, is right for you."
          />
        </motion.div>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {PRODUCTS.map((product) => (
            <motion.li
              key={product.id}
              {...reveal}
              className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft"
            >
              <div className="bg-primary-soft p-4 md:p-6">
                <img
                  src={product.image.src}
                  alt={product.image.alt}
                  width={product.image.width}
                  height={product.image.height}
                  loading="lazy"
                  decoding="async"
                  className="mx-auto h-36 w-auto object-contain drop-shadow-xl md:h-48"
                />
              </div>
              <div className="flex flex-1 flex-col p-5 md:p-6">
                <p className="text-sm font-semibold text-muted-foreground">
                  {product.kind}
                </p>
                <h3 className="mt-1 text-2xl font-bold text-foreground">
                  {product.name}
                </h3>
                <p className="mt-3 text-sm md:min-h-[4.25rem] leading-relaxed text-muted-foreground">
                  {product.blurb}
                </p>
                <div className="mt-4 md:mt-5 md:min-h-[5.25rem]">
                  <p className="text-3xl font-bold tracking-tight text-foreground">
                    {product.headline.price}
                    {product.headline.unit ? (
                      <span className="ml-1.5 text-base font-normal text-muted-foreground">
                        {product.headline.unit}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-muted-foreground">
                    {product.headline.sub}
                  </p>
                </div>
                {product.id !== "ed-mints" ? (
                  <ProductPlansDialog
                    name={product.name}
                    pricing={product.pricing}
                    cta={
                      product.id === "tadalafil" ? tadalafilCta : sildenafilCta
                    }
                  />
                ) : (
                  <p className="mt-4 flex h-11 items-center rounded-full border border-border px-4 text-sm font-semibold text-foreground">
                    Same price for both formulations
                  </p>
                )}
                {productAction(
                  product,
                  "mt-4 w-full",
                  <>
                    Start with {product.name} <ArrowRight />
                  </>,
                )}
                <Link
                  to={product.learnMore}
                  className="mt-1 py-2.5 text-center text-sm font-semibold text-foreground underline-offset-4 hover:underline"
                >
                  About {product.name}
                </Link>
              </div>
            </motion.li>
          ))}
        </ul>
        <div className="mx-auto mt-8 max-w-3xl space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p>
            All prices are cash-pay when prescribed, with no membership fee and
            no insurance billed. Your provider decides the medication and dose;
            prescribing is never guaranteed. Product images are illustrative.
            See our{" "}
            <Link
              to="/legal/refund/"
              className="underline underline-offset-2 hover:text-foreground"
            >
              cancellation and refund policy
            </Link>
            .
          </p>
          <p>{GENERIC_TADALAFIL_REQUIRED}</p>
          <p>{GENERIC_SILDENAFIL_REQUIRED}</p>
          <p>{COMPOUNDED_ED_MINTS_REQUIRED}</p>
        </div>
      </Section>

      {/* 6. What one price covers: infographic with benefit callouts. */}
      <Section id="whats-included" className="scroll-mt-20">
        <motion.div {...reveal}>
          <SectionHeading
            title="One price covers your care"
            description="Everything below is included when a licensed provider prescribes. No membership fee, no insurance paperwork."
          />
        </motion.div>
        <motion.figure
          {...reveal}
          aria-label="What your ED treatment plan includes"
          className="mx-auto mt-10 max-w-5xl"
        >
          <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
            <ul className="order-2 grid gap-4 sm:grid-cols-2 lg:order-1 lg:grid-cols-1">
              {INCLUDED_CALLOUTS.slice(0, 2).map((c) => (
                <IncludedCallout key={c.title} {...c} />
              ))}
            </ul>
            <div className="order-1 mx-auto w-64 max-w-full lg:order-2 lg:w-72">
              <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
                <img
                  src={sildenafilPhoto}
                  alt=""
                  width={720}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  className="absolute right-[6%] top-[5%] h-[52%] w-auto object-contain drop-shadow-xl"
                />
                <img
                  src={tadalafilPhoto}
                  alt=""
                  width={720}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  className="absolute bottom-[5%] left-[5%] h-[62%] w-auto object-contain drop-shadow-2xl"
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

      {/* 7. Mid-page CTA: the low-friction start. */}
      <Section className="bg-muted/40 py-14 md:py-20">
        <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            Skip the waiting room. Start from your phone.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            Starting your intake is free. A licensed provider reviews your
            health history and decides whether treatment is right for you, and
            you won&apos;t be charged anything if you&apos;re not prescribed. If
            you are, one cash-pay price covers your care and medication.
          </p>
          <Button
            type="button"
            size="xl"
            className="mt-8 w-full sm:w-auto"
            onClick={openStart}
          >
            Get Started <ArrowRight />
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Prescribing is never guaranteed.
          </p>
        </motion.div>
      </Section>

      {/* 8. Who it is for, and where. */}
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
              Who this is for
            </h2>
            <ul className="mt-3 space-y-2">
              {SEXUAL_HEALTH_SERVING_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2 text-sm text-foreground md:text-base"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground md:mt-1" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground md:text-base">
              {LEARN_FIFTY_STATE_SENTENCE} Eligibility is an individual clinical
              decision and is never guaranteed.
            </p>
          </div>
        </motion.div>
      </Section>

      {/* Team media license: no CTA or pricing adjacent, so keep this section standalone. */}
      <MedicalTeamSection className={LAZY_SECTION} />

      {/* 9. FAQ (same items as the page's FAQ structured data). */}
      <Section className={LAZY_SECTION}>
        <SectionHeading
          title="ED treatment, pricing, and getting started"
          description="Straight answers about how online ED care works with Beema Health."
        />
        <div className="mt-10">
          <TreatmentFaqSection items={FAQ_ITEMS} />
        </div>
      </Section>

      {/* 10. Final CTA. */}
      <Section className={cn("pt-0", LAZY_SECTION)}>
        <div className="rounded-4xl bg-primary px-6 py-12 text-center text-primary-foreground md:px-12 md:py-16">
          <h2 className="text-balance text-3xl font-bold md:text-4xl">
            Ready to see if ED treatment is right for you?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Complete intake from home. You won&apos;t be charged anything if
            you&apos;re not prescribed, and a prescription is never guaranteed.
          </p>
          <Button
            type="button"
            size="xl"
            className="mt-8 w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 sm:w-auto"
            onClick={openStart}
          >
            Get Started <ArrowRight />
          </Button>
          <p className="mt-4 text-xs text-primary-foreground/70">
            Cash-pay only. Prescribing is never guaranteed.
          </p>
        </div>
      </Section>
      <MoneyPageGuides path="/sexual-health/" />

      <SexualHealthStartModal open={startOpen} onOpenChange={setStartOpen} />
      <SexualHealthEdMintsPicker
        open={edMintsOpen}
        onOpenChange={setEdMintsOpen}
      />
    </MarketingLayout>
  );
}

export const variant: LandingVariant = {
  id: "v2-get-started-modal",
  label: "Rebuilt landing page with a product picker",
  Component: SexualHealthGetStartedModal,
};
