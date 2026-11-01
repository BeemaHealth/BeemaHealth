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
import { HAIRLOSS_ORAL_MINOXIDIL_PRICING } from "@/lib/simple-treatment-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  FAQ_ITEMS,
} from "@/landing-variants/oral-minoxidil-women/shared";

export const Route = createFileRoute("/oral-minoxidil-women")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/oral-minoxidil-women") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/oral-minoxidil-women") },
      ...bootImagePreloadLinks("/oral-minoxidil-women"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            {
              name: "Oral Minoxidil for Women",
              path: "/oral-minoxidil-women",
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
            name: "Oral Minoxidil for Women Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/oral-minoxidil-women",
            serviceType: "Hair loss treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-11",
            offer: {
              introPrice: HAIRLOSS_ORAL_MINOXIDIL_PRICING.monthlyUsd,
              recurringPrice: HAIRLOSS_ORAL_MINOXIDIL_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: OralMinoxidilWomenPage,
});

function OralMinoxidilWomenPage() {
  useEffect(() => {
    trackPageViewed("oral_minoxidil_women");
  }, []);

  return <LandingExperiment page="oral-minoxidil-women" />;
}
