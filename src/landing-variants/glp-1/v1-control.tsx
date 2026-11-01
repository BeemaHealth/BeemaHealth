import { Glp1LandingPage } from "@/components/site/Glp1LandingPage";
import type { LandingVariant } from "../types";

function Glp1Control() {
  return <Glp1LandingPage market="national" />;
}

export const variant: LandingVariant = {
  id: "v1-control",
  label: "Control (original page)",
  Component: Glp1Control,
};
