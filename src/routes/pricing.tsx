import { createFileRoute, redirect } from "@tanstack/react-router";

/** MVP: pricing page removed — redirect home. */
export const Route = createFileRoute("/pricing")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
