import { createFileRoute } from "@tanstack/react-router";
import { LandingExperiment } from "@/landing-variants/runtime";
import { glp1Head } from "@/lib/glp-1-landing";

export const Route = createFileRoute("/glp-1-houston")({
  head: () => glp1Head("houston"),
  component: Glp1HoustonPage,
});

function Glp1HoustonPage() {
  return <LandingExperiment page="glp-1-houston" />;
}
