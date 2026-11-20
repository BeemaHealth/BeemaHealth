import type { LandingVariant } from "../types";
import { BLACK_FRIDAY_OFFERS } from "../template/BlackFriday";
import { EdMintsBostonNewPage } from "../template/EdBostonPage";
import { CTA_IDS } from "@/lib/cta-ids";
import { MintsPlanComparison } from "../ed-mints-boston/MintsPlanComparison";
import { FAQ_ITEMS } from "./shared";

/**
 * New shared landing layout (same design as the Houston and Boston pages).
 * Content and FAQ match the control; every Get Started jumps to the ED Mints
 * formulation cards. Layout is built by `../template`. To customize this page
 * only, pass `overrides` or `insertAfter` below.
 */
function NewLayout() {
  return (
    <EdMintsBostonNewPage
      market="nationwide"
      blackFriday={BLACK_FRIDAY_OFFERS.edMints}
      faqItems={FAQ_ITEMS}
      heroTileHref="#plan-comparison"
      formulationCtaIds={{
        rdt: CTA_IDS.ed_mints_rdt_picker,
        odt: CTA_IDS.ed_mints_odt_picker,
      }}
      insertAfter={{
        pricing: (
          <MintsPlanComparison
            blackFriday={BLACK_FRIDAY_OFFERS.edMints}
            ctaIds={{
              rdt: CTA_IDS.ed_mints_rdt_plans,
              odt: CTA_IDS.ed_mints_odt_plans,
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
  Component: NewLayout,
};
