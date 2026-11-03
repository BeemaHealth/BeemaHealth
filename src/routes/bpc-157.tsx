import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { BPC_157_PRICING } from "@/lib/simple-treatment-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  FAQ_ITEMS,
} from "@/landing-variants/bpc-157/shared";

export const Route = createFileRoute("/bpc-157")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/bpc-157") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/bpc-157") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Compounded BPC-157", path: "/bpc-157" },
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
            name: "Compounded BPC-157 Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/bpc-157",
            serviceType: "BPC-157 injection telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-11-03",
            offer: {
              introPrice: BPC_157_PRICING.monthlyUsd,
              recurringPrice: BPC_157_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: Bpc157Page,
});

function Bpc157Page() {
  useEffect(() => {
    trackPageViewed("bpc-157");
  }, []);

  return <LandingExperiment page="bpc-157" />;
}
