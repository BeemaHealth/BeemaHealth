import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gift, Share2, UserCheck } from "lucide-react";
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
  REFERRAL_CREDIT_USD,
  REFERRAL_LANDING_PATH,
  REFERRAL_SHARE_NOTICE,
  REFERRAL_TERMS_PATH,
} from "@/lib/growth-programs";
import { breadcrumbJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/refer")({
  head: () => ({
    ...growthProgramHead({
      title: "Refer a Friend | Beema Health",
      description: `Beema Health patients can share a personal link. When a friend becomes a patient, you each get a $${REFERRAL_CREDIT_USD} credit toward your own care.`,
      path: REFERRAL_LANDING_PATH,
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Refer a friend", path: REFERRAL_LANDING_PATH },
          ]),
        ),
      },
    ],
  }),
  component: ReferPage,
});

const STEPS = [
  {
    icon: Share2,
    title: "Share your link",
    text: "Get your personal link and share it yourself, from your own phone or email, with people you know. We never message your friends for you.",
  },
  {
    icon: UserCheck,
    title: "Your friend starts care",
    text: "Your friend completes the questionnaire and a licensed provider decides whether treatment is right for them. Nothing is guaranteed.",
  },
  {
    icon: Gift,
    title: "You each get a credit",
    text: `After their first paid order clears the refund window, you each receive a $${REFERRAL_CREDIT_USD} credit toward your own Beema Health care.`,
  },
] as const;

const RULES = [
  "For current patients in good standing, 18 or older. Licensed clinicians and Beema Health, Bask, and Care Partner staff are not eligible.",
  "Referred friends must be new patients. Self-referrals and household referrals do not qualify.",
  "Credits have no cash value, cannot be transferred, and may expire.",
  "The credit is the same for everyone and never depends on the medication, dose, or plan.",
  "Share only with people you know. Posting your link publicly or on coupon sites is not allowed.",
  "For your friend's privacy, we never tell you who became a patient. You only see credits earned.",
] as const;

const FAQ = [
  {
    q: "How do I get my link?",
    a: "Referral links are being added to the patient portal. Email us and we will let you know the moment yours is available.",
  },
  {
    q: "Can I see who signed up?",
    a: "No. To protect everyone's privacy, we only show the credits you have earned, never names or any health information.",
  },
  {
    q: "Is there a limit?",
    a: "Yes. Credits are limited per person per year, as described in the Referral Terms.",
  },
  {
    q: "Does this affect my care?",
    a: "No. Referring a friend is optional and has no effect on your treatment, prices, or eligibility.",
  },
] as const;

function ReferPage() {
  useEffect(() => {
    trackPageViewed("refer");
  }, []);

  return (
    <MarketingLayout>
      <ProgramHero
        eyebrow="Refer a friend"
        title={`Give $${REFERRAL_CREDIT_USD}, get $${REFERRAL_CREDIT_USD}`}
        description={`Share Beema Health with someone you care about. When they become a patient, you each get a $${REFERRAL_CREDIT_USD} credit toward your own care.`}
      >
        <ProgramActionButton
          program="referral"
          label="Get my referral link"
          fallbackLabel="Email us for your referral link"
          fallbackSubject="Referral program"
        />
      </ProgramHero>
      <ProgramSteps heading="How it works" steps={STEPS} />
      <ProgramBullets heading="Program basics" items={RULES} />
      <ProgramFaq items={FAQ} />
      <ProgramDisclosure
        termsPath={REFERRAL_TERMS_PATH}
        termsLabel="Referral Terms"
      >
        {REFERRAL_SHARE_NOTICE} {CLINICAL_INDEPENDENCE_NOTE}
      </ProgramDisclosure>
    </MarketingLayout>
  );
}
