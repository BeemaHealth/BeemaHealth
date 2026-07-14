import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { InfinityMotif } from "@/components/site/primitives";
import { CTA_IDS, qualifyHref } from "@/lib/cta-ids";

const COLUMNS = [
  {
    title: "Care",
    links: [
      { label: "Weight Loss", to: "/weight-loss" },
      { label: "How it works", to: "/how-it-works" },
      // { label: "Pricing", to: "/pricing" }, // disabled — pricing model not finalized yet
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "About Beema Health", to: "/about" },
      { label: "Safety & eligibility", to: "/safety" },
      { label: "FAQ", to: "/faq" },
      { label: "Contact", to: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/legal/privacy" },
      { label: "Terms of Service", to: "/legal/terms" },
      { label: "Telehealth Consent", to: "/legal/telehealth-consent" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-grad-ink relative overflow-hidden text-ink-foreground">
      <InfinityMotif className="pointer-events-none absolute -right-16 -top-20 w-80 text-primary/10" />
      <div className="veya-container relative py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo className="h-10" tone="ink" />
            <p className="mt-4 text-sm leading-relaxed text-ink-foreground/70">
              Weight-loss care guided by independent medical professionals,
              licensed providers, with transparent pricing, and support designed
              for success.
            </p>
            <Link
              to={qualifyHref(CTA_IDS.footer)}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
            >
              See if you qualify
            </Link>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold uppercase tracking-wide text-primary">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="inline-flex min-h-11 items-center text-sm text-ink-foreground/70 transition-colors hover:text-ink-foreground md:min-h-0"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-4 border-t border-ink-foreground/15 pt-8 text-xs leading-relaxed text-ink-foreground/60">
          <p>
            <strong className="font-semibold text-ink-foreground/90">
              Important:
            </strong>{" "}
            Beema Health is a telehealth platform that connects patients with
            independently licensed clinicians. Completing intake does not
            guarantee a prescription. Clinicians make all medical decisions
            independently.
          </p>
          <p>
            If you are experiencing a medical emergency, call 911. This site
            does not provide emergency care.
          </p>
          <div className="pt-2">
            <span>© {new Date().getFullYear()} Beema Health</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
