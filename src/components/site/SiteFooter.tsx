import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "How it works", to: "/how-it-works" },
      { label: "Pricing", to: "/pricing" },
      { label: "Switch to Aretide", to: "/switch" },
      { label: "Insurance & Pharmacy", to: "/insurance" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "Clinicians", to: "/clinicians" },
      { label: "Safety & eligibility", to: "/safety" },
      { label: "Learn", to: "/learn" },
      { label: "FAQ", to: "/faq" },
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
              Weight-loss care with real clinicians, clear pricing, and refill
              help that actually follows through.
            </p>
            <Link
              to="/qualify"
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
            independently licensed clinicians. Completing intake or transferring
            records does not guarantee a prescription. Clinicians make all
            medical decisions independently based on a clinical evaluation.
            Medication availability, pricing, and insurance coverage vary and are
            not guaranteed.
          </p>
          <p>
            If you are experiencing a medical emergency, call 911. This site does
            not provide emergency care. Aretide does not claim its services are
            equivalent to any specific branded medication.
          </p>
          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <span>© {new Date().getFullYear()} Aretide Health, Inc.</span>
            <div className="flex flex-wrap gap-4">
              <Link to="/legal/privacy" className="hover:text-foreground">
                Privacy Policy
              </Link>
              <Link to="/legal/terms" className="hover:text-foreground">
                Terms of Service
              </Link>
              <Link to="/legal/telehealth-consent" className="hover:text-foreground">
                Telehealth Consent
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
