import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck, Gift, MessageSquareText, Video } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  ProgramActionButton,
  ProgramBullets,
  ProgramDisclosure,
  ProgramFaq,
  growthProgramHead,
} from "@/components/site/GrowthProgramBlocks";
import { trackPageViewed } from "@/lib/analytics";
import {
  CLINICAL_INDEPENDENCE_NOTE,
  STORY_COMPENSATION_DISCLOSURE,
  STORY_CREDIT_USD,
  STORY_LANDING_PATH,
  STORY_PAGE_FOOTER_DISCLOSURE,
  STORY_TERMS_PATH,
} from "@/lib/growth-programs";
import { Section, SurfaceCard } from "@/components/site/primitives";
import { resolveVialImagery } from "@/lib/treatment-imagery";
import { breadcrumbJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/share-your-story")({
  head: () => ({
    ...growthProgramHead({
      title: "Share Your Beema Health Story | Beema Health",
      description: `Tell us about your experience with Beema Health on a short video and receive a $${STORY_CREDIT_USD} credit toward your care after approval. Any honest experience is welcome.`,
      path: STORY_LANDING_PATH,
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Share your story", path: STORY_LANDING_PATH },
          ]),
        ),
      },
    ],
  }),
  component: ShareYourStoryPage,
});

const STEPS = [
  {
    icon: Video,
    title: "Record or Upload",
    text: "Film a short video about your experience with Beema Health, or send us one you already have.",
  },
  {
    icon: MessageSquareText,
    title: "Share Your Experience",
    text: "Tell us in your own words what your care has been like, what you valued, and what you would want others to know.",
  },
  {
    icon: ClipboardCheck,
    title: "Submit For Review",
    text: "Send your video and our team will look it over to make sure it meets our simple content guidelines.",
  },
  {
    icon: Gift,
    title: "Receive Your Credit",
    text: `Approved stories earn a $${STORY_CREDIT_USD} credit toward your next Beema Health charge within 3 to 5 business days.`,
  },
] as const;

const GUIDELINES = [
  "Use your first name only. Please do not show your last name, address, or date of birth.",
  "Speak in your own words. Positive, mixed, and negative experiences are all welcome.",
  "Please mention Beema Health by name.",
  'Please do not name brand-name medications, give dosing, or give medical advice. Say "the medication my provider prescribed."',
  "Please do not state exact pounds lost or timeframes.",
  "Keep other people, prescription labels, and pharmacy names out of the frame.",
] as const;

const FAQ = [
  {
    q: "Who can submit a story?",
    a: "Adults 18 and older who are current or former Beema Health patients with at least one completed paid order. We confirm patient status through our care platform, not from what you tell us.",
  },
  {
    q: "Do I have to say something positive?",
    a: "No. Your credit never depends on whether your story is positive or negative. We review only for technical quality and for our content guidelines.",
  },
  {
    q: `Is the $${STORY_CREDIT_USD} cash?`,
    a: "No. It is a credit toward your own future Beema Health charges. It has no cash value, cannot be transferred, and may expire as described in the program terms.",
  },
  {
    q: "Will my video be public?",
    a: "Only if you authorize it, and only after our compliance review. Approved stories may appear on our website, social channels, and email. Paid advertising use is a separate, optional choice.",
  },
  {
    q: "Can I take my story down later?",
    a: "Yes. You can revoke your authorization at any time. We stop new uses and remove your story from channels we control, but we cannot recall copies already shared by others.",
  },
  {
    q: "Does this affect my care?",
    a: "No. Sharing a story is optional and has no effect on your treatment, prices, or eligibility.",
  },
] as const;

function ShareYourStoryPage() {
  useEffect(() => {
    trackPageViewed("share_your_story");
  }, []);
  const vial = resolveVialImagery("tirzepatide");

  return (
    <MarketingLayout>
      <section className="bg-grad-hero relative overflow-hidden">
        <div className="veya-container grid items-center gap-8 py-14 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div className="relative z-10 max-w-xl">
            <h1 className="text-balance text-4xl font-bold leading-[1.05] text-foreground md:text-6xl">
              Share Your Beema Health Story
            </h1>
            <p className="mt-6 text-base font-semibold text-foreground md:text-lg">
              Record a quick video about your experience and get $
              {STORY_CREDIT_USD} toward your next Beema Health order.
            </p>
            <p className="mt-4 text-pretty text-base leading-relaxed text-foreground/80 md:text-lg">
              Telling your story is easy. Send us your video right here on our
              site. Once our team has reviewed and approved it, we will add a $
              {STORY_CREDIT_USD} credit to your account for your next order.
            </p>
            <div className="mt-8">
              <ProgramActionButton
                program="story"
                label="Submit Your Story"
                fallbackLabel="Submit Your Story"
                fallbackSubject="Story submission"
              />
            </div>
          </div>
          <div className="relative flex justify-center md:justify-end">
            <img
              src={vial.src}
              width={vial.width}
              height={vial.height}
              alt={vial.alt}
              className="w-56 rotate-[28deg] drop-shadow-[0_28px_28px_rgba(20,20,40,0.28)] md:w-80 lg:w-96"
            />
          </div>
        </div>
      </section>

      <Section>
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-12 w-2 rounded-full bg-primary" />
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            What To Expect
          </h2>
        </div>
        <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.title}>
              <SurfaceCard className="h-full p-6 shadow-none md:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-soft text-accent-foreground">
                    <step.icon className="size-6" aria-hidden />
                  </span>
                  <h3 className="text-lg font-semibold leading-snug text-foreground">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-foreground/80">
                  {step.text}
                </p>
              </SurfaceCard>
            </li>
          ))}
        </ol>
      </Section>

      <Section className="pt-0">
        <div className="bg-grad-ink rounded-4xl rounded-tr-[8rem] px-6 py-12 text-ink-foreground md:px-12 md:py-16">
          <div className="flex items-center gap-4">
            <span
              aria-hidden
              className="h-10 w-2 rounded-full bg-ink-foreground"
            />
            <h2 className="text-3xl font-bold md:text-4xl">What To Include</h2>
          </div>
          <ul className="mt-8 grid max-w-4xl gap-x-10 gap-y-3 text-sm leading-relaxed text-ink-foreground/85 md:grid-cols-2 md:text-base">
            {GUIDELINES.map((item) => (
              <li key={item} className="list-inside list-disc">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <ProgramFaq items={FAQ} />
      <ProgramDisclosure
        termsPath={STORY_TERMS_PATH}
        termsLabel="Story Program Terms"
      >
        {STORY_COMPENSATION_DISCLOSURE} {STORY_PAGE_FOOTER_DISCLOSURE}{" "}
        {CLINICAL_INDEPENDENCE_NOTE}
      </ProgramDisclosure>
    </MarketingLayout>
  );
}
