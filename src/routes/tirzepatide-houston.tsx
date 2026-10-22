import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { bootImagePreloadLinks } from "@/lib/boot-assets";
import { COMPOUNDED_TIRZEPATIDE_PRICING } from "@/lib/medication-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  DESCRIPTION,
  FAQ_ITEMS,
  HOUSTON_AREA_SERVED,
  SERVICE_DESCRIPTION,
  STARTER,
  TITLE,
} from "@/landing-variants/tirzepatide-houston/shared";

export const Route = createFileRoute("/tirzepatide-houston")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/tirzepatide-houston") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/tirzepatide-houston") },
      ...bootImagePreloadLinks("/tirzepatide-houston"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            {
              name: "Compounded Tirzepatide in Houston",
              path: "/tirzepatide-houston",
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
            name: "Compounded Tirzepatide Weight-Loss Telehealth Care in Houston",
            description: SERVICE_DESCRIPTION,
            path: "/tirzepatide-houston",
            serviceType: "Medical weight-loss telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-27",
            areaServed: HOUSTON_AREA_SERVED,
            offer: {
              introPrice: STARTER.monthlyEquivalentUsd,
              recurringPrice: COMPOUNDED_TIRZEPATIDE_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: TirzepatideHoustonPage,
});

function TirzepatideHoustonPage() {
  useEffect(() => {
    trackPageViewed("tirzepatide_houston");
  }, []);

  return <LandingExperiment page="tirzepatide-houston" />;
}
