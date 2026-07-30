import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy alias — in-house funnel retired in favor of Bask; redirect home. */
export const Route = createFileRoute("/eligibility")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
