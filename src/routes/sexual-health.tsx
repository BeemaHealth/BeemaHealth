import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { trackPageViewed } from "@/lib/analytics";
import { LandingExperiment } from "@/landing-variants/runtime";
import { sexualHealthHead } from "@/lib/sexual-health-page";

export const Route = createFileRoute("/sexual-health")({
  head: () => sexualHealthHead(),
  component: SexualHealthPage,
});

function SexualHealthPage() {
  useEffect(() => {
    trackPageViewed("sexual_health");
  }, []);

  return <LandingExperiment page="sexual-health" />;
}
