// Live GA4 rows for the CRO Lab. Read-only, keyless Application Default
// Credentials impersonate the dedicated analytics service account.
//
// Metrics are keyed by landing page path, not by the variant_id custom
// dimension: variants are attributed by confirmed deployment windows, so the
// numbers do not depend on custom dimensions being registered in GA4.
import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { denverDate, fmtDateTime } from "../shared/time.ts";
import {
  applyFetch,
  datesToFetch,
  emptyStore,
  lastPulled,
  loadStore,
  saveStore,
  storeKey,
  type DayStore,
} from "./ga4-cache.ts";
import {
  pageIdFromCtaId,
  pageIdFromPagePath,
  pagePathRegexp,
} from "../shared/pages.ts";
import {
  DOWNSTREAM_EVENTS,
  type AnalyticsStatus,
  type DailyRow,
  type DownstreamRow,
  type PathRow,
} from "../shared/types.ts";

export const GA4_PROPERTY_ID = process.env.CRO_GA4_PROPERTY ?? "546707320";
/** First day of data the lab ever shows ("All time"). */
export const RANGE_START = "2026-08-01";
const SERVICE_ACCOUNT =
  "beema-cro-analytics@beema-health.iam.gserviceaccount.com";
const REAUTH_COMMAND = `gcloud auth application-default login --impersonate-service-account=${SERVICE_ACCOUNT}`;
const LOGIN_HINT = `Run \`${REAUTH_COMMAND}\`, then press Refresh.`;

export type LiveResult = {
  rows: DailyRow[];
  paths: PathRow[];
  downstream: DownstreamRow[];
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

/** "/glp-1-houston/" or "/glp-1-houston" -> "glp-1-houston", "/" -> "home", else null. */
export function pageIdFromPath(
  pagePath: string,
  pageIds: readonly string[],
): string | null {
  return pageIdFromPagePath(pagePath, pageIds);
}

/** Marketing-site events only: Bask (q.) also has a "/" and its own paths. */
const notBask = () => ({
  notExpression: {
    filter: {
      fieldName: "hostName",
      stringFilter: { matchType: "EXACT", value: BASK_HOST },
    },
  },
});

const reportBase = (
  pageIds: readonly string[],
  events: string[],
  startDate: string,
) => ({
  property: `properties/${GA4_PROPERTY_ID}`,
  dateRanges: [{ startDate, endDate: "today" }],
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
              value: pagePathRegexp(pageIds),
            },
          },
        },
        notBask(),
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
  startDate = RANGE_START,
): Promise<DailyRow[]> {
  const [views, handoffs] = await Promise.all([
    run({
      ...reportBase(pageIds, ["page_view"], startDate),
      metrics: [{ name: "totalUsers" }, { name: "sessions" }],
    }),
    run({
      ...reportBase(pageIds, ["intake_handoff"], startDate),
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
  startDate = RANGE_START,
): Promise<PathRow[]> {
  const base = (event: string) => ({
    property: `properties/${GA4_PROPERTY_ID}`,
    dateRanges: [{ startDate, endDate: "today" }],
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
                value: pagePathRegexp(pageIds),
              },
            },
          },
          notBask(),
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

/** Host Bask serves intake and checkout from; signup and purchase fire here. */
const BASK_HOST = "q.beemahealth.com";
/** Traffic from GTM Preview (our own testing) is not a real signup. */
const PREVIEW_SOURCE = "tagassistant.google.com";

/** cta_id from a Bask page URL, or null if absent or unparseable. */
export function ctaIdFromLocation(location: string): string | null {
  try {
    return new URL(location).searchParams.get("cta_id");
  } catch {
    return null;
  }
}

/**
 * Signup and purchase counts per day from Bask's GTM tags, tied to a landing
 * page by the cta_id still on the Bask URL (pageId null when there is none).
 * Excludes GTM Preview sessions (our own testing) so QA runs do not inflate
 * the funnel. Counts are summed over distinct URLs, so a user who fires the
 * event from two different URLs on one day counts twice.
 */
export async function fetchDownstream(
  run: Runner = defaultRunner,
  startDate = RANGE_START,
): Promise<DownstreamRow[]> {
  const rows = await run({
    property: `properties/${GA4_PROPERTY_ID}`,
    dateRanges: [{ startDate, endDate: "today" }],
    dimensions: [
      { name: "date" },
      { name: "eventName" },
      { name: "pageLocation" },
    ],
    metrics: [{ name: "totalUsers" }, { name: "eventCount" }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          {
            filter: {
              fieldName: "eventName",
              inListFilter: { values: [...DOWNSTREAM_EVENTS] },
            },
          },
          {
            filter: {
              fieldName: "hostName",
              stringFilter: { matchType: "EXACT", value: BASK_HOST },
            },
          },
          {
            notExpression: {
              filter: {
                fieldName: "sessionSource",
                stringFilter: { matchType: "EXACT", value: PREVIEW_SOURCE },
              },
            },
          },
          {
            // GTM Preview appends gtm_debug to every URL it loads.
            notExpression: {
              filter: {
                fieldName: "pageLocation",
                stringFilter: { matchType: "CONTAINS", value: "gtm_debug" },
              },
            },
          },
        ],
      },
    },
  });
  const byKey = new Map<string, DownstreamRow>();
  for (const r of rows) {
    const event = DOWNSTREAM_EVENTS.find((e) => e === dv(r, 1));
    if (!event) continue;
    const date = isoDate(dv(r, 0));
    const pageId = pageIdFromCtaId(ctaIdFromLocation(dv(r, 2)));
    const key = [date, event, pageId ?? ""].join("\u0000");
    const row = byKey.get(key) ?? { date, event, pageId, users: 0, events: 0 };
    row.users += mv(r, 0);
    row.events += mv(r, 1);
    byKey.set(key, row);
  }
  return [...byKey.values()].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.event.localeCompare(b.event) ||
      (a.pageId ?? "").localeCompare(b.pageId ?? ""),
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

let memStore: DayStore | null = null;
let inflight: Promise<LiveResult> | null = null;
/**
 * The most recent failed pull, kept until a pull succeeds. Without it the next
 * cached read (the dashboard asks for rows, then state) would report "connected"
 * and hide why Refresh did nothing.
 */
let lastFailure: { status: AnalyticsStatus; message: string } | null = null;

const toResult = (
  store: DayStore,
  status: AnalyticsStatus,
  message: string,
): LiveResult => ({
  rows: store.rows,
  paths: store.paths,
  downstream: store.downstream,
  status: status === "connected" && !store.rows.length ? "no-data" : status,
  message:
    status === "connected" && !store.rows.length
      ? "Connected to GA4, but no rows came back for these pages."
      : message,
  refreshedAt: lastPulled(store),
});

/**
 * GA4 data for the dashboard, served from a per-day cache. Only days never
 * pulled are requested (plus, on `force`, recent days GA4 may still revise),
 * so opening, restarting or switching period costs no Google calls. A failed
 * pull keeps serving the cache. Concurrent callers share one request. Never
 * throws.
 */
export function getLive(
  pageIds: readonly string[],
  trackingStart: string,
  opts: {
    force?: boolean;
    run?: Runner;
    /** Where the per-day cache lives; memory only when omitted. */
    persistFile?: string;
    /** Current time as an ISO string (tests). */
    now?: string;
  } = {},
): Promise<LiveResult> {
  inflight ??= (async (): Promise<LiveResult> => {
    const key = storeKey(pageIds, trackingStart);
    let store =
      memStore?.key === key
        ? memStore
        : (opts.persistFile && loadStore(opts.persistFile, key)) ||
          emptyStore(key);
    memStore = store;
    try {
      const nowIso = opts.now ?? new Date().toISOString();
      const today = denverDate(nowIso);
      const need = datesToFetch(store, RANGE_START, today, !!opts.force);
      if (!need.length && lastFailure)
        return toResult(store, lastFailure.status, lastFailure.message);
      if (!need.length)
        return toResult(
          store,
          "connected",
          `Showing cached GA4 data last pulled ${fmtDateTime(lastPulled(store) ?? nowIso)}. Refresh pulls the most recent days again.`,
        );
      const from = need[0];
      const [rows, paths, downstream] = await Promise.all([
        fetchRows(pageIds, trackingStart, opts.run, from),
        fetchPaths(pageIds, trackingStart, opts.run, from),
        fetchDownstream(opts.run, from),
      ]);
      store = applyFetch(store, need, { rows, paths, downstream }, nowIso);
      memStore = store;
      if (opts.persistFile) saveStore(opts.persistFile, store);
      lastFailure = null;
      return toResult(
        store,
        "connected",
        `Live GA4 data (property ${GA4_PROPERTY_ID}), ${need.length} ${need.length === 1 ? "day" : "days"} pulled. Recent days are preliminary.`,
      );
    } catch (e) {
      // Keep serving the cache, flagged, rather than blanking the UI.
      const { status, message } = classifyError(e);
      const when = lastPulled(store);
      const full = store.rows.length
        ? `${message} Showing cached data last pulled ${fmtDateTime(when ?? opts.now ?? new Date().toISOString())}.`
        : message;
      lastFailure = { status, message: full };
      return toResult(store, status, full);
    }
  })();
  // Cleared after assignment: a cache hit resolves before `inflight` is set, so
  // clearing inside the async body would leave that stale promise stuck here.
  const mine = inflight;
  void mine.finally(() => {
    if (inflight === mine) inflight = null;
  });
  return mine;
}

/** Forgets the in-memory cache (tests; simulates a server restart). */
export function resetLiveCache(): void {
  memStore = null;
  inflight = null;
  lastFailure = null;
}
