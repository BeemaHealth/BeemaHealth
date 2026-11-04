import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { GHK_CU_PRICING } from "@/lib/simple-treatment-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  FAQ_ITEMS,
} from "@/landing-variants/ghk-cu/shared";

export const Route = createFileRoute("/ghk-cu")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/ghk-cu") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/ghk-cu") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            {
              name: "Compounded GHK-Cu",
              path: "/ghk-cu",
            },
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
            name: "Compounded GHK-Cu Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/ghk-cu",
            serviceType: "GHK-Cu peptide injection telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-11-03",
            offer: {
              introPrice: GHK_CU_PRICING.monthlyUsd,
              recurringPrice: GHK_CU_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: GhkCuPage,
});

function GhkCuPage() {
  useEffect(() => {
    trackPageViewed("ghk-cu");
  }, []);

  return <LandingExperiment page="ghk-cu" />;
}
