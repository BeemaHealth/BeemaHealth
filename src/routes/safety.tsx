import { createFileRoute, redirect } from "@tanstack/react-router";

/** MVP: safety marketing page removed — safety info is in intake flow. */
export const Route = createFileRoute("/safety")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
