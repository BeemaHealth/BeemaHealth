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
        { title: "Beema Health — Medical weight-loss care" },
        {
          name: "description",
          content:
            "Medical weight-loss care reviewed by a licensed provider. Secure intake for Zepbound, Wegovy, and affordable alternatives when appropriate.",
        },
        { name: "author", content: "Beema Health" },
        {
          property: "og:title",
          content: "Beema Health — Medical weight-loss care",
        },
        {
          property: "og:description",
          content:
            "USA physicians, licensed pharmacies, clear pricing, and thoughtful medical care that doesn't stop at the first prescription.",
        },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "Beema Health" },
        { name: "twitter:card", content: "summary" },
        {
          name: "twitter:title",
          content: "Beema Health — Medical weight-loss care",
        },
        {
          name: "twitter:description",
          content:
            "Medical weight-loss care with licensed providers, transparent pricing, and support designed for success.",
        },
        { property: "og:image", content: absoluteUrl("/beema-mark.png") },
        { name: "twitter:image", content: absoluteUrl("/beema-mark.png") },
      ],
      links: [
        { rel: "icon", href: "/favicon-beema.png", type: "image/png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossOrigin: "anonymous",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=Figtree:wght@400;500;600;700&display=swap",
        },
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
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Capture UTMs from the URL on every page load so they're available
  // when the funnel session is eventually created in qualify.tsx.
  useEffect(() => {
    capturePageUtms();
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
