import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/verify-email")({
  component: VerifyEmailLayout,
});

function VerifyEmailLayout() {
  return <Outlet />;
}
