import { Glp1LandingPage } from "@/components/site/Glp1LandingPage";
import type { LandingVariant } from "../types";

function Glp1HoustonControl() {
  return <Glp1LandingPage market="houston" />;
}

export const variant: LandingVariant = {
  id: "v1-control",
  label: "Control (original page)",
  Component: Glp1HoustonControl,
};
