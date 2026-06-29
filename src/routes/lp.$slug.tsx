import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  createFunnelSession,
  fetchLandingPage,
  type LandingPageItem,
} from "@/lib/api/client";
import { storePendingUtms } from "@/lib/utm";
import { trackPageViewed } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { CTA_IDS, qualifyHref } from "@/lib/cta-ids";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/lp/$slug")({
  component: LandingPageRoute,
});

function LandingPageRoute() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState<LandingPageItem | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let trackingTimer: ReturnType<typeof setTimeout> | null = null;

    fetchLandingPage(slug)
      .then((data) => {
        if (cancelled) return;
        setPage(data);

        const utms = {
          utm_source: data.utm_source,
          utm_medium: data.utm_medium,
          utm_campaign: data.utm_campaign,
          utm_content: data.utm_content,
          landing_page_slug: data.slug,
        };
        storePendingUtms(utms);

        trackingTimer = setTimeout(() => {
          if (cancelled) return;
          console.log("[aretide] creating funnel session", { slug: data.slug });
          createFunnelSession(utms)
            .then(() => {
              console.log("[aretide] funnel session ready");
              if (!cancelled) {
                trackPageViewed("landing_page", {
                  landing_page_slug: data.slug,
                });
                console.log("[aretide] page_viewed event fired");
                if (data.redirect_to_home) void navigate({ to: "/" });
              }
            })
            .catch((err: unknown) => {
              console.error("[aretide] funnel session creation failed:", err);
              if (!cancelled) {
                trackPageViewed("landing_page", {
                  landing_page_slug: data.slug,
                });
                if (data.redirect_to_home) void navigate({ to: "/" });
              }
            });
        }, 0);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });

    return () => {
      cancelled = true;
      if (trackingTimer) clearTimeout(trackingTimer);
    };
  }, [slug]);

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-bold text-foreground">404</h1>
          <p className="mt-2 text-muted-foreground">This page doesn't exist.</p>
          <Button asChild className="mt-6">
            <Link to="/">Go home</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal nav — no distractions on a landing page */}
      <header className="border-b border-border bg-background px-6 py-4">
        <Link to="/" className="text-xl font-bold text-foreground">
          Aretide
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        {page.headline ? (
          <h1 className="text-balance text-4xl font-bold leading-tight text-foreground md:text-5xl">
            {page.headline}
          </h1>
        ) : (
          <h1 className="text-balance text-4xl font-bold leading-tight text-foreground md:text-5xl">
            Clear, human weight-loss care
          </h1>
        )}

        {page.subheadline && (
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            {page.subheadline}
          </p>
        )}

        <Button
          size="lg"
          className="mt-10"
          onClick={() =>
            void navigate({ to: qualifyHref(CTA_IDS.landing_page) })
          }
        >
          Get started
        </Button>

        <p className="mt-4 text-xs text-muted-foreground">
          No commitment. See if you qualify in minutes.
        </p>
      </main>
    </div>
  );
}
