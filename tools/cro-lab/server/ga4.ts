// Live GA4 rows for the CRO Lab. Read-only, keyless Application Default
// Credentials impersonate the dedicated analytics service account.
//
// Metrics are keyed by landing page path, not by the variant_id custom
// dimension: variants are attributed by confirmed deployment windows, so the
// numbers do not depend on custom dimensions being registered in GA4.
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import type { AnalyticsStatus, DailyRow, PathRow } from "../shared/types.ts";

export const GA4_PROPERTY_ID = process.env.CRO_GA4_PROPERTY ?? "546707320";
/** First day of data the lab ever shows ("All time"). */
export const RANGE_START = "2026-08-01";
const TTL_MS = 60_000;
const SERVICE_ACCOUNT =
  "beema-cro-analytics@beema-health.iam.gserviceaccount.com";
const REAUTH_COMMAND = `gcloud auth application-default login --impersonate-service-account=${SERVICE_ACCOUNT}`;
const LOGIN_HINT = `Run \`${REAUTH_COMMAND}\`, then press Refresh.`;

export type LiveResult = {
  rows: DailyRow[];
  paths: PathRow[];
  status: AnalyticsStatus;
  message: string;
  refreshedAt: string | null;
};

type GaRow = {
  dimensionValues?: { value?: string | null }[] | null;
  metricValues?: { value?: string | null }[] | null;
};
type Runner = (request: object) => Promise<GaRow[]>;

let client: BetaAnalyticsDataClient | undefined;
const defaultRunner: Runner = async (request) => {
  client ??= new BetaAnalyticsDataClient();
  const out: GaRow[] = [];
  const limit = 100_000;
  for (let offset = 0; ; offset += limit) {
    const [res] = await client.runReport({ ...request, limit, offset });
    const rows = (res.rows ?? []) as GaRow[];
    out.push(...rows);
    if (rows.length < limit) return out;
  }
};

const dv = (r: GaRow, i: number) => r.dimensionValues?.[i]?.value ?? "";
const mv = (r: GaRow, i: number) => Number(r.metricValues?.[i]?.value ?? 0);
const isoDate = (d: string) =>
  `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

/** "/glp-1-houston/" or "/glp-1-houston" -> "glp-1-houston", else null. */
export function pageIdFromPath(
  pagePath: string,
  pageIds: readonly string[],
): string | null {
  const id = pagePath.replace(/^\/+|\/+$/g, "");
  return pageIds.includes(id) ? id : null;
}

const reportBase = (pageIds: readonly string[], events: string[]) => ({
  property: `properties/${GA4_PROPERTY_ID}`,
  dateRanges: [{ startDate: RANGE_START, endDate: "today" }],
  dimensions: [
    { name: "date" },
    { name: "pagePath" },
    { name: "sessionSourceMedium" },
    { name: "sessionCampaignName" },
  ],
  dimensionFilter: {
    andGroup: {
      expressions: [
        {
          filter: {
            fieldName: "pagePath",
            stringFilter: {
              matchType: "FULL_REGEXP",
              value: `/(${pageIds.join("|")})/?`,
            },
          },
        },
        {
          filter: {
            fieldName: "eventName",
            inListFilter: { values: events },
          },
        },
      ],
    },
  },
});

/**
 * Daily rows per page / source / campaign. Users and sessions come from
 * page_view; handoff counts come from intake_handoff and are null for days
 * before `trackingStart` (the event did not exist or was not recorded).
 */
export async function fetchRows(
  pageIds: readonly string[],
  trackingStart: string,
  run: Runner = defaultRunner,
): Promise<DailyRow[]> {
  const [views, handoffs] = await Promise.all([
    run({
      ...reportBase(pageIds, ["page_view"]),
      metrics: [{ name: "totalUsers" }, { name: "sessions" }],
    }),
    run({
      ...reportBase(pageIds, ["intake_handoff"]),
      metrics: [{ name: "totalUsers" }, { name: "eventCount" }],
    }),
  ]);
  const byKey = new Map<string, DailyRow>();
  const rowFor = (r: GaRow): DailyRow | null => {
    const pageId = pageIdFromPath(dv(r, 1), pageIds);
    if (!pageId) return null;
    const date = isoDate(dv(r, 0));
    const sourceMedium = dv(r, 2) || "(not set)";
    const campaign = dv(r, 3) || "(not set)";
    const key = [date, pageId, sourceMedium, campaign].join("\u0000");
    let row = byKey.get(key);
    if (!row) {
      row = {
        date,
        pageId,
        sourceMedium,
        campaign,
        users: 0,
        sessions: 0,
        handoffUsers: date >= trackingStart ? 0 : null,
        handoffEvents: date >= trackingStart ? 0 : null,
      };
      byKey.set(key, row);
    }
    return row;
  };
  for (const r of views) {
    const row = rowFor(r);
    if (!row) continue;
    row.users += mv(r, 0);
    row.sessions += mv(r, 1);
  }
  for (const r of handoffs) {
    const row = rowFor(r);
    if (!row || row.handoffUsers === null) continue;
    row.handoffUsers += mv(r, 0);
    row.handoffEvents = (row.handoffEvents ?? 0) + mv(r, 1);
  }
  return [...byKey.values()].sort(
    (a, b) => a.date.localeCompare(b.date) || a.pageId.localeCompare(b.pageId),
  );
}

const normalizePage = (p: string) =>
  p === "/" || p === "" ? "/" : `${p.replace(/\/+$/, "")}/`;

/**
 * Where sessions that landed on each ad page went next. Two reports, both
 * keyed by landingPage x pagePath: page_view sessions (who viewed what) and
 * intake_handoff sessions (which page the handoff fired from). Handoffs whose
 * landing page GA4 reports as "(not set)" cannot be attributed and are skipped.
 */
export async function fetchPaths(
  pageIds: readonly string[],
  trackingStart: string,
  run: Runner = defaultRunner,
): Promise<PathRow[]> {
  const base = (event: string) => ({
    property: `properties/${GA4_PROPERTY_ID}`,
    dateRanges: [{ startDate: RANGE_START, endDate: "today" }],
    dimensions: [
      { name: "date" },
      { name: "landingPage" },
      { name: "pagePath" },
    ],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "landingPage",
              stringFilter: {
                matchType: "FULL_REGEXP",
                value: `/(${pageIds.join("|")})/?`,
              },
            },
          },
          {
            filter: {
              fieldName: "eventName",
              stringFilter: { matchType: "EXACT", value: event },
            },
          },
        ],
      },
    },
    metrics: [{ name: "sessions" }],
  });
  const [views, handoffs] = await Promise.all([
    run(base("page_view")),
    run(base("intake_handoff")),
  ]);
  const byKey = new Map<string, PathRow>();
  const rowFor = (r: GaRow): PathRow | null => {
    const pageId = pageIdFromPath(dv(r, 1), pageIds);
    if (!pageId) return null;
    const date = isoDate(dv(r, 0));
    const page = normalizePage(dv(r, 2));
    const key = [date, pageId, page].join("\u0000");
    let row = byKey.get(key);
    if (!row) {
      row = {
        date,
        pageId,
        page,
        sessionsViewed: 0,
        handoffSessions: date >= trackingStart ? 0 : null,
      };
      byKey.set(key, row);
    }
    return row;
  };
  for (const r of views) {
    const row = rowFor(r);
    if (row) row.sessionsViewed += mv(r, 0);
  }
  for (const r of handoffs) {
    const row = rowFor(r);
    if (row && row.handoffSessions !== null) row.handoffSessions += mv(r, 0);
  }
  return [...byKey.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.pageId.localeCompare(b.pageId) ||
      a.page.localeCompare(b.page),
  );
}

/** Maps a thrown GA4/auth error to a dashboard status and a plain-English message. */
export function classifyError(e: unknown): {
  status: AnalyticsStatus;
  message: string;
} {
  const err = e as { code?: number; message?: string };
  const text = String(err?.message ?? e);
  if (
    err?.code === 16 ||
    /invalid_grant|reauth|unauthenticated|could not load the default credentials/i.test(
      text,
    )
  )
    return {
      status: "auth-expired",
      message: `Google sign-in expired or is missing. ${LOGIN_HINT}`,
    };
  if (
    /ACCESS_TOKEN_SCOPE_INSUFFICIENT|insufficient authentication scopes/i.test(
      text,
    )
  )
    return {
      status: "auth-expired",
      message: `Google credentials are not configured for keyless GA4 access. ${LOGIN_HINT}`,
    };
  if (err?.code === 7 || /permission|forbidden|insufficient/i.test(text))
    return {
      status: "insufficient-permissions",
      message: `The signed-in Google account cannot read GA4 property ${GA4_PROPERTY_ID}. Sign in with an account that has Viewer access. ${LOGIN_HINT}`,
    };
  return {
    status: "api-unavailable",
    message: `GA4 request failed: ${text.split("\n")[0].slice(0, 200)}`,
  };
}

let cache: { at: number; result: LiveResult } | null = null;
let inflight: Promise<LiveResult> | null = null;

/** Cached for 60s; concurrent callers share one request. Never throws. */
export function getLive(
  pageIds: readonly string[],
  trackingStart: string,
  opts: { force?: boolean; run?: Runner } = {},
): Promise<LiveResult> {
  if (!opts.force && cache && Date.now() - cache.at < TTL_MS)
    return Promise.resolve(cache.result);
  inflight ??= (async (): Promise<LiveResult> => {
    try {
      const rows = await fetchRows(pageIds, trackingStart, opts.run);
      // Path data is secondary: if it fails, keep the core funnel working.
      const paths = await fetchPaths(pageIds, trackingStart, opts.run).catch(
        () => cache?.result.paths ?? [],
      );
      const result: LiveResult = rows.length
        ? {
            rows,
            paths,
            status: "connected",
            message: `Live GA4 data (property ${GA4_PROPERTY_ID}). Today is preliminary.`,
            refreshedAt: new Date().toISOString(),
          }
        : {
            rows,
            paths,
            status: "no-data",
            message: "Connected to GA4, but no rows came back for these pages.",
            refreshedAt: new Date().toISOString(),
          };
      cache = { at: Date.now(), result };
      return result;
    } catch (e) {
      // Keep serving the last good rows, flagged stale, rather than blanking the UI.
      const { status, message } = classifyError(e);
      const stale = cache?.result.rows ?? [];
      return {
        rows: stale,
        paths: cache?.result.paths ?? [],
        status,
        message: stale.length
          ? `${message} Showing the last loaded data.`
          : message,
        refreshedAt: cache?.result.refreshedAt ?? null,
      };
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
