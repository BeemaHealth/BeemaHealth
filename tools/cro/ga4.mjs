// GA4 Data API client for the local dashboard. Uses Application Default
// Credentials (gcloud auth application-default login); no key files in the repo.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

const here = path.dirname(fileURLToPath(import.meta.url));
const configFile = path.join(here, "config.json");

export function loadConfig() {
  try {
    const c = JSON.parse(fs.readFileSync(configFile, "utf8"));
    if (!/^\d+$/.test(String(c.ga4PropertyId ?? ""))) return null;
    return { propertyId: String(c.ga4PropertyId) };
  } catch {
    return null;
  }
}

let client;
export const getClient = () => (client ??= new BetaAnalyticsDataClient());

const prop = (cfg) => `properties/${cfg.propertyId}`;
const range = (days) => [{ startDate: `${days}daysAgo`, endDate: "today" }];

export const REQUIRED_DIMENSIONS = [
  "variant_id",
  "experiment_id",
  "landing_page_id",
];

const eq = (fieldName, value) => ({
  filter: { fieldName, stringFilter: { matchType: "EXACT", value } },
});
const inList = (fieldName, values) => ({
  filter: { fieldName, inListFilter: { values } },
});
const and = (...expressions) => ({ andGroup: { expressions } });
const pageFilter = (page) =>
  and(
    eq("customEvent:landing_page_id", page),
    inList("eventName", ["variant_exposure", "intake_handoff"]),
  );

const val = (row, i) => row.dimensionValues[i].value;
const num = (row, i) => Number(row.metricValues[i].value);

async function run(request) {
  try {
    const [res] = await getClient().runReport({ limit: 100000, ...request });
    return res.rows ?? [];
  } catch (e) {
    throw new Error(
      `GA4 request failed: ${String(e?.message ?? e).split("\n")[0]}`,
    );
  }
}

/** Which of the custom event dimensions are registered in GA4 (they apply only going forward). */
export async function dimensionStatus(cfg) {
  const [meta] = await getClient().getMetadata({
    name: `${prop(cfg)}/metadata`,
  });
  const have = new Set(meta.dimensions.map((d) => d.apiName));
  const registered = Object.fromEntries(
    REQUIRED_DIMENSIONS.map((d) => [d, have.has(`customEvent:${d}`)]),
  );
  return { registered, all: Object.values(registered).every(Boolean) };
}

/**
 * Per-variant unique visitors (variant_exposure users) and unique clickers
 * (intake_handoff users). totalUsers is de-duplicated across the whole range
 * because no date dimension is requested.
 */
export async function variantTotals(cfg, page, days) {
  const rows = await run({
    property: prop(cfg),
    dateRanges: range(days),
    dimensions: [{ name: "customEvent:variant_id" }, { name: "eventName" }],
    metrics: [{ name: "totalUsers" }, { name: "eventCount" }],
    dimensionFilter: pageFilter(page),
  });
  const out = {};
  for (const r of rows) {
    const id = val(r, 0);
    const v = (out[id] ??= {
      visitors: 0,
      exposures: 0,
      clickers: 0,
      clicks: 0,
    });
    if (val(r, 1) === "variant_exposure") {
      v.visitors = num(r, 0);
      v.exposures = num(r, 1);
    } else {
      v.clickers = num(r, 0);
      v.clicks = num(r, 1);
    }
  }
  return out;
}

/** Days (YYYYMMDD) on which each variant had exposures. */
export async function variantDays(cfg, page, days) {
  const rows = await run({
    property: prop(cfg),
    dateRanges: range(days),
    dimensions: [{ name: "customEvent:variant_id" }, { name: "date" }],
    metrics: [{ name: "totalUsers" }],
    dimensionFilter: and(
      eq("customEvent:landing_page_id", page),
      eq("eventName", "variant_exposure"),
    ),
  });
  const out = {};
  for (const r of rows) (out[val(r, 0)] ??= []).push(val(r, 1));
  for (const id of Object.keys(out)) out[id].sort();
  return out;
}

/** Daily visitors and clickers for one variant. */
export async function variantSeries(cfg, page, variant, days) {
  const rows = await run({
    property: prop(cfg),
    dateRanges: range(days),
    dimensions: [{ name: "date" }, { name: "eventName" }],
    metrics: [{ name: "totalUsers" }],
    dimensionFilter: and(
      pageFilter(page),
      eq("customEvent:variant_id", variant),
    ),
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });
  const byDate = new Map();
  for (const r of rows) {
    const d = byDate.get(val(r, 0)) ?? {
      date: val(r, 0),
      visitors: 0,
      clickers: 0,
    };
    if (val(r, 1) === "variant_exposure") d.visitors = num(r, 0);
    else d.clickers = num(r, 0);
    byDate.set(d.date, d);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Source / medium / campaign breakdown for one variant. */
export async function variantBreakdown(cfg, page, variant, days) {
  const rows = await run({
    property: prop(cfg),
    dateRanges: range(days),
    dimensions: [
      { name: "sessionSourceMedium" },
      { name: "sessionCampaignName" },
      { name: "eventName" },
    ],
    metrics: [{ name: "totalUsers" }],
    dimensionFilter: and(
      pageFilter(page),
      eq("customEvent:variant_id", variant),
    ),
  });
  const by = new Map();
  for (const r of rows) {
    const key = `${val(r, 0)}\u0000${val(r, 1)}`;
    const b = by.get(key) ?? {
      source: val(r, 0),
      campaign: val(r, 1),
      visitors: 0,
      clickers: 0,
    };
    if (val(r, 2) === "variant_exposure") b.visitors = num(r, 0);
    else b.clickers = num(r, 0);
    by.set(key, b);
  }
  return [...by.values()].sort((a, b) => b.visitors - a.visitors);
}

/**
 * Tracking health that does NOT depend on custom dimensions: raw page_view and
 * intake_handoff for the page path. Used to tell "no clicks" apart from
 * "clicks are not being recorded".
 */
export async function pageHealth(cfg, page, days) {
  const rows = await run({
    property: prop(cfg),
    dateRanges: range(days),
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "totalUsers" }, { name: "eventCount" }],
    dimensionFilter: and(
      {
        filter: {
          fieldName: "pagePath",
          stringFilter: { matchType: "FULL_REGEXP", value: `/${page}/?` },
        },
      },
      inList("eventName", ["page_view", "variant_exposure", "intake_handoff"]),
    ),
  });
  const out = {
    page_view: { users: 0, events: 0 },
    variant_exposure: { users: 0, events: 0 },
    intake_handoff: { users: 0, events: 0 },
  };
  for (const r of rows)
    out[val(r, 0)] = { users: num(r, 0), events: num(r, 1) };
  return out;
}

const pathFilter = (page) => ({
  filter: {
    fieldName: "pagePath",
    stringFilter: { matchType: "FULL_REGEXP", value: `/${page}/?` },
  },
});

/**
 * Page-level history that needs no custom dimensions: daily unique page_view
 * users and source/campaign split. NOT attributed to any variant.
 */
export async function pageSeries(cfg, page, days) {
  const rows = await run({
    property: prop(cfg),
    dateRanges: range(days),
    dimensions: [{ name: "date" }],
    metrics: [{ name: "totalUsers" }],
    dimensionFilter: and(pathFilter(page), eq("eventName", "page_view")),
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });
  return rows.map((r) => ({
    date: val(r, 0),
    visitors: num(r, 0),
    clickers: 0,
  }));
}

export async function pageBreakdown(cfg, page, days) {
  const rows = await run({
    property: prop(cfg),
    dateRanges: range(days),
    dimensions: [
      { name: "sessionSourceMedium" },
      { name: "sessionCampaignName" },
    ],
    metrics: [{ name: "totalUsers" }],
    dimensionFilter: and(pathFilter(page), eq("eventName", "page_view")),
    orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
    limit: 25,
  });
  return rows.map((r) => ({
    source: val(r, 0),
    campaign: val(r, 1),
    visitors: num(r, 0),
    clickers: 0,
  }));
}

/** Realtime (last 30 minutes), for troubleshooting only. */
export async function realtimeEvents(cfg) {
  const [res] = await getClient().runRealtimeReport({
    property: prop(cfg),
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }],
    limit: 50,
  });
  return (res.rows ?? []).map((r) => ({ event: val(r, 0), count: num(r, 0) }));
}
