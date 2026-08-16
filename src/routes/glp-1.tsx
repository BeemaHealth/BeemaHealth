import { createFileRoute } from "@tanstack/react-router";
import { Glp1LandingPage } from "@/components/site/Glp1LandingPage";
import { glp1Head } from "@/lib/glp-1-landing";

export const Route = createFileRoute("/glp-1")({
  head: () => glp1Head("national"),
  component: Glp1NationalPage,
});

function Glp1NationalPage() {
  return <Glp1LandingPage market="national" />;
}
