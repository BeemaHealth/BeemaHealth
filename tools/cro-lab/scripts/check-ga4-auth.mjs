#!/usr/bin/env node

import { BetaAnalyticsDataClient } from "@google-analytics/data";

const propertyId = process.env.CRO_GA4_PROPERTY ?? "546707320";
const client = new BetaAnalyticsDataClient();

try {
  const [report] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        stringFilter: { matchType: "EXACT", value: "intake_handoff" },
      },
    },
    limit: 10,
  });
  const count = report.rows?.[0]?.metricValues?.[0]?.value ?? "0";
  console.log(
    JSON.stringify(
      {
        ok: true,
        propertyId,
        event: "intake_handoff",
        range: "30daysAgo..today",
        eventCount: Number(count),
      },
      null,
      2,
    ),
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    JSON.stringify(
      { ok: false, propertyId, error: message.split("\n")[0] },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
