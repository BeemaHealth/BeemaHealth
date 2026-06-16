import { createFileRoute, redirect } from "@tanstack/react-router";

/** MVP: clinicians marketing page removed — redirect home. */
export const Route = createFileRoute("/clinicians")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
