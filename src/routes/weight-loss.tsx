import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { trackPageViewed } from "@/lib/analytics";
import { weightLossHead } from "@/lib/weight-loss-page";
import { LandingExperiment } from "@/landing-variants/runtime";

export const Route = createFileRoute("/weight-loss")({
  head: () => weightLossHead(),
  component: WeightLossPage,
});

function WeightLossPage() {
  useEffect(() => {
    trackPageViewed("weight_loss");
  }, []);

  return <LandingExperiment page="weight-loss" />;
}
