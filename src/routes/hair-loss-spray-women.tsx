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
import { HAIRLOSS_TOPICAL_WOMEN_PRICING } from "@/lib/simple-treatment-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  FAQ_ITEMS,
} from "@/landing-variants/hair-loss-spray-women/shared";

export const Route = createFileRoute("/hair-loss-spray-women")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/hair-loss-spray-women") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/hair-loss-spray-women") },
      ...bootImagePreloadLinks("/hair-loss-spray-women"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            {
              name: "Hair Loss Spray for Women",
              path: "/hair-loss-spray-women",
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
            name: "Hair Loss Spray for Women Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/hair-loss-spray-women",
            serviceType: "Hair loss treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-13",
            offer: {
              introPrice: HAIRLOSS_TOPICAL_WOMEN_PRICING.monthlyUsd,
              recurringPrice: HAIRLOSS_TOPICAL_WOMEN_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: HairLossSprayWomenPage,
});

function HairLossSprayWomenPage() {
  useEffect(() => {
    trackPageViewed("hairloss_spray_women");
  }, []);

  return <LandingExperiment page="hair-loss-spray-women" />;
}
