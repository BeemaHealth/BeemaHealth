import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { MOTS_C_PRICING } from "@/lib/simple-treatment-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  FAQ_ITEMS,
} from "@/landing-variants/mots-c/shared";

export const Route = createFileRoute("/mots-c")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/mots-c") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/mots-c") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Compounded MOTS-C", path: "/mots-c" },
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
            name: "Compounded MOTS-C Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/mots-c",
            serviceType: "MOTS-C injection telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-11-02",
            offer: {
              introPrice: MOTS_C_PRICING.monthlyUsd,
              recurringPrice: MOTS_C_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: MotsCPage,
});

function MotsCPage() {
  useEffect(() => {
    trackPageViewed("mots-c");
  }, []);

  return <LandingExperiment page="mots-c" />;
}
