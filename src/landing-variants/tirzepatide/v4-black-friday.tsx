import type { LandingVariant } from "../types";
import {
  BLACK_FRIDAY_OFFERS,
  useBlackFridayFaq,
} from "../template/BlackFriday";
import { GlpTreatmentPage } from "../template/GlpTreatmentPage";
import { FAQ_ITEMS } from "./shared";

/**
 * New shared landing layout (same design as GLP-1 Houston and sexual health).
 * Content, CTA ids, FAQ and safety copy match the control; layout is built by
 * `../template`. To customize this page only, pass `overrides` or
 * `insertAfter` to `GlpTreatmentPage` below.
 */
function TirzepatideNewLayout() {
  return (
    <GlpTreatmentPage
      med="tirzepatide"
      market="nationwide"
      blackFriday={BLACK_FRIDAY_OFFERS.tirzepatide}
      faqItems={useBlackFridayFaq(FAQ_ITEMS)}
    />
  );
}

export const variant: LandingVariant = {
  id: "v4-black-friday",
  label: "Black Friday 2026",
  Component: TirzepatideNewLayout,
};
