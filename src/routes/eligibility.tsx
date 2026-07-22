import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy alias — eligibility / qualify entry now lands on the waitlist. */
export const Route = createFileRoute("/eligibility")({
  beforeLoad: () => {
    throw redirect({ to: "/waitlist/", replace: true });
  },
});
