import { createFileRoute, redirect } from "@tanstack/react-router";

/** MVP: switch flow not available — redirect home. */
export const Route = createFileRoute("/switch")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
