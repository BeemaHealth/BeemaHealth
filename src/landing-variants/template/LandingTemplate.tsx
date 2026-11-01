import { Fragment, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  CheckCircle2,
  Info,
  MapPin,
  Star,
  type LucideIcon,
} from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading } from "@/components/site/primitives";
import {
  TreatmentFaqSection,
  type TreatmentFaqItem,
} from "@/components/site/TreatmentPageBlocks";
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { MedicalTeamSection } from "@/components/site/MedicalTeamSection";
import { LegitScriptSeal } from "@/components/site/LegitScriptSeal";
import { MoneyPageGuides } from "@/components/learn/MoneyPageGuides";
import { EASE_OUT } from "@/components/home/home-motion";
import { Button } from "@/components/ui/button";
import type { resolveCta } from "@/lib/cta-ids";
import { GOOGLE_RATING_VALUE } from "@/lib/google-business";
import { cn } from "@/lib/utils";
import { PatientStoryVideo } from "./PatientStoryVideo";
import {
  PATIENT_STORY_YOUTUBE_ID,
  STORY_DISCLAIMER,
  type StoryDisclaimer,
} from "./story";

/**
 * Shared landing-page layout (the GLP-1 Houston / sexual-health design):
 * hero with trust row, proof stats, founder story, how it works, one
 * page-specific pricing section, what is included, mid-page CTA, where we
 * serve, medical team, FAQ, final CTA.
 *
 * A page variant fills it in with data (`LandingTemplateProps`). To customize
 * a page, either pass different data, replace any section through `overrides`
 * (any `SectionKey`, `null` removes it), or add a section after another with
 * `insertAfter`. Every section is also exported, so a page can assemble its
 * own order from the pieces.
 *
 * Tracking: the template never calls `trackPageViewed` (the route does) and it
 * never creates CTA ids. Pages pass in CTAs resolved with their existing ids
 * (`resolveCta(CTA_IDS.<page>_hero)`), so click attribution is unchanged.
 */

/**
 * Below-the-fold sections skip layout and paint until they near the viewport
 * (CSS content-visibility). Keeps them in the DOM for SEO and anchor links.
 */
export const LAZY_SECTION =
  "[content-visibility:auto] [contain-intrinsic-size:auto_640px]";

export type TemplateCta =
  | ReturnType<typeof resolveCta>
  | { label: string; onClick: () => void; to?: undefined; search?: undefined };

function isLinkCta(cta: TemplateCta): cta is ReturnType<typeof resolveCta> {
  return typeof (cta as { to?: unknown }).to === "string";
}

export function StartButton({
  cta,
  size = "xl",
  className,
}: {
  cta: TemplateCta;
  size?: "lg" | "xl";
  className?: string;
}) {
  const label = (
    <>
      {cta.label} <ArrowRight />
    </>
  );
  if (isLinkCta(cta)) {
    return (
      <Button asChild size={size} className={className}>
        <Link to={cta.to} search={cta.search} onClick={cta.onClick}>
          {label}
        </Link>
      </Button>
    );
  }
  return (
    <Button
      type="button"
      size={size}
      className={className}
      onClick={cta.onClick}
    >
      {label}
    </Button>
  );
}

export type HeroImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type HeroImageLayout = "single" | "duo" | "trio";

/** Positioning for each image slot. Index 0 is the main (LCP) image. */
const IMAGE_SLOTS: Record<HeroImageLayout, readonly string[]> = {
  single: ["absolute inset-0 h-full w-full object-contain"],
  duo: [
    "absolute bottom-[5%] left-[6%] h-[66%] w-auto object-contain drop-shadow-2xl",
    "absolute right-[8%] top-[6%] h-[58%] w-auto object-contain drop-shadow-xl",
  ],
  trio: [
    "absolute bottom-[5%] left-[5%] h-[68%] w-auto object-contain drop-shadow-2xl",
    "absolute right-[6%] top-[5%] h-[56%] w-auto object-contain drop-shadow-xl",
    "absolute bottom-[4%] right-[6%] h-[34%] w-auto object-contain drop-shadow-xl",
  ],
};

function ImageStack({
  images,
  layout,
  lazy,
}: {
  images: readonly HeroImage[];
  layout: HeroImageLayout;
  lazy?: boolean;
}) {
  return (
    <>
      {images.map((img, i) => (
        <img
          key={img.src}
          src={img.src}
          alt={img.alt}
          width={img.width}
          height={img.height}
          {...(lazy
            ? { loading: "lazy" as const, decoding: "async" as const }
            : i === 0
              ? { fetchPriority: "high" as const }
              : {})}
          className={IMAGE_SLOTS[layout][i] ?? IMAGE_SLOTS[layout][0]}
        />
      ))}
    </>
  );
}

export type PriceTile = {
  name: string;
  price: string;
  unit: string;
  /** Small emphasized line, e.g. the promo code. */
  note?: string | null;
  /** Small muted line, e.g. the multi-month total. */
  detail?: string | null;
};

export type ProofStat = { value: string; label: string; stars?: boolean };

export type Callout = { icon: LucideIcon; title: string; body: string };

export function CancellationLink({ className }: { className?: string }) {
  return (
    <Link
      to="/legal/refund/"
      className={cn(
        "underline underline-offset-2 hover:text-foreground",
        className,
      )}
    >
      cancellation and refund policy
    </Link>
  );
}

function useReveal() {
  const reduceMotion = useReducedMotion();
  return {
    reduceMotion,
    reveal: {
      initial: reduceMotion ? false : { opacity: 0, y: 24 },
      whileInView: reduceMotion ? undefined : { opacity: 1, y: 0 },
      viewport: { once: true, amount: 0.2 },
      transition: { duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT },
    } as const,
  };
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export type HeroProps = {
  h1: string;
  /** About 300 characters: benefit first, one feature, no guarantee. */
  lead: string;
  cta: TemplateCta;
  images: readonly HeroImage[];
  imageLayout?: HeroImageLayout;
  tiles?: readonly PriceTile[];
  /** Small print under the tiles. Include <CancellationLink /> where useful. */
  priceNote?: ReactNode;
};

export function GoogleRatingLine() {
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

export function HeroSection({
  h1,
  lead,
  cta,
  images,
  imageLayout = "single",
  tiles,
  priceNote,
}: HeroProps) {
  const thumb = imageLayout === "single" ? "single" : "duo";
  return (
    <section className="bg-background pb-12 pt-6 md:pb-20 md:pt-14">
      <div className="veya-container">
        <div className="grid items-center gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-balance text-[1.7rem] font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl md:text-5xl">
                {h1}
              </h1>
              {/* Desktop seal beside the heading; mobile gets it in the trust row below. */}
              <LegitScriptSeal className="hidden w-20 lg:inline-block [&_img]:h-auto [&_img]:w-full" />
              {/* Small clarity shot so the product is visible on a phone without scrolling. */}
              <div
                aria-hidden
                className="relative -mt-1 h-28 w-24 shrink-0 sm:h-32 sm:w-28 lg:hidden"
              >
                <ImageStack
                  images={images
                    .slice(0, 2)
                    .map((img) => ({ ...img, alt: "" }))}
                  layout={thumb}
                  lazy
                />
              </div>
            </div>
            <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
              {lead}
            </p>

            <div className="mt-5">
              <StartButton cta={cta} className="w-full sm:w-auto" />
            </div>

            {tiles && tiles.length > 0 ? (
              <>
                <div
                  className={cn(
                    "mt-5 grid gap-3",
                    tiles.length === 1
                      ? "grid-cols-1 sm:max-w-xs"
                      : tiles.length === 2
                        ? "grid-cols-2"
                        : "sm:grid-cols-3",
                  )}
                >
                  {tiles.map((tile) => (
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
                      {tile.note ? (
                        <p className="mt-1 text-[0.7rem] font-medium leading-snug text-foreground/80 md:text-xs">
                          {tile.note}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
                {priceNote ? (
                  <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted-foreground">
                    {priceNote}
                  </p>
                ) : null}
              </>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
              {/* Mobile: seal and Google rating share the row as equal halves. Desktop: seal sits by the heading, so this wrapper collapses. */}
              <div className="grid w-full grid-cols-2 items-center gap-3 lg:contents">
                <LegitScriptSeal className="w-[73px] justify-self-center lg:hidden [&_img]:h-auto [&_img]:w-full" />
                <GoogleRatingLine />
              </div>
              <span className="w-full text-center text-muted-foreground lg:w-auto lg:text-left">
                You won&apos;t be charged anything if you&apos;re not prescribed
              </span>
            </div>
          </div>

          {/* Large clarity shot (desktop). Plain wrapper: LCP image, no initial opacity (see treatment-pages.md). */}
          <div className="relative mx-auto hidden w-full max-w-md lg:mx-0 lg:block">
            <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
              <ImageStack images={images} layout={imageLayout} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProofStatsSection({ stats }: { stats: readonly ProofStat[] }) {
  return (
    <section
      aria-label="Beema Health at a glance"
      className="border-y border-border bg-muted/40"
    >
      <dl className="veya-container grid grid-cols-2 gap-y-6 py-7 md:grid-cols-4 md:py-9">
        {stats.map((stat) => (
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
  );
}

export function StoryDisclaimerNote({
  kind = STORY_DISCLAIMER,
}: {
  kind?: StoryDisclaimer;
}) {
  return (
    <div
      role="note"
      className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs leading-snug text-muted-foreground"
    >
      <Info className="mt-0.5 size-3.5 shrink-0 text-trust" aria-hidden />
      <div className="space-y-2 text-pretty">
        <p>
          {kind === "glp1"
            ? "Individual stories are not typical, and results vary. Weight and blood sugar changes described in the video are one person's experience and are not guaranteed."
            : "Individual stories are not typical, and results vary. Nothing in the video is a guarantee of any result."}
        </p>
        {kind === "glp1" ? (
          <>
            <p>
              For context, in trials of FDA-approved tirzepatide, average weight
              loss was up to about 20.9% at the highest studied dose at 72
              weeks. Compounded medications are not FDA-approved and were not
              the products studied in those trials.
            </p>
            <p>
              Any change in blood sugar or prediabetes status described in the
              video is one person&apos;s experience. The FDA has not approved
              tirzepatide to treat, prevent, or reverse prediabetes, and we make
              no claim that it does.
            </p>
          </>
        ) : null}
        <p>
          Treatment depends on a licensed provider&apos;s review of your health
          history. Prescribing is never guaranteed.
        </p>
      </div>
    </div>
  );
}

export function StorySection({
  cta,
  videoId = PATIENT_STORY_YOUTUBE_ID,
  heading = "Hear why we built Beema Health",
  body = "Watch the Beema Health patient and founder story in their own words, then see if care is right for you.",
  disclaimer = STORY_DISCLAIMER,
}: {
  cta: TemplateCta;
  videoId?: string;
  heading?: string;
  body?: string;
  disclaimer?: StoryDisclaimer;
}) {
  const { reveal } = useReveal();
  if (!videoId) return null;
  return (
    <Section
      id="our-story"
      className={cn("scroll-mt-20 bg-muted/40", LAZY_SECTION)}
    >
      <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <motion.div {...reveal}>
          <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
            {heading}
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
            {body}
          </p>
          <div className="mt-6 hidden lg:block">
            <StartButton cta={cta} size="lg" />
          </div>
        </motion.div>
        <motion.div {...reveal}>
          <PatientStoryVideo videoId={videoId} />
          <StoryDisclaimerNote kind={disclaimer} />
          <StartButton cta={cta} className="mt-6 w-full lg:hidden" />
        </motion.div>
      </div>
    </Section>
  );
}

export function PricingSection({
  id = "pricing",
  title,
  description,
  children,
  footnote,
}: {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footnote?: ReactNode;
}) {
  const { reveal } = useReveal();
  return (
    <Section id={id} className="scroll-mt-20">
      <motion.div {...reveal}>
        <SectionHeading title={title} description={description} />
      </motion.div>
      <div className="mt-10">{children}</div>
      {footnote ? (
        <div className="mx-auto mt-8 max-w-3xl space-y-2 text-xs leading-relaxed text-muted-foreground">
          {footnote}
        </div>
      ) : null}
    </Section>
  );
}

function IncludedCallout({ icon: Icon, title, body }: Callout) {
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

export function IncludedSection({
  title,
  description,
  ariaLabel,
  callouts,
  images,
  imageLayout = "single",
  caption = "Included when prescribed. Prescribing is up to your provider and is never guaranteed. Cash-pay only. Product images are illustrative.",
}: {
  title: string;
  description: string;
  ariaLabel: string;
  callouts: readonly Callout[];
  images: readonly HeroImage[];
  imageLayout?: HeroImageLayout;
  caption?: string;
}) {
  const { reveal } = useReveal();
  return (
    <Section id="whats-included" className="scroll-mt-20">
      <motion.div {...reveal}>
        <SectionHeading title={title} description={description} />
      </motion.div>
      <motion.figure
        {...reveal}
        aria-label={ariaLabel}
        className="mx-auto mt-10 max-w-5xl"
      >
        <div className="grid items-center gap-5 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
          <ul className="order-2 grid gap-4 sm:grid-cols-2 lg:order-1 lg:grid-cols-1">
            {callouts.slice(0, 2).map((c) => (
              <IncludedCallout key={c.title} {...c} />
            ))}
          </ul>
          <div className="order-1 mx-auto w-full max-w-[16rem] lg:order-2 lg:max-w-xs">
            <div className="relative aspect-[4/5] overflow-hidden rounded-4xl bg-primary-soft shadow-lift">
              <ImageStack images={images} layout={imageLayout} lazy />
            </div>
          </div>
          <ul className="order-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {callouts.slice(2).map((c) => (
              <IncludedCallout key={c.title} {...c} />
            ))}
          </ul>
        </div>
        <figcaption className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          {caption}
        </figcaption>
      </motion.figure>
    </Section>
  );
}

export function MidCtaSection({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta: TemplateCta;
}) {
  const { reveal } = useReveal();
  return (
    <Section className="bg-muted/40 py-14 md:py-20">
      <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
        <h2 className="text-balance text-3xl font-bold text-foreground md:text-4xl">
          {heading}
        </h2>
        <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
          {body}
        </p>
        <StartButton cta={cta} className="mt-8 w-full sm:w-auto" />
        <p className="mt-3 text-xs text-muted-foreground">
          Prescribing is never guaranteed.
        </p>
      </motion.div>
    </Section>
  );
}

export function WhereSection({
  title,
  points,
  body,
}: {
  title: string;
  points?: readonly string[];
  body: ReactNode;
}) {
  const { reveal } = useReveal();
  return (
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
            {title}
          </h2>
          {points && points.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {points.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2 text-sm text-foreground md:text-base"
                >
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground md:mt-1" />
                  {point}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            {body}
          </div>
        </div>
      </motion.div>
    </Section>
  );
}

export function FaqSection({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: TreatmentFaqItem[];
}) {
  return (
    <Section id="faq" className={cn("scroll-mt-20", LAZY_SECTION)}>
      <SectionHeading title={title} description={description} />
      <div className="mt-10">
        <TreatmentFaqSection items={items} />
      </div>
    </Section>
  );
}

export function FinalCtaSection({
  heading,
  body,
  cta,
}: {
  heading: string;
  body: string;
  cta: TemplateCta;
}) {
  return (
    <Section className={cn("pt-0", LAZY_SECTION)}>
      <div className="rounded-4xl bg-primary px-6 py-12 text-center text-primary-foreground md:px-12 md:py-16">
        <h2 className="text-balance text-3xl font-bold md:text-4xl">
          {heading}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
          {body}
        </p>
        <StartButton
          cta={cta}
          className="mt-8 w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 sm:w-auto"
        />
        <p className="mt-4 text-xs text-primary-foreground/70">
          Cash-pay only. Prescribing is never guaranteed.
        </p>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Template
// ---------------------------------------------------------------------------

export type SectionKey =
  | "hero"
  | "proof"
  | "story"
  | "howItWorks"
  | "pricing"
  | "included"
  | "midCta"
  | "where"
  | "team"
  | "faq"
  | "finalCta"
  | "guides";

export const SECTION_ORDER: readonly SectionKey[] = [
  "hero",
  "proof",
  "story",
  "howItWorks",
  "pricing",
  "included",
  "midCta",
  "where",
  "team",
  "faq",
  "finalCta",
  "guides",
];

export type LandingTemplateProps = {
  /** Page path for the related-guides block, e.g. "/tirzepatide-houston/". */
  pagePath: string;
  hero: HeroProps;
  proofStats: readonly ProofStat[];
  /** Story video settings. Pass `null` to hide the section. */
  story?: {
    videoId?: string;
    heading?: string;
    body?: string;
    disclaimer?: StoryDisclaimer;
  } | null;
  howItWorksTitle: string;
  /** Page-specific pricing / product section. */
  pricing: {
    id?: string;
    title: string;
    description?: string;
    children: ReactNode;
    footnote?: ReactNode;
  };
  included: {
    title: string;
    description: string;
    ariaLabel: string;
    callouts: readonly Callout[];
    images?: readonly HeroImage[];
    imageLayout?: HeroImageLayout;
    caption?: string;
  };
  midCta: { heading: string; body: string; cta?: TemplateCta };
  where: { title: string; points?: readonly string[]; body: ReactNode };
  faq: { title: string; description: string; items: TreatmentFaqItem[] };
  finalCta: { heading: string; body: string; cta: TemplateCta };
  /** Replace a section (a node) or remove it (`null`). */
  overrides?: Partial<Record<SectionKey, ReactNode>>;
  /** Extra sections rendered right after the named one. */
  insertAfter?: Partial<Record<SectionKey, ReactNode>>;
  /** Anything that must live outside the layout flow, such as modals. */
  children?: ReactNode;
};

export function LandingTemplate(props: LandingTemplateProps) {
  const { overrides = {}, insertAfter = {} } = props;

  const defaults: Record<SectionKey, ReactNode> = {
    hero: <HeroSection {...props.hero} />,
    proof: <ProofStatsSection stats={props.proofStats} />,
    story:
      props.story === null ? null : (
        <StorySection cta={props.hero.cta} {...props.story} />
      ),
    howItWorks: (
      <HowItWorksSteps
        eyebrow={null}
        title={props.howItWorksTitle}
        showCareFollowUpNote
      />
    ),
    pricing: <PricingSection {...props.pricing} />,
    included: (
      <IncludedSection
        {...props.included}
        images={props.included.images ?? props.hero.images}
        imageLayout={
          props.included.imageLayout ?? props.hero.imageLayout ?? "single"
        }
      />
    ),
    midCta: (
      <MidCtaSection
        heading={props.midCta.heading}
        body={props.midCta.body}
        cta={props.midCta.cta ?? props.hero.cta}
      />
    ),
    where: <WhereSection {...props.where} />,
    // Team media license: no CTA or pricing adjacent, so keep this section standalone.
    team: <MedicalTeamSection className={LAZY_SECTION} />,
    faq: <FaqSection {...props.faq} />,
    finalCta: <FinalCtaSection {...props.finalCta} />,
    guides: <MoneyPageGuides path={props.pagePath} />,
  };

  return (
    <MarketingLayout>
      {SECTION_ORDER.map((key) => (
        <Fragment key={key}>
          {key in overrides ? overrides[key] : defaults[key]}
          {insertAfter[key]}
        </Fragment>
      ))}
      {props.children}
    </MarketingLayout>
  );
}
