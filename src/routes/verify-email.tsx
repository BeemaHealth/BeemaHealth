import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

/**
 * In-house email verification retired in favor of Bask; redirect home.
 * Blocking beforeLoad here covers both children (/verify-email/,
 * /verify-email/pending) without touching those files individually.
 */
export const Route = createFileRoute("/verify-email")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
  component: VerifyEmailLayout,
});

function VerifyEmailLayout() {
  return <Outlet />;
}
