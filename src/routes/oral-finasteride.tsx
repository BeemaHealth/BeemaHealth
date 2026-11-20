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
import { HAIRLOSS_FINASTERIDE_PRICING } from "@/lib/simple-treatment-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  FAQ_ITEMS,
} from "@/landing-variants/oral-finasteride/shared";

export const Route = createFileRoute("/oral-finasteride")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/oral-finasteride") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/oral-finasteride") },
      ...bootImagePreloadLinks("/oral-finasteride"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Oral Finasteride", path: "/oral-finasteride" },
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
            name: "Oral Finasteride Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/oral-finasteride",
            serviceType: "Hair loss treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-03",
            offer: {
              introPrice: HAIRLOSS_FINASTERIDE_PRICING.monthlyUsd,
              recurringPrice: HAIRLOSS_FINASTERIDE_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: OralFinasteridePage,
});

function OralFinasteridePage() {
  useEffect(() => {
    trackPageViewed("oral_finasteride");
  }, []);

  return <LandingExperiment page="oral-finasteride" />;
}
