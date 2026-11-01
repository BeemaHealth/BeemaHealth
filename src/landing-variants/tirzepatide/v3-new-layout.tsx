import type { LandingVariant } from "../types";
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
      faqItems={FAQ_ITEMS}
    />
  );
}

export const variant: LandingVariant = {
  id: "v3-new-layout",
  label: "New layout (shared template)",
  Component: TirzepatideNewLayout,
};
