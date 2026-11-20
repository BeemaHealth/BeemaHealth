import { ShieldCheck } from "lucide-react";
import { SimpleTreatmentPricingCard } from "@/components/site/TreatmentPageBlocks";
import {
  GHK_CU_PRICING,
  formatSimpleQuarterlyStartingAt,
} from "@/lib/simple-treatment-pricing";
import ghkCuPhoto from "@/assets/treatments/ghk-cu-injection-vial.webp";
import type { LandingVariant } from "../types";
import { ProductPage } from "../template/ProductPage";
import { TalkToProviderBody } from "../template/blocks";
import { ELIGIBILITY_POINTS, FAQ_ITEMS } from "./shared";

/**
 * Control for GHK-Cu. Built on the shared new landing layout (the
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
        pagePath: "/ghk-cu/",
        heroCtaId: "ghk_cu_hero",
        footerCtaId: "ghk_cu_footer",
        name: "GHK-Cu",
        h1: "Compounded GHK-Cu injections, online",
        lead: "Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, compounded GHK-Cu injections are prepared for you and shipped to your door. Prescribing is never guaranteed.",
        image: {
          src: ghkCuPhoto,
          alt: "Vial and syringe of Beema Health compounded GHK-Cu peptide injection, prescription only",
          width: 800,
          height: 800,
        },
        tile: {
          name: "Compounded GHK-Cu",
          price: `from ${formatSimpleQuarterlyStartingAt(GHK_CU_PRICING)}`,
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
            label="GHK-Cu"
            pricing={GHK_CU_PRICING}
            interactive
            className="h-full"
          />
        ),
        eligibility: {
          intro:
            "Not everyone qualifies for GHK-Cu. Your provider weighs health history, current medications, and applicable state law before making an independent decision.",
          points: ELIGIBILITY_POINTS,
        },
        whatIs: {
          title: "What is GHK-Cu?",
          body: (
            <>
              <p>
                GHK-Cu is a naturally occurring peptide made of three amino
                acids that binds copper. It has been studied mostly in
                laboratory and early-stage research.
              </p>
              <p>
                GHK-Cu is not an FDA-approved drug product, which is why
                it&apos;s available only through licensed compounding
                pharmacies. Beema Health&apos;s compounded GHK-Cu is prepared
                specifically for you.
              </p>
              <p>
                Compounded GHK-Cu is not FDA-approved and is considered only
                when legally available and clinically appropriate. Whether
                it&apos;s an appropriate option for you is a decision your
                licensed provider makes individually.
              </p>
            </>
          ),
        },
        disclosure:
          "Compounded GHK-Cu is not FDA-approved and is considered only when legally available and clinically appropriate.",
        safetyCards: [
          {
            icon: ShieldCheck,
            title: "Prescription medical care",
            body: "GHK-Cu injections are a prescription product and aren't appropriate for everyone. Compounded GHK-Cu is not FDA-approved and is considered only when legally available and clinically appropriate.",
          },
          {
            icon: ShieldCheck,
            title: "Talk to your provider",
            body: (
              <TalkToProviderBody extra="Include your full medical history, possible contraindications, side effects, and any medication interactions in your intake questionnaire." />
            ),
          },
        ],
        faqTitle: "GHK-Cu care, pricing, and getting started",
        faqDescription:
          "Straight answers about how online GHK-Cu care works with Beema Health.",
      }}
    />
  );
}

export const variant: LandingVariant = {
  id: "v1-control",
  label: "Control (new layout)",
  Component: Control,
};
