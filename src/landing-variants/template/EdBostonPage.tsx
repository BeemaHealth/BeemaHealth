import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  Pill,
  Stethoscope,
  Truck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MINT_OPTIONS } from "@/components/site/EdMintsPicker";
import type { TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  COMPOUNDED_ED_MINTS_REQUIRED,
  GENERIC_SILDENAFIL_REQUIRED,
  GENERIC_TADALAFIL_REQUIRED,
} from "@/lib/compounded-disclosure";
import { formatUsd } from "@/lib/medication-pricing";
import { GOOGLE_RATING_VALUE } from "@/lib/google-business";
import {
  ED_MINTS_RDT_PRICING,
  ED_SILDENAFIL_PER_PILL_USD,
  ED_TADALAFIL_PER_PILL_USD,
  formatPerPillStartingAt,
  formatSimpleQuarterlyStartingAt,
} from "@/lib/simple-treatment-pricing";
import tadalafilPhoto from "@/assets/treatments/tadalafil-oral-tablets-bottle.webp";
import sildenafilPhoto from "@/assets/treatments/sildenafil-oral-tablets-bottle.webp";
import edMintsPhoto from "@/assets/treatments/ed-mints-dissolvable-tablet.webp";
import { PRODUCT_PRICING } from "../sexual-health/pricing";
import { ProductPlansDialog } from "../sexual-health/ProductPlansDialog";
import {
  CancellationLink,
  LandingTemplate,
  StartButton,
  type Callout,
  type HeroImage,
  type LandingTemplateProps,
  type ProofStat,
} from "./LandingTemplate";
import {
  EligibilityCard,
  ProseSection,
  SafetySection,
  TalkToProviderBody,
} from "./blocks";
import { NO_MEMBERSHIP_FEE_STAT } from "./proof";

type EdProduct = "sildenafil" | "tadalafil" | "ed-mints";

const ED_CALLOUTS: readonly Callout[] = [
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
];

const ELIGIBILITY_INTRO =
  "Not everyone qualifies. Your provider weighs cardiovascular history, current medications, and applicable state law before making an independent decision.";

const BOSTON_LEAD =
  "Skip the waiting room and the pharmacy counter. Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, your medication ships to your Boston address. Prescribing is never guaranteed.";

const BOSTON_FINAL_BODY =
  "Boston patients can complete intake from home. You won't be charged anything if you're not prescribed, and a prescription is never guaranteed.";

const NATIONWIDE_LEAD =
  "Skip the waiting room and the pharmacy counter. Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, your medication ships to your door. Prescribing is never guaranteed.";

const NATIONWIDE_FINAL_BODY =
  "Complete intake from home. You won't be charged anything if you're not prescribed, and a prescription is never guaranteed.";

export type EdMarket = "boston" | "nationwide";

function nationwideBody(what: string) {
  return (
    <>
      <p>
        Beema Health is available to adults in all 50 US states. You can
        complete the medical intake entirely online, from home. A licensed
        provider reviews your case by telehealth and decides, on an individual
        basis, whether {what} may be appropriate for you. When prescribed,
        medication ships directly to your door.
      </p>
    </>
  );
}

function servingBody(what: string) {
  return (
    <>
      <p>
        If you&apos;re in Boston, or anywhere else in Massachusetts, you can
        complete Beema Health&apos;s medical intake entirely online, from home -
        there is no physical Boston office or in-person clinic to visit. A
        licensed provider reviews your case by telehealth and decides, on an
        individual basis, whether {what} may be appropriate for you. When
        prescribed, medication ships to your Boston address.
      </p>
      <p>
        Licensed providers can evaluate adults in all 50 US states, including
        Massachusetts.
      </p>
    </>
  );
}

function statsFor(third: ProofStat): ProofStat[] {
  return [
    { value: GOOGLE_RATING_VALUE, label: "Google rating", stars: true },
    { value: "50 states", label: "Providers licensed per state", stars: false },
    third,
    NO_MEMBERSHIP_FEE_STAT,
  ];
}

// ---------------------------------------------------------------------------
// Sildenafil / tadalafil (single generic product, plans dialog)
// ---------------------------------------------------------------------------

type GenericConfig = {
  name: string;
  brand: string;
  pagePath: "/sildenafil-boston/" | "/tadalafil-boston/";
  heroCtaId: keyof typeof CTA_IDS;
  footerCtaId: keyof typeof CTA_IDS;
  image: HeroImage;
  photo: string;
  blurb: string;
  perPill: string;
  headSub: string;
  disclosure: string;
  whatIs: string;
  otherLabel: string;
  otherPath: "/sildenafil-boston/" | "/tadalafil-boston/";
  nationwidePath: "/sildenafil/" | "/tadalafil/";
  learnMore: "/sildenafil/" | "/tadalafil/";
};

const GENERIC: Record<"sildenafil" | "tadalafil", GenericConfig> = {
  sildenafil: {
    name: "Sildenafil",
    brand: "Viagra",
    pagePath: "/sildenafil-boston/",
    heroCtaId: "sildenafil_boston_hero",
    footerCtaId: "sildenafil_boston_footer",
    photo: sildenafilPhoto,
    image: {
      src: sildenafilPhoto,
      alt: "Bottle of Beema Health sildenafil oral tablets, generic Viagra",
      width: 720,
      height: 900,
    },
    blurb: "An oral tablet taken as needed.",
    perPill: `from ${formatPerPillStartingAt(ED_SILDENAFIL_PER_PILL_USD)}`,
    headSub: "On the 3-month plan. 1-month plan below.",
    disclosure: GENERIC_SILDENAFIL_REQUIRED,
    whatIs:
      "Sildenafil works by relaxing blood vessels so more blood can flow to the penis. That can make it easier to get and keep an erection when you're sexually aroused. It doesn't cause arousal by itself - you still need to be sexually stimulated for it to work. Sildenafil typically takes effect within 30-60 minutes and lasts several hours, so it's usually taken as needed before activity.",
    otherLabel: "tadalafil",
    otherPath: "/tadalafil-boston/",
    nationwidePath: "/sildenafil/",
    learnMore: "/sildenafil/",
  },
  tadalafil: {
    name: "Tadalafil",
    brand: "Cialis",
    pagePath: "/tadalafil-boston/",
    heroCtaId: "tadalafil_boston_hero",
    footerCtaId: "tadalafil_boston_footer",
    photo: tadalafilPhoto,
    image: {
      src: tadalafilPhoto,
      alt: "Bottle of Beema Health tadalafil oral tablets, generic Cialis",
      width: 720,
      height: 900,
    },
    blurb:
      "An oral tablet taken as needed or daily. Known for a longer duration of action than other ED medications.",
    perPill: `from ${formatPerPillStartingAt(ED_TADALAFIL_PER_PILL_USD)}`,
    headSub:
      "On the 3-month plan, lowest dose. Higher doses and 1-month plans below.",
    disclosure: GENERIC_TADALAFIL_REQUIRED,
    whatIs:
      "Tadalafil works by relaxing blood vessels so more blood can flow to the penis. That can make it easier to get and keep an erection when you're sexually aroused. It doesn't cause arousal by itself - you still need to be sexually stimulated for it to work. Tadalafil is known for a longer duration of action than other ED medications, which is why some patients take a low dose daily rather than only as needed.",
    otherLabel: "sildenafil",
    otherPath: "/sildenafil-boston/",
    nationwidePath: "/tadalafil/",
    learnMore: "/tadalafil/",
  },
};

const OTHER_NATIONWIDE = {
  sildenafil: "/tadalafil/",
  tadalafil: "/sildenafil/",
} as const;

export type GenericEdBostonPageProps = {
  product: "sildenafil" | "tadalafil";
  faqItems: TreatmentFaqItem[];
  /** Defaults to "boston" (the live Boston pages). */
  market?: EdMarket;
} & Pick<LandingTemplateProps, "overrides" | "insertAfter">;

/** New-layout Boston page for a single generic ED tablet. */
export function GenericEdBostonPage({
  product,
  faqItems,
  market = "boston",
  overrides,
  insertAfter,
}: GenericEdBostonPageProps) {
  const c = GENERIC[product];
  const lower = c.name.toLowerCase();
  const nationwide = market === "nationwide";
  const heroCta = resolveCta(
    nationwide
      ? CTA_IDS[product === "sildenafil" ? "sildenafil_hero" : "tadalafil_hero"]
      : CTA_IDS[c.heroCtaId],
  );
  const footerCta = resolveCta(
    nationwide
      ? CTA_IDS[
          product === "sildenafil" ? "sildenafil_footer" : "tadalafil_footer"
        ]
      : CTA_IDS[c.footerCtaId],
  );

  return (
    <LandingTemplate
      pagePath={nationwide ? c.nationwidePath : c.pagePath}
      hero={{
        h1: nationwide ? `${c.name} online` : `${c.name} online in Boston`,
        lead: nationwide ? NATIONWIDE_LEAD : BOSTON_LEAD,
        cta: heroCta,
        images: [c.image],
        tiles: [
          {
            name: c.name,
            price: c.perPill,
            unit: c.headSub,
          },
        ],
        priceNote: (
          <>
            Medication eligibility and availability are determined by a licensed
            provider and applicable law. Cash-pay when prescribed. Product
            images are illustrative. See our <CancellationLink />.
          </>
        ),
      }}
      proofStats={statsFor({
        value: "Generic",
        label: `FDA-approved ${lower}`,
        stars: false,
      })}
      howItWorksTitle={`How Beema Health's ${lower} care works`}
      pricing={{
        title: `${c.name} pricing`,
        description:
          "Clear cash-pay pricing. A licensed provider decides what, and which dose, is right for you.",
        children: (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
              <div className="bg-primary-soft p-4 md:p-6">
                <img
                  src={c.image.src}
                  alt={c.image.alt}
                  width={c.image.width}
                  height={c.image.height}
                  loading="lazy"
                  decoding="async"
                  className="mx-auto h-36 w-auto object-contain drop-shadow-xl md:h-48"
                />
              </div>
              <div className="flex flex-1 flex-col p-5 md:p-6">
                <p className="text-sm font-semibold text-muted-foreground">
                  Generic {c.brand} tablet
                </p>
                <h3 className="mt-1 text-2xl font-bold text-foreground">
                  {c.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {c.blurb}
                </p>
                <p className="mt-4 text-3xl font-bold tracking-tight text-foreground">
                  {c.perPill}
                </p>
                <p className="mt-1 text-sm leading-snug text-muted-foreground">
                  {c.headSub}
                </p>
                <ProductPlansDialog
                  name={c.name}
                  pricing={PRODUCT_PRICING[product]}
                  cta={heroCta.withPosition("pricing")}
                />
                <StartButton
                  cta={heroCta.withPosition("pricing")}
                  size="lg"
                  className="mt-4 w-full"
                />
              </div>
            </div>
            <EligibilityCard
              intro={ELIGIBILITY_INTRO}
              points={[
                "Adult men, 18 and older",
                "Eligibility considers cardiovascular history and current medications",
                "Final approval rests with a licensed provider",
              ]}
            />
          </div>
        ),
        footnote: (
          <>
            <p>
              All prices are cash-pay when prescribed, with no membership fee
              and no insurance billed. Your provider decides the medication and
              dose; prescribing is never guaranteed. See our{" "}
              <CancellationLink />.
            </p>
            <p>{c.disclosure}</p>
          </>
        ),
      }}
      included={{
        title: "One price covers your care",
        description:
          "Everything below is included when a licensed provider prescribes. No membership fee, no insurance paperwork.",
        ariaLabel: "What your ED treatment plan includes",
        callouts: ED_CALLOUTS,
      }}
      midCta={{
        heading: "Skip the waiting room. Start from your phone.",
        body: "Starting your intake is free. A licensed provider reviews your health history and decides whether treatment is right for you, and you won't be charged anything if you're not prescribed. If you are, one cash-pay price covers your care and medication.",
      }}
      where={{
        title: nationwide
          ? `Telehealth ${lower} care in all 50 states`
          : `Telehealth ${lower} care for Boston, Massachusetts`,
        body: nationwide ? (
          nationwideBody(lower)
        ) : (
          <>
            {servingBody(lower)}
            <p>
              Looking for the nationwide version of this page instead? See{" "}
              <Link to={c.nationwidePath} className="text-primary underline">
                {c.name}
              </Link>
              .
            </p>
          </>
        ),
      }}
      faq={{
        title: "ED treatment, pricing, and getting started",
        description:
          "Straight answers about how online ED care works with Beema Health.",
        items: faqItems,
      }}
      finalCta={{
        heading: "Ready to see if ED treatment is right for you?",
        body: nationwide ? NATIONWIDE_FINAL_BODY : BOSTON_FINAL_BODY,
        cta: footerCta,
      }}
      overrides={overrides}
      insertAfter={{
        howItWorks: (
          <ProseSection title={`What is ${lower}?`}>
            <p>{c.whatIs}</p>
            <p>
              Beema Health&apos;s {lower} is the FDA-approved generic version of{" "}
              {c.brand} - the identical active ingredient, strength, and
              intended use as the brand-name product, dispensed by a licensed
              pharmacy, not a compounded formulation. Looking for {c.otherLabel}{" "}
              instead? See{" "}
              <Link
                to={nationwide ? OTHER_NATIONWIDE[product] : c.otherPath}
                className="text-primary underline"
              >
                {c.otherLabel.charAt(0).toUpperCase() + c.otherLabel.slice(1)}
                {nationwide ? "" : " in Boston"}
              </Link>
              . Looking for a dissolve-under-the-tongue combination formulation?
              See{" "}
              <Link
                to={nationwide ? "/ed-mints/" : "/ed-mints-boston/"}
                className="text-primary underline"
              >
                ED Mints{nationwide ? "" : " in Boston"}
              </Link>
              , a separate compounded product.
            </p>
            <p>
              Whether {lower} may be appropriate for you is a decision your
              licensed provider makes individually, based on your health history
              and current medications. Completing intake does not guarantee a
              prescription.
            </p>
          </ProseSection>
        ),
        included: (
          <SafetySection
            cards={[
              {
                icon: HeartPulse,
                title: "Prescription medical care",
                body: `This medication is a prescription product and isn't appropriate for everyone, including people on certain nitrate medications or with certain cardiovascular conditions. It is the FDA-approved generic version of ${c.brand}, dispensed by a licensed pharmacy.`,
              },
              {
                icon: HeartPulse,
                title: "Talk to your provider",
                body: (
                  <TalkToProviderBody extra="Include your full medical history, possible contraindications, side effects, and any medication interactions, especially nitrates, in your intake questionnaire." />
                ),
              },
            ]}
          />
        ),
        ...insertAfter,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// ED Mints (compounded, formulation picker)
// ---------------------------------------------------------------------------

function scrollToFormulations() {
  document
    .getElementById("formulations")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * Both ED Mints formulations inline (same options, photos and copy as the
 * "Choose your formulation" popup). Each card links straight to its own
 * questionnaire with the ed_mints_* CTA id, so attribution matches the
 * popup it replaces.
 */
function FormulationChooser() {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-md rounded-2xl border border-primary/40 bg-primary-soft/60 px-4 py-3 text-center shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-accent-foreground">
          Both formulations
        </p>
        <p className="mt-0.5 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          from {formatSimpleQuarterlyStartingAt(ED_MINTS_RDT_PRICING)}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {MINT_OPTIONS.map((opt) => {
          const cta = resolveCta(opt.ctaId, "pricing");
          return (
            <Link
              key={opt.id}
              to={cta.to}
              search={cta.search}
              onClick={cta.onClick}
              className="group flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft outline-none transition-colors hover:border-primary hover:bg-primary-soft/40 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {opt.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">{opt.dose}</p>
                </div>
                <img
                  src={opt.photo}
                  alt={opt.photoAlt}
                  width={1024}
                  height={1024}
                  loading="lazy"
                  decoding="async"
                  className="w-20 shrink-0 sm:w-24"
                />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {opt.description}
              </p>
              <ul className="space-y-1.5">
                {opt.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-accent-foreground" />
                    {b}
                  </li>
                ))}
              </ul>
              <span className="flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-base font-semibold text-primary-foreground transition-colors group-hover:bg-primary/90">
                Continue <ArrowRight className="size-4" />
              </span>
            </Link>
          );
        })}
      </div>
      <EligibilityCard
        intro={ELIGIBILITY_INTRO}
        points={[
          "Adult men, 18 and older",
          "Eligibility considers cardiovascular history and current medications",
          "Final approval and formulation selection rests with a licensed provider",
        ]}
      />
    </div>
  );
}

export type EdMintsBostonPageProps = {
  faqItems: TreatmentFaqItem[];
  /** Defaults to "boston" (the live Boston page). */
  market?: EdMarket;
} & Pick<LandingTemplateProps, "overrides" | "insertAfter">;

/** New-layout Boston ED Mints page. Every Get Started opens the picker. */
export function EdMintsBostonNewPage({
  faqItems,
  market = "boston",
  overrides,
  insertAfter,
}: EdMintsBostonPageProps) {
  const nationwide = market === "nationwide";
  // Every Get Started jumps to the formulation cards on this page; each card
  // links straight to its own questionnaire (ed_mints_*_hero CTA ids).
  const startCta = { label: "Get Started", onClick: scrollToFormulations };
  const image: HeroImage = {
    src: edMintsPhoto,
    alt: nationwide
      ? "Beema Health ED Mints - blue four-part scored dissolvable ED tablet"
      : "Beema Health ED Mints - blue four-part scored dissolvable ED tablet for Boston patients",
    width: 1024,
    height: 1024,
  };
  const price = formatSimpleQuarterlyStartingAt(ED_MINTS_RDT_PRICING);

  return (
    <LandingTemplate
      pagePath={nationwide ? "/ed-mints/" : "/ed-mints-boston/"}
      hero={{
        h1: nationwide ? "ED Mints online" : "ED Mints online in Boston",
        lead: nationwide ? NATIONWIDE_LEAD : BOSTON_LEAD,
        cta: startCta,
        images: [image],
        tiles: [
          {
            name: "ED Mints",
            price,
            unit: "Same price for either formulation",
            detail: `${formatUsd(ED_MINTS_RDT_PRICING.quarterly?.totalUsd ?? 0)} billed every 3 months. Or ${formatUsd(ED_MINTS_RDT_PRICING.monthlyUsd)} for 1 month.`,
          },
        ],
        priceNote: (
          <>
            Medication eligibility, formulation, and availability are determined
            by a licensed provider and applicable law. Cash-pay when prescribed.
            Product images are illustrative. See our <CancellationLink />.
          </>
        ),
      }}
      proofStats={statsFor({
        value: "503A/B",
        label: "FDA-registered outsourcing pharmacies",
        stars: false,
      })}
      howItWorksTitle="How Beema Health's ED Mints care works"
      pricing={{
        id: "formulations",
        title: "Choose your formulation",
        description: `A licensed provider reviews your intake first and decides which formulation, if any, is right for you. You won't be charged anything if you're not prescribed. Both are ${price}, and each has its own intake.`,
        children: <FormulationChooser />,
        footnote: (
          <>
            <p>
              All prices are cash-pay when prescribed, with no membership fee
              and no insurance billed. Your provider decides the formulation;
              prescribing is never guaranteed. See our <CancellationLink />.
            </p>
            <p>{COMPOUNDED_ED_MINTS_REQUIRED}</p>
          </>
        ),
      }}
      included={{
        title: "One price covers your care",
        description:
          "Everything below is included when a licensed provider prescribes. No membership fee, no insurance paperwork.",
        ariaLabel: "What your ED treatment plan includes",
        callouts: ED_CALLOUTS,
      }}
      midCta={{
        heading: "Skip the waiting room. Start from your phone.",
        body: "Starting your intake is free. A licensed provider reviews your health history and decides whether treatment is right for you, and you won't be charged anything if you're not prescribed. If you are, one cash-pay price covers your care and medication.",
        cta: startCta,
      }}
      where={{
        title: nationwide
          ? "Telehealth ED care in all 50 states"
          : "Telehealth ED care for Boston, Massachusetts",
        body: nationwide
          ? nationwideBody("an ED Mints formulation")
          : servingBody("an ED Mints formulation"),
      }}
      faq={{
        title: "ED treatment, pricing, and getting started",
        description:
          "Straight answers about how online ED care works with Beema Health.",
        items: faqItems,
      }}
      finalCta={{
        heading: "Ready to see if ED treatment is right for you?",
        body: nationwide ? NATIONWIDE_FINAL_BODY : BOSTON_FINAL_BODY,
        cta: startCta,
      }}
      overrides={overrides}
      insertAfter={{
        howItWorks: (
          <ProseSection title="What are ED Mints?">
            <p>
              ED Mints are compounded combination formulations that dissolve
              under the tongue instead of being swallowed with water. Most
              patients take one about 30 minutes before sexual activity, and no
              more than one dose in a 24-hour period. They don&apos;t cause
              arousal by themselves - you still need to be sexually stimulated
              for them to work.
            </p>
            <p>
              Beema Health offers two ED Mints formulations, each a combination
              not sold as a single commercial product and prepared at an
              FDA-registered 503B outsourcing facility. These formulations are
              not FDA-approved and are considered only when legally available
              and clinically appropriate. Which option, if any, may be
              appropriate for you is a decision your licensed provider makes
              individually.
            </p>
            <ul className="space-y-2 text-sm text-foreground">
              <li>
                <strong>Tadalafil + Sildenafil 12mg/60mg RDT:</strong> a rapidly
                dissolving tablet combining tadalafil and sildenafil into one
                dose.
              </li>
              <li>
                <strong>
                  Sildenafil 50mg/Tadalafil 20mg/Oxytocin 125 IU ODT:
                </strong>{" "}
                an orally dissolving tablet combining sildenafil, tadalafil, and
                oxytocin into one dose.
              </li>
            </ul>
          </ProseSection>
        ),
        included: (
          <SafetySection
            cards={[
              {
                icon: HeartPulse,
                title: "Prescription medical care",
                body: "These formulations are prescription products and aren't appropriate for everyone, including people on certain nitrate medications or with certain cardiovascular conditions. They are compounded at an FDA-registered 503B outsourcing facility, not FDA-approved, and considered only when legally available and clinically appropriate.",
              },
              {
                icon: HeartPulse,
                title: "Talk to your provider",
                body: (
                  <TalkToProviderBody extra="Include your full medical history, possible contraindications, side effects, and any medication interactions, especially nitrates, in your intake questionnaire." />
                ),
              },
            ]}
          />
        ),
        ...insertAfter,
      }}
    />
  );
}
