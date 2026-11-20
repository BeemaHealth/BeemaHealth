import type { LandingVariant } from "../types";
import { BLACK_FRIDAY_OFFERS } from "../template/BlackFriday";
import { GenericEdBostonPage } from "../template/EdBostonPage";
import { FAQ_ITEMS } from "./shared";

/**
 * New shared landing layout (same design as the Houston and Boston pages).
 * Content and FAQ match the control; layout is built by `../template`. To
 * customize this page only, pass `overrides` or `insertAfter` below.
 */
function NewLayout() {
  return (
    <GenericEdBostonPage
      product="tadalafil"
      market="nationwide"
      blackFriday={BLACK_FRIDAY_OFFERS.tadalafil}
      faqItems={FAQ_ITEMS}
    />
  );
}

export const variant: LandingVariant = {
  id: "v4-black-friday",
  label: "Black Friday 2026",
  Component: NewLayout,
};
