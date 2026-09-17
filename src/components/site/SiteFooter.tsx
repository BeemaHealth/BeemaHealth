import { useState } from "react";
import { Phone } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { HeaderLogo } from "@/components/brand/Logo";
import { HoverLiftButton, InfinityMotif } from "@/components/site/primitives";
import { GetStartedModal } from "@/components/site/GetStartedModal";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { FIRST_MONTH_PROMO_LINE } from "@/lib/marketing-copy";
import { dualCompoundedShortPricingLine } from "@/lib/medication-pricing";
import { SUPPORT_PHONE_DISPLAY, SUPPORT_PHONE_HREF } from "@/lib/contact-info";
import {
  GOOGLE_REVIEW_LINK_LABEL,
  GOOGLE_REVIEW_URL,
} from "@/lib/google-business";
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
 * Resources is the care-process overview plus the free content library
 * (how it works, recipes, learn; videos later).
 * Trust also has one external Google review link (`href`, not `to`).
 *
 * Care column is grouped by category (2026-08-27), each category's hub page
 * first followed by its specific medication pages - mirrors the header's
 * Weight Loss / Sexual Health / Hair dropdowns. Hub pages (`/weight-loss`,
 * `/sexual-health`, `/hair-loss`) live only here in the footer, not in the
 * header dropdowns - see SiteHeader.tsx. NAD+ (2026-09-16) and Sermorelin
 * (2026-09-17) relaunched with their own header Wellness dropdown (see
 * SiteHeader.tsx) but, like every other individual money page, stay out of
 * this column - see "Money-page architecture" in
 * docs/features/treatment-pages.md. TRT and the Wellness hub (`/wellness`)
 * remain paused.
 *
 * Money-page architecture (2026-09-03): unlike Weight Loss, the ED and Hair
 * Loss rows deliberately do NOT also list every individual money page
 * (Tadalafil, Sildenafil, ED Mints, Oral Finasteride) here - that would
 * duplicate what the header's Sexual Health / Hair dropdowns already expose
 * and bloat this column. `/ed` (overview page) and `/hair-loss` (hub -
 * `/hair` and `/hairloss` merged into one page, 2026-09-04, neither had
 * shipped to production) stay the footer entry point for that category; the
 * header dropdown is where visitors reach the specific product pages
 * directly.
 */
const COLUMNS = [
  {
    title: "Care",
    links: [
      { label: "Weight Loss Program", to: "/weight-loss/" },
      { label: "Compounded Tirzepatide", to: "/tirzepatide/" },
      { label: "Compounded Semaglutide", to: "/semaglutide/" },
      { label: "GLP-1 Care", to: "/glp-1/" },
      { label: "Sexual Health", to: "/sexual-health/" },
      { label: "ED Treatment", to: "/ed/" },
      { label: "Hair Loss Care", to: "/hair-loss/" },
      // TRT and the Wellness hub are paused - not linked anywhere while
      // inaccessible. NAD+ and Sermorelin relaunched via the header's
      // Wellness dropdown instead (see SiteHeader.tsx), not here - see
      // docs/features/treatment-pages.md.
      // { label: "Pricing", to: "/pricing/" }, // disabled - pricing model not finalized yet
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "How it works", to: "/how-it-works/" },
      { label: "Recipes", to: "/recipes/" },
      { label: "Learn", to: "/learn/" },
    ],
  },
  {
    title: "Trust",
    links: [
      { label: "About us", to: "/about/" },
      { label: "Safety & eligibility", to: "/safety/" },
      { label: "FAQ", to: "/faq/" },
      { label: "Contact us", to: "/contact/" },
      { label: GOOGLE_REVIEW_LINK_LABEL, href: GOOGLE_REVIEW_URL },
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
  const [getStartedOpen, setGetStartedOpen] = useState(false);
  return (
    <footer className="bg-grad-ink relative overflow-hidden text-ink-foreground">
      <GetStartedModal open={getStartedOpen} onOpenChange={setGetStartedOpen} />
      <InfinityMotif className="pointer-events-none absolute -right-16 -top-20 w-80 text-primary/10" />
      <div className="veya-container relative py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <div className="max-w-sm">
            <span className="inline-flex rounded-lg bg-white px-3 py-2">
              <HeaderLogo className="h-10" />
            </span>
            <p className="mt-4 text-sm leading-relaxed text-ink-foreground/70">
              Weight-loss care guided by independent medical professionals,
              503A-licensed pharmacies, with transparent cash pricing (
              {dualCompoundedShortPricingLine()}), and support designed for
              success.
            </p>
            <HoverLiftButton className="mt-6 block">
              <button
                type="button"
                onClick={() => setGetStartedOpen(true)}
                className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
              >
                {cta.label}
              </button>
            </HoverLiftButton>
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
                  <li key={"href" in l ? l.href : l.to}>
                    {"href" in l ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 items-center text-sm text-ink-foreground/70 transition-colors hover:text-ink-foreground md:min-h-0"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        to={l.to}
                        className="inline-flex min-h-11 items-center text-sm text-ink-foreground/70 transition-colors hover:text-ink-foreground md:min-h-0"
                      >
                        {l.label}
                      </Link>
                    )}
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
