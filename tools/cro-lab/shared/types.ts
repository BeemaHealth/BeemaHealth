// Types shared by the CRO Lab server and web UI. No runtime imports.

/** "landing" pages run ad traffic and variants; "product" pages are tracked only. */
export type PageGroup = "landing" | "product";

export type PageDef = {
  id: string;
  path: string;
  group: PageGroup;
  /** Only landing pages have variants, experiments and go-live windows. */
  variants: boolean;
  /** Ad market, landing pages only. */
  market?: "Houston" | "Boston";
  title: string;
  /** Route file that renders the page (used for non-migrated pages). */
  routeFile: string;
};

/** "live" is never stored: it is derived from an open confirmed deployment. */
export type StoredStatus = "draft" | "ready" | "paused" | "archived";
/** "retired" is derived too: was live before, is not live now. */
export type VariantStatus = StoredStatus | "live" | "retired";

export type Variant = {
  /** Stable id, equals the component file name (without .tsx). */
  id: string;
  pageId: string;
  name: string;
  description: string;
  componentPath: string;
  createdAt: string;
  status: StoredStatus;
  parentId: string | null;
  hypothesis: string;
  /** The single element changed, e.g. "Hero image". */
  element: string;
  whyTested: string;
  expected: string;
  notes: string;
};

export type Deployment = {
  id: string;
  pageId: string;
  variantId: string;
  /** UTC ISO timestamps. */
  startUtc: string;
  endUtc: string | null;
  confirmed: boolean;
  commitSha?: string;
  notes?: string;
};

export const TEST_STATUSES = [
  "Idea",
  "Planned",
  "Building",
  "Live",
  "Completed",
] as const;
export type TestStatus = (typeof TEST_STATUSES)[number];
export type Priority = "High" | "Medium" | "Low";

export type TestIdea = {
  id: string;
  pageId: string;
  hypothesis: string;
  element: string;
  priority: Priority;
  status: TestStatus;
  expected: string;
  findings: string;
  followUp: string;
  variantId?: string;
};

export type LabData = {
  schemaVersion: 1;
  variants: Variant[];
  deployments: Deployment[];
  tests: TestIdea[];
  /** pageId -> variantId chosen for next deployment. Not the same as live. */
  readyToDeploy: Record<string, string>;
};

/** One day of GA4-shaped traffic for a page, by source/medium and campaign. */
export type DailyRow = {
  /** YYYY-MM-DD in the GA4 property time zone (America/Denver). */
  date: string;
  pageId: string;
  /** Raw GA4 sessionSourceMedium, e.g. "google / cpc". */
  sourceMedium: string;
  campaign: string;
  users: number;
  sessions: number;
  /** null = tracking did not exist or was unverified for that day. */
  handoffUsers: number | null;
  handoffEvents: number | null;
};

/**
 * One day of "where else did people go" for sessions that LANDED on `pageId`.
 * `page` is a page they viewed in that session (the landing page itself
 * included); `handoffSessions` is how many of those sessions fired
 * intake_handoff while on `page`. A session that views several pages appears
 * in several rows, so rows are never additive across `page`.
 */
export type PathRow = {
  date: string;
  pageId: string;
  /** Normalized path with a trailing slash, e.g. "/semaglutide-houston/". */
  page: string;
  sessionsViewed: number;
  /** null = handoff tracking did not exist for that day. */
  handoffSessions: number | null;
};

/** Events Bask's GTM container sends after the marketing handoff. */
export const DOWNSTREAM_EVENTS = ["signup", "purchase"] as const;
export type DownstreamEvent = (typeof DOWNSTREAM_EVENTS)[number];

/**
 * One day of a Bask-side event (signup, purchase). These fire on
 * q.beemahealth.com, where GA4 has no landing page for the session. A row is
 * tied to a landing page only through the `cta_id` still on the Bask URL.
 */
export type DownstreamRow = {
  date: string;
  event: DownstreamEvent;
  /**
   * Landing page whose CTA led here, from cta_id. null = no cta_id, or a
   * cta_id from a page the lab does not track (home, learn, ...).
   */
  pageId: string | null;
  users: number;
  events: number;
};

export type AnalyticsStatus =
  | "demo"
  | "not-connected"
  | "connected"
  | "auth-expired"
  | "insufficient-permissions"
  | "api-unavailable"
  | "no-data";

export type Mode = "demo" | "live";

export type LabState = {
  mode: Mode;
  pages: PageDef[];
  data: LabData;
  devUrl: string;
  analytics: {
    status: AnalyticsStatus;
    message: string;
    /** First date intake_handoff was verified in GA4. */
    trackingStart: string | null;
    refreshedAt: string | null;
  };
  /** pageId -> variant the local code serves (experiments.json). Live mode only. */
  mainVariants: Record<string, string | null>;
  /** True when variant files are really created on disk (live mode). */
  writesFiles: boolean;
  /** Live mode only. */
  staging: StagingState | null;
};

export type CreateVariantInput = {
  pageId: string;
  baseVariantId: string;
  name: string;
  hypothesis: string;
  element: string;
  whyTested?: string;
  expected?: string;
};

/** Deploys the working tree (committed or not) to staging.beemahealth.com. */
export type StagingState = {
  status: "idle" | "running" | "succeeded" | "failed";
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  /** Last lines of the deploy script output. */
  log: string[];
  /** Last successful deploy: what each landing page's main variant was. */
  deployed: {
    at: string;
    mains: Record<string, string | null>;
  } | null;
  url: string;
};
