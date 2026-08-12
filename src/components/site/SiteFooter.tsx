import { Phone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/brand/Logo";
import { InfinityMotif } from "@/components/site/primitives";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { FIRST_MONTH_PROMO_LINE } from "@/lib/marketing-copy";
import { dualCompoundedShortPricingLine } from "@/lib/medication-pricing";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_HREF } from "@/lib/contact-info";
import { SOCIAL_LINKS } from "@/lib/social-links";
import { cn } from "@/lib/utils";
import {
  JURISDICTIONAL_NOTICE_BODY,
  JURISDICTIONAL_NOTICE_TITLE,
} from "@/lib/jurisdictional-notice";
import { TRUST_SIGNALS } from "@/lib/trust-signals";

/**
 * Trailing-slash paths - match sitemap.xml / canonicalUrl / GitHub Pages 200
 * URLs. See docs/features/treatment-pages.md for the Care column's link set.
 */
const COLUMNS = [
  {
    title: "Care",
    links: [
      { label: "Weight Loss Program", to: "/weight-loss/" },
      { label: "Compounded Tirzepatide", to: "/tirzepatide/" },
      { label: "Compounded Semaglutide", to: "/semaglutide/" },
      { label: "How it works", to: "/how-it-works/" },
      // { label: "Pricing", to: "/pricing/" }, // disabled - pricing model not finalized yet
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "About Beema Health", to: "/about/" },
      { label: "Safety & eligibility", to: "/safety/" },
      { label: "FAQ", to: "/faq/" },
      { label: "Contact", to: "/contact/" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", to: "/legal/privacy/" },
      { label: "Terms of Service", to: "/legal/terms/" },
      { label: "Refund Policy", to: "/legal/refund/" },
      { label: "Shipping Policy", to: "/legal/shipping/" },
      {
        label: "Physician Code of Conduct",
        to: "/legal/physician-code-of-conduct/",
      },
      { label: "HIPAA Privacy Policy", to: "/legal/hipaa/" },
      { label: "Telehealth Consent", to: "/legal/telehealth-consent/" },
    ],
  },
] as const;

export function SiteFooter() {
  const cta = resolveCta(CTA_IDS.footer);
  return (
    <footer className="bg-grad-ink relative overflow-hidden text-ink-foreground">
      <InfinityMotif className="pointer-events-none absolute -right-16 -top-20 w-80 text-primary/10" />
      <div className="veya-container relative py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <span className="inline-flex rounded-lg bg-white px-3 py-2">
              <Logo className="h-10" />
            </span>
            <p className="mt-4 text-sm leading-relaxed text-ink-foreground/70">
              Weight-loss care guided by independent medical professionals,
              licensed providers, with transparent cash pricing (
              {dualCompoundedShortPricingLine()}), and support designed for
              success.
            </p>
            <Link
              to={cta.to}
              search={cta.search}
              onClick={cta.onClick}
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
            >
              {cta.label}
            </Link>
            <p className="mt-3 text-xs font-medium text-primary">
              Offer: {FIRST_MONTH_PROMO_LINE}
            </p>

            <div className="mt-6 flex items-center gap-5 border-t border-ink-foreground/15 pt-6">
              <a
                href={SUPPORT_PHONE_HREF}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-foreground/80 transition-colors hover:text-ink-foreground"
              >
                <Phone className="size-4" aria-hidden />
                {SUPPORT_PHONE_DISPLAY}
              </a>
              <div className="flex items-center gap-4">
                {SOCIAL_LINKS.map(({ label, href, Icon, colorClassName }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Beema Health on ${label}`}
                    className={cn(
                      "text-ink-foreground/70 transition-all hover:scale-110 hover:text-ink-foreground",
                      colorClassName,
                    )}
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            </div>
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

        <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-ink-foreground/15 pt-8">
          {TRUST_SIGNALS.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 text-xs font-medium text-ink-foreground/70"
            >
              <Icon className="size-4 shrink-0 text-primary" aria-hidden />
              {label}
            </span>
          ))}
        </div>

        <div className="mt-8 space-y-4 border-t border-ink-foreground/15 pt-8 text-xs leading-relaxed text-ink-foreground/60">
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
            <strong className="font-semibold text-ink-foreground/90">
              {JURISDICTIONAL_NOTICE_TITLE}:
            </strong>{" "}
            {JURISDICTIONAL_NOTICE_BODY}
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
