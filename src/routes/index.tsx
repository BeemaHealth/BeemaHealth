import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { canonicalUrl, WEBSITE_JSONLD } from "@/lib/seo";
import { trackPageViewed } from "@/lib/analytics";
import { createFunnelSession } from "@/lib/api/client";
import { getPendingUtms, clearPendingUtms } from "@/lib/utm";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { ScrollProgressBar } from "@/components/site/primitives";
import { HomeHero } from "@/components/home/HomeHero";
import { DoseJourney } from "@/components/home/DoseJourney";
import { HowItWorksScrolly } from "@/components/home/HowItWorksScrolly";
import { TreatmentShowcase } from "@/components/home/TreatmentShowcase";
import { MissionSection } from "@/components/home/MissionSection";
import { FinalCTASection } from "@/components/home/FinalCTASection";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Beema Health — Medical weight-loss care" },
      {
        name: "description",
        content:
          "Medical weight-loss care reviewed by a licensed provider. Secure intake for Zepbound, Wegovy, and affordable alternatives when appropriate.",
      },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/") }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(WEBSITE_JSONLD),
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const utms = getPendingUtms();
      const hasUtms = Object.keys(utms).length > 0;
      createFunnelSession(hasUtms ? utms : undefined)
        .then(() => {
          if (hasUtms) clearPendingUtms();
          trackPageViewed("home");
        })
        .catch((err: unknown) => {
          console.error("[beemahealth] home session failed:", err);
          trackPageViewed("home");
        });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return (
    <>
      <ScrollProgressBar />
      <MarketingLayout>
        <HomeHero />
        <HowItWorksScrolly />
        <DoseJourney />
        <TreatmentShowcase />
        <MissionSection />
        <FinalCTASection />
      </MarketingLayout>
    </>
  );
}
