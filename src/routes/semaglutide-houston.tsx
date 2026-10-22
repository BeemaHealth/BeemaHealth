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
import {
  COMPOUNDED_SEMAGLUTIDE_PRICING,
  promoFirstMonthUsd,
} from "@/lib/medication-pricing";
import { LandingExperiment } from "@/landing-variants/runtime";
import {
  HOUSTON_AREA_SERVED,
  TITLE,
  DESCRIPTION,
  SERVICE_DESCRIPTION,
  FAQ_ITEMS,
} from "@/landing-variants/semaglutide-houston/shared";

export const Route = createFileRoute("/semaglutide-houston")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: canonicalUrl("/semaglutide-houston") },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [
      { rel: "canonical", href: canonicalUrl("/semaglutide-houston") },
      ...bootImagePreloadLinks("/semaglutide-houston"),
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            {
              name: "Compounded Semaglutide in Houston",
              path: "/semaglutide-houston",
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
            name: "Compounded Semaglutide Telehealth Care in Houston",
            description: SERVICE_DESCRIPTION,
            path: "/semaglutide-houston",
            serviceType: "Medical weight-loss telehealth service",
            reviewedByClinicalLead: false,
            dateModified: "2026-09-27",
            areaServed: HOUSTON_AREA_SERVED,
            offer: {
              introPrice: promoFirstMonthUsd(COMPOUNDED_SEMAGLUTIDE_PRICING),
              recurringPrice: COMPOUNDED_SEMAGLUTIDE_PRICING.monthlyUsd,
            },
          }),
        ),
      },
    ],
  }),
  component: SemaglutideHoustonPage,
});

function SemaglutideHoustonPage() {
  useEffect(() => {
    trackPageViewed("semaglutide_houston");
  }, []);

  return <LandingExperiment page="semaglutide-houston" />;
}
