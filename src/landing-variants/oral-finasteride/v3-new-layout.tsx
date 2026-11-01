import { ShieldCheck } from "lucide-react";
import { SimpleTreatmentPricingCard } from "@/components/site/TreatmentPageBlocks";
import {
  HAIRLOSS_FINASTERIDE_PRICING,
  formatSimpleStartingAt,
  simplePerDaySentence,
} from "@/lib/simple-treatment-pricing";
import finasteridePhoto from "@/assets/treatments/finasteride-oral-tablets-bottle.webp";
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
  const perDayNote = simplePerDaySentence(HAIRLOSS_FINASTERIDE_PRICING);
  return (
    <ProductPage
      faqItems={FAQ_ITEMS}
      config={{
        pagePath: "/oral-finasteride/",
        heroCtaId: "oral_finasteride_hero",
        footerCtaId: "oral_finasteride_footer",
        name: "finasteride",
        h1: "Oral finasteride online, the generic Propecia® tablet",
        lead: "Hair loss care without the clinic visit. Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, once-daily generic finasteride ships to your door. Results vary. Prescribing is never guaranteed.",
        image: {
          src: finasteridePhoto,
          alt: "Bottle of Beema Health oral finasteride tablets, generic Propecia",
          width: 720,
          height: 900,
        },
        tile: {
          name: "Oral finasteride",
          price: `from ${formatSimpleStartingAt(HAIRLOSS_FINASTERIDE_PRICING)}`,
          unit: "Per month",
          detail: perDayNote ?? null,
        },
        proofThird: {
          value: "Generic",
          label: "FDA-approved finasteride",
          stars: false,
        },
        pricingDescription:
          "Your provider decides whether finasteride is clinically appropriate - this is a starting point, not a self-selected order.",
        pricingCard: (
          <SimpleTreatmentPricingCard
            label="oral finasteride"
            title="Finasteride (Generic Propecia®)"
            badge="Rx"
            pricing={HAIRLOSS_FINASTERIDE_PRICING}
            perDayNote={perDayNote}
            className="h-full"
          />
        ),
        eligibility: {
          intro:
            "Not everyone qualifies. Your provider weighs your hair loss pattern, health history, current medications, and applicable state law before making an independent decision.",
          points: ELIGIBILITY_POINTS,
        },
        whatIs: {
          title: "What is oral finasteride?",
          body: (
            <>
              <p>
                Finasteride is a once-daily oral tablet that blocks a hormone
                (DHT) that can shrink hair follicles over time in men with
                pattern hair loss. Taken consistently, it may help slow further
                hair loss and support the hair you still have. Results vary and
                can take several months to become noticeable.
              </p>
              <p>
                Beema Health&apos;s finasteride is the FDA-approved generic
                version of Propecia&reg; - the same active ingredient, strength,
                and intended use as the brand-name product, at generic pricing.
                It&apos;s only appropriate for men; it&apos;s not for women who
                are or may become pregnant.
              </p>
              <p>
                Which formulation, if any, may be appropriate for you is a
                decision your licensed provider makes individually based on your
                health history and hair loss pattern.
              </p>
            </>
          ),
        },
        safetyCards: [
          {
            icon: ShieldCheck,
            title: "Prescription medication",
            body: "Finasteride is a prescription medication and isn't appropriate for everyone. It's only prescribed when legally available and clinically appropriate for your case.",
          },
          {
            icon: ShieldCheck,
            title: "Talk to your provider",
            body: (
              <TalkToProviderBody extra="Include your full medical history, possible contraindications, side effects, and any medication interactions in your intake questionnaire." />
            ),
          },
        ],
        faqTitle: "Hair loss care, pricing, and getting started",
        faqDescription:
          "Straight answers about how online hair loss care works with Beema Health.",
      }}
    />
  );
}

export const variant: LandingVariant = {
  id: "v3-new-layout",
  label: "New layout (shared template)",
  Component: NewLayout,
};
