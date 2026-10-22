// Optional Google Ads adapter (NOT built yet). The dashboard calls this and
// shows "not connected" while it returns { available: false }.
//
// To add Ads later, return for a landing page and date range:
//   { available: true, campaigns: [{ campaign, clicks, impressions, costMicros }] }
// The dashboard can then derive CPC and cost per intake handoff. Ad clicks and
// GA4 visitors are measured differently, so they are never matched one-to-one.
export async function fetchAdsSummary() {
  return { available: false, reason: "Google Ads adapter not connected" };
}
