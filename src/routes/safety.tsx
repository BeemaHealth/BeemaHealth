import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, AlertTriangle, Phone, ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading, SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety & Eligibility — Aretide" },
      {
        name: "description",
        content:
          "Eligibility, contraindications, side effects, and emergency warning signs explained in plain language. Clinicians make independent medical decisions.",
      },
      { property: "og:title", content: "Safety & Eligibility — Aretide" },
      { property: "og:description", content: "Plain-language safety information for weight-management care." },
    ],
    links: [{ rel: "canonical", href: "/safety" }],
  }),
  component: SafetyPage,
});

function SafetyPage() {
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          eyebrow="Safety & eligibility"
          title="Plain-language safety, no fine-print games"
          description="We believe you should understand your care. Here's how eligibility, contraindications, and side effects work — in simple terms."
        />
      </Section>

      <Section className="pt-0">
        <div className="grid gap-6 md:grid-cols-2">
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-foreground">Who may be eligible</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Eligibility depends on your medical history, current health, and a
              clinician's independent evaluation. We'll calculate your BMI during
              intake and ask about conditions that affect safety.
            </p>
          </SurfaceCard>
          <SurfaceCard>
            <h3 className="text-lg font-semibold text-foreground">Common contraindications</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Some histories may make certain medications unsafe — for example a
              personal/family history of medullary thyroid cancer or MEN2,
              pancreatitis, certain gallbladder issues, pregnancy or breastfeeding,
              or a history of eating disorders. Your clinician will review these
              carefully.
            </p>
          </SurfaceCard>
        </div>

        <SurfaceCard className="mt-6">
          <h3 className="text-lg font-semibold text-foreground">Possible side effects</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Common side effects can include nausea, reduced appetite, and digestive
            changes, especially early on. Most are manageable — message your care
            team and we'll help. We track side effects over time so your clinician
            can adjust your plan.
          </p>
        </SurfaceCard>

        <SurfaceCard className="mt-6 border-destructive/40 bg-destructive/5">
          <div className="flex gap-4">
            <AlertTriangle className="size-6 shrink-0 text-destructive" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Emergency warning signs</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Seek emergency care for severe abdominal pain, persistent vomiting,
                signs of an allergic reaction (swelling, trouble breathing), or other
                severe symptoms.
              </p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground">
                <Phone className="size-4" /> If this is an emergency, call 911.
              </p>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className="mt-6 border-primary/30 bg-primary-soft/30">
          <div className="flex gap-4">
            <ShieldCheck className="size-6 shrink-0 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Clinical independence</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Clinical decisions are made independently by licensed providers based
                on a clinical evaluation. Completing intake does not guarantee a
                prescription, and Aretide does not influence medical judgment.
              </p>
            </div>
          </div>
        </SurfaceCard>

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
