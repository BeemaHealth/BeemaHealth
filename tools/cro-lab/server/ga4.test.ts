import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyError,
  ctaIdFromLocation,
  fetchDownstream,
  fetchPaths,
  fetchRows,
  getLive,
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
  assert.match(stale.message, /Showing the last loaded data/);
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
