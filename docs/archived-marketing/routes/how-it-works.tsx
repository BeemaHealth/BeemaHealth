import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardCheck, Stethoscope, Send, Truck, LineChart } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading, SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How it works — Aretide" },
      {
        name: "description",
        content:
          "Five clear steps: complete online intake, a licensed clinician reviews, prescription is routed if appropriate, and Aretide handles pharmacy, insurance, and refills.",
      },
      { property: "og:title", content: "How Aretide works" },
      { property: "og:description", content: "From intake to refills — calm, clear, and always knowing what's next." },
    ],
    links: [{ rel: "canonical", href: "/how-it-works" }],
  }),
  component: HowItWorksPage,
});

const STEPS = [
  { icon: ClipboardCheck, title: "Complete online health intake", text: "Answer simple questions one at a time — like TurboTax for healthcare. Upload any records or labs you already have." },
  { icon: Stethoscope, title: "A licensed clinician reviews", text: "A named, licensed clinician independently evaluates your intake and may message you with follow-up questions." },
  { icon: Send, title: "If appropriate, prescription is routed", text: "When clinically appropriate, your prescription is routed to the pharmacy path that works best for you. Prescribing is never guaranteed." },
  { icon: Truck, title: "We help with pharmacy, insurance & refills", text: "Our rescue desk handles routing, prior-auth support, refill timing, and shipping or local pickup." },
  { icon: LineChart, title: "Track progress in the app", text: "Log weight, habits, and side effects, complete weekly check-ins, and stay in touch with your care team." },
];

function HowItWorksPage() {
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          eyebrow="How it works"
          title="A calm, clear path from intake to refills"
          description="Every step has one clear next action and shows you what happens next. No mazes, no guessing."
        />
      </Section>

      <Section className="pt-0">
        <ol className="mx-auto max-w-3xl space-y-5">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <SurfaceCard className="flex gap-5">
                <div className="flex flex-col items-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
                    <s.icon className="size-5" />
                  </span>
                  {i < STEPS.length - 1 && (
                    <span className="mt-2 h-full w-px flex-1 bg-border" />
                  )}
                </div>
                <div className="pb-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                    Step {i + 1}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-foreground">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
                </div>
              </SurfaceCard>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="xl">
            <Link to="/qualify">
              See if you qualify <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="xl" variant="outline">
            <Link to="/pricing">See clear pricing</Link>
          </Button>
        </div>
      </Section>
    </MarketingLayout>
  );
}
