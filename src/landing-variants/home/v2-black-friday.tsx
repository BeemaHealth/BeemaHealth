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
import {
  BLACK_FRIDAY_OFFERS,
  promoLine,
  usePromoEvent,
  BlackFridayCompactOffers,
} from "../template/BlackFriday";

function HomeBlackFriday() {
  const ev = usePromoEvent();
  return (
    <>
      <ScrollProgressBar />
      <MarketingLayout>
        <HomeHero promoLine={promoLine(ev)} />
        <TrustSignals />
        <BlackFridayCompactOffers />
        <HowItWorksSteps
          eyebrow={null}
          title={<LineReveal>How it works</LineReveal>}
        />
        <MedicalTeamSection />
        <TreatmentShowcase
          blackFriday={{
            semaglutide: BLACK_FRIDAY_OFFERS.semaglutide,
            tirzepatide: BLACK_FRIDAY_OFFERS.tirzepatide,
          }}
        />
        <WellnessLineupSection />
        <FreeResourcesSection />
        <MissionSection />
        <FinalCTASection promoLine={promoLine(ev)} />
      </MarketingLayout>
    </>
  );
}

export const variant: LandingVariant = {
  id: "v2-black-friday",
  label: "Black Friday 2026",
  Component: HomeBlackFriday,
};
