import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { capturePageUtms } from "@/lib/utm";
import { initAdPixels } from "@/lib/ad-conversions";
import {
  GOOGLE_ADS_HEAD_SCRIPT,
  GTM_CONTAINER_ID,
  GTM_HEAD_SCRIPT,
} from "@/lib/gtm";
import { absoluteUrl, ORGANIZATION_JSONLD } from "@/lib/seo";
import { duplicateHomepageRedirectTarget } from "@/lib/canonicalize-url";

import appCss from "../styles.css?url";
import { AuthProvider } from "../context/AuthContext";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back
          home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        // Security headers, best-effort: this site is static-hosted on
        // GitHub Pages (custom domain, no custom server-header support), so
        // there is no way to send real HTTP response headers. `<meta
        // http-equiv>` is the only lever available here, and it cannot set
        // everything a proper security header set would:
        //   - HSTS (Strict-Transport-Security) CANNOT be set via <meta> at
        //     all — the spec only allows it as a real HTTP response header.
        //   - X-Frame-Options CANNOT be set via <meta> either (browsers
        //     ignore it there); `frame-ancestors` in CSP is the meta-tag
        //     equivalent, but GitHub Pages' static tier still can't set the
        //     header-only fallback some older browsers rely on.
        //   - Getting real HSTS / X-Frame-Options would require putting a
        //     proxy (e.g. Cloudflare) in front of GitHub Pages to inject
        //     response headers — out of scope for this change; do not treat
        //     either as "fixed" by what's below.
        // The CSP below is intentionally on the permissive side — it allows
        // every external origin this app currently loads (GTM/gtag.js, Meta
        // Pixel, Formspree, Nominatim) plus 'unsafe-inline' for script/style
        // because this is a static SPA with no server to mint per-request
        // nonces, and both React's SSR'd inline `style` attributes and the
        // app's inline bootstrap scripts (GTM snippet, gtag stub) rely on it.
        // Fonts (Outfit/Figtree) are self-hosted now — no fonts.googleapis.com
        // /fonts.gstatic.com allowance needed. Tighten further (nonces/hashes,
        // narrower img-src, drop 'unsafe-inline') and test every page + the ad
        // pixels/GTM/Formspree flows manually before trusting it fully.
        {
          httpEquiv: "Content-Security-Policy",
          content:
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://connect.facebook.net; " +
            "style-src 'self' 'unsafe-inline'; " +
            "font-src 'self' data:; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' https://nominatim.openstreetmap.org https://formspree.io https://www.google-analytics.com https://www.googletagmanager.com https://connect.facebook.net https://www.facebook.com; " +
            "frame-src https://www.googletagmanager.com; " +
            "form-action 'self' https://formspree.io; " +
            "base-uri 'self'; " +
            "object-src 'none'",
        },
        { name: "referrer", content: "strict-origin-when-cross-origin" },
        { title: "Beema Health | Medical weight-loss care" },
        {
          name: "description",
          content:
            "Medical weight-loss care reviewed by a licensed provider. Compounded semaglutide and compounded tirzepatide when clinically appropriate and legally available. Compounded medications are not FDA-approved.",
        },
        { name: "author", content: "Beema Health" },
        {
          property: "og:title",
          content: "Beema Health | Medical weight-loss care",
        },
        {
          property: "og:description",
          content:
            "USA physicians, licensed pharmacies, clear pricing, and thoughtful medical care that doesn't stop at the first prescription.",
        },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Beema Health" },
        { property: "og:image", content: absoluteUrl("/og-card.jpg") },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { property: "og:image:alt", content: "Beema Health logo" },
        { name: "twitter:card", content: "summary_large_image" },
        {
          name: "twitter:title",
          content: "Beema Health | Medical weight-loss care",
        },
        {
          name: "twitter:description",
          content:
            "Medical weight-loss care with licensed providers, transparent pricing, and support designed for success.",
        },
        { name: "twitter:image", content: absoluteUrl("/og-card.jpg") },
        {
          name: "twitter:image:alt",
          content: "Beema Health logo",
        },
      ],
      links: [
        // Root /favicon.ico is the classic crawler fallback (Google still
        // probes it). Keep the PNG as the preferred high-res icon.
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", href: "/favicon-beema.png", type: "image/png" },
        // Outfit/Figtree are self-hosted via @fontsource, imported into
        // styles.css — see the comment there. No external font origins to
        // preconnect/fetch from anymore.
        {
          rel: "stylesheet",
          href: appCss,
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(ORGANIZATION_JSONLD),
        },
      ],
    }),
    shellComponent: RootShell,
    component: RootComponent,
    notFoundComponent: NotFoundComponent,
    errorComponent: ErrorComponent,
  },
);

function RootShell({ children }: { children: ReactNode }) {
  // No root index.html in TanStack Start — this shell is the HTML document.
  // GTM + Google Ads gtag: standard head installs (hostname-gated) + GTM noscript.
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: GTM_HEAD_SCRIPT,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: GOOGLE_ADS_HEAD_SCRIPT,
          }}
        />
        <HeadContent />
      </head>
      <body>
        <noscript>
          <iframe
            src={`https://www.googletagmanager.com/ns.html?id=${GTM_CONTAINER_ID}`}
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Capture UTMs / cta_id from the URL on every page load so Formspree and
  // GA can attribute waitlist leads and sessions without a backend.
  useEffect(() => {
    capturePageUtms();
  }, []);

  // Meta Pixel / GA4 — no-op when VITE_* IDs are unset (local/dev).
  // GTM + Google Ads AW tag load from RootShell (hostname-gated), not here.
  useEffect(() => {
    initAdPixels();
  }, []);

  // GitHub Pages also serves the homepage at /index.html (HTTP 200). That is
  // a duplicate of /. Rewrite once to the canonical path — never when already
  // on `/` (avoids the intermittent self-redirect class of bugs).
  useEffect(() => {
    const target = duplicateHomepageRedirectTarget(
      window.location.pathname,
      window.location.search,
      window.location.hash,
    );
    if (target !== null) {
      window.location.replace(target);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
