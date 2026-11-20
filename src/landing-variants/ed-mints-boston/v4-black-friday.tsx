import type { LandingVariant } from "../types";
import { EdMintsBostonNewPage } from "../template/EdBostonPage";
import { CTA_IDS } from "@/lib/cta-ids";
import { BLACK_FRIDAY_OFFERS } from "../template/BlackFriday";
import { FAQ_ITEMS } from "./shared";
import { MintsPlanComparison } from "./MintsPlanComparison";

/**
 * New shared landing layout (same design as GLP-1 Houston and sexual health).
 * Content and FAQ match the control; every Get Started still opens the ED
 * Mints formulation picker. Layout is built by `../template`. To customize
 * this page only, pass `overrides` or `insertAfter` below.
 */
function EdMintsBostonBlackFriday() {
  return (
    <EdMintsBostonNewPage
      faqItems={FAQ_ITEMS}
      blackFriday={BLACK_FRIDAY_OFFERS.edMints}
      heroTileHref="#plan-comparison"
      formulationCtaIds={{
        rdt: CTA_IDS.ed_mints_boston_rdt_picker,
        odt: CTA_IDS.ed_mints_boston_odt_picker,
      }}
      insertAfter={{
        pricing: (
          <MintsPlanComparison
            blackFriday={BLACK_FRIDAY_OFFERS.edMints}
            ctaIds={{
              rdt: CTA_IDS.ed_mints_boston_rdt_plans,
              odt: CTA_IDS.ed_mints_boston_odt_plans,
            }}
          />
        ),
      }}
    />
  );
}

export const variant: LandingVariant = {
  id: "v4-black-friday",
  label: "Black Friday 2026",
  Component: EdMintsBostonBlackFriday,
};
