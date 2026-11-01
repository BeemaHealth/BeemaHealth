import { Link } from "@tanstack/react-router";
import {
  HeartPulse,
  Pill,
  ShieldCheck,
  Stethoscope,
  Truck,
} from "lucide-react";
import { Section, SectionHeading } from "@/components/site/primitives";
import {
  TreatmentComparisonTable,
  TreatmentPricingCard,
} from "@/components/site/TreatmentPageBlocks";
import { BmiCalculator } from "@/components/site/BmiCalculator";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatUsd,
  promoFirstMonthUsd,
  semaThreeMonthPromoTotalUsd,
} from "@/lib/medication-pricing";
import { GOOGLE_RATING_VALUE } from "@/lib/google-business";
import { resolveVialImagery } from "@/lib/treatment-imagery";
import { learnPath } from "@/content/learn/types";
import type { TreatmentFaqItem } from "@/components/site/TreatmentPageBlocks";
import {
  CancellationLink,
  LandingTemplate,
  type LandingTemplateProps,
  type PriceTile,
} from "./LandingTemplate";
import {
  EligibilityCard,
  ProseSection,
  SafetySection,
  TalkToProviderBody,
} from "./blocks";
import { NO_MEMBERSHIP_FEE_STAT } from "./proof";
import {
  TIRZEPATIDE_STORY_POSTER,
  TIRZEPATIDE_STORY_YOUTUBE_ID,
} from "./story";

type Med = "tirzepatide" | "semaglutide";

type MedConfig = {
  name: string;
  pagePath: string;
  heroCtaId: keyof typeof CTA_IDS;
  footerCtaId: keyof typeof CTA_IDS;
  bmiCtaId: keyof typeof CTA_IDS;
  eligibilityIntro: string;
  eligibilityPoints: readonly string[];
  safetyBody: string;
  compareHighlight: "tirzepatide" | "semaglutide";
  compareDescription: string;
  otherName: string;
  otherHoustonPath: "/tirzepatide-houston/" | "/semaglutide-houston/";
  nationwidePath: "/tirzepatide/" | "/semaglutide/";
  otherNationwidePath: "/tirzepatide/" | "/semaglutide/";
  guideSlug: string;
  /** The nationwide page (`/semaglutide/`, `/tirzepatide/`) has its own CTA ids. */
  nationwide: {
    pagePath: "/tirzepatide/" | "/semaglutide/";
    heroCtaId: keyof typeof CTA_IDS;
    footerCtaId: keyof typeof CTA_IDS;
    bmiCtaId: keyof typeof CTA_IDS;
  };
};

const MED_CONFIG: Record<Med, MedConfig> = {
  tirzepatide: {
    name: "Tirzepatide",
    pagePath: "/tirzepatide-houston/",
    heroCtaId: "tirzepatide_houston_hero",
    footerCtaId: "tirzepatide_houston_footer",
    bmiCtaId: "tirzepatide_houston_bmi",
    eligibilityIntro:
      "Not everyone qualifies. Eligibility is based on BMI, health history, current medications, a licensed provider's independent judgment, and applicable state law.",
    eligibilityPoints: [
      "Adults 18 and older",
      "Eligibility depends on BMI, health history, and current medications",
      "A licensed provider makes the final decision, based on your intake and applicable state law",
    ],
    safetyBody:
      "Tirzepatide is a prescription medication and is not appropriate for everyone. Compounded tirzepatide is not FDA-approved and is considered only when legally available and clinically appropriate. It is not identical to branded tirzepatide.",
    compareHighlight: "tirzepatide",
    compareDescription:
      "Both are GLP-1 medications used in medical weight-management care. Neither is universally better, appropriateness is an individual clinical decision.",
    otherName: "semaglutide",
    otherHoustonPath: "/semaglutide-houston/",
    nationwidePath: "/tirzepatide/",
    otherNationwidePath: "/semaglutide/",
    guideSlug: "tirzepatide-in-houston",
    nationwide: {
      pagePath: "/tirzepatide/",
      heroCtaId: "tirzepatide_hero",
      footerCtaId: "tirzepatide_footer",
      bmiCtaId: "tirzepatide_bmi",
    },
  },
  semaglutide: {
    name: "Semaglutide",
    pagePath: "/semaglutide-houston/",
    heroCtaId: "semaglutide_houston_hero",
    footerCtaId: "semaglutide_houston_footer",
    bmiCtaId: "semaglutide_houston_bmi",
    eligibilityIntro:
      "Not everyone qualifies for semaglutide. Your provider weighs BMI, health history, current medications, and applicable state law before making an independent decision.",
    eligibilityPoints: [
      "Adults 18 and older",
      "Eligibility considers BMI, health history, and current medications",
      "Final approval rests with a licensed provider",
    ],
    safetyBody:
      "Semaglutide is a prescription medication and isn't appropriate for everyone. Compounded semaglutide is not FDA-approved and is considered only when legally available and clinically appropriate. It should not be assumed identical to branded semaglutide.",
    compareHighlight: "semaglutide",
    compareDescription:
      "Both are GLP-1 medications used in medical weight-management care. Neither is universally better, your provider decides what's appropriate for you.",
    otherName: "tirzepatide",
    otherHoustonPath: "/tirzepatide-houston/",
    nationwidePath: "/semaglutide/",
    otherNationwidePath: "/tirzepatide/",
    guideSlug: "semaglutide-in-houston",
    nationwide: {
      pagePath: "/semaglutide/",
      heroCtaId: "semaglutide_hero",
      footerCtaId: "semaglutide_footer",
      bmiCtaId: "semaglutide_bmi",
    },
  },
};

const WHAT_IS: Record<Med, string> = {
  tirzepatide:
    "Tirzepatide is a GLP-1/GIP medication used in medical weight-management care. It's available both as an FDA-approved branded medication and, separately, as a compounded version prepared by a licensed compounding pharmacy. Compounded tirzepatide is not the same product as the branded version, it is not FDA-approved and is considered only when legally available and clinically appropriate.",
  semaglutide:
    "Semaglutide is a GLP-1 medication used in medical weight-management care. Like tirzepatide, it comes in an FDA-approved branded form and, separately, as a compounded version made by a licensed compounding pharmacy. Compounded semaglutide is not FDA-approved and is considered only when legally available and clinically appropriate; whether it's an appropriate option for you is a decision your licensed provider makes individually.",
};

const WHAT_IS_NATIONWIDE: Record<Med, readonly string[]> = {
  tirzepatide: [
    "Tirzepatide helps you feel full sooner and stay full longer, and it may also help your body respond better to the food you eat. When you feel full longer, it's easier to eat less without feeling hungry all the time. Eating less, over time, can lead to weight loss.",
    "Tirzepatide is a GLP-1/GIP medication used in medical weight-management care. It's available both as an FDA-approved branded medication and, separately, as a compounded version prepared by a licensed compounding pharmacy.",
    "Compounded tirzepatide is not the same product as the branded version, it is not FDA-approved and is considered only when legally available and clinically appropriate. A licensed provider decides, on a case-by-case basis, whether it may be an appropriate option as part of your care.",
  ],
  semaglutide: [
    "Semaglutide helps you feel full sooner and stay full longer, by slowing down how fast food leaves your stomach. When you feel full longer, it's easier to eat less without feeling hungry all the time. Eating less, over time, can lead to weight loss.",
    "Semaglutide is a GLP-1 medication used in medical weight-management care. Like tirzepatide, it comes in an FDA-approved branded form and, separately, as a compounded version made by a licensed compounding pharmacy.",
    "Compounded semaglutide is a different product from the branded version, it is not FDA-approved and is considered only when legally available and clinically appropriate. Whether it's an appropriate option for you is a decision your licensed provider makes individually.",
  ],
};

/** Hero price tile, straight from the pricing library (nothing hardcoded). */
function heroTile(med: Med): PriceTile {
  if (med === "semaglutide") {
    const p = COMPOUNDED_SEMAGLUTIDE_PRICING;
    return {
      name: "Semaglutide",
      price: formatUsd(promoFirstMonthUsd(p)),
      unit: "first month",
      detail: `Then ${formatUsd(p.monthlyUsd)}/mo · ${formatUsd(semaThreeMonthPromoTotalUsd())} for 3 months`,
      note: `With code ${p.promoCode} on a 3-month plan`,
    };
  }
  const starter = COMPOUNDED_TIRZEPATIDE_PRICING.starterPack;
  return {
    name: "Tirzepatide",
    price: starter ? `from ${formatUsd(starter.monthlyEquivalentUsd)}` : "",
    unit: "per month",
    detail: starter
      ? `${formatUsd(starter.totalUsd)} for ${starter.months} months`
      : null,
  };
}

export type GlpTreatmentPageProps = {
  med: Med;
  /** "houston" is the city ad page; "nationwide" is /semaglutide or /tirzepatide. */
  market?: "houston" | "nationwide";
  faqItems: TreatmentFaqItem[];
} & Pick<LandingTemplateProps, "overrides" | "insertAfter">;

/**
 * New-layout Houston GLP-1 landing page (tirzepatide or semaglutide). Same
 * CTA ids, FAQ items, safety copy and BMI calculator as the control it
 * replaces; only the layout changes. Customize a single page by passing
 * `overrides` / `insertAfter` from its variant file.
 */
export function GlpTreatmentPage({
  med,
  market = "houston",
  faqItems,
  overrides,
  insertAfter,
}: GlpTreatmentPageProps) {
  const c = MED_CONFIG[med];
  const lower = c.name.toLowerCase();
  const pricing =
    med === "tirzepatide"
      ? COMPOUNDED_TIRZEPATIDE_PRICING
      : COMPOUNDED_SEMAGLUTIDE_PRICING;
  const imagery = resolveVialImagery(med);
  const houston = market === "houston";
  const ids = houston
    ? {
        pagePath: c.pagePath,
        heroCtaId: c.heroCtaId,
        footerCtaId: c.footerCtaId,
        bmiCtaId: c.bmiCtaId,
      }
    : c.nationwide;
  const heroCta = resolveCta(CTA_IDS[ids.heroCtaId]);
  const footerCta = resolveCta(CTA_IDS[ids.footerCtaId]);
  const where = houston ? " in Houston" : "";

  return (
    <LandingTemplate
      pagePath={ids.pagePath}
      story={
        med === "tirzepatide"
          ? {
              videoId: TIRZEPATIDE_STORY_YOUTUBE_ID,
              poster: TIRZEPATIDE_STORY_POSTER,
              disclaimer: "glp1",
            }
          : undefined
      }
      hero={{
        h1: `${c.name} weight-loss care${where || " online"}`,
        lead: `Get a plan built around your health history. A licensed provider reviews it and, if appropriate, ships compounded ${lower} to your door${where}. One monthly price covers it. Starting your intake is free.`,
        cta: heroCta,
        images: [imagery],
        tiles: [heroTile(med)],
        priceNote: (
          <>
            {med === "tirzepatide"
              ? "To see the starter pack price, mark that you are new to GLP-1 when asked during intake. Starter pack and Tirz100 can't be used together. "
              : ""}
            Medication eligibility and availability are determined by a licensed
            provider and applicable law. Cash-pay when prescribed. Product
            images are illustrative. See our <CancellationLink />.
          </>
        ),
      }}
      proofStats={[
        { value: GOOGLE_RATING_VALUE, label: "Google rating", stars: true },
        {
          value: "50 states",
          label: "Providers licensed per state",
          stars: false,
        },
        { value: "503A", label: "U.S. licensed pharmacies", stars: false },
        NO_MEMBERSHIP_FEE_STAT,
      ]}
      howItWorksTitle={`How it works`}
      pricing={{
        title: `${c.name} pricing${where}`,
        description: `Clear cash-pay rates for compounded ${lower}. No membership fee. Your licensed provider decides what medication and dose is appropriate for you - pricing below is cash-pay when prescribed.`,
        children: (
          <div className="grid gap-10 lg:grid-cols-2">
            <EligibilityCard
              intro={c.eligibilityIntro}
              points={c.eligibilityPoints}
            />
            <TreatmentPricingCard
              pricing={pricing}
              imagery={imagery}
              cta={heroCta}
              className="h-full"
            />
          </div>
        ),
        footnote: (
          <p>
            All prices are cash-pay when prescribed. See our{" "}
            <CancellationLink />.
          </p>
        ),
      }}
      included={{
        title: "One monthly price covers your care",
        description:
          "Everything below is included in your plan when a licensed provider prescribes. No membership fee, no insurance paperwork.",
        ariaLabel: "What your monthly plan includes",
        callouts: [
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
            icon: HeartPulse,
            title: "Supplies",
            body: "Syringes and alcohol pads are part of the plan.",
          },
          {
            icon: Truck,
            title: "Expedited shipping",
            body: houston
              ? "Delivered to your door in Houston."
              : "Delivered to your door.",
          },
        ],
      }}
      midCta={{
        heading: "Your plan starts with a free intake",
        body: "Starting your intake is free, and you won't be charged anything if you're not prescribed. A licensed provider reviews your health history and decides what is right for you. If treatment is appropriate, one monthly price covers your care, medication, supplies, and shipping.",
      }}
      where={{
        title: houston
          ? `Online ${lower} care for Houston patients`
          : `${c.name} care, available in all 50 states`,
        body: houston ? (
          <>
            <p>
              Beema Health has no clinic or office in Houston. Instead, a
              provider licensed to treat patients in Texas reviews your medical
              intake online, under the same Texas telemedicine rules that govern
              an in-person visit. If compounded {lower} is prescribed, it&apos;s
              shipped directly to your Houston address rather than picked up in
              person.
            </p>
            <p>{WHAT_IS[med]}</p>
            <p>
              Want the fuller picture of how Texas telemedicine law applies, and
              what Houston&apos;s climate means for storing and taking a GLP-1
              medication? See our{" "}
              <Link
                to={learnPath("weight-loss", c.guideSlug)}
                className="text-primary underline"
              >
                Houston {lower} guide
              </Link>
              . Looking for care outside Houston?{" "}
              <Link to={c.nationwidePath} className="text-primary underline">
                See our nationwide {lower} program
              </Link>
              .
            </p>
          </>
        ) : (
          <>
            <p>
              Beema Health is available to adults in all 50 U.S. states. A
              licensed provider reviews your medical intake online and decides
              whether {lower} may be appropriate for you. If compounded {lower}{" "}
              is prescribed, it ships directly to your door.
            </p>
            <p>
              Looking for care in Houston? See{" "}
              <Link to={c.otherHoustonPath} className="text-primary underline">
                GLP-1 care in Houston
              </Link>
              .
            </p>
          </>
        ),
      }}
      faq={{
        title: "GLP-1 care, pricing, and getting started",
        description: houston
          ? `Straight answers for Houston adults comparing cash-pay ${lower} care online.`
          : `Straight answers for adults comparing cash-pay ${lower} care online.`,
        items: faqItems,
      }}
      finalCta={{
        heading: "Ready to see if GLP-1 care is right for you?",
        body: houston
          ? "Houston patients can complete medical intake from home. You won't be charged anything if you're not prescribed. A prescription is never guaranteed."
          : "Complete medical intake from home. You won't be charged anything if you're not prescribed. A prescription is never guaranteed.",
        cta: footerCta,
      }}
      overrides={overrides}
      insertAfter={{
        ...(houston
          ? {}
          : {
              howItWorks: (
                <ProseSection title={`What is ${lower}?`}>
                  {WHAT_IS_NATIONWIDE[med].map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                  <p>
                    Not sure {lower} is the right fit? Learn about our{" "}
                    <Link to="/weight-loss/" className="text-primary underline">
                      weight-loss program
                    </Link>{" "}
                    to see the full range of options.
                  </p>
                </ProseSection>
              ),
            }),
        pricing: (
          <Section className="pt-0">
            <SectionHeading
              align="left"
              title="Check your BMI"
              description="See where your BMI falls, then decide if it's worth a conversation with a licensed provider."
              className="mx-0 max-w-2xl"
            />
            <div className="mt-8">
              <BmiCalculator
                ctaId={CTA_IDS[ids.bmiCtaId]}
                medicationLabel={lower}
              />
            </div>
          </Section>
        ),
        included: (
          <>
            <SafetySection
              cards={[
                {
                  icon: ShieldCheck,
                  title: "Prescription medical care",
                  body: c.safetyBody,
                },
                {
                  icon: HeartPulse,
                  title: "Talk to your provider",
                  body: (
                    <TalkToProviderBody extra="Include your full medical history, possible contraindications, side effects, and any medication interactions in your intake questionnaire." />
                  ),
                },
              ]}
            />
            <Section className="pt-0">
              <SectionHeading
                align="left"
                title={`${c.name} vs. ${c.otherName}`}
                description={c.compareDescription}
                className="mx-0 max-w-2xl"
              />
              <div className="mt-8">
                <TreatmentComparisonTable highlight={c.compareHighlight} />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Curious about the alternative?{" "}
                <Link
                  to={houston ? c.otherHoustonPath : c.otherNationwidePath}
                  className="text-primary underline"
                >
                  See compounded {c.otherName} details
                  {houston ? " for Houston" : ""}
                </Link>
                .
              </p>
            </Section>
          </>
        ),
        ...insertAfter,
      }}
    />
  );
}
