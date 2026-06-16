import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading, SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { PHARMACY_PARTNERS } from "@/lib/veya-data";

export const Route = createFileRoute("/insurance")({
  head: () => ({
    meta: [
      { title: "Insurance & Pharmacy Help — Aretide" },
      {
        name: "description",
        content:
          "Prior-authorization support, local pharmacy routing, stock checks, and refill escalation. We're clear about what Aretide can and cannot control.",
      },
      { property: "og:title", content: "Insurance & Pharmacy Help — Aretide" },
      { property: "og:description", content: "Find the cheapest, fastest path to your medication." },
    ],
    links: [{ rel: "canonical", href: "/insurance" }],
  }),
  component: InsurancePage,
});

const HELP = [
  { t: "Prior authorization support", d: "We help draft PA notes, submit, track status, and support appeals when a claim is denied." },
  { t: "Local pharmacy routing", d: "We route your prescription to a pharmacy that can actually fill it — including local pickup where available." },
  { t: "Stock checks", d: "We check availability before routing, so you're less likely to hit an out-of-stock wall." },
  { t: "Refill escalation", d: "Delayed, lost, or cold-chain-compromised shipments get a ticket and an escalation, fast." },
];

function InsurancePage() {
  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          eyebrow="Insurance & pharmacy rescue desk"
          title="The cheapest, fastest path to your medication"
          description="Insurance and pharmacies are confusing. We help you navigate them with branded-med support, insurance routing, cash-pay options, and refill-risk alerts."
        />
      </Section>

      <Section className="pt-0">
        <div className="grid gap-5 sm:grid-cols-2">
          {HELP.map((h) => (
            <SurfaceCard key={h.t}>
              <h3 className="text-lg font-semibold text-foreground">{h.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{h.d}</p>
            </SurfaceCard>
          ))}
        </div>
      </Section>

      <Section className="bg-muted/40">
        <SectionHeading
          eyebrow="Pharmacy partners"
          title="Disclosed partners, clear capabilities"
          description="We tell you who fills your medication and what each partner supports."
        />
        <div className="mt-10 overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          <div className="grid grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] gap-2 border-b border-border bg-muted/60 px-5 py-3 text-xs font-semibold text-muted-foreground">
            <span>Partner</span>
            <span className="text-center">Shipping</span>
            <span className="text-center">Pickup</span>
            <span className="text-center">Insurance</span>
            <span className="text-center">Cash-pay</span>
          </div>
          {PHARMACY_PARTNERS.map((p) => (
            <div
              key={p.name}
              className="grid grid-cols-[1.5fr_repeat(4,minmax(0,1fr))] items-center gap-2 border-b border-border px-5 py-4 last:border-0"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.detail}</p>
              </div>
              {[p.shipping, p.pickup, p.insurance, p.cashPay].map((v, i) => (
                <span key={i} className="flex justify-center">
                  {v ? (
                    <Check className="size-5 text-success" />
                  ) : (
                    <X className="size-5 text-muted-foreground/50" />
                  )}
                </span>
              ))}
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <SurfaceCard className="border-success/30 bg-success/5">
            <h3 className="text-lg font-semibold text-foreground">What Aretide can do</h3>
            <ul className="mt-4 space-y-2 text-sm text-foreground">
              {[
                "Help find cheaper or faster medication paths",
                "Support prior authorizations and appeals",
                "Route prescriptions and check stock",
                "Open and escalate refill/shipping tickets",
                "Track refill risk and warn you early",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <Check className="mt-0.5 size-4 shrink-0 text-success" /> {t}
                </li>
              ))}
            </ul>
          </SurfaceCard>
          <SurfaceCard className="border-border bg-muted/30">
            <h3 className="text-lg font-semibold text-foreground">What Aretide can't control</h3>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {[
                "Whether your insurance covers a medication",
                "Final prior-authorization decisions by your plan",
                "Manufacturer-wide medication shortages",
                "Pharmacy pricing set by third parties",
                "Guaranteeing a prescription",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {t}
                </li>
              ))}
            </ul>
          </SurfaceCard>
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="xl">
            <Link to="/qualify">
              Get insurance help <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>
    </MarketingLayout>
  );
}
