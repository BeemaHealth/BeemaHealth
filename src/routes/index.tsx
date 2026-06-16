import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Truck,
  CircleDollarSign,
  ClipboardCheck,
  MessageCircle,
  CheckCircle2,
  Repeat,
} from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { Section, SectionHeading, Eyebrow, SurfaceCard } from "@/components/site/primitives";
import { Button } from "@/components/ui/button";
import { CLINICIANS, FAQ_GROUPS, LAUNCH_STATES } from "@/lib/veya-data";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aretide — Clear, human weight-loss care built around follow-through" },
      {
        name: "description",
        content:
          "Weight-loss care with real clinicians, clear pricing, and refill help that actually follows through. See if you qualify or switch from another provider.",
      },
      { property: "og:title", content: "Aretide — Weight-loss care that's clear and human" },
      {
        property: "og:description",
        content:
          "Real clinicians, clear pricing, and reliable refills. Telehealth weight-management built around trust.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: HomePage,
});

const STEPS = [
  { icon: ClipboardCheck, title: "Complete intake", text: "Answer simple questions online — one at a time, like TurboTax for health." },
  { icon: Stethoscope, title: "Clinician reviews", text: "A licensed clinician independently evaluates whether treatment is appropriate." },
  { icon: CircleDollarSign, title: "Prescription routed", text: "If appropriate, your prescription is routed to the best pharmacy path for you." },
  { icon: Truck, title: "We handle refills", text: "We coordinate pharmacy, insurance, and refills — and follow through." },
];

function HomePage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="bg-grad-hero">
        <div className="veya-container grid items-center gap-12 py-16 md:py-24 lg:grid-cols-2">
          <div>
            <Eyebrow>Telehealth weight care</Eyebrow>
            <h1 className="mt-5 text-balance text-4xl font-bold leading-[1.05] text-foreground md:text-6xl">
              Weight-loss care that's{" "}
              <span className="text-grad-brand">clear, human,</span> and built
              around follow-through.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Real clinicians, pricing you can actually understand, and refill
              help that follows through. No hype, no fake urgency — just calm,
              trustworthy care.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link to="/qualify">
                  See if you qualify <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link to="/switch">
                  <Repeat /> Switch from another provider
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted-foreground">
              {[
                "Real clinician identity",
                "No surprise charges",
                "Reliable refills",
              ].map((t) => (
                <span key={t} className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-primary" /> {t}
                </span>
              ))}
            </div>
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
            <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-border bg-card p-4 shadow-lift sm:block">
              <p className="text-xs font-medium text-muted-foreground">Your clinician</p>
              <p className="mt-1 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <span className="size-2.5 rounded-full bg-success" /> Real, licensed
                & named
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <Section>
        <SectionHeading
          eyebrow="How Aretide works"
          title="Five simple steps, always knowing what's next"
          description="Every screen has one clear next action. You'll never wonder what's happening with your care."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-3 lg:grid-cols-5">
          {STEPS.map((s, i) => (
            <SurfaceCard key={s.title} className="p-6">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
                  <s.icon className="size-5" />
                </span>
                <span className="text-sm font-semibold text-muted-foreground">
                  Step {i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.text}</p>
            </SurfaceCard>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="ghost">
            <Link to="/how-it-works">
              See the full process <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>

      {/* Clear pricing */}
      <Section className="bg-muted/40">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Clear-price promise"
              title="Pricing that's impossible to misunderstand"
              description="Membership and medication are always billed separately. We show shipping, labs, cancellation timing, pause rules, and what's not included — before you ever pay."
            />
            <ul className="mt-8 space-y-3">
              {[
                "Membership and medication shown separately",
                "Pre-bill reminders before every charge",
                "Self-serve pause and cancel — never buried",
                "Email + SMS receipt for every billing change",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-8" size="lg">
              <Link to="/pricing">
                See pricing & calculator <ArrowRight />
              </Link>
            </Button>
          </div>

          <SurfaceCard className="bg-card">
            <p className="text-sm font-medium text-muted-foreground">Sample monthly breakdown</p>
            <div className="mt-5 space-y-3">
              {[
                ["Aretide membership", "$79"],
                ["Medication (varies by path)", "shown before charge"],
                ["Shipping", "$0–$25"],
                ["Labs (if needed)", "billed separately"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3"
                >
                  <span className="text-sm text-foreground">{k}</span>
                  <span className="text-sm font-semibold text-foreground">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
              Not included: medication cost varies by your chosen path. We always
              show your exact charge and next billing date before you pay.
            </p>
          </SurfaceCard>
        </div>
      </Section>

      {/* Real clinicians */}
      <Section>
        <SectionHeading
          eyebrow="Real clinicians"
          title="Care from named, licensed clinicians"
          description="No stock-photo doctors. Real bios, real licensure, and a clear promise: clinical decisions are made independently by licensed providers."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {CLINICIANS.map((c) => (
            <SurfaceCard key={c.id}>
              <div className="flex items-center gap-4">
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-secondary/15 text-lg font-bold text-secondary">
                  {c.initials}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">{c.name}</h3>
                  <p className="text-sm text-muted-foreground">{c.credentials}</p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{c.bio}</p>
              <p className="mt-4 text-xs font-medium text-primary">{c.states}</p>
            </SurfaceCard>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button asChild variant="ghost">
            <Link to="/clinicians">
              Meet the care team <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>

      {/* Refill help */}
      <Section className="bg-primary-soft/30">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <SurfaceCard className="order-2 lg:order-1">
            <p className="text-sm font-medium text-muted-foreground">Refill risk</p>
            <div className="mt-4 space-y-3">
              {[
                ["On track", "23 days remaining", "bg-success"],
                ["Needs action soon", "Insurance check pending", "bg-warning"],
                ["At risk of delay", "Pharmacy out of stock — rerouting", "bg-destructive"],
              ].map(([label, detail, color]) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                >
                  <span className={`size-3 rounded-full ${color}`} />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>
          <div className="order-1 lg:order-2">
            <SectionHeading
              align="left"
              eyebrow="Refill help that follows through"
              title="The refill experience other providers get wrong"
              description="We track days remaining, refill windows, and pharmacy status — and flag refill risk before you run out. If something goes wrong, we open a ticket and escalate."
            />
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Refill-risk alerts (green / yellow / red)",
                "Delayed shipment escalation",
                "Pharmacy transfer & rerouting",
                "Out-of-stock & cold-chain tickets",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Insurance & pharmacy rescue desk */}
      <Section>
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Insurance & pharmacy rescue desk"
              title="Help finding the cheapest, fastest path"
              description="We support insurance routing, cash-pay options, local pickup, and shipping where available — plus prior-authorization help and appeals. We're clear about what we can and can't control."
            />
            <Button asChild className="mt-8" size="lg">
              <Link to="/insurance">
                Explore insurance & pharmacy help <ArrowRight />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: CircleDollarSign, t: "Cash-pay options", d: "When clinically appropriate and permitted." },
              { icon: ShieldCheck, t: "Prior-auth support", d: "We help draft and track PA cases and appeals." },
              { icon: Truck, t: "Shipping or pickup", d: "Cold-chain shipping or local pharmacy pickup." },
              { icon: MessageCircle, t: "Refill escalation", d: "Out-of-stock and delay tickets, handled." },
            ].map((c) => (
              <SurfaceCard key={c.t} className="p-5">
                <c.icon className="size-6 text-primary" />
                <h3 className="mt-3 text-base font-semibold text-foreground">{c.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.d}</p>
              </SurfaceCard>
            ))}
          </div>
        </div>
      </Section>

      {/* Safety & eligibility */}
      <Section className="bg-muted/40">
        <SurfaceCard className="mx-auto max-w-4xl text-center">
          <ShieldCheck className="mx-auto size-10 text-primary" />
          <h2 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">
            Safety comes first, always
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            We explain eligibility, contraindications, and side effects in plain
            language. Clinicians make independent medical decisions, and we never
            imply a guaranteed prescription.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild variant="outline">
              <Link to="/safety">Read safety & eligibility</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/faq">Browse FAQs</Link>
            </Button>
          </div>
        </SurfaceCard>
      </Section>

      {/* App preview */}
      <Section>
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="App preview"
              title="Your whole care experience, calmly organized"
              description="A personalized home, refill countdowns, progress tracking, and secure messaging with your care team — all in one warm, simple app."
            />
            <ul className="mt-8 space-y-3">
              {[
                "Home dashboard with your next action",
                "Refills tab with risk levels and timeline",
                "Progress tracking for weight, habits & side effects",
                "Secure messaging with your care team",
              ].map((t) => (
                <li key={t} className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="mx-auto w-full max-w-[300px]">
            <PhoneMock />
          </div>
        </div>
      </Section>

      {/* FAQ teaser */}
      <Section className="bg-muted/40">
        <SectionHeading
          eyebrow="FAQs"
          title="Answers to the questions people ask most"
        />
        <div className="mx-auto mt-10 grid max-w-3xl gap-4">
          {FAQ_GROUPS.slice(0, 4).map((g) => {
            const item = g.items[0];
            return (
              <SurfaceCard key={g.category} className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {g.category}
                </p>
                <h3 className="mt-2 text-base font-semibold text-foreground">{item.q}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </SurfaceCard>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Button asChild variant="ghost">
            <Link to="/faq">
              See all FAQs <ArrowRight />
            </Link>
          </Button>
        </div>
      </Section>

      {/* Final CTA */}
      <Section>
        <div className="overflow-hidden rounded-4xl bg-primary px-6 py-14 text-center text-primary-foreground md:px-12">
          <h2 className="text-balance text-3xl font-bold md:text-4xl">
            Ready when you are
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/85">
            Check your eligibility in a few minutes. No commitment, no pressure —
            and we currently serve {LAUNCH_STATES.length} states with more on the
            way.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="xl" variant="soft">
              <Link to="/qualify">
                See if you qualify <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              size="xl"
              variant="outline"
              className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/switch">Switch from another provider</Link>
            </Button>
          </div>
        </div>
      </Section>
    </MarketingLayout>
  );
}

function PhoneMock() {
  return (
    <div className="rounded-[2.5rem] border-[10px] border-foreground/90 bg-background p-3 shadow-lift">
      <div className="rounded-[1.8rem] bg-grad-hero p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">Hi, Jordan</span>
          <span className="text-xs text-muted-foreground">Home</span>
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <p className="text-xs font-medium text-muted-foreground">Next action</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            Complete your weekly check-in
          </p>
          <div className="mt-3 h-2 rounded-full bg-muted">
            <div className="h-2 w-2/3 rounded-full bg-primary" />
          </div>
        </div>
        <div className="mt-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Refill</p>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
              <span className="size-2 rounded-full bg-success" /> On track
            </span>
          </div>
          <p className="mt-1 text-sm font-semibold text-foreground">23 days remaining</p>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-soft">
            <p className="text-lg font-bold text-foreground">−8.4</p>
            <p className="text-[10px] text-muted-foreground">lbs in 6 wks</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-soft">
            <p className="text-lg font-bold text-foreground">5 / 7</p>
            <p className="text-[10px] text-muted-foreground">habit streak</p>
          </div>
        </div>
      </div>
    </div>
  );
}
