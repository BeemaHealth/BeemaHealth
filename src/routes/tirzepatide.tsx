import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { COMPOUNDED_TIRZEPATIDE_PRICING } from "@/lib/medication-pricing";
import { bootImagePreloadLinks } from "@/lib/boot-assets";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  DESCRIPTION,
  FAQ_ITEMS,
  TITLE,
  STARTER,
} from "@/landing-variants/tirzepatide/shared";

export const Route = createFileRoute("/tirzepatide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/tirzepatide") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/tirzepatide") },
      ...bootImagePreloadLinks("/tirzepatide"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Compounded Tirzepatide", path: "/tirzepatide" },
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
            name: "Compounded Tirzepatide Weight-Loss Telehealth Care",
            description: DESCRIPTION,
            path: "/tirzepatide",
            serviceType: "Medical weight-loss telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-13",
            offer: {
              introPrice: STARTER.monthlyEquivalentUsd,
              recurringPrice: COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: TirzepatidePage,
});

function TirzepatidePage() {
  useEffect(() => {
    trackPageViewed("tirzepatide");
  }, []);

  return <LandingExperiment page="tirzepatide" />;
}
