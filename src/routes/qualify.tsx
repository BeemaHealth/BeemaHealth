import { createFileRoute, redirect } from "@tanstack/react-router";

type WaitlistSearch = {
  cta_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

function pickWaitlistSearch(search: Record<string, unknown>): WaitlistSearch {
  const out: WaitlistSearch = {};
  for (const key of [
    "cta_id",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
  ] as const) {
    const val = search[key];
    if (typeof val === "string" && val.trim()) out[key] = val;
  }
  return out;
}

/**
 * Legacy path — waitlist lives at /waitlist/.
 * Preserve ?cta_id= / UTM query so old shared links keep attribution.
 */
export const Route = createFileRoute("/qualify")({
  validateSearch: (search: Record<string, unknown>) =>
    pickWaitlistSearch(search),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/waitlist/",
      search,
      replace: true,
    });
  },
});
