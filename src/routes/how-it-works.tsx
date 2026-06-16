import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardCheck, Stethoscope, Send } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading, SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  component: HowItWorksPage,
});

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Complete your eligibility check",
    text: "Answer short questions about your health, location, and treatment interest. Colorado patients only.",
  },
  {
    icon: Send,
    title: "Submit your medical intake",
    text: "Create an account and complete a secure medical questionnaire. Save and continue later anytime.",
  },
  {
    icon: Stethoscope,
    title: "Provider review",
    text: "A Colorado-licensed provider reviews your intake and decides whether treatment may be appropriate. Prescribing is never guaranteed.",
  },
];

function HowItWorksPage() {
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          eyebrow="How it works"
          title="A minimal path from intake to provider review"
          description="No subscriptions, refill tracking, or messaging in this MVP — just the essentials."
        />
      </Section>

      <Section className="pt-0">
        <ol className="grid w-full gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="h-full">
              <SurfaceCard className="flex h-full flex-col gap-4 p-6">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <s.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Step {i + 1}</p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </div>
              </SurfaceCard>
            </li>
          ))}
        </ol>
        <div className="mt-10 text-center">
          <Button asChild size="lg">
            <Link to="/qualify">
              Start eligibility check <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>
    </MarketingLayout>
  );
}

/*
 * MVP: removed steps 4–5 from original marketing site:
 * - Pharmacy / insurance rescue desk
 * - Track progress in the app
 */
