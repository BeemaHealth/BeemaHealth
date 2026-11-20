import type { LandingVariant } from "../types";
import { GenericEdBostonPage } from "../template/EdBostonPage";
import { BLACK_FRIDAY_OFFERS } from "../template/BlackFriday";
import { FAQ_ITEMS } from "./shared";

/**
 * Black Friday 2026 variant, built from the live v3 layout. Same CTA ids, FAQ
 * and safety copy; adds the offer banner, deal hero tile, coupon card with the
 * checkout code, and code reminders. Offer data: ../template/BlackFriday.tsx.
 */
function SildenafilBostonBlackFriday() {
  return (
    <GenericEdBostonPage
      product="sildenafil"
      faqItems={FAQ_ITEMS}
      blackFriday={BLACK_FRIDAY_OFFERS.sildenafil}
    />
  );
}

export const variant: LandingVariant = {
  id: "v4-black-friday",
  label: "Black Friday 2026",
  Component: SildenafilBostonBlackFriday,
};
