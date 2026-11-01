import { ShieldCheck } from "lucide-react";
import { SimpleTreatmentPricingCard } from "@/components/site/TreatmentPageBlocks";
import {
  HAIRLOSS_ORAL_MINOXIDIL_PRICING,
  formatSimpleStartingAt,
  simplePerDaySentence,
} from "@/lib/simple-treatment-pricing";
import oralMinoxidilPhoto from "@/assets/treatments/oral-minoxidil-tablets-bottle.webp";
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
  const perDayNote = simplePerDaySentence(HAIRLOSS_ORAL_MINOXIDIL_PRICING);
  return (
    <ProductPage
      faqItems={FAQ_ITEMS}
      config={{
        pagePath: "/oral-minoxidil-men/",
        heroCtaId: "oral_minoxidil_men_hero",
        footerCtaId: "oral_minoxidil_men_footer",
        name: "oral minoxidil",
        h1: "Oral minoxidil for men, online",
        lead: "Hair loss care without the clinic visit. Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, once-daily generic oral minoxidil, used off-label for hair loss, ships to your door. Results vary. Prescribing is never guaranteed.",
        image: {
          src: oralMinoxidilPhoto,
          alt: "Bottle of Beema Health oral minoxidil tablets, an FDA-approved generic medication",
          width: 720,
          height: 900,
        },
        tile: {
          name: "Oral minoxidil (men)",
          price: `from ${formatSimpleStartingAt(HAIRLOSS_ORAL_MINOXIDIL_PRICING)}`,
          unit: "Per month",
          detail: perDayNote ?? null,
        },
        proofThird: {
          value: "Generic",
          label: "FDA-approved minoxidil",
          stars: false,
        },
        pricingDescription:
          "Your provider decides whether oral minoxidil is clinically appropriate - this is a starting point, not a self-selected order.",
        pricingCard: (
          <SimpleTreatmentPricingCard
            label="oral minoxidil"
            title="Oral Minoxidil (Men)"
            badge="Rx"
            pricing={HAIRLOSS_ORAL_MINOXIDIL_PRICING}
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
          title: "What is oral minoxidil?",
          body: (
            <>
              <p>
                Minoxidil is best known as a topical treatment, but taken as a
                low-dose oral tablet it can also help support hair growth by
                improving blood flow to hair follicles and extending the hair
                growth cycle. It&apos;s taken once daily. Results vary and can
                take several months to become noticeable.
              </p>
              <p>
                Beema Health&apos;s oral minoxidil for men is an FDA-approved
                generic medication, not a compounded formulation. It was
                originally approved to treat high blood pressure; using it for
                hair loss is a well-established off-label use in dermatology.
              </p>
              <p>
                Whether oral minoxidil, or another formulation, may be
                appropriate for you is a decision your licensed provider makes
                individually based on your health history and hair loss pattern.
              </p>
            </>
          ),
        },
        safetyCards: [
          {
            icon: ShieldCheck,
            title: "FDA-approved generic medication",
            body: "Oral minoxidil is an FDA-approved generic medication, not compounded. It's a prescription medication and isn't appropriate for everyone; using it for hair loss is an off-label use considered only when clinically appropriate.",
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
