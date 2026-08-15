import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Retired branded overview for the free library ("The Comb").
 * Redirects home - the homepage Free Resources section covers recipes + learn.
 */
export const Route = createFileRoute("/the-comb")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
});
