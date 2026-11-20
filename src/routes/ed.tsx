import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { ED_TADALAFIL_PRICING } from "@/lib/simple-treatment-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  FAQ_ITEMS,
} from "@/landing-variants/ed/shared";

export const Route = createFileRoute("/ed")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/ed") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/ed") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Generic ED Treatment", path: "/ed" },
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
            name: "Generic ED Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/ed",
            serviceType: "Erectile dysfunction treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-08-27",
            offer: {
              introPrice: ED_TADALAFIL_PRICING.monthlyUsd,
              recurringPrice: ED_TADALAFIL_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: EdPage,
});

function EdPage() {
  useEffect(() => {
    trackPageViewed("ed");
  }, []);

  return <LandingExperiment page="ed" />;
}
