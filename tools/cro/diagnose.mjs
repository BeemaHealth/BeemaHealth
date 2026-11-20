// Read-only GA4 health check: node tools/cro/diagnose.mjs [days]
// Prints event counts, intake_handoff presence, and registered custom dimensions.
import { getClient, loadConfig } from "./ga4.mjs";

const cfg = loadConfig();
if (!cfg) throw new Error("Missing tools/cro/config.json with ga4PropertyId");
const property = `properties/${cfg.propertyId}`;
const days = Number(process.argv[2] ?? 28);
const range = [{ startDate: `${days}daysAgo`, endDate: "today" }];
const c = getClient();

const [totals] = await c.runReport({
  property,
  dateRanges: range,
  metrics: [{ name: "sessions" }, { name: "totalUsers" }],
});
console.log(
  `Last ${days}d sessions/users:`,
  totals.rows?.[0]?.metricValues.map((m) => m.value).join(" / "),
);

const [events] = await c.runReport({
  property,
  dateRanges: range,
  dimensions: [{ name: "eventName" }],
  metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
  orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
  limit: 50,
});
console.log("\nEvents (name, count, users):");
for (const r of events.rows ?? [])
  console.log(
    `  ${r.dimensionValues[0].value}\t${r.metricValues[0].value}\t${r.metricValues[1].value}`,
  );

const [handoff] = await c.runReport({
  property,
  dateRanges: range,
  dimensions: [{ name: "pagePath" }, { name: "date" }],
  metrics: [{ name: "eventCount" }],
  dimensionFilter: {
    filter: {
      fieldName: "eventName",
      stringFilter: { value: "intake_handoff" },
    },
  },
  orderBys: [{ metric: { metricName: "eventCount" }, desc: true }],
  limit: 15,
});
console.log(
  "\nintake_handoff by page/date (top 15):",
  handoff.rows?.length ? "" : "NONE FOUND",
);
for (const r of handoff.rows ?? [])
  console.log(
    `  ${r.dimensionValues[0].value}\t${r.dimensionValues[1].value}\t${r.metricValues[0].value}`,
  );

const [meta] = await c.getMetadata({ name: `${property}/metadata` });
const custom = meta.dimensions.filter((d) =>
  d.apiName.startsWith("customEvent:"),
);
console.log(
  "\nRegistered event-scoped custom dimensions:",
  custom.length ? "" : "NONE",
);
for (const d of custom) console.log(`  ${d.apiName}\t(${d.uiName})`);
