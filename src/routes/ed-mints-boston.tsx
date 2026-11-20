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
import { ED_MINTS_RDT_PRICING } from "@/lib/simple-treatment-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  BOSTON_AREA_SERVED,
  FAQ_ITEMS,
} from "@/landing-variants/ed-mints-boston/shared";

export const Route = createFileRoute("/ed-mints-boston")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/ed-mints-boston") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/ed-mints-boston") },
      ...bootImagePreloadLinks("/ed-mints-boston"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "ED Mints in Boston", path: "/ed-mints-boston" },
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
            name: "ED Mints Telehealth Care in Boston",
            description: SERVICE_DESCRIPTION,
            path: "/ed-mints-boston",
            serviceType: "Erectile dysfunction treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-27",
            areaServed: BOSTON_AREA_SERVED,
            offer: {
              introPrice: ED_MINTS_RDT_PRICING.monthlyUsd,
              recurringPrice: ED_MINTS_RDT_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: EdMintsBostonPage,
});

function EdMintsBostonPage() {
  useEffect(() => {
    trackPageViewed("ed_mints_boston");
  }, []);

  return <LandingExperiment page="ed-mints-boston" />;
}
