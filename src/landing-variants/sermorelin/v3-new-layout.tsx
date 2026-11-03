import { ShieldCheck } from "lucide-react";
import { SimpleTreatmentPricingCard } from "@/components/site/TreatmentPageBlocks";
import {
  SERMORELIN_PRICING,
  formatSimpleQuarterlyStartingAt,
} from "@/lib/simple-treatment-pricing";
import sermorelinInjectionPhoto from "@/assets/treatments/sermorelin-injection-vial.webp";
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
        pagePath: "/sermorelin/",
        heroCtaId: "sermorelin_hero",
        footerCtaId: "sermorelin_footer",
        name: "sermorelin",
        h1: "Compounded sermorelin injections, online",
        lead: "Answer a private health questionnaire online and a licensed provider reviews it. If treatment is right for you, compounded sermorelin injections is prepared for you and shipped to your door. Prescribing is never guaranteed.",
        image: {
          src: sermorelinInjectionPhoto,
          alt: "Vial of Beema Health compounded sermorelin injection",
          width: 1024,
          height: 1280,
        },
        tile: {
          name: "Compounded sermorelin",
          price: `from ${formatSimpleQuarterlyStartingAt(SERMORELIN_PRICING)}`,
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
            label="sermorelin"
            pricing={SERMORELIN_PRICING}
            interactive
            className="h-full"
          />
        ),
        eligibility: {
          intro:
            "Not everyone qualifies for sermorelin. Your provider weighs health history, current medications, and applicable state law before making an independent decision.",
          points: ELIGIBILITY_POINTS,
        },
        whatIs: {
          title: "What is sermorelin?",
          body: (
            <>
              <p>
                A gland in your brain called the pituitary makes growth hormone,
                and your natural growth hormone levels tend to go down as you
                get older. Sermorelin signals your pituitary gland to release
                more of your own growth hormone, instead of giving you growth
                hormone directly.
              </p>
              <p>
                Sermorelin is a growth-hormone-releasing hormone analog. It is
                not currently sold as an FDA-approved commercial drug product,
                which is why it&apos;s available today only through licensed
                compounding pharmacies. Beema Health&apos;s compounded
                sermorelin is prepared specifically for you.
              </p>
              <p>
                Compounded sermorelin is not FDA-approved and is considered only
                when legally available and clinically appropriate. Whether
                it&apos;s an appropriate option for you is a decision your
                licensed provider makes individually.
              </p>
            </>
          ),
        },
        safetyCards: [
          {
            icon: ShieldCheck,
            title: "Prescription medical care",
            body: "Sermorelin injections are a prescription product and aren't appropriate for everyone. Compounded sermorelin is not FDA-approved and is considered only when legally available and clinically appropriate.",
          },
          {
            icon: ShieldCheck,
            title: "Talk to your provider",
            body: (
              <TalkToProviderBody extra="Include your full medical history, possible contraindications, side effects, and any medication interactions in your intake questionnaire." />
            ),
          },
        ],
        faqTitle: "Sermorelin care, pricing, and getting started",
        faqDescription:
          "Straight answers about how online sermorelin care works with Beema Health.",
      }}
    />
  );
}

export const variant: LandingVariant = {
  id: "v3-new-layout",
  label: "New layout (shared template)",
  Component: NewLayout,
};
