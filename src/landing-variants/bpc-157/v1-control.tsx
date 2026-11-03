import { ShieldCheck } from "lucide-react";
import { SimpleTreatmentPricingCard } from "@/components/site/TreatmentPageBlocks";
import {
  BPC_157_PRICING,
  formatSimpleQuarterlyStartingAt,
} from "@/lib/simple-treatment-pricing";
import bpc157InjectionPhoto from "@/assets/treatments/bpc-157-injection-vial.webp";
import type { LandingVariant } from "../types";
import { ProductPage } from "../template/ProductPage";
import { TalkToProviderBody } from "../template/blocks";
import { ELIGIBILITY_POINTS, FAQ_ITEMS } from "./shared";

/**
 * Control for BPC-157. Built on the shared new landing layout (the "v3"
 * layout every other product page runs) from day one, so the control IS the
 * v3 layout. It lives in `v1-control` because the CRO Lab and its tests
 * expect every page's root variant to use that id (same as MOTS-C). Layout is built by `../template`; to customize this
 * page only, pass `overrides` or `insertAfter` below.
 */
function Control() {
  return (
    <ProductPage
      faqItems={FAQ_ITEMS}
      config={{
        pagePath: "/bpc-157/",
        heroCtaId: "bpc_157_hero",
        footerCtaId: "bpc_157_footer",
        name: "BPC-157",
        h1: "Compounded BPC-157 injections, online",
        lead: "Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, compounded BPC-157 injections are prepared for you and shipped to your door. Prescribing is never guaranteed.",
        image: {
          src: bpc157InjectionPhoto,
          alt: "Vial of Beema Health compounded BPC-157 peptide injection with a syringe",
          width: 720,
          height: 1028,
        },
        tile: {
          name: "Compounded BPC-157",
          price: `from ${formatSimpleQuarterlyStartingAt(BPC_157_PRICING)}`,
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
            label="BPC-157"
            pricing={BPC_157_PRICING}
            interactive
            className="h-full"
          />
        ),
        eligibility: {
          intro:
            "Not everyone qualifies for BPC-157. Your provider weighs health history, current medications, and applicable state law before making an independent decision.",
          points: ELIGIBILITY_POINTS,
        },
        whatIs: {
          title: "What is BPC-157?",
          body: (
            <>
              <p>
                BPC-157 is a short synthetic peptide, a chain of 15 amino acids,
                based on part of a protein found in human gastric juice. It has
                been studied in early-stage research, mostly in laboratory and
                animal studies.
              </p>
              <p>
                BPC-157 is not an FDA-approved drug product, which is why
                it&apos;s available only through licensed compounding
                pharmacies. Beema Health&apos;s compounded BPC-157 is prepared
                specifically for you.
              </p>
              <p>
                Compounded BPC-157 is not FDA-approved and is considered only
                when legally available and clinically appropriate. Whether
                it&apos;s an appropriate option for you is a decision your
                licensed provider makes individually.
              </p>
            </>
          ),
        },
        disclosure:
          "Compounded BPC-157 is not FDA-approved and is considered only when legally available and clinically appropriate.",
        safetyCards: [
          {
            icon: ShieldCheck,
            title: "Prescription medical care",
            body: "BPC-157 injections are a prescription product and aren't appropriate for everyone. Compounded BPC-157 is not FDA-approved and is considered only when legally available and clinically appropriate.",
          },
          {
            icon: ShieldCheck,
            title: "Talk to your provider",
            body: (
              <TalkToProviderBody extra="Include your full medical history, possible contraindications, side effects, and any medication interactions in your intake questionnaire." />
            ),
          },
        ],
        faqTitle: "BPC-157 care, pricing, and getting started",
        faqDescription:
          "Straight answers about how online BPC-157 care works with Beema Health.",
      }}
    />
  );
}

export const variant: LandingVariant = {
  id: "v1-control",
  label: "Control (new layout)",
  Component: Control,
};
