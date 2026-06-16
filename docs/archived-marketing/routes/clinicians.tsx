import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, MapPin, ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading, SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { CLINICIANS, LAUNCH_STATES } from "@/lib/veya-data";

export const Route = createFileRoute("/clinicians")({
  head: () => ({
    meta: [
      { title: "Our Clinicians — Aretide" },
      {
        name: "description",
        content:
          "Meet Aretide's named, licensed clinicians. Real bios, licensure coverage, and clinical independence — no stock-photo doctors.",
      },
      { property: "og:title", content: "Our Clinicians — Aretide" },
      { property: "og:description", content: "Real clinician identity and independent medical decision-making." },
    ],
    links: [{ rel: "canonical", href: "/clinicians" }],
  }),
  component: CliniciansPage,
});

function CliniciansPage() {
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          eyebrow="Real clinicians"
          title="Care from named, licensed providers"
          description="We show you who you're working with. No fake doctor imagery, no anonymous care."
        />
      </Section>

      <Section className="pt-0">
        <div className="grid gap-6 md:grid-cols-3">
          {CLINICIANS.map((c) => (
            <SurfaceCard key={c.id}>
              <div className="flex items-center gap-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-secondary/15 text-xl font-bold text-secondary">
                  {c.initials}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">{c.credentials}</p>
                  <p className="text-xs font-medium text-primary">{c.role}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.bio}</p>
              <p className="mt-4 flex items-center gap-2 text-xs font-medium text-foreground">
                <MapPin className="size-3.5 text-primary" /> {c.states}
              </p>
              <p className="mt-4 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                Typical message response: within 1 business day.
              </p>
            </SurfaceCard>
          ))}
        </div>
      </Section>

      <Section className="bg-muted/40">
        <div className="grid gap-6 md:grid-cols-2">
          <SurfaceCard className="border-primary/30 bg-primary-soft/30">
            <ShieldCheck className="size-7 text-primary" />
            <h3 className="mt-3 text-lg font-semibold text-foreground">Clinical independence</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Clinical decisions are made independently by licensed providers. Aretide
              supports clinicians with tools and coordination, but never directs
              medical judgment, and AI never makes clinical decisions.
            </p>
          </SurfaceCard>
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-foreground">Licensure coverage</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Our clinicians are licensed across our launch states. We match you to
              a clinician licensed in your state.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {LAUNCH_STATES.map((s) => (
                <span key={s} className="rounded-full bg-background px-3 py-1 text-xs text-foreground">
                  {s}
                </span>
              ))}
            </div>
          </SurfaceCard>
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="xl">
            <Link to="/qualify">
              See if you qualify <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>
    </MarketingLayout>
  );
}
