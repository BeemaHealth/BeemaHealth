import { createFileRoute, redirect } from "@tanstack/react-router";

type QualifySearch = {
  cta_id?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
};

function pickQualifySearch(search: Record<string, unknown>): QualifySearch {
  const out: QualifySearch = {};
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
 * Legacy path - in-house funnel retired in favor of Bask; redirect home.
 * Preserve ?cta_id= / UTM query so old shared links keep attribution.
 */
export const Route = createFileRoute("/qualify")({
  validateSearch: (search: Record<string, unknown>) =>
    pickQualifySearch(search),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/",
      search,
      replace: true,
    });
  },
});
