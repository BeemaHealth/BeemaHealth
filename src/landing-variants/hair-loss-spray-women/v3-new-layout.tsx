import { ShieldCheck } from "lucide-react";
import { SimpleTreatmentPricingCard } from "@/components/site/TreatmentPageBlocks";
import {
  HAIRLOSS_TOPICAL_WOMEN_PRICING,
  formatSimpleQuarterlyStartingAt,
  simplePerDaySentence,
} from "@/lib/simple-treatment-pricing";
import hairLossSprayWomenPhoto from "@/assets/treatments/hair-loss-spray-women-bottle.webp";
import type { LandingVariant } from "../types";
import { ProductPage } from "../template/ProductPage";
import { TalkToProviderBody } from "../template/blocks";
import {
  ELIGIBILITY_POINTS,
  FAQ_ITEMS,
  FORMULATION_SENTENCE,
  REQUIRED_COMPOUND_SENTENCE,
} from "./shared";

/**
 * New shared landing layout (same design as the Houston and Boston pages).
 * Content and FAQ match the control; layout is built by `../template`. To
 * customize this page only, pass `overrides` or `insertAfter` below.
 */
function NewLayout() {
  const perDayNote = simplePerDaySentence(HAIRLOSS_TOPICAL_WOMEN_PRICING);
  return (
    <ProductPage
      faqItems={FAQ_ITEMS}
      config={{
        pagePath: "/hair-loss-spray-women/",
        heroCtaId: "hairloss_spray_women_hero",
        footerCtaId: "hairloss_spray_women_footer",
        name: "hair loss spray",
        h1: "Hair loss spray for women, online",
        lead: "Hair loss care without the clinic visit. Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, a compounded 5-in-1 topical spray ships to your door. Prescribing is never guaranteed.",
        image: {
          src: hairLossSprayWomenPhoto,
          alt: "Bottle of Beema Health compounded hair loss spray with minoxidil, tretinoin, fluocinolone, biotin, and melatonin, for women",
          width: 720,
          height: 900,
        },
        tile: {
          name: "Hair loss spray (women)",
          price: `from ${formatSimpleQuarterlyStartingAt(HAIRLOSS_TOPICAL_WOMEN_PRICING)}`,
          unit: "On a 3-month plan",
          detail: perDayNote ?? null,
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
            label="hair loss spray"
            title="Hair Loss Spray (Women)"
            badge="Rx"
            pricing={HAIRLOSS_TOPICAL_WOMEN_PRICING}
            perDayNote={perDayNote}
            interactive
            className="h-full"
          />
        ),
        eligibility: {
          intro:
            "Not everyone qualifies. Your provider weighs your hair loss pattern, health history, current medications, and applicable state law before making an independent decision.",
          points: ELIGIBILITY_POINTS,
        },
        whatIs: {
          title: "What is Beema Health's hair loss spray for women?",
          body: (
            <>
              <p>
                This is a topical spray, applied directly to the scalp.{" "}
                {FORMULATION_SENTENCE} Delivering these active ingredients
                topically is intended to target hair follicles and support the
                scalp environment around them. Results vary and can take several
                months to become noticeable.
              </p>
              <p>
                Beema Health&apos;s hair loss spray is a compounded formulation,
                for women only. {REQUIRED_COMPOUND_SENTENCE}
              </p>
              <p>
                Whether this spray, or another formulation, may be appropriate
                for you is a decision your licensed provider makes individually
                based on your health history and hair loss pattern.
              </p>
            </>
          ),
        },
        safetyCards: [
          {
            icon: ShieldCheck,
            title: "Compounded, not FDA-approved",
            body: `${REQUIRED_COMPOUND_SENTENCE} It isn't appropriate for everyone.`,
          },
          {
            icon: ShieldCheck,
            title: "Talk to your provider",
            body: (
              <TalkToProviderBody extra="Include your full medical history, possible contraindications, side effects, and any medication interactions in your intake questionnaire." />
            ),
          },
        ],
        disclosure: REQUIRED_COMPOUND_SENTENCE,
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
