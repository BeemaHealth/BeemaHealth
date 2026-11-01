import type { LandingVariant } from "../types";
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
      faqItems={FAQ_ITEMS}
    />
  );
}

export const variant: LandingVariant = {
  id: "v3-new-layout",
  label: "New layout (shared template)",
  Component: NewLayout,
};
