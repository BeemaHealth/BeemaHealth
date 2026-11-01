import { ShieldCheck } from "lucide-react";
import { SimpleTreatmentPricingCard } from "@/components/site/TreatmentPageBlocks";
import {
  NAD_PRICING,
  formatSimpleQuarterlyStartingAt,
} from "@/lib/simple-treatment-pricing";
import nadInjectionPhoto from "@/assets/treatments/nad-injection-vial.webp";
import type { LandingVariant } from "../types";
import { ProductPage } from "../template/ProductPage";
import { TalkToProviderBody } from "../template/blocks";
import { ELIGIBILITY_POINTS, FAQ_ITEMS } from "./shared";

/**
 * New shared landing layout (same design as the Houston and Boston pages).
 * Content and FAQ match the control; layout is built by `../template`. To
 * customize this page only, pass `overrides` or `insertAfter` below.
 */
function NewLayout() {
  return (
    <ProductPage
      faqItems={FAQ_ITEMS}
      config={{
        pagePath: "/nad-plus/",
        heroCtaId: "nad_hero",
        footerCtaId: "nad_footer",
        name: "NAD+",
        h1: "Compounded NAD+ injections, online",
        lead: "Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, compounded NAD+ injections is prepared for you and shipped to your door. Prescribing is never guaranteed.",
        image: {
          src: nadInjectionPhoto,
          alt: "Vial of Beema Health compounded NAD+ injection",
          width: 1024,
          height: 1280,
        },
        tile: {
          name: "Compounded NAD+",
          price: `from ${formatSimpleQuarterlyStartingAt(NAD_PRICING)}`,
          unit: "On a 3-month plan",
        },
        proofThird: {
          value: "Rx",
          label: "Licensed provider review",
          stars: false,
        },
        pricingDescription:
          "Your provider decides whether NAD+ is clinically appropriate - this is a starting point, not a self-selected order.",
        pricingCard: (
          <SimpleTreatmentPricingCard
            label="NAD+"
            pricing={NAD_PRICING}
            interactive
            className="h-full"
          />
        ),
        eligibility: {
          intro:
            "Not everyone qualifies for NAD+. Your provider weighs health history, current medications, and applicable state law before making an independent decision.",
          points: ELIGIBILITY_POINTS,
        },
        whatIs: {
          title: "What is NAD+?",
          body: (
            <>
              <p>
                Every cell in your body uses a molecule called NAD+ to make
                energy. Your natural NAD+ levels tend to go down as you get
                older. Some people choose NAD+ injections as part of a wellness
                routine, though no specific benefit is proven or guaranteed for
                any individual.
              </p>
              <p>
                NAD+ (nicotinamide adenine dinucleotide) is a coenzyme the body
                produces naturally and uses in cellular energy processes. Beema
                Health&apos;s compounded NAD+ injections are prepared by a
                licensed compounding pharmacy specifically for you.
              </p>
              <p>
                Compounded NAD+ is not FDA-approved and is considered only when
                legally available and clinically appropriate. Whether it&apos;s
                an appropriate option for you is a decision your licensed
                provider makes individually.
              </p>
            </>
          ),
        },
        safetyCards: [
          {
            icon: ShieldCheck,
            title: "Prescription medical care",
            body: "NAD+ injections are a prescription product and aren't appropriate for everyone. Compounded NAD+ is not FDA-approved and is considered only when legally available and clinically appropriate.",
          },
          {
            icon: ShieldCheck,
            title: "Talk to your provider",
            body: (
              <TalkToProviderBody extra="Include your full medical history, possible contraindications, side effects, and any medication interactions in your intake questionnaire." />
            ),
          },
        ],
        faqTitle: "NAD+ care, pricing, and getting started",
        faqDescription:
          "Straight answers about how online NAD+ care works with Beema Health.",
      }}
    />
  );
}

export const variant: LandingVariant = {
  id: "v3-new-layout",
  label: "New layout (shared template)",
  Component: NewLayout,
};
