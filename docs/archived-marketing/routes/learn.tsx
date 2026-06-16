import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading, SurfaceCard } from "@/components/site/primitives";
import { LEARN_POSTS } from "@/lib/veya-data";

export const Route = createFileRoute("/learn")({
  head: () => ({
    meta: [
      { title: "Learn — Weight care education from Aretide" },
      {
        name: "description",
        content:
          "Plain-language guides on GLP-1 basics, insurance, prior authorizations, side effects, protein and strength training, switching providers, and cost.",
      },
      { property: "og:title", content: "Learn — Aretide" },
      { property: "og:description", content: "Trustworthy, judgment-free education about weight-management care." },
    ],
    links: [{ rel: "canonical", href: "/learn" }],
  }),
  component: LearnPage,
});

function LearnPage() {
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          eyebrow="Learn"
          title="Clear, judgment-free education"
          description="No hype, no scare tactics — just useful guides to help you make informed decisions."
        />
      </Section>

      <Section className="pt-0">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {LEARN_POSTS.map((p) => (
            <SurfaceCard key={p.slug} className="flex flex-col">
              <span className="inline-flex w-fit rounded-full bg-primary-soft/60 px-3 py-1 text-xs font-semibold text-primary">
                {p.category}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.excerpt}</p>
              <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="size-3.5" /> {p.readMins} min read
              </p>
            </SurfaceCard>
          ))}
        </div>
        <p className="mt-10 text-center text-sm text-muted-foreground">
          Educational content is for general information only and is not medical
          advice. Talk to your clinician about your specific situation.
        </p>
      </Section>
    </MarketingLayout>
  );
}
