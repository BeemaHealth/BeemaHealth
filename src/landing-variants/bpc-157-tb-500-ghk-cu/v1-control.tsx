import { ShieldCheck } from "lucide-react";
import { SimpleTreatmentPricingCard } from "@/components/site/TreatmentPageBlocks";
import {
  BPC_TB500_GHK_CU_PRICING,
  formatSimpleQuarterlyStartingAt,
} from "@/lib/simple-treatment-pricing";
import peptideBlendPhoto from "@/assets/treatments/bpc-tb500-ghk-cu-blend-vial.webp";
import type { LandingVariant } from "../types";
import { ProductPage } from "../template/ProductPage";
import { TalkToProviderBody } from "../template/blocks";
import { ELIGIBILITY_POINTS, FAQ_ITEMS } from "./shared";

/**
 * Control for the BPC-157 / TB-500 / GHK-Cu blend. Built on the shared new landing layout (the
 * "v3" layout every other product page runs) from day one, so the control IS
 * the v3 layout. It lives in `v1-control` because the CRO Lab expects every
 * page's root variant to use that id (same as the other peptide pages).
 * Layout is built by `../template`; to customize this page only, pass
 * `overrides` or `insertAfter` below.
 */
function Control() {
  return (
    <ProductPage
      faqItems={FAQ_ITEMS}
      config={{
        pagePath: "/bpc-157-tb-500-ghk-cu/",
        heroCtaId: "peptide_blend_hero",
        footerCtaId: "peptide_blend_footer",
        name: "BPC-157 / TB-500 / GHK-Cu",
        h1: "Compounded BPC-157 / TB-500 / GHK-Cu injection, online",
        lead: "Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, a compounded BPC-157 / TB-500 / GHK-Cu injection is prepared for you and shipped to your door. Prescribing is never guaranteed.",
        image: {
          src: peptideBlendPhoto,
          alt: "Vial and syringe of Beema Health compounded BPC-157, TB-500, and GHK-Cu combined peptide injection, prescription only",
          width: 800,
          height: 800,
        },
        tile: {
          name: "Compounded BPC-157 / TB-500 / GHK-Cu",
          price: `from ${formatSimpleQuarterlyStartingAt(BPC_TB500_GHK_CU_PRICING)}`,
          unit: "On a 3-month plan",
        },
        proofThird: {
          value: "Rx",
          label: "Licensed provider review",
          stars: false,
        },
        pricingDescription:
          "A licensed provider reviews your intake first. You won't be charged anything if you're not prescribed.",
        pricingCard: (
          <SimpleTreatmentPricingCard
            label="BPC-157 / TB-500 / GHK-Cu"
            pricing={BPC_TB500_GHK_CU_PRICING}
            interactive
            className="h-full"
          />
        ),
        eligibility: {
          intro:
            "Not everyone qualifies for this blend. Your provider weighs health history, current medications, and applicable state law before making an independent decision.",
          points: ELIGIBILITY_POINTS,
        },
        whatIs: {
          title: "What is the BPC-157 / TB-500 / GHK-Cu blend?",
          body: (
            <>
              <p>
                This is a single compounded injection that combines three
                peptides: BPC-157, TB-500, and GHK-Cu. BPC-157 is a short
                synthetic peptide based on part of a protein found in human
                gastric juice. TB-500 is a synthetic peptide related to a
                fragment of thymosin beta-4. GHK-Cu is a naturally occurring
                copper-binding peptide. Each has been studied mostly in
                laboratory and animal research.
              </p>
              <p>
                None of these peptides is an FDA-approved drug product, which is
                why they&apos;re available only through licensed compounding
                pharmacies. Beema Health&apos;s compounded blend is prepared
                specifically for you.
              </p>
              <p>
                The compounded blend is not FDA-approved and is considered only
                when legally available and clinically appropriate. Whether
                it&apos;s an appropriate option for you is a decision your
                licensed provider makes individually.
              </p>
            </>
          ),
        },
        disclosure:
          "The compounded blend is not FDA-approved and is considered only when legally available and clinically appropriate.",
        safetyCards: [
          {
            icon: ShieldCheck,
            title: "Prescription medical care",
            body: "The BPC-157 / TB-500 / GHK-Cu injection is a prescription product and aren't appropriate for everyone. The compounded blend is not FDA-approved and is considered only when legally available and clinically appropriate.",
          },
          {
            icon: ShieldCheck,
            title: "Talk to your provider",
            body: (
              <TalkToProviderBody extra="Include your full medical history, possible contraindications, side effects, and any medication interactions in your intake questionnaire." />
            ),
          },
        ],
        faqTitle:
          "BPC-157 / TB-500 / GHK-Cu care, pricing, and getting started",
        faqDescription:
          "Straight answers about how online care for the blend works with Beema Health.",
      }}
    />
  );
}

export const variant: LandingVariant = {
  id: "v1-control",
  label: "Control (new layout)",
  Component: Control,
};
