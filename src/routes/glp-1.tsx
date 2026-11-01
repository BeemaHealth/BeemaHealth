import { createFileRoute } from "@tanstack/react-router";
import { glp1Head } from "@/lib/glp-1-landing";
import { LandingExperiment } from "@/landing-variants/runtime";

export const Route = createFileRoute("/glp-1")({
  head: () => glp1Head("national"),
  component: Glp1NationalPage,
});

function Glp1NationalPage() {
  return <LandingExperiment page="glp-1" />;
}
