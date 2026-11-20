import type { LandingVariant } from "../types";
import { GlpTreatmentPage } from "../template/GlpTreatmentPage";
import {
  BLACK_FRIDAY_OFFERS,
  useBlackFridayFaq,
} from "../template/BlackFriday";
import { FAQ_ITEMS } from "./shared";

/**
 * Black Friday 2026 variant, built from the live v3 layout. Same CTA ids, FAQ
 * and safety copy; adds the offer banner, deal hero tile, coupon card with the
 * checkout code, and code reminders. Offer data: ../template/BlackFriday.tsx.
 */
function SemaglutideHoustonBlackFriday() {
  return (
    <GlpTreatmentPage
      med="semaglutide"
      faqItems={useBlackFridayFaq(FAQ_ITEMS)}
      blackFriday={BLACK_FRIDAY_OFFERS.semaglutide}
    />
  );
}

export const variant: LandingVariant = {
  id: "v4-black-friday",
  label: "Black Friday 2026",
  Component: SemaglutideHoustonBlackFriday,
};
