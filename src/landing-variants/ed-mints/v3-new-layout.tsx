import type { LandingVariant } from "../types";
import { EdMintsBostonNewPage } from "../template/EdBostonPage";
import { FAQ_ITEMS } from "./shared";

/**
 * New shared landing layout (same design as the Houston and Boston pages).
 * Content and FAQ match the control; every Get Started jumps to the ED Mints
 * formulation cards. Layout is built by `../template`. To customize this page
 * only, pass `overrides` or `insertAfter` below.
 */
function NewLayout() {
  return <EdMintsBostonNewPage market="nationwide" faqItems={FAQ_ITEMS} />;
}

export const variant: LandingVariant = {
  id: "v3-new-layout",
  label: "New layout (shared template)",
  Component: NewLayout,
};
