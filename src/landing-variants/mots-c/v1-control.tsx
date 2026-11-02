import { ShieldCheck } from "lucide-react";
import { SimpleTreatmentPricingCard } from "@/components/site/TreatmentPageBlocks";
import {
  MOTS_C_PRICING,
  formatSimpleQuarterlyStartingAt,
} from "@/lib/simple-treatment-pricing";
import motsCInjectionPhoto from "@/assets/treatments/mots-c-injection-vial.webp";
import type { LandingVariant } from "../types";
import { ProductPage } from "../template/ProductPage";
import { TalkToProviderBody } from "../template/blocks";
import { ELIGIBILITY_POINTS, FAQ_ITEMS } from "./shared";

/**
 * Control for MOTS-C. Built on the shared new landing layout (same design as
 * the other product pages, e.g. sermorelin's v3-new-layout) from day one, so
 * the baseline is the current standard layout. Layout is built by
 * `../template`; to customize this page only, pass `overrides` or
 * `insertAfter` below.
 */
function Control() {
  return (
    <ProductPage
      faqItems={FAQ_ITEMS}
      config={{
        pagePath: "/mots-c/",
        heroCtaId: "mots_c_hero",
        footerCtaId: "mots_c_footer",
        name: "MOTS-C",
        h1: "Compounded MOTS-C injections, online",
        lead: "Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, compounded MOTS-C injections are prepared for you and shipped to your door. Prescribing is never guaranteed.",
        image: {
          src: motsCInjectionPhoto,
          alt: "Vial of Beema Health compounded MOTS-C peptide injection with a syringe",
          width: 720,
          height: 1026,
        },
        tile: {
          name: "Compounded MOTS-C",
          price: `from ${formatSimpleQuarterlyStartingAt(MOTS_C_PRICING)}`,
          unit: "On a 3-month plan",
        },
        proofThird: {
          value: "Rx",
          label: "Licensed provider review",
          stars: false,
        },
        pricingDescription:
          "Your provider decides whether MOTS-C is clinically appropriate - this is a starting point, not a self-selected order.",
        pricingCard: (
          <SimpleTreatmentPricingCard
            label="MOTS-C"
            pricing={MOTS_C_PRICING}
            interactive
            className="h-full"
          />
        ),
        eligibility: {
          intro:
            "Not everyone qualifies for MOTS-C. Your provider weighs health history, current medications, and applicable state law before making an independent decision.",
          points: ELIGIBILITY_POINTS,
        },
        whatIs: {
          title: "What is MOTS-C?",
          body: (
            <>
              <p>
                MOTS-C is a short peptide made from mitochondrial DNA.
                Mitochondria are the structures inside your cells that produce
                energy, and MOTS-C is one of several mitochondrial-derived
                peptides that researchers have studied.
              </p>
              <p>
                MOTS-C is not an FDA-approved drug product, which is why
                it&apos;s available only through licensed compounding
                pharmacies. Beema Health&apos;s compounded MOTS-C is prepared
                specifically for you.
              </p>
              <p>
                Compounded MOTS-C is not FDA-approved and is considered only
                when legally available and clinically appropriate. Whether
                it&apos;s an appropriate option for you is a decision your
                licensed provider makes individually.
              </p>
            </>
          ),
        },
        disclosure:
          "Compounded MOTS-C is not FDA-approved and is considered only when legally available and clinically appropriate.",
        safetyCards: [
          {
            icon: ShieldCheck,
            title: "Prescription medical care",
            body: "MOTS-C injections are a prescription product and aren't appropriate for everyone. Compounded MOTS-C is not FDA-approved and is considered only when legally available and clinically appropriate.",
          },
          {
            icon: ShieldCheck,
            title: "Talk to your provider",
            body: (
              <TalkToProviderBody extra="Include your full medical history, possible contraindications, side effects, and any medication interactions in your intake questionnaire." />
            ),
          },
        ],
        faqTitle: "MOTS-C care, pricing, and getting started",
        faqDescription:
          "Straight answers about how online MOTS-C care works with Beema Health.",
      }}
    />
  );
}

export const variant: LandingVariant = {
  id: "v1-control",
  label: "Control (new layout)",
  Component: Control,
};
