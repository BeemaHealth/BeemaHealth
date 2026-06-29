import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { CTA_IDS, qualifyHref } from "@/lib/cta-ids";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Weight Loss", to: "/weight-loss" },
      { label: "Pricing", to: "/pricing" },
      { label: "How it works", to: "/how-it-works" },
    ],
  },
  {
    title: "Trust",
    links: [
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
    <footer className="border-t border-border bg-muted/40">
      <div className="veya-container py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Weight-loss care with real clinicians, clear pricing, and refill
              help that actually follows through.
            </p>
            <Link
              to={qualifyHref(CTA_IDS.footer)}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
            >
              See if you qualify
            </Link>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link
                      to={l.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 space-y-4 border-t border-border pt-8 text-xs leading-relaxed text-muted-foreground">
          <p>
            <strong className="font-semibold text-foreground">
              Important:
            </strong>{" "}
            Aretide is a telehealth platform that connects patients with
            independently licensed clinicians. Completing intake does not
            guarantee a prescription. Clinicians make all medical decisions
            independently.
          </p>
          <p>
            If you are experiencing a medical emergency, call 911. This site
            does not provide emergency care.
          </p>
          <div className="pt-2">
            <span>© {new Date().getFullYear()} Aretide Health, Inc.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
