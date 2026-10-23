import test from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import {
  classifyError,
  ctaIdFromLocation,
  fetchDownstream,
  fetchPaths,
  fetchRows,
  getLive,
  resetLiveCache,
  pageIdFromPath,
} from "./ga4.ts";

const IDS = ["glp-1-houston", "tirzepatide-houston"];
const row = (dims: string[], mets: number[]) => ({
  dimensionValues: dims.map((value) => ({ value })),
  metricValues: mets.map((n) => ({ value: String(n) })),
});

test("pageIdFromPath accepts trailing slash and rejects other paths", () => {
  assert.equal(pageIdFromPath("/glp-1-houston/", IDS), "glp-1-houston");
  assert.equal(pageIdFromPath("/glp-1-houston", IDS), "glp-1-houston");
  assert.equal(pageIdFromPath("/glp-1-houston/x", IDS), null);
  assert.equal(pageIdFromPath("/../etc/passwd", IDS), null);
});

test("fetchRows merges page views and handoffs, nulls handoff before tracking start", async () => {
  const calls: string[] = [];
  const rows = await fetchRows(IDS, "2026-10-19", async (req) => {
    const events = JSON.stringify(req);
    if (events.includes("intake_handoff")) {
      calls.push("handoff");
      return [
        row(["20261020", "/glp-1-houston/", "google / cpc", "c1"], [2, 3]),
      ];
    }
    calls.push("views");
    return [
      row(["20261018", "/glp-1-houston/", "google / cpc", "c1"], [10, 12]),
      row(["20261020", "/glp-1-houston/", "google / cpc", "c1"], [20, 25]),
      row(["20261020", "/other/", "google / cpc", "c1"], [99, 99]),
    ];
  });
  assert.deepEqual(calls.sort(), ["handoff", "views"]);
  assert.equal(rows.length, 2);
  const [before, after] = rows;
  assert.equal(before.date, "2026-10-18");
  assert.equal(before.handoffUsers, null);
  assert.equal(after.users, 20);
  assert.equal(after.sessions, 25);
  assert.equal(after.handoffUsers, 2);
  assert.equal(after.handoffEvents, 3);
});

test("days at or after tracking start with no handoff row report zero, not null", async () => {
  const rows = await fetchRows(IDS, "2026-10-19", async (req) =>
    JSON.stringify(req).includes("intake_handoff")
      ? []
      : [
          row(
            ["20261021", "/tirzepatide-houston/", "(direct) / (none)", ""],
            [4, 4],
          ),
        ],
  );
  assert.equal(rows[0].handoffUsers, 0);
  assert.equal(rows[0].campaign, "(not set)");
});

test("getLive keeps the last loaded rows when a later refresh fails", async () => {
  resetLiveCache();
  const good = await getLive(IDS, "2026-10-19", {
    force: true,
    run: async (req) =>
      JSON.stringify(req).includes("intake_handoff")
        ? []
        : [row(["20261021", "/glp-1-houston/", "google / cpc", "c1"], [5, 6])],
  });
  assert.equal(good.status, "connected");

  const stale = await getLive(IDS, "2026-10-19", {
    force: true,
    run: async () => {
      throw new Error("socket hang up");
    },
  });
  assert.equal(stale.status, "api-unavailable");
  assert.deepEqual(stale.rows, good.rows);
  assert.match(stale.message, /Showing cached data last pulled/);
});

test("classifyError separates auth, permission, and other failures", () => {
  assert.equal(
    classifyError({ code: 16, message: "Getting metadata from plugin failed" })
      .status,
    "auth-expired",
  );
  assert.equal(
    classifyError(new Error("invalid_grant: Token has been expired")).status,
    "auth-expired",
  );
  assert.equal(
    classifyError(
      new Error(
        "ACCESS_TOKEN_SCOPE_INSUFFICIENT: Request had insufficient authentication scopes",
      ),
    ).status,
    "auth-expired",
  );
  assert.match(
    classifyError(new Error("invalid_grant: reauth required")).message,
    /--impersonate-service-account=beema-cro-analytics@/,
  );
  assert.equal(
    classifyError({ code: 7, message: "PERMISSION_DENIED" }).status,
    "insufficient-permissions",
  );
  assert.equal(
    classifyError(new Error("socket hang up")).status,
    "api-unavailable",
  );
});

test("fetchPaths merges views and handoffs by landing page and destination", async () => {
  const paths = await fetchPaths(IDS, "2026-10-19", async (req) =>
    JSON.stringify(req).includes('"intake_handoff"')
      ? [
          row(["20261020", "/glp-1-houston", "/glp-1-houston/"], [2]),
          row(["20261020", "/glp-1-houston", "/semaglutide-houston"], [1]),
          row(["20261020", "(not set)", "/weight-loss/"], [5]),
        ]
      : [
          row(["20261018", "/glp-1-houston", "/glp-1-houston/"], [9]),
          row(["20261020", "/glp-1-houston", "/glp-1-houston/"], [10]),
          row(["20261020", "/glp-1-houston", "/semaglutide-houston/"], [3]),
          row(["20261020", "/other", "/about/"], [99]),
        ],
  );
  assert.equal(paths.length, 3);
  const [old, own, sema] = paths;
  assert.equal(old.handoffSessions, null);
  assert.equal(own.sessionsViewed, 10);
  assert.equal(own.handoffSessions, 2);
  assert.equal(sema.page, "/semaglutide-houston/");
  assert.equal(sema.sessionsViewed, 3);
  assert.equal(sema.handoffSessions, 1);
});

test("fetchDownstream ties Bask events to a page by cta_id and excludes GTM Preview", async () => {
  let request = "";
  const q = "https://q.beemahealth.com/start-online-visit/weightloss";
  const out = await fetchDownstream(async (req) => {
    request = JSON.stringify(req);
    return [
      row(["20261021", "signup", `${q}?cta_id=glp1_hero&utm_source=x`], [2, 3]),
      row(["20261021", "signup", `${q}?cta_id=glp1_footer`], [1, 1]),
      row(["20261021", "signup", `${q}?cta_id=footer`], [1, 1]),
      row(
        ["20261020", "purchase", `${q}?cta_id=tirzepatide_houston_hero`],
        [1, 1],
      ),
      row(
        [
          "20261020",
          "signup",
          "https://q.beemahealth.com/start-online-visit/draft-1",
        ],
        [1, 1],
      ),
      row(["20261020", "intake_handoff", `${q}?cta_id=glp1_hero`], [9, 9]),
    ];
  });
  assert.deepEqual(
    out.map((r) => [r.date, r.event, r.pageId, r.users, r.events]),
    [
      ["2026-10-20", "purchase", "tirzepatide-houston", 1, 1],
      ["2026-10-20", "signup", null, 1, 1],
      ["2026-10-21", "signup", null, 1, 1],
      ["2026-10-21", "signup", "glp-1-houston", 3, 4],
    ],
  );
  assert.match(request, /q\.beemahealth\.com/);
  assert.match(request, /tagassistant\.google\.com/);
  assert.match(request, /gtm_debug/);
});

test("ctaIdFromLocation reads cta_id and tolerates bad URLs", () => {
  assert.equal(
    ctaIdFromLocation("https://q.x.com/a?cta_id=glp1_hero&b=1"),
    "glp1_hero",
  );
  assert.equal(ctaIdFromLocation("https://q.x.com/a"), null);
  assert.equal(ctaIdFromLocation("not a url"), null);
});

const NOW = "2026-10-23T15:00:00.000Z"; // 09:00 in Denver
const pageViewRun = (calls: string[]) => async (req: object) => {
  const json = JSON.stringify(req);
  calls.push(
    (json.match(/"startDate":"([\d-]+)"/)?.[1] ?? "?") +
      (json.includes("intake_handoff") ? " handoff" : " other"),
  );
  return json.includes("intake_handoff") || json.includes('"signup"')
    ? []
    : [row(["20261022", "/glp-1-houston/", "google / cpc", "c1"], [5, 6])];
};

test("getLive pulls once, then serves reloads and restarts from the day cache", async () => {
  resetLiveCache();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cro-days-"));
  const file = path.join(dir, "days.json");
  const calls: string[] = [];
  const run = pageViewRun(calls);

  const first = await getLive(IDS, "2026-10-19", {
    run,
    persistFile: file,
    now: NOW,
  });
  assert.equal(first.status, "connected");
  assert.equal(first.rows.length, 1);
  assert.equal(
    calls.length,
    5,
    "page views, handoffs, two path reports, signups",
  );
  assert.ok(
    calls.every((c) => c.startsWith("2026-08-01")),
    "first pull covers all history",
  );

  const again = await getLive(IDS, "2026-10-19", {
    run,
    persistFile: file,
    now: NOW,
  });
  assert.equal(calls.length, 5, "a reload makes no Google calls");
  assert.match(again.message, /cached GA4 data/);
  assert.deepEqual(again.rows, first.rows);

  resetLiveCache(); // server restart
  const restarted = await getLive(IDS, "2026-10-19", {
    run: async () => {
      throw new Error("must not call Google");
    },
    persistFile: file,
    now: NOW,
  });
  assert.equal(restarted.status, "connected");
  assert.deepEqual(restarted.rows, first.rows);

  fs.rmSync(dir, { recursive: true });
});

test("getLive pulls only the new day, and Refresh re-pulls only recent days", async () => {
  resetLiveCache();
  const calls: string[] = [];
  const run = pageViewRun(calls);
  await getLive(IDS, "2026-10-19", { run, now: NOW });
  calls.length = 0;

  // Next morning: only the new day is missing.
  const next = "2026-10-24T15:00:00.000Z";
  await getLive(IDS, "2026-10-19", { run, now: next });
  assert.equal(calls.length, 5);
  assert.ok(
    calls.every((c) => c.startsWith("2026-10-24")),
    calls.join(),
  );

  // Refresh: 10/21 onward were pulled while GA4 could still revise them (10/20
  // had settled), so they are pulled again and 10/20 is not.
  calls.length = 0;
  await getLive(IDS, "2026-10-19", { run, now: next, force: true });
  assert.equal(calls.length, 5);
  assert.ok(
    calls.every((c) => c.startsWith("2026-10-21")),
    calls.join(),
  );

  // A much later open pulls only the days after the last cached one.
  const later = "2026-11-30T15:00:00.000Z";
  calls.length = 0;
  await getLive(IDS, "2026-10-19", { run, now: later });
  assert.ok(
    calls.every((c) => c.startsWith("2026-10-25")),
    calls.join(),
  );
});

test("getLive falls back to the cache when Google fails after a restart", async () => {
  resetLiveCache();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cro-days-"));
  const file = path.join(dir, "days.json");
  await getLive(IDS, "2026-10-19", {
    run: pageViewRun([]),
    persistFile: file,
    now: NOW,
  });
  resetLiveCache();
  const failing = async () => {
    throw new Error("invalid_grant: reauth related error (invalid_rapt)");
  };
  const res = await getLive(IDS, "2026-10-19", {
    run: failing,
    persistFile: file,
    now: "2026-10-24T15:00:00.000Z", // a new day is missing, so Google is called
  });
  assert.equal(res.status, "auth-expired");
  assert.equal(res.rows.length, 1);
  assert.match(res.message, /Showing cached data last pulled/);
  fs.rmSync(dir, { recursive: true });
});
