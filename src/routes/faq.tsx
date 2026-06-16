import { createFileRoute, redirect } from "@tanstack/react-router";

/** MVP: FAQ removed — redirect home. */
export const Route = createFileRoute("/faq")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
