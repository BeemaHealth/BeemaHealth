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
import { HAIRLOSS_TOPICAL_MEN_PRICING } from "@/lib/simple-treatment-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  FAQ_ITEMS,
} from "@/landing-variants/hair-loss-spray-men/shared";

export const Route = createFileRoute("/hair-loss-spray-men")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/hair-loss-spray-men") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/hair-loss-spray-men") },
      ...bootImagePreloadLinks("/hair-loss-spray-men"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Hair Loss Spray for Men", path: "/hair-loss-spray-men" },
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
            name: "Hair Loss Spray for Men Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/hair-loss-spray-men",
            serviceType: "Hair loss treatment telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-13",
            offer: {
              introPrice: HAIRLOSS_TOPICAL_MEN_PRICING.monthlyUsd,
              recurringPrice: HAIRLOSS_TOPICAL_MEN_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: HairLossSprayMenPage,
});

function HairLossSprayMenPage() {
  useEffect(() => {
    trackPageViewed("hairloss_spray_men");
  }, []);

  return <LandingExperiment page="hair-loss-spray-men" />;
}
