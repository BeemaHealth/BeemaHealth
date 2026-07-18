import { createFileRoute, redirect } from "@tanstack/react-router";
import { canonicalUrl } from "@/lib/seo";

/**
 * Pricing page disabled — the pricing model isn't finalized yet.
 * Original implementation commented out below for easy restoration once
 * real pricing is ready.
 */
export const Route = createFileRoute("/pricing")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});

/*
import { useEffect, useMemo, useState } from "react";
import { trackPageViewed } from "@/lib/analytics";
import { Link } from "@tanstack/react-router";
import { Check, X, ArrowRight, Info } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import {
  Section,
  SectionHeading,
  Eyebrow,
  SurfaceCard,
} from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { CTA_IDS, QUALIFY_PATH, qualifySearch } from "@/lib/cta-ids";
import { cn } from "@/lib/utils";

const headMeta = () => ({
  meta: [
    { title: "Pricing — Beema Health" },
    {
      name: "description",
      content:
        "Medication-only pricing: pay for your prescription when clinically appropriate. Shipping and labs shown separately before any charge.",
    },
    { property: "og:title", content: "Pricing — Beema Health" },
    {
      property: "og:description",
      content:
        "No platform membership fee. Estimate your monthly medication cost.",
    },
  ],
  links: [{ rel: "canonical", href: canonicalUrl("/pricing") }],
});

const MED_PATHS = [
  {
    id: "insurance",
    label: "Insurance (if covered)",
    low: 25,
    high: 75,
    note: "Copay varies by plan; PA may be required.",
  },
  {
    id: "cash",
    label: "Cash-pay option",
    low: 199,
    high: 349,
    note: "When clinically appropriate and permitted.",
  },
  {
    id: "local",
    label: "Local pharmacy pickup",
    low: 60,
    high: 320,
    note: "Depends on stock and your plan.",
  },
] as const;

const SHIPPING = [
  { id: "standard", label: "Standard shipping", cost: 0 },
  { id: "cold", label: "Cold-chain expedited", cost: 25 },
  { id: "pickup", label: "Local pickup", cost: 0 },
] as const;

function PricingPage() {
  useEffect(() => {
    trackPageViewed("pricing");
  }, []);
  const [path, setPath] =
    useState<(typeof MED_PATHS)[number]["id"]>("insurance");
  const [ship, setShip] = useState<(typeof SHIPPING)[number]["id"]>("standard");
  const [labs, setLabs] = useState(false);

  const estimate = useMemo(() => {
    const p = MED_PATHS.find((m) => m.id === path)!;
    const s = SHIPPING.find((x) => x.id === ship)!;
    const labCost = labs ? 75 : 0;
    return {
      low: p.low + s.cost + labCost,
      high: p.high + s.cost + labCost,
      note: p.note,
    };
  }, [path, ship, labs]);

  return (
    <MarketingLayout>
      <Section className="bg-grad-hero">
        <SectionHeading
          as="h1"
          eyebrow="Clear-price promise"
          title="Pricing you can actually understand"
          description="No platform membership fee. You pay for medication when prescribed — plus shipping or labs only when they apply, always shown before you pay."
        />
      </Section>

      <Section className="pt-0">
        <div className="grid gap-6 lg:grid-cols-2">
          <SurfaceCard>
            <Eyebrow>Medication-only pricing</Eyebrow>
            <p className="mt-5 text-2xl font-bold text-foreground">
              Pay for your medication. That's it.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Beema Health does not charge a separate monthly membership or
              subscription fee. Your cost is the medication your clinician
              prescribes, if appropriate.
            </p>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <div>
                <p className="text-sm font-semibold text-foreground">
                  What you pay for
                </p>
                <ul className="mt-3 space-y-2 text-sm text-foreground">
                  {[
                    "Prescribed medication (per fill or month)",
                    "Cash-pay, insurance copay, or pharmacy pricing — your path",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-success" />{" "}
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  May be billed separately
                </p>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {[
                    "Shipping (if home delivery)",
                    "Lab work (only if clinically needed)",
                    "Insurance deductibles or uncovered costs",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <X className="mt-0.5 size-4 shrink-0 text-muted-foreground" />{" "}
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className="bg-card">
            <Eyebrow>Estimate your monthly cost</Eyebrow>
            <p className="mt-4 text-sm font-semibold text-foreground">
              Medication path
            </p>
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
                  <span>
                    ${m.low}–${m.high}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-5 text-sm font-semibold text-foreground">
              Delivery
            </p>
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
              <span className="text-sm text-foreground">
                Add lab work (if needed)
              </span>
              <input
                type="checkbox"
                checked={labs}
                onChange={(e) => setLabs(e.target.checked)}
                className="size-5 accent-[var(--color-primary)]"
              />
            </label>

            <div className="mt-6 rounded-2xl bg-primary px-5 py-5 text-primary-foreground">
              <p className="text-xs uppercase tracking-wide text-primary-foreground/80">
                Estimated medication cost / month
              </p>
              <p className="mt-1 text-3xl font-bold">
                ${estimate.low}–${estimate.high}
              </p>
              <p className="mt-2 text-xs text-primary-foreground/85">
                {estimate.note}
              </p>
            </div>
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Estimates only. No platform membership fee. Your exact medication
              charge is always shown before you pay. Prescribing is never
              guaranteed.
            </p>
          </SurfaceCard>
        </div>
      </Section>

      <Section className="bg-muted/40 pt-0">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              t: "Transparent pricing",
              d: "Medication, shipping, and labs are listed separately. You see the full breakdown before confirming any charge.",
            },
            {
              t: "Refill billing",
              d: "Each refill is billed at the medication price shown for your plan and pharmacy path — no hidden platform fees on top.",
            },
            {
              t: "Pre-charge reminders",
              d: "We remind you before every medication charge and send a receipt for every payment.",
            },
          ].map((c) => (
            <SurfaceCard key={c.t}>
              <h3 className="text-lg font-semibold text-foreground">{c.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {c.d}
              </p>
            </SurfaceCard>
          ))}
        </div>
        <SurfaceCard className="mt-6">
          <h3 className="text-base font-semibold text-foreground">
            Shipping, labs & insurance caveats
          </h3>
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
          <h2 className="text-2xl font-bold md:text-3xl">
            No surprises. Ever.
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-primary-foreground/85">
            Start with a quick eligibility check — you'll see medication pricing
            before paying anything.
          </p>
          <Button
            asChild
            size="xl"
            className="mt-6 bg-ink text-ink-foreground hover:bg-ink/85"
          >
            <Link to={QUALIFY_PATH} search={qualifySearch(CTA_IDS.pricing_footer)}>
              See if you qualify <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>
    </MarketingLayout>
  );
}
*/
