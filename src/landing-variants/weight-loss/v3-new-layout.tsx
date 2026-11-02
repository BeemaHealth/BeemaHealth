import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ChefHat,
  HeartPulse,
  Pill,
  ShieldCheck,
  Stethoscope,
  Truck,
  Wallet,
} from "lucide-react";
import { Section, SurfaceCard } from "@/components/site/primitives";
import {
  TreatmentComparisonTable,
  TreatmentPricingCard,
} from "@/components/site/TreatmentPageBlocks";
import { Button } from "@/components/ui/button";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { COMPOUNDED_DISCLOSURE } from "@/lib/compounded-disclosure";
import { GOOGLE_RATING_VALUE } from "@/lib/google-business";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  COMPOUNDED_TIRZEPATIDE_PRICING,
  formatUsd,
  promoFirstMonthUsd,
  semaThreeMonthPromoTotalUsd,
  starterPackTitle,
  type CompoundedMedicationPricing,
} from "@/lib/medication-pricing";
import { RECIPES } from "@/lib/recipes";
import { resolveVialImagery, type MedicationId } from "@/lib/treatment-imagery";
import {
  WEIGHT_LOSS_CASH_PAY_POINTS,
  WEIGHT_LOSS_FAQ,
  WEIGHT_LOSS_LINK,
  WEIGHT_LOSS_SERVING_POINTS,
} from "@/lib/weight-loss-page";
import { cn } from "@/lib/utils";
import { useMedicationFromUrl } from "@/lib/medication-param";
import type { LandingVariant } from "../types";
import {
  CancellationLink,
  LandingTemplate,
  type PriceTile,
} from "../template/LandingTemplate";
import { SafetySection, TalkToProviderBody } from "../template/blocks";
import { NO_MEMBERSHIP_FEE_STAT } from "../template/proof";

/**
 * New shared landing layout (same design as GLP-1 Houston and the treatment
 * pages). Content, FAQ, CTA ids and pricing picker match the control; layout
 * is built by `../template`. To customize this page only, pass `overrides` or
 * `insertAfter` below.
 */

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

/** Hero price tiles, straight from the pricing library (nothing hardcoded). */
function heroTiles(): PriceTile[] {
  const sema = COMPOUNDED_SEMAGLUTIDE_PRICING;
  const starter = COMPOUNDED_TIRZEPATIDE_PRICING.starterPack;
  return [
    {
      name: "Semaglutide",
      price: formatUsd(promoFirstMonthUsd(sema)),
      unit: "first month",
      detail: `Then ${formatUsd(sema.monthlyUsd)}/mo · ${formatUsd(semaThreeMonthPromoTotalUsd())} for 3 months`,
      note: `With code ${sema.promoCode} on a 3-month plan`,
    },
    {
      name: starter
        ? `Tirzepatide ${starterPackTitle(starter)}`
        : "Tirzepatide",
      price: starter ? formatUsd(starter.monthlyEquivalentUsd) : "",
      unit: "per month for new patients",
      detail: starter
        ? `${formatUsd(starter.totalUsd)} for ${starter.months} months`
        : null,
    },
  ];
}

function PricingPicker() {
  const heroCta = resolveCta(CTA_IDS.weight_loss_hero);
  const [selected, setSelected] = useMedicationFromUrl();
  const imagery: Record<MedicationId, ReturnType<typeof resolveVialImagery>> = {
    semaglutide: resolveVialImagery("semaglutide"),
    tirzepatide: resolveVialImagery("tirzepatide"),
  };

  return (
    <>
      <div className="flex justify-center">
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
              aria-selected={selected === id}
              onClick={() => setSelected(id)}
              className={cn(
                "min-h-11 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected === id
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
          key={selected}
          pricing={MEDICATION_PICKER[selected].pricing}
          imagery={imagery[selected]}
          cta={heroCta}
        />
      </div>
      <ul className="mx-auto mt-8 max-w-2xl space-y-2">
        {WEIGHT_LOSS_CASH_PAY_POINTS.map((point) => (
          <li
            key={point}
            className="flex items-start gap-2 text-sm text-foreground"
          >
            <Wallet
              className="mt-0.5 size-4 shrink-0 text-accent-foreground"
              aria-hidden
            />
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
    </>
  );
}

function RecipesSection() {
  return (
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
  );
}

function WeightLossNewLayout() {
  const heroCta = resolveCta(CTA_IDS.weight_loss_hero);
  const footerCta = resolveCta(CTA_IDS.weight_loss_footer);
  const sema = resolveVialImagery("semaglutide");
  const tirz = resolveVialImagery("tirzepatide");

  return (
    <LandingTemplate
      pagePath={WEIGHT_LOSS_LINK}
      hero={{
        h1: "Online medical weight-loss care",
        lead: "Get a plan built around your health history. A licensed provider reviews it and, if appropriate, prescribes compounded semaglutide or tirzepatide and ships it to your door. One monthly price covers it. Starting your intake is free.",
        cta: heroCta,
        images: [sema, tirz],
        imageLayout: "duo",
        tiles: heroTiles(),
        priceNote: (
          <>
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
      howItWorksTitle="How weight-loss care works"
      pricing={{
        title: "Clear cash-pay rates for compounded options",
        description:
          "No membership fee. Your licensed provider decides what medication and dose is appropriate for you - pricing below is cash-pay when prescribed.",
        children: <PricingPicker />,
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
            body: "Delivered to your door.",
          },
        ],
      }}
      midCta={{
        heading: "Your plan starts with a free intake",
        body: "Starting your intake is free, and you won't be charged anything if you're not prescribed. A licensed provider reviews your health history and decides what is right for you. If treatment is appropriate, one monthly price covers your care, medication, supplies, and shipping.",
      }}
      where={{
        title: "Online weight-loss care, available in all 50 states",
        points: WEIGHT_LOSS_SERVING_POINTS,
        body: (
          <>
            <p>
              You complete Beema Health&apos;s medical intake online and a
              licensed provider reviews your case by telehealth. When clinically
              appropriate and legally available, compounded semaglutide or
              tirzepatide may be prescribed and shipped to you. Beema Health
              does not serve patients outside the United States.
            </p>
            <p>
              Looking for care in Houston? See{" "}
              <Link to="/glp-1-houston/" className="text-primary underline">
                GLP-1 care in Houston
              </Link>
              . Questions about who qualifies? Read our{" "}
              <Link to="/safety/" className="text-primary underline">
                safety and eligibility
              </Link>{" "}
              page.
            </p>
          </>
        ),
      }}
      faq={{
        title: "Medical weight loss, pricing, and getting started",
        description:
          "Straight answers for adults comparing online medical weight-loss care.",
        items: WEIGHT_LOSS_FAQ,
      }}
      finalCta={{
        heading: "Get started online",
        body: "Complete medical intake from home. You won't be charged anything if you're not prescribed. A prescription is never guaranteed.",
        cta: footerCta,
      }}
      insertAfter={{
        pricing: (
          <Section className="pt-0">
            <TreatmentComparisonTable />
          </Section>
        ),
        included: (
          <SafetySection
            cards={[
              {
                icon: ShieldCheck,
                title: "Prescription medical care",
                body: "Prescribing is an individual clinical decision. Compounded medications are not FDA-approved and are not appropriate for everyone.",
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
        ),
        where: <RecipesSection />,
      }}
    />
  );
}

export const variant: LandingVariant = {
  id: "v3-new-layout",
  label: "New layout (shared template)",
  Component: WeightLossNewLayout,
};
