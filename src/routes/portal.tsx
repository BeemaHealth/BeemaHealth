import {
  createFileRoute,
  Outlet,
  redirect,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { PortalShell } from "@/components/portal/PortalShell";
import { PortalUserProvider } from "@/components/portal/PortalUserContext";
import {
  fetchMe,
  isLoginPath,
  isUnauthenticated,
  PORTAL_LOGIN_PATH,
  type PortalUser,
} from "@/lib/api/portal/auth";
import { setUnauthorizedHandler } from "@/lib/api/portal/client";

const LOGIN_PATH = PORTAL_LOGIN_PATH;

/**
 * Patient portal layout. Client-only (session cookie lives on the API origin),
 * guards every child route except /portal/login*, and exposes the signed-in
 * user through PortalUserProvider.
 */
export const Route = createFileRoute("/portal")({
  ssr: false,
  head: () => ({
    meta: [
      { name: "robots", content: "noindex, nofollow" },
      { title: "Patient portal | Beema Health" },
    ],
  }),
  beforeLoad: async ({ location }): Promise<{ user: PortalUser | null }> => {
    if (isLoginPath(location.pathname)) return { user: null };
    try {
      return { user: await fetchMe() };
    } catch (err) {
      if (isUnauthenticated(err))
        throw redirect({ to: LOGIN_PATH as "/", replace: true });
      throw err;
    }
  },
  component: PortalLayout,
  errorComponent: PortalLayoutError,
});

function PortalLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!isLoginPath(router.state.location.pathname)) {
        void router.navigate({ to: LOGIN_PATH as "/", replace: true });
      }
    });
    return () => setUnauthorizedHandler(null);
  }, [router]);

  if (!user) return <Outlet />;
  return (
    <PortalUserProvider value={user}>
      <PortalShell user={user}>
        <Outlet />
      </PortalShell>
    </PortalUserProvider>
  );
}

function PortalLayoutError() {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        role="alert"
        className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-soft"
      >
        <h1 className="font-display text-2xl font-semibold">
          We could not load your portal
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={() => void router.invalidate()}
          className="mt-6 inline-flex h-10 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
