import { createFileRoute, redirect } from "@tanstack/react-router";

/** MVP: learn/blog removed — redirect home. */
export const Route = createFileRoute("/learn")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
