import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Upload, FileText, Repeat, AlertTriangle } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading, SurfaceCard, Eyebrow } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/switch")({
  head: () => ({
    meta: [
      { title: "Switch to Aretide — Transfer from another provider" },
      {
        name: "description",
        content:
          "Frustrated with Hims, Ro, Noom, WeightWatchers, Medvi, or a local clinic? Transfer your records and get a clear next-step plan. Transfer does not guarantee prescribing.",
      },
      { property: "og:title", content: "Switch to Aretide" },
      { property: "og:description", content: "A switch-and-rescue lane for people frustrated by refill delays and unclear pricing." },
    ],
    links: [{ rel: "canonical", href: "/switch" }],
  }),
  component: SwitchPage,
});

const PROVIDERS = ["Hims/Hers", "Ro", "Noom", "WeightWatchers", "Medvi", "A local clinic", "Another provider"];

const UPLOADS = [
  { icon: FileText, t: "Prescription label", d: "Snap a photo of your current label." },
  { icon: Upload, t: "Lab results", d: "Upload recent labs if you have them." },
  { icon: FileText, t: "Medical records", d: "Any records that help us understand your care." },
  { icon: FileText, t: "Prior authorization docs", d: "If you've already started a PA." },
];

function SwitchPage() {
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <Eyebrow>Switch & rescue lane</Eyebrow>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-tight text-foreground md:text-5xl">
              Switching providers? We'll make it smooth.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              If you're frustrated by refill delays, unclear pricing, or hard-to-reach
              support, tell us where you are now and we'll build a clear transition plan.
            </p>
            <Button asChild size="xl" className="mt-7">
              <Link to="/qualify">
                Start your switch <ArrowRight />
              </Link>
            </Button>
          </div>
          <SurfaceCard>
            <p className="text-sm font-semibold text-foreground">Where are you switching from?</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PROVIDERS.map((p) => (
                <span
                  key={p}
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm text-foreground"
                >
                  <Repeat className="size-3.5 text-primary" /> {p}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm font-semibold text-foreground">We'll ask about</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              {[
                "Current medication & dose",
                "Last injection date",
                "Refill status",
                "Current provider & pharmacy",
                "Insurance",
                "Reason for switching",
              ].map((t) => (
                <li key={t} className="rounded-xl bg-muted px-3 py-2">{t}</li>
              ))}
            </ul>
          </SurfaceCard>
        </div>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Bring your records"
          title="Upload what you have — we'll do the rest"
          description="The more we know, the safer and faster your transition. Don't worry if you're missing something."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {UPLOADS.map((u) => (
            <SurfaceCard key={u.t} className="p-6 text-center">
              <u.icon className="mx-auto size-7 text-primary" />
              <h3 className="mt-3 text-base font-semibold text-foreground">{u.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{u.d}</p>
            </SurfaceCard>
          ))}
        </div>
      </Section>

      <Section className="pt-0">
        <SurfaceCard className="mx-auto max-w-3xl border-warning/40 bg-warning/10">
          <div className="flex gap-4">
            <AlertTriangle className="size-6 shrink-0 text-warning-foreground" />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                A clear next-step plan — not guaranteed medication
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Transferring your records does not guarantee a prescription. A
                licensed clinician independently reviews your history and decides
                what's appropriate. We promise clarity about your options and what
                happens next.
              </p>
            </div>
          </div>
        </SurfaceCard>
      </Section>
    </MarketingLayout>
  );
}
