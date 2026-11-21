import type { LandingVariant } from "../types";
import { BLACK_FRIDAY_OFFERS } from "../template/BlackFriday";
import { EdMintsBostonNewPage } from "../template/EdBostonPage";
import { CTA_IDS } from "@/lib/cta-ids";
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
      heroTileHref="#formulations"
      formulationCtaIds={{
        rdt: CTA_IDS.ed_mints_rdt_picker,
        odt: CTA_IDS.ed_mints_odt_picker,
      }}
    />
  );
}

export const variant: LandingVariant = {
  id: "v4-black-friday",
  label: "Black Friday 2026",
  Component: NewLayout,
};
