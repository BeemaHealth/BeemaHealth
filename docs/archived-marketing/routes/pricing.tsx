import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, X, ArrowRight, Info } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading, Eyebrow, SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Aretide" },
      {
        name: "description",
        content:
          "Clear, separate pricing: $79/month membership plus medication, shipping, and labs shown before any charge. Self-serve pause and cancel.",
      },
      { property: "og:title", content: "Pricing — Aretide" },
      {
        property: "og:description",
        content: "Membership and medication billed separately. No hidden fees. Estimate your cost.",
      },
    ],
    links: [{ rel: "canonical", href: "/pricing" }],
  }),
  component: PricingPage,
});

const MEMBERSHIP = 79;

const MED_PATHS = [
  { id: "insurance", label: "Insurance (if covered)", low: 25, high: 75, note: "Copay varies by plan; PA may be required." },
  { id: "cash", label: "Cash-pay option", low: 199, high: 349, note: "When clinically appropriate and permitted." },
  { id: "local", label: "Local pharmacy pickup", low: 60, high: 320, note: "Depends on stock and your plan." },
] as const;

const SHIPPING = [
  { id: "standard", label: "Standard shipping", cost: 0 },
  { id: "cold", label: "Cold-chain expedited", cost: 25 },
  { id: "pickup", label: "Local pickup", cost: 0 },
] as const;

function PricingPage() {
  const [path, setPath] = useState<(typeof MED_PATHS)[number]["id"]>("insurance");
  const [ship, setShip] = useState<(typeof SHIPPING)[number]["id"]>("standard");
  const [labs, setLabs] = useState(false);

  const estimate = useMemo(() => {
    const p = MED_PATHS.find((m) => m.id === path)!;
    const s = SHIPPING.find((x) => x.id === ship)!;
    const labCost = labs ? 75 : 0;
    return {
      low: MEMBERSHIP + p.low + s.cost + labCost,
      high: MEMBERSHIP + p.high + s.cost + labCost,
      note: p.note,
    };
  }, [path, ship, labs]);

  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          eyebrow="Clear-price promise"
          title="Pricing you can actually understand"
          description="Membership and medication are always billed separately. We show shipping, labs, and what's not included — and remind you before every charge."
        />
      </Section>

      <Section className="pt-0">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Membership */}
          <SurfaceCard>
            <Eyebrow>Membership</Eyebrow>
            <div className="mt-5 flex items-end gap-2">
              <span className="text-5xl font-bold text-foreground">${MEMBERSHIP}</span>
              <span className="pb-2 text-muted-foreground">/ month</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Cancel or pause anytime — self-serve, never buried.
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-foreground">What's included</p>
                <ul className="mt-3 space-y-2 text-sm text-foreground">
                  {[
                    "Licensed clinician evaluation",
                    "Secure messaging with care team",
                    "Refill coordination & risk alerts",
                    "Insurance & pharmacy rescue desk",
                    "Progress tracking & check-ins",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">What's not included</p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {[
                    "Medication cost (billed separately)",
                    "Shipping fees (if any)",
                    "Lab work (if needed)",
                    "Insurance copays",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SurfaceCard>

          {/* Calculator */}
          <SurfaceCard className="bg-card">
            <Eyebrow>Estimate your monthly cost</Eyebrow>
            <p className="mt-4 text-sm font-semibold text-foreground">Medication path</p>
            <div className="mt-2 grid gap-2">
              {MED_PATHS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setPath(m.id)}
                  className={cn(
                    "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors",
                    path === m.id
                      ? "border-primary bg-primary-soft/50 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span className="font-medium text-foreground">{m.label}</span>
                  <span>${m.low}–${m.high}</span>
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm font-semibold text-foreground">Delivery</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {SHIPPING.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setShip(s.id)}
                  className={cn(
                    "rounded-2xl border px-3 py-2 text-xs font-medium transition-colors",
                    ship === s.id
                      ? "border-primary bg-primary-soft/50 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {s.label}
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {s.cost === 0 ? "Free" : `$${s.cost}`}
                  </span>
                </button>
              ))}
            </div>

            <label className="mt-5 flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3">
              <span className="text-sm text-foreground">Add lab work (if needed)</span>
              <input
                type="checkbox"
                checked={labs}
                onChange={(e) => setLabs(e.target.checked)}
                className="size-5 accent-[var(--color-primary)]"
              />
            </label>

            <div className="mt-6 rounded-2xl bg-primary px-5 py-5 text-primary-foreground">
              <p className="text-xs uppercase tracking-wide text-primary-foreground/80">
                Estimated total / month
              </p>
              <p className="mt-1 text-3xl font-bold">
                ${estimate.low}–${estimate.high}
              </p>
              <p className="mt-2 text-xs text-primary-foreground/85">{estimate.note}</p>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Estimates only. Your exact charge and next billing date are always
              shown before you pay. Prescribing is never guaranteed.
            </p>
          </SurfaceCard>
        </div>
      </Section>

      {/* Cancellation & pause */}
      <Section className="bg-muted/40 pt-0">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { t: "Cancellation", d: "Cancel anytime in the app. You'll see exactly when access ends and your next billing date, then confirm. We email and text a receipt." },
            { t: "Pause rules", d: "Pause your membership and we show a clear resume date. No phone calls and no retention mazes." },
            { t: "Pre-bill reminders", d: "We remind you before every charge and send a confirmation receipt for every billing change." },
          ].map((c) => (
            <SurfaceCard key={c.t}>
              <h3 className="text-lg font-semibold text-foreground">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c.d}</p>
            </SurfaceCard>
          ))}
        </div>
        <SurfaceCard className="mt-6">
          <h3 className="text-base font-semibold text-foreground">Shipping, labs & insurance caveats</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Shipping costs depend on your delivery choice and location. Labs are
            only billed when clinically needed, and the cost is shown before you
            agree. Insurance coverage, copays, and prior-authorization outcomes
            are determined by your plan — we help you navigate them but can't
            guarantee coverage.
          </p>
        </SurfaceCard>
      </Section>

      <Section className="pt-0">
        <div className="rounded-4xl bg-primary px-6 py-12 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold md:text-3xl">No surprises. Ever.</h2>
          <p className="mx-auto mt-2 max-w-lg text-primary-foreground/85">
            Start with a quick eligibility check — you'll see your full breakdown
            before paying anything.
          </p>
          <Button asChild size="xl" variant="soft" className="mt-6">
            <Link to="/qualify">
              See if you qualify <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>
    </MarketingLayout>
  );
}
