import { createFileRoute, redirect } from "@tanstack/react-router";

/** MVP: insurance & pharmacy pages removed — redirect home. */
export const Route = createFileRoute("/insurance")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
