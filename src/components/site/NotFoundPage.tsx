import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { MarketingLayout } from "@/components/site/MarketingLayout";
import { trackPageViewed } from "@/lib/analytics";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";
import { NOT_FOUND_LINKS } from "@/lib/not-found";

export function NotFoundPage() {
  const cta = resolveCta(CTA_IDS.not_found);

  useEffect(() => {
    trackPageViewed("not_found");
  }, []);

  return (
    <MarketingLayout>
      {/* React 19 hoists this into <head>; keeps error URLs out of the index. */}
      <meta name="robots" content="noindex" />
      <section className="bg-grad-hero py-20 md:py-32">
        <div className="veya-container">
          <div className="mx-auto max-w-2xl text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p
              aria-hidden
              className="text-8xl font-bold tracking-tight text-primary/20 md:text-9xl"
            >
              404
            </p>
            <h1 className="mt-2 text-balance text-4xl font-bold leading-tight text-foreground md:text-5xl">
              We couldn't find that page
            </h1>
            <p className="mt-5 text-pretty text-lg leading-relaxed text-muted-foreground">
              The link may be out of date or mistyped. Here are a few places to
              pick back up with Beema Health.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/"
                className="inline-flex cursor-pointer items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Go home
              </Link>
              <a
                href={cta.to}
                onClick={cta.onClick}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                {cta.label}
                <ArrowRight className="size-4" aria-hidden />
              </a>
            </div>

            <nav aria-label="Popular pages" className="mt-12">
              <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm">
                {NOT_FOUND_LINKS.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
