import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  canonicalUrl,
  breadcrumbJsonLd,
  faqPageJsonLd,
  serviceJsonLd,
} from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  promoFirstMonthUsd,
} from "@/lib/medication-pricing";
import { bootImagePreloadLinks } from "@/lib/boot-assets";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  DESCRIPTION,
  FAQ_ITEMS,
  SERVICE_DESCRIPTION,
  TITLE,
} from "@/landing-variants/semaglutide/shared";

export const Route = createFileRoute("/semaglutide")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/semaglutide") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/semaglutide") },
      ...bootImagePreloadLinks("/semaglutide"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Compounded Semaglutide", path: "/semaglutide" },
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
            name: "Compounded Semaglutide Telehealth Care",
            description: SERVICE_DESCRIPTION,
            path: "/semaglutide",
            serviceType: "Medical weight-loss telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-13",
            offer: {
              introPrice: promoFirstMonthUsd(COMPOUNDED_SEMAGLUTIDE_PRICING),
              recurringPrice: COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: SemaglutidePage,
});

function SemaglutidePage() {
  useEffect(() => {
    trackPageViewed("semaglutide");
  }, []);

  return <LandingExperiment page="semaglutide" />;
}
