import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, MailWarning } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { PortalLink } from "@/components/portal/PortalLink";
import { verifyLinkToken } from "@/lib/api/portal/auth";
import { ApiError } from "@/lib/api/portal/client";

export const Route = createFileRoute("/portal/login_/verify")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { token?: string } => ({
    token:
      typeof s.token === "string" && s.token.length > 0 && s.token.length <= 200
        ? s.token
        : undefined,
  }),
  component: PortalVerify,
});

function PortalVerify() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const started = useRef(false);
  const [error, setError] = useState(
    token ? "" : "That sign-in link is missing its token.",
  );

  useEffect(() => {
    // Tokens are single use: never submit twice (StrictMode double effects).
    if (!token || started.current) return;
    started.current = true;
    // Drop the token from the address bar and history right away.
    window.history.replaceState(null, "", window.location.pathname);
    verifyLinkToken(token)
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ["portal"] });
        await navigate({ to: "/portal" as "/", replace: true });
      })
      .catch((err: unknown) => {
        setError(
          err instanceof ApiError && (err.status === 400 || err.status === 429)
            ? err.message
            : "We could not sign you in. Please request a new link.",
        );
      });
  }, [token, navigate, queryClient]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <main className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center">
          <Logo className="h-12" />
        </div>
        <div className="rounded-3xl border border-border bg-card p-8 shadow-lift">
          {error ? (
            <div role="alert">
              <MailWarning
                className="mx-auto size-10 text-destructive"
                aria-hidden="true"
              />
              <h1 className="mt-4 font-display text-xl font-semibold">
                This link did not work
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{error}</p>
              <PortalLink
                to="/portal/login"
                replace
                className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Request a new link
              </PortalLink>
            </div>
          ) : (
            <div role="status" aria-live="polite">
              <Loader2
                className="mx-auto size-10 animate-spin text-primary motion-reduce:animate-none"
                aria-hidden="true"
              />
              <h1 className="mt-4 font-display text-xl font-semibold">
                Signing you in
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                One moment while we verify your link.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
