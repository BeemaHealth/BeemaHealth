import { createFileRoute } from "@tanstack/react-router";
import { Glp1LandingPage } from "@/components/site/Glp1LandingPage";
import { glp1Head } from "@/lib/glp-1-landing";

export const Route = createFileRoute("/glp-1-houston")({
  head: () => glp1Head("houston"),
  component: Glp1HoustonPage,
});

function Glp1HoustonPage() {
  return <Glp1LandingPage market="houston" />;
}
