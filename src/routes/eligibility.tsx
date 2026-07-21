import { createFileRoute, redirect } from "@tanstack/react-router";

/** MVP: eligibility lives at /qualify — keep old /eligibility links working. */
export const Route = createFileRoute("/eligibility")({
  beforeLoad: () => {
    throw redirect({ to: "/qualify/" });
  },
});
