// DEMO fixtures. Everything here is synthetic and labelled DEMO in the UI.
import type {
  DailyRow,
  DownstreamRow,
  PathRow,
  Deployment,
  LabData,
  TestIdea,
  Variant,
} from "../shared/types.ts";
import { PAGES, TRACKED_PAGES, pagePathFor } from "../shared/pages.ts";
import {
  addDays,
  denverDate,
  denverDayStartMs,
  eachDate,
} from "../shared/time.ts";

export const DEMO_START = "2026-09-01";
/** Demo only: pretend handoff tracking began here so older windows show "not tracked". */
export const DEMO_TRACKING_START = "2026-09-05";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function rand(seed: string): number {
  let t = (hash(seed) + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

type Plan = {
  id: string;
  name: string;
  element: string;
  hypothesis: string;
  days: number | null;
  startsMid?: boolean;
  status?: Variant["status"];
};

const iso = (date: string, hour = 0, min = 0) =>
  new Date(denverDayStartMs(date) + (hour * 60 + min) * 60_000).toISOString();

const PLANS: Record<string, Plan[]> = {
  "tirzepatide-houston": [
    {
      id: "v1-control",
      name: "Control",
      element: "None",
      hypothesis: "Baseline.",
      days: 13,
    },
    {
      id: "v2-price-first",
      name: "Price-first hero",
      element: "Hero headline",
      hypothesis:
        "Leading with the monthly price lowers hesitation for cost-sensitive searchers.",
      days: 3,
    },
    {
      id: "v1-control",
      name: "Control",
      element: "None",
      hypothesis: "Baseline.",
      days: 11,
    },
    {
      id: "v3-video-hero",
      name: "Video hero",
      element: "Hero image",
      hypothesis:
        "A short provider video builds trust faster than a static photo.",
      days: 15,
    },
    {
      id: "v4-reviews-block",
      name: "Reviews above fold",
      element: "Social proof",
      hypothesis:
        "Showing patient reviews above the fold increases handoff clicks.",
      days: null,
      startsMid: true,
    },
    {
      id: "v5-short-page",
      name: "Short page",
      element: "Page length",
      hypothesis:
        "Cutting FAQ and comparison sections reduces drop-off before the CTA.",
      days: 0,
      status: "draft",
    },
  ],
  "glp-1-houston": [
    {
      id: "v1-control",
      name: "Control",
      element: "None",
      hypothesis: "Baseline.",
      days: 8,
    },
    {
      id: "v2-cta-start-today",
      name: "CTA: Start today",
      element: "CTA wording",
      hypothesis: "Action-oriented CTA copy beats 'Get started'.",
      days: 6,
    },
    {
      id: "v3-trust-badges",
      name: "Trust badge row",
      element: "Trust badges",
      hypothesis:
        "LegitScript and licensed-provider badges near the CTA lift clicks.",
      days: 7,
    },
    {
      id: "v4-pricing-card",
      name: "Pricing card",
      element: "Pricing presentation",
      hypothesis: "A single pricing card clarifies what is included.",
      days: 5,
    },
    {
      id: "v5-hero-image",
      name: "New hero image",
      element: "Hero image",
      hypothesis: "A lifestyle photo beats the product photo.",
      days: 6,
    },
    {
      id: "v6-testimonials",
      name: "Testimonials",
      element: "Testimonials",
      hypothesis: "Three short testimonials reduce hesitation.",
      days: 7,
    },
    {
      id: "v7-two-column",
      name: "Two-column layout",
      element: "Page layout",
      hypothesis: "Sticky CTA column keeps the next step visible.",
      days: null,
    },
    {
      id: "v8-faq-first",
      name: "FAQ first",
      element: "Page layout",
      hypothesis: "Answering safety questions first lowers bounce.",
      days: 0,
      status: "paused",
    },
    {
      id: "v9-long-form",
      name: "Long-form story",
      element: "Page length",
      hypothesis: "Long explainer converts higher-intent traffic.",
      days: 0,
      status: "archived",
    },
    {
      id: "v10-compare-table",
      name: "Compare table",
      element: "Page layout",
      hypothesis: "A comparison table with competitors speeds decisions.",
      days: 0,
      status: "ready",
    },
  ],
  "semaglutide-houston": [
    {
      id: "v1-control",
      name: "Control",
      element: "None",
      hypothesis: "Baseline.",
      days: 25,
    },
    {
      id: "v2-guarantee",
      name: "Money-back note",
      element: "Trust badges",
      hypothesis: "A visible refund policy removes purchase anxiety.",
      days: null,
    },
  ],
  "sildenafil-boston": [
    {
      id: "v1-control",
      name: "Control",
      element: "None",
      hypothesis: "Baseline.",
      days: 18,
    },
    {
      id: "v2-discreet-shipping",
      name: "Discreet shipping",
      element: "Hero headline",
      hypothesis: "Emphasizing discreet delivery matters for ED buyers.",
      days: 14,
    },
    {
      id: "v3-sticky-cta",
      name: "Sticky mobile CTA",
      element: "CTA wording",
      hypothesis: "A sticky mobile CTA lifts clicks on long scrolls.",
      days: null,
    },
  ],
  "tadalafil-boston": [
    {
      id: "v1-control",
      name: "Control",
      element: "None",
      hypothesis: "Baseline.",
      days: null,
    },
  ],
  "ed-mints-boston": [
    {
      id: "v1-control",
      name: "Control",
      element: "None",
      hypothesis: "Baseline.",
      days: 20,
    },
    {
      id: "v2-no-pill-hero",
      name: "No-pill hero",
      element: "Hero image",
      hypothesis: "Mint imagery feels less clinical.",
      days: 0,
      status: "draft",
    },
  ],
};

export function seedDemo(today = denverDate(new Date())): LabData {
  const variants: Variant[] = [];
  const deployments: Deployment[] = [];
  const tests: TestIdea[] = [];
  const readyToDeploy: Record<string, string> = {};
  for (const page of PAGES) {
    const plan = PLANS[page.id] ?? [];
    let cursor = DEMO_START;
    let n = 0;
    let prevId: string | null = null;
    for (const p of plan) {
      if (!variants.some((v) => v.pageId === page.id && v.id === p.id)) {
        variants.push({
          id: p.id,
          pageId: page.id,
          name: p.name,
          description: `[DEMO] ${p.name}`,
          componentPath: `src/landing-variants/${page.id}/${p.id}.tsx`,
          createdAt: iso(cursor, 9),
          status: p.status ?? "draft",
          parentId: p.id === "v1-control" ? null : "v1-control",
          hypothesis: p.hypothesis,
          element: p.element,
          whyTested:
            p.id === "v1-control"
              ? "Reference point for everything else."
              : `Tests ${p.element.toLowerCase()} while holding the rest constant.`,
          expected:
            p.id === "v1-control"
              ? ""
              : "Higher intake handoff rate than control.",
          notes: "",
        });
      }
      if (p.days === 0) continue;
      const start = p.startsMid ? iso(cursor, 15, 30) : iso(cursor);
      let end: string | null = null;
      if (p.days !== null) {
        const endDate = addDays(cursor, p.days);
        end = iso(endDate);
        cursor = endDate;
      }
      deployments.push({
        id: `${page.id}-w${++n}`,
        pageId: page.id,
        variantId: p.id,
        startUtc: start,
        endUtc: end,
        confirmed: true,
        notes: "[DEMO]",
      });
      prevId = p.id;
    }
    void prevId;
  }
  // End-date sanity: windows must not run past today.
  for (const d of deployments) {
    if (d.endUtc && d.endUtc > new Date().toISOString()) d.endUtc = null;
  }
  tests.push(
    {
      id: "t1",
      pageId: "tirzepatide-houston",
      hypothesis: "Removing the comparison table shortens the path to CTA.",
      element: "Page length",
      priority: "High",
      status: "Planned",
      expected: "+10% handoff rate",
      findings: "",
      followUp: "",
      variantId: "v5-short-page",
    },
    {
      id: "t2",
      pageId: "tirzepatide-houston",
      hypothesis: "Reviews above the fold beat video hero.",
      element: "Social proof",
      priority: "Medium",
      status: "Live",
      expected: "Higher rate than video hero",
      findings: "",
      followUp: "",
      variantId: "v4-reviews-block",
    },
    {
      id: "t3",
      pageId: "glp-1-houston",
      hypothesis: "Comparison table speeds decisions.",
      element: "Page layout",
      priority: "High",
      status: "Building",
      expected: "Lower bounce",
      findings: "",
      followUp: "",
      variantId: "v10-compare-table",
    },
    {
      id: "t4",
      pageId: "semaglutide-houston",
      hypothesis: "Pricing card clarity lifts clicks.",
      element: "Pricing presentation",
      priority: "Medium",
      status: "Planned",
      expected: "+8%",
      findings: "",
      followUp: "",
    },
    {
      id: "t5",
      pageId: "sildenafil-boston",
      hypothesis: "Pharmacist Q&A block builds trust.",
      element: "Trust badges",
      priority: "Low",
      status: "Idea",
      expected: "",
      findings: "",
      followUp: "",
    },
    {
      id: "t6",
      pageId: "glp-1-houston",
      hypothesis: "CTA wording test.",
      element: "CTA wording",
      priority: "Medium",
      status: "Completed",
      expected: "Start today wins",
      findings: "Directional lift only; repeat with more traffic.",
      followUp: "Re-run during the next ad flight.",
    },
  );
  readyToDeploy["glp-1-houston"] = "v10-compare-table";
  void today;
  return { schemaVersion: 1, variants, deployments, tests, readyToDeploy };
}

const SOURCES = [
  { sm: "google / cpc", campaign: "houston-glp1-generic", w: 0.34, mult: 1.0 },
  { sm: "google / cpc", campaign: "brand-beema", w: 0.12, mult: 1.45 },
  {
    sm: "facebook / paid_social",
    campaign: "meta-prospecting-q4",
    w: 0.2,
    mult: 0.7,
  },
  { sm: "google / organic", campaign: "(organic)", w: 0.18, mult: 1.1 },
  {
    sm: "m.facebook.com / referral",
    campaign: "(referral)",
    w: 0.06,
    mult: 0.9,
  },
  { sm: "(direct) / (none)", campaign: "(direct)", w: 0.1, mult: 1.2 },
];

/** Synthetic GA4-shaped rows. Rate depends on the variant serving each day. */
export function demoRows(
  data: LabData,
  today = denverDate(new Date()),
): DailyRow[] {
  const rows: DailyRow[] = [];
  for (const page of TRACKED_PAGES) {
    const base =
      page.market === "Houston" ? 70 : page.market === "Boston" ? 38 : 26;
    const deps = data.deployments.filter((d) => d.pageId === page.id);
    for (const date of eachDate(DEMO_START, today)) {
      const s = denverDayStartMs(date) + 12 * 3600_000;
      const dep = deps.find(
        (d) =>
          Date.parse(d.startUtc) <= s &&
          (d.endUtc === null || Date.parse(d.endUtc) > s),
      );
      const vRate =
        0.05 + rand(`${page.id}|${dep?.variantId ?? "none"}`) * 0.09;
      const day = base * (0.75 + rand(`${page.id}|${date}`) * 0.6);
      for (const src of SOURCES) {
        const users = Math.round(
          day *
            src.w *
            (0.8 + rand(`${page.id}|${date}|${src.campaign}`) * 0.4),
        );
        if (users <= 0) continue;
        const tracked = date >= DEMO_TRACKING_START;
        const clickers = Math.min(
          users,
          Math.round(
            users *
              vRate *
              src.mult *
              (0.8 + rand(`h|${page.id}|${date}|${src.sm}`) * 0.4),
          ),
        );
        rows.push({
          date,
          pageId: page.id,
          sourceMedium: src.sm,
          campaign: src.campaign,
          users,
          sessions: Math.round(users * 1.12),
          handoffUsers: tracked ? clickers : null,
          handoffEvents: tracked ? Math.round(clickers * 1.08) : null,
        });
      }
    }
  }
  return rows;
}

const DEMO_DESTINATIONS = [
  { page: "/semaglutide-houston/", w: 0.3 },
  { page: "/tirzepatide-houston/", w: 0.26 },
  { page: "/weight-loss/", w: 0.2 },
  { page: "/learn/weight-loss/semaglutide-in-texas/", w: 0.14 },
  { page: "/about/", w: 0.1 },
];

/** Synthetic path rows derived from demo daily rows so the two always agree. */
export function demoPaths(rows: DailyRow[]): PathRow[] {
  const byDay = new Map<
    string,
    { sessions: number; handoffs: number | null }
  >();
  for (const r of rows) {
    const k = `${r.date}|${r.pageId}`;
    const g = byDay.get(k) ?? { sessions: 0, handoffs: null };
    g.sessions += r.sessions;
    if (r.handoffUsers !== null)
      g.handoffs = (g.handoffs ?? 0) + r.handoffUsers;
    byDay.set(k, g);
  }
  const out: PathRow[] = [];
  for (const [k, g] of byDay) {
    const [date, pageId] = k.split("|");
    const own = g.handoffs === null ? null : Math.round(g.handoffs * 0.78);
    out.push({
      date,
      pageId,
      page: pagePathFor(pageId) ?? `/${pageId}/`,
      sessionsViewed: g.sessions,
      handoffSessions: own,
    });
    const elsewhere = g.handoffs === null ? null : g.handoffs - (own ?? 0);
    for (const d of DEMO_DESTINATIONS) {
      const viewed = Math.round(
        g.sessions * 0.22 * d.w * (0.7 + rand(`p|${k}|${d.page}`) * 0.6),
      );
      if (viewed <= 0) continue;
      out.push({
        date,
        pageId,
        page: d.page,
        sessionsViewed: viewed,
        handoffSessions:
          elsewhere === null
            ? null
            : Math.min(viewed, Math.round(elsewhere * d.w)),
      });
    }
  }
  return out.sort(
    (a, b) => a.date.localeCompare(b.date) || a.pageId.localeCompare(b.pageId),
  );
}

/**
 * Synthetic Bask signup and purchase counts derived from demo handoffs so the
 * funnel narrows sensibly, attributed to a page like the live data (a share of
 * signups carries no page).
 */
export function demoDownstream(rows: DailyRow[]): DownstreamRow[] {
  const handoffs = new Map<
    string,
    { date: string; pageId: string; n: number }
  >();
  for (const r of rows) {
    if (r.handoffUsers === null) continue;
    const k = `${r.date}|${r.pageId}`;
    const g = handoffs.get(k) ?? { date: r.date, pageId: r.pageId, n: 0 };
    g.n += r.handoffUsers;
    handoffs.set(k, g);
  }
  const out: DownstreamRow[] = [];
  const add = (
    date: string,
    event: DownstreamRow["event"],
    pageId: string | null,
    n: number,
  ) => {
    if (n > 0) out.push({ date, event, pageId, users: n, events: n });
  };
  const days = new Set<string>();
  for (const { date, pageId, n } of handoffs.values()) {
    days.add(date);
    const signups = Math.round(n * (0.45 + rand(`s|${date}|${pageId}`) * 0.2));
    const purchases = Math.round(
      signups * (0.35 + rand(`b|${date}|${pageId}`) * 0.2),
    );
    add(date, "signup", pageId, signups);
    add(date, "purchase", pageId, purchases);
  }
  for (const date of days) {
    const stray = Math.round(rand(`x|${date}`) * 2);
    add(date, "signup", null, stray);
  }
  return out.sort(
    (a, b) => a.date.localeCompare(b.date) || a.event.localeCompare(b.event),
  );
}
