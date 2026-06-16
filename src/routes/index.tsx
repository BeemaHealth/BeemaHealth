import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ClipboardCheck, Stethoscope, Send } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { TreatmentLineup } from "@/components/site/TreatmentLineup";
import { Section, SectionHeading, SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aretide — Colorado medical weight-loss care" },
      {
        name: "description",
        content:
          "Colorado medical weight-loss care reviewed by a licensed provider. Secure intake for Zepbound, Wegovy, and affordable alternatives when appropriate.",
      },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Complete your eligibility check",
    text: "Answer a short set of questions to see if Aretide may be a fit.",
  },
  {
    icon: Send,
    title: "Submit your medical intake",
    text: "Complete a secure medical questionnaire for provider review.",
  },
  {
    icon: Stethoscope,
    title: "A Colorado-licensed provider reviews",
    text: "A licensed provider reviews your information and decides next steps. No prescription is guaranteed.",
  },
];

function HomePage() {
  return (
    <MarketingLayout>
      <section className="bg-grad-hero">
        <div className="veya-container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2">
          <div>
            <h1 className="text-balance text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Colorado medical weight-loss care, reviewed by a licensed provider.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Aretide helps eligible Colorado patients complete a secure medical intake
              for provider-reviewed weight-loss treatment options, including Zepbound,
              Wegovy, and affordable alternatives when appropriate.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link to="/qualify">
                  Start Eligibility Check <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <a href="#how-it-works">Learn How It Works</a>
              </Button>
            </div>
            <p className="mt-6 max-w-xl text-sm text-muted-foreground">
              Completing an intake does not guarantee a prescription. Treatment decisions
              are made only by a licensed medical provider.
            </p>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-4xl border border-border bg-card shadow-lift">
              <img
                src={heroImg}
                alt="A calm, bright kitchen with fresh vegetables and a glass of water"
                width={1280}
                height={1024}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <Section id="how-it-works">
        <SectionHeading
          eyebrow="How it works"
          title="Three simple steps"
          description="A minimal path from eligibility to provider review."
        />
        <div className="mt-12 grid w-full gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <SurfaceCard key={s.title} className="flex h-full flex-col p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <s.icon className="size-5" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">Step {i + 1}</span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </SurfaceCard>
          ))}
        </div>
      </Section>

      <TreatmentLineup />

      <Section>
        <div className="overflow-hidden rounded-4xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
          <h2 className="text-3xl font-bold">Ready to start?</h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Colorado patients only for this MVP. The eligibility check takes about 5 minutes.
          </p>
          <Button
            asChild
            size="xl"
            className="mt-8 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <Link to="/qualify">
              Start Eligibility Check <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>
    </MarketingLayout>
  );
}
