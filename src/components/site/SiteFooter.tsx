import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

const COLUMNS = [
  {
    title: "MVP",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "Eligibility check", to: "/qualify" },
      { label: "Patient dashboard", to: "/dashboard" },
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
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Colorado-first telehealth medical weight-loss intake for provider review.
            </p>
            <Link
              to="/qualify"
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
            >
              Start eligibility check
            </Link>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold text-foreground">{col.title}</h4>
              <ul className="mt-4 space-y-3">
                {col.links.map((l) => (
                  <li key={l.to}>
                    <Link to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
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
            <strong className="font-semibold text-foreground">Important:</strong>{" "}
            Completing intake does not guarantee a prescription. Clinicians make all
            medical decisions independently. This MVP prototype is not HIPAA-compliant
            production infrastructure.
          </p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Aretide Health, Inc.</span>
            <Link to="/admin" className="hover:text-foreground">Provider admin (prototype)</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/*
 * MVP: removed footer links:
 * - Pricing, Switch to Aretide, Insurance & Pharmacy
 * - Clinicians, Safety, Learn, FAQ
 */
