import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { NAD_PRICING } from "@/lib/simple-treatment-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  FAQ_ITEMS,
} from "@/landing-variants/nad-plus/shared";

export const Route = createFileRoute("/nad-plus")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/nad-plus") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/nad-plus") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Compounded NAD+", path: "/nad-plus" },
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
            name: "Compounded NAD+ Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/nad-plus",
            serviceType: "NAD+ injection telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-16",
            offer: {
              introPrice: NAD_PRICING.monthlyUsd,
              recurringPrice: NAD_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: NadPlusPage,
});

function NadPlusPage() {
  useEffect(() => {
    trackPageViewed("nad-plus");
  }, []);

  return <LandingExperiment page="nad-plus" />;
}
