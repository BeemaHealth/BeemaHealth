import type { LandingVariant } from "../types";
import { EdMintsBostonNewPage } from "../template/EdBostonPage";
import { FAQ_ITEMS } from "./shared";

/**
 * New shared landing layout (same design as GLP-1 Houston and sexual health).
 * Content and FAQ match the control; every Get Started still opens the ED
 * Mints formulation picker. Layout is built by `../template`. To customize
 * this page only, pass `overrides` or `insertAfter` below.
 */
function EdMintsBostonNewLayout() {
  return <EdMintsBostonNewPage faqItems={FAQ_ITEMS} />;
}

export const variant: LandingVariant = {
  id: "v3-new-layout",
  label: "New layout (shared template)",
  Component: EdMintsBostonNewLayout,
};
