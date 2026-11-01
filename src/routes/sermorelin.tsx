import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { SERMORELIN_PRICING } from "@/lib/simple-treatment-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  FAQ_ITEMS,
} from "@/landing-variants/sermorelin/shared";

export const Route = createFileRoute("/sermorelin")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/sermorelin") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/sermorelin") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Compounded Sermorelin", path: "/sermorelin" },
          ]),
        ),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(faqPageJsonLd(FAQ_ITEMS)),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify(
          serviceJsonLd({
            name: "Compounded Sermorelin Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/sermorelin",
            serviceType: "Sermorelin injection telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-17",
            offer: {
              introPrice: SERMORELIN_PRICING.monthlyUsd,
              recurringPrice: SERMORELIN_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: SermorelinPage,
});

function SermorelinPage() {
  useEffect(() => {
    trackPageViewed("sermorelin");
  }, []);

  return <LandingExperiment page="sermorelin" />;
}
