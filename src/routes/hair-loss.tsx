import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { breadcrumbJsonLd, canonicalUrl, serviceJsonLd } from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { LandingExperiment } from "@/landing-variants/runtime";
import { TITLE, DESCRIPTION } from "@/landing-variants/hair-loss/shared";

export const Route = createFileRoute("/hair-loss")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/hair-loss") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/hair-loss") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Hair Loss", path: "/hair-loss" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceJsonLd({
            name: "Hair Loss Telehealth Program",
            description:
              "Telehealth hair loss program from Beema Health. Licensed providers review every patient and may prescribe FDA-approved generic oral medications or compounded topical hair loss formulations when clinically appropriate; compounded medications are not FDA-approved, and prescribing is never guaranteed.",
            path: "/hair-loss",
            serviceType: "Hair loss telehealth program",
          }),
        ),
      },
    ],
  }),
  component: HairLossPage,
});

function HairLossPage() {
  useEffect(() => {
    trackPageViewed("hair_loss");
  }, []);

  return <LandingExperiment page="hair-loss" />;
}
