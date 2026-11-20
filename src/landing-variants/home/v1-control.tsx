import { MarketingLayout } from "@/components/site/MarketingLayout";
import { ScrollProgressBar } from "@/components/site/primitives";
import { HowItWorksSteps } from "@/components/site/HowItWorksSteps";
import { LineReveal } from "@/components/home/home-motion";
import { MedicalTeamSection } from "@/components/site/MedicalTeamSection";
import { HomeHero } from "@/components/home/HomeHero";
import { TrustSignals } from "@/components/home/TrustSignals";
import { TreatmentShowcase } from "@/components/home/TreatmentShowcase";
import { WellnessLineupSection } from "@/components/home/WellnessLineupSection";
import { FreeResourcesSection } from "@/components/home/FreeResourcesSection";
import { MissionSection } from "@/components/home/MissionSection";
import { FinalCTASection } from "@/components/home/FinalCTASection";
import type { LandingVariant } from "../types";

function HomeControl() {
  return (
    <>
      <ScrollProgressBar />
      <MarketingLayout>
        <HomeHero />
        <TrustSignals />
        <HowItWorksSteps
          eyebrow={null}
          title={<LineReveal>How it works</LineReveal>}
        />
        <MedicalTeamSection />
        <TreatmentShowcase />
        <WellnessLineupSection />
        <FreeResourcesSection />
        <MissionSection />
        <FinalCTASection />
      </MarketingLayout>
    </>
  );
}

export const variant: LandingVariant = {
  id: "v1-control",
  label: "Control (original page)",
  Component: HomeControl,
};
