import { Glp1LandingPage } from "@/components/site/Glp1LandingPage";
import type { LandingVariant } from "../types";

function Glp1HoustonControl() {
  return <Glp1LandingPage market="houston" compactPricing />;
}

export const variant: LandingVariant = {
  id: "v4-editing-the-pricing-large-info-text-at-b",
  label: "Editing the pricing large info text at bottom",
  Component: Glp1HoustonControl,
};
