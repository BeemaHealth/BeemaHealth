import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, FileCheck2, Send } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  ProgramActionButton,
  ProgramBullets,
  ProgramDisclosure,
  ProgramFaq,
  ProgramHero,
  ProgramSteps,
  growthProgramHead,
} from "@/components/site/GrowthProgramBlocks";
import { trackPageViewed } from "@/lib/analytics";
import {
  CLINICAL_INDEPENDENCE_NOTE,
  CREATOR_EARNINGS_DISCLAIMER,
  CREATOR_LANDING_PATH,
  CREATOR_MIN_FOLLOWERS,
  CREATOR_TERMS_PATH,
} from "@/lib/growth-programs";
import { breadcrumbJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/creators")({
  head: () => ({
    ...growthProgramHead({
      title: "Beema Health Creator Program | Beema Health",
      description:
        "Apply to partner with Beema Health as a creator. Paid partnership with clear disclosure, a unique tracking link, and monthly payouts.",
      path: CREATOR_LANDING_PATH,
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Creators", path: CREATOR_LANDING_PATH },
          ]),
        ),
      },
    ],
  }),
  component: CreatorsPage,
});

const STEPS = [
  {
    icon: Send,
    title: "Apply",
    text: "Tell us about your audience and content. Applying is free and there is no minimum spend.",
  },
  {
    icon: FileCheck2,
    title: "Get reviewed",
    text: "We review your public profile and recent content, then send the creator agreement and claim guidelines if approved.",
  },
  {
    icon: BadgeCheck,
    title: "Share with disclosure",
    text: "Promote Beema Health with your own tracking link, disclosing the paid partnership clearly in every post.",
  },
] as const;

const WHO = [
  `At least ${CREATOR_MIN_FOLLOWERS.toLocaleString("en-US")} followers on TikTok or Instagram.`,
  "18 or older, US-based, and located in a state where the program is available.",
  "Active, original content about fitness, wellness, weight loss, or lifestyle.",
  "Authentic, engaged audiences. We value engagement over raw follower count.",
  "Licensed healthcare professionals and Beema Health, Bask, and Care Partner staff are not eligible.",
] as const;

const RULES = [
  "Every post clearly discloses the paid partnership, in the same place and format as the endorsement.",
  "No health advice, no medical claims, and no requests for followers' health information.",
  "No guaranteed results, no weight-loss numbers, and no comparisons to brand-name medications.",
  "Creators never receive patient information, including whether anyone became a patient.",
  "Beema Health may limit or exclude certain states.",
] as const;

const FAQ = [
  {
    q: "How do I get started?",
    a: "Apply using the button above. We review every application and follow up by email.",
  },
  {
    q: "How does payment work?",
    a: "Compensation terms are shared in the creator agreement after approval and are paid on a regular schedule after eligibility checks. We do not publish earnings figures.",
  },
  {
    q: "What does it cost to join?",
    a: "Nothing. There is no fee and no minimum spend.",
  },
  {
    q: "How long does approval take?",
    a: "We aim to review applications within about five business days.",
  },
  {
    q: "I am a current patient. Can I join?",
    a: "Current patients can use the Refer a Friend program instead. The creator program is for audience-based promotion.",
  },
] as const;

function CreatorsPage() {
  useEffect(() => {
    trackPageViewed("creators");
  }, []);

  return (
    <MarketingLayout>
      <ProgramHero
        eyebrow="Creator program"
        title="Partner with Beema Health"
        description="Share an honest, well-disclosed look at modern online care with your audience through a paid creator partnership."
      >
        <ProgramActionButton
          program="creator"
          label="Apply now"
          fallbackLabel="Email us to apply"
          fallbackSubject="Creator program application"
        />
      </ProgramHero>
      <ProgramSteps heading="How it works" steps={STEPS} />
      <ProgramBullets heading="Who we are looking for" items={WHO} />
      <ProgramBullets heading="Ground rules" items={RULES} />
      <ProgramFaq items={FAQ} />
      <ProgramDisclosure
        termsPath={CREATOR_TERMS_PATH}
        termsLabel="Creator Program Terms"
      >
        {CREATOR_EARNINGS_DISCLAIMER} {CLINICAL_INDEPENDENCE_NOTE}
      </ProgramDisclosure>
    </MarketingLayout>
  );
}
