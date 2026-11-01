import type { LandingVariant } from "../types";
import { GenericEdBostonPage } from "../template/EdBostonPage";
import { FAQ_ITEMS } from "./shared";

/**
 * New shared landing layout (same design as GLP-1 Houston and sexual health).
 * Content, CTA ids and FAQ match the control; layout is built by `../template`.
 * To customize this page only, pass `overrides` or `insertAfter` below.
 */
function TadalafilBostonNewLayout() {
  return <GenericEdBostonPage product="tadalafil" faqItems={FAQ_ITEMS} />;
}

export const variant: LandingVariant = {
  id: "v3-new-layout",
  label: "New layout (shared template)",
  Component: TadalafilBostonNewLayout,
};
