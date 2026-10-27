import test from "node:test";
import assert from "node:assert/strict";
import {
  attributeDays,
  bySource,
  compareToBaseline,
  downstreamRates,
  downstreamTotals,
  pageDownstream,
  trackingWarningText,
  pathGroup,
  pathSummary,
  sourceKind,
  sumRows,
  validateWindows,
  variantReport,
} from "./metrics.ts";
import {
  denverDate,
  denverDayStartMs,
  denverLocalToIso,
  denverLocalValue,
} from "./time.ts";
import type { DailyRow, Deployment, DownstreamRow, PathRow } from "./types.ts";

const dep = (
  id: string,
  variantId: string,
  startUtc: string,
  endUtc: string | null,
): Deployment => ({
  id,
  pageId: "p",
  variantId,
  startUtc,
  endUtc,
  confirmed: true,
});
const row = (
  date: string,
  users: number,
  handoff: number | null,
  sm = "google / cpc",
): DailyRow => ({
  date,
  pageId: "p",
  sourceMedium: sm,
  campaign: "c",
  users,
  sessions: users,
  handoffUsers: handoff,
  handoffEvents: handoff,
});
const midnight = (d: string) => new Date(denverDayStartMs(d)).toISOString();

test("Denver day boundaries respect DST", () => {
  assert.equal(
    new Date(denverDayStartMs("2026-07-01")).toISOString(),
    "2026-07-01T06:00:00.000Z",
  );
  assert.equal(
    new Date(denverDayStartMs("2026-12-01")).toISOString(),
    "2026-12-01T07:00:00.000Z",
  );
  assert.equal(denverDate("2026-10-20T05:59:59Z"), "2026-10-19");
  assert.equal(denverDate("2026-10-20T06:00:00Z"), "2026-10-20");
});

test("rejects overlapping confirmed windows and allows touching ones", () => {
  assert.deepEqual(
    validateWindows([
      dep("a", "v1", midnight("2026-09-01"), midnight("2026-09-05")),
      dep("b", "v2", midnight("2026-09-05"), null),
    ]),
    [],
  );
  assert.equal(
    validateWindows([
      dep("a", "v1", midnight("2026-09-01"), midnight("2026-09-06")),
      dep("b", "v2", midnight("2026-09-05"), null),
    ]).length,
    1,
  );
  assert.equal(
    validateWindows([
      dep("a", "v1", midnight("2026-09-01"), null),
      dep("b", "v2", midnight("2026-09-05"), null),
    ]).length,
    1,
  );
});

test("mid-day transitions are ambiguous, not silently assigned", () => {
  const deps = [
    dep("a", "v1", midnight("2026-09-01"), "2026-09-04T21:30:00Z"),
    dep("b", "v2", "2026-09-04T21:30:00Z", null),
  ];
  const a = attributeDays(
    deps,
    "2026-09-01",
    "2026-09-06",
    Date.parse("2026-09-06T18:00:00Z"),
  );
  assert.equal(a.byDate.get("2026-09-03")?.variantId, "v1");
  assert.ok(a.ambiguous.has("2026-09-04"));
  assert.equal(a.byDate.get("2026-09-05")?.variantId, "v2");
});

test("unconfirmed windows never attribute traffic", () => {
  const d: Deployment = {
    ...dep("a", "v1", midnight("2026-09-01"), null),
    confirmed: false,
  };
  assert.equal(attributeDays([d], "2026-09-01", "2026-09-03").byDate.size, 0);
});

test("missing tracking is null, never zero", () => {
  const t = sumRows([
    row("2026-09-01", 100, null),
    row("2026-09-02", 100, null),
  ]);
  assert.equal(t.clickers, null);
  assert.equal(t.rate, null);
  assert.equal(t.untrackedDays, 2);
});

test("partial tracking uses tracked days only for the rate", () => {
  const t = sumRows([
    row("2026-09-01", 100, null),
    row("2026-09-02", 100, 10),
    row("2026-09-03", 100, 20),
  ]);
  assert.equal(t.visitors, 300);
  assert.equal(t.trackedVisitors, 200);
  assert.equal(t.clickers, 30);
  assert.equal(t.rate, 0.15);
});

test("a variant live twice aggregates both windows and excludes the other variant", () => {
  const deps = [
    dep("a", "v1", midnight("2026-09-01"), midnight("2026-09-03")),
    dep("b", "v2", midnight("2026-09-03"), midnight("2026-09-04")),
    dep("c", "v1", midnight("2026-09-04"), null),
  ];
  const rows = ["01", "02", "03", "04", "05"].map((d) =>
    row(`2026-09-${d}`, 100, 10),
  );
  const r = variantReport({
    rows,
    deployments: deps,
    pageId: "p",
    variantId: "v1",
    from: "2026-09-01",
    to: "2026-09-05",
    nowMs: Date.parse("2026-09-06T00:00:00Z"),
  });
  assert.equal(r.totals.visitors, 400);
  assert.equal(r.windows.length, 2);
  const only = variantReport({
    rows,
    deployments: deps,
    pageId: "p",
    variantId: "v1",
    from: "2026-09-01",
    to: "2026-09-05",
    windowIds: ["a"],
  });
  assert.equal(only.totals.visitors, 200);
});

test("source kind comes from medium; facebook referral is never paid", () => {
  assert.equal(sourceKind("google / cpc"), "Paid search");
  assert.equal(sourceKind("facebook / paid_social"), "Paid social");
  assert.equal(sourceKind("m.facebook.com / referral"), "Referral / social");
  assert.equal(sourceKind("facebook / social"), "Referral / social");
  assert.equal(sourceKind("(direct) / (none)"), "Direct");
});

test("source filtering groups funnel totals", () => {
  const rows = [
    row("2026-09-01", 100, 10, "google / cpc"),
    row("2026-09-01", 50, 5, "google / organic"),
    row("2026-09-02", 100, 20, "google / cpc"),
  ];
  const s = bySource(rows);
  assert.equal(s[0].sourceMedium, "google / cpc");
  assert.equal(s[0].totals.visitors, 200);
  assert.equal(s[0].totals.rate, 0.15);
});

test("evidence: small samples are insufficient, large real gaps persuasive", () => {
  const mk = (v: number, c: number) => sumRows([row("2026-09-30", v, c)]);
  assert.equal(
    compareToBaseline(mk(100, 20), mk(100, 10)).level,
    "insufficient",
  );
  assert.equal(
    compareToBaseline(mk(2000, 300), mk(2000, 200)).level,
    "persuasive",
  );
  assert.equal(
    compareToBaseline(mk(2000, 210), mk(2000, 200)).level,
    "directional",
  );
  assert.equal(
    compareToBaseline(sumRows([row("2026-09-01", 900, null)]), mk(2000, 200))
      .level,
    "none",
  );
});

test("Denver wall-clock input converts to UTC across DST and round-trips", () => {
  assert.equal(
    denverLocalToIso("2026-07-01T09:30"),
    "2026-07-01T15:30:00.000Z",
  );
  assert.equal(
    denverLocalToIso("2026-12-01T09:30"),
    "2026-12-01T16:30:00.000Z",
  );
  assert.equal(denverLocalToIso("2026-03-08T02:30"), null); // spring-forward gap
  assert.equal(denverLocalToIso("garbage"), null);
  assert.equal(
    denverLocalValue(new Date("2026-10-21T16:05:00Z")),
    "2026-10-21T10:05",
  );
});

const pr = (
  page: string,
  sessionsViewed: number,
  handoffSessions: number | null,
  date = "2026-10-20",
): PathRow => ({
  date,
  pageId: "glp-1-houston",
  page,
  sessionsViewed,
  handoffSessions,
});

test("pathGroup folds learn articles and home", () => {
  assert.equal(pathGroup("/"), "Home page");
  assert.equal(pathGroup("/learn/a/b/"), "Learn articles");
  assert.equal(pathGroup("/about/"), "/about/");
});

test("pathSummary separates landing, direct handoffs, and other pages", () => {
  const s = pathSummary([
    pr("/glp-1-houston/", 10, 2),
    pr("/glp-1-houston/", 5, 1, "2026-10-21"),
    pr("/semaglutide-houston/", 3, 1),
    pr("/learn/x/", 2, 0),
    pr("/learn/y/", 1, 0),
  ]);
  assert.equal(s.landed, 15);
  assert.equal(s.direct, 3);
  assert.deepEqual(
    s.destinations.map((d) => [d.label, d.sessions, d.handoffs]),
    [
      ["/semaglutide-houston/", 3, 1],
      ["Learn articles", 3, 0],
    ],
  );
});

test("pathSummary keeps untracked days null and caps the list", () => {
  const s = pathSummary(
    [
      pr("/glp-1-houston/", 4, null),
      pr("/a/", 5, null),
      pr("/b/", 4, null),
      pr("/c/", 3, null),
    ],
    2,
  );
  assert.equal(s.direct, null);
  assert.equal(s.destinations.length, 3);
  assert.equal(s.destinations[2].label, "1 other pages");
  assert.equal(s.destinations[2].handoffs, null);
});

test("downstreamTotals adds unique users per event across days", () => {
  const rows: DownstreamRow[] = [
    { date: "2026-10-20", event: "signup", pageId: null, users: 2, events: 2 },
    { date: "2026-10-21", event: "signup", pageId: "p", users: 1, events: 4 },
    { date: "2026-10-21", event: "purchase", pageId: "p", users: 1, events: 1 },
  ];
  assert.deepEqual(downstreamTotals(rows), { signups: 3, purchases: 1 });
  assert.deepEqual(downstreamTotals([]), { signups: 0, purchases: 0 });
});

test("pageDownstream keeps one page's events on handoff-tracked days only", () => {
  const rows = [
    {
      date: "2026-10-19",
      pageId: "p",
      sourceMedium: "a",
      campaign: "c",
      users: 5,
      sessions: 5,
      handoffUsers: null,
      handoffEvents: null,
    },
    {
      date: "2026-10-20",
      pageId: "p",
      sourceMedium: "a",
      campaign: "c",
      users: 5,
      sessions: 5,
      handoffUsers: 1,
      handoffEvents: 1,
    },
  ] satisfies DailyRow[];
  const down: DownstreamRow[] = [
    { date: "2026-10-19", event: "signup", pageId: "p", users: 9, events: 9 },
    { date: "2026-10-20", event: "signup", pageId: "p", users: 2, events: 2 },
    {
      date: "2026-10-20",
      event: "signup",
      pageId: "other",
      users: 7,
      events: 7,
    },
    { date: "2026-10-20", event: "signup", pageId: null, users: 4, events: 4 },
    { date: "2026-10-20", event: "purchase", pageId: "p", users: 1, events: 1 },
  ];
  assert.deepEqual(pageDownstream(down, "p", rows), {
    signups: 2,
    purchases: 1,
  });
});

test("trackingWarningText flags partial and missing handoff tracking", () => {
  const row = (date: string, users: number, h: number | null): DailyRow => ({
    date,
    pageId: "p",
    sourceMedium: "a",
    campaign: "c",
    users,
    sessions: users,
    handoffUsers: h,
    handoffEvents: h,
  });
  const partial = sumRows([
    row("2026-10-12", 900, null),
    row("2026-10-20", 24, 3),
  ]);
  const text = trackingWarningText(partial, "2026-10-19");
  assert.match(text ?? "", /not running on 1 of the 2 days/);
  assert.match(
    text ?? "",
    /only the 24 visitors from the 1 day tracked, not all 924/,
  );
  assert.match(text ?? "", /started Oct 19/i);
  const none = sumRows([row("2026-10-12", 900, null)]);
  assert.match(trackingWarningText(none, null) ?? "", /any of the 1 day/);
  assert.equal(
    trackingWarningText(sumRows([row("2026-10-20", 5, 1)]), "2026-10-19"),
    null,
  );
  assert.equal(trackingWarningText(sumRows([]), "2026-10-19"), null);
});

test("downstreamRates divides by handoffs, visitors and signups", () => {
  const r = downstreamRates(
    { trackedVisitors: 200, clickers: 50 },
    { signups: 10, purchases: 4 },
  );
  assert.equal(r.signupOfHandoff, 0.2);
  assert.equal(r.signupOfVisitors, 0.05);
  assert.equal(r.purchaseOfSignup, 0.4);
  assert.equal(r.purchaseOfVisitors, 0.02);
});

test("downstreamRates is null when a denominator is missing or zero", () => {
  const r = downstreamRates(
    { trackedVisitors: 0, clickers: null },
    { signups: 0, purchases: 0 },
  );
  assert.deepEqual(r, {
    signupOfHandoff: null,
    signupOfVisitors: null,
    purchaseOfSignup: null,
    purchaseOfVisitors: null,
  });
});
