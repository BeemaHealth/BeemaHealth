import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { bootImagePreloadLinks } from "@/lib/boot-assets";
import { canonicalUrl, WEBSITE_JSONLD } from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { LandingExperiment } from "@/landing-variants/runtime";
import { createFunnelSession } from "@/lib/api/client";
import { getPendingUtms, clearPendingUtms } from "@/lib/utm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beema Health | Online medical care" },
      {
        name: "description",
        content:
          "Online medical care reviewed by licensed providers in all 50 states: GLP-1 weight loss, hair loss, ED, NAD+, sermorelin, when clinically appropriate.",
      },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/") },
      ...bootImagePreloadLinks("/"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(WEBSITE_JSONLD),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const utms = getPendingUtms();
      const hasUtms = Object.keys(utms).length > 0;
      createFunnelSession(hasUtms ? utms : undefined)
        .then(() => {
          if (hasUtms) clearPendingUtms();
          trackPageViewed("home");
        })
        .catch((err: unknown) => {
          console.error("[beemahealth] home session failed:", err);
          trackPageViewed("home");
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return <LandingExperiment page="home" />;
}
