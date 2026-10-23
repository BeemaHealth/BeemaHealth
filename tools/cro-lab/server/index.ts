// CRO Lab local server. Binds to 127.0.0.1 only. Never part of the site build.
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer as createVite } from "vite";
import { PAGES, TRACKED_PAGES } from "../shared/pages.ts";
import type {
  CreateVariantInput,
  LabState,
  Mode,
  TestIdea,
  Variant,
} from "../shared/types.ts";
import { TEST_STATUSES } from "../shared/types.ts";
import { Store } from "./store.ts";
import {
  demoDownstream,
  demoPaths,
  demoRows,
  seedDemo,
  DEMO_TRACKING_START,
} from "./demo.ts";
import { seedLive } from "./seed-live.ts";
import { getLive } from "./ga4.ts";
import {
  mainVariantId,
  readExperiments,
  withMain,
  writeExperiments,
} from "./experiments.ts";
import {
  duplicateVariantFile,
  nextVariantId,
  syncWithDisk,
} from "./variants.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const labRoot = path.resolve(here, "..");
const repoRoot = path.resolve(labRoot, "../..");
/** Landing pages: variants, experiments, go-live windows. */
const PAGE_IDS = PAGES.map((p) => p.id);
/** Every page analytics is read for (landing + product + home). */
const TRACKED_IDS = TRACKED_PAGES.map((p) => p.id);
const PORT = Number(process.env.CRO_PORT ?? 8787);
const DEV_URL = process.env.CRO_DEV_URL ?? "http://localhost:8080";
const LIVE_TRACKING_START = "2026-10-19";
const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

const stores: Record<Mode, Store> = {
  live: new Store(path.join(labRoot, "data/lab.json"), () =>
    seedLive(repoRoot),
  ),
  demo: new Store(path.join(labRoot, ".local/demo-lab.json"), () => seedDemo()),
};
// Pick up variant files created outside the dashboard (e.g. by Claude Code).
stores.live.update((d) => void syncWithDisk(d, repoRoot, PAGE_IDS));

class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
const bad = (msg: string) => new HttpError(400, msg);

const modeOf = (url: URL): Mode =>
  url.searchParams.get("mode") === "live" ? "live" : "demo";

async function buildState(mode: Mode): Promise<LabState> {
  const store = stores[mode];
  const base = {
    mode,
    pages: TRACKED_PAGES,
    data: store.data,
    devUrl: DEV_URL,
    writesFiles: mode === "live",
  };
  if (mode === "demo")
    return {
      ...base,
      mainVariants: {},
      analytics: {
        status: "demo",
        message: "Synthetic DEMO data. Nothing here is real analytics.",
        trackingStart: DEMO_TRACKING_START,
        refreshedAt: new Date().toISOString(),
      },
    };
  const live = await getLive(TRACKED_IDS, LIVE_TRACKING_START);
  const experiments = readExperiments(repoRoot);
  return {
    ...base,
    mainVariants: Object.fromEntries(
      PAGE_IDS.map((id) => [id, mainVariantId(experiments, id)]),
    ),
    analytics: {
      status: live.status,
      message: live.message,
      trackingStart: LIVE_TRACKING_START,
      refreshedAt: live.refreshedAt,
    },
  };
}

const str = (
  v: unknown,
  field: string,
  max = 600,
  required = false,
): string => {
  if (v === undefined || v === null || v === "") {
    if (required) throw bad(`${field} is required`);
    return "";
  }
  if (typeof v !== "string") throw bad(`${field} must be text`);
  if (v.length > max) throw bad(`${field} is too long`);
  return v.trim();
};

function createVariant(mode: Mode, input: CreateVariantInput) {
  const store = stores[mode];
  if (!PAGES.some((p) => p.id === input.pageId)) throw bad("Unknown page");
  const name = str(input.name, "Name", 80, true);
  const hypothesis = str(input.hypothesis, "Hypothesis", 600, true);
  const parent = store.data.variants.find(
    (v) => v.pageId === input.pageId && v.id === input.baseVariantId,
  );
  if (!parent) throw bad("Base variant not found");
  const id = nextVariantId(store.data.variants, input.pageId, name);
  let componentPath = `src/landing-variants/${input.pageId}/${id}.tsx`;
  if (mode === "live") {
    try {
      componentPath = duplicateVariantFile({
        root: repoRoot,
        pageId: input.pageId,
        parent,
        newId: id,
        label: name,
      });
    } catch (e) {
      throw bad((e as Error).message);
    }
  }
  const variant: Variant = {
    id,
    pageId: input.pageId,
    name,
    description:
      mode === "demo" ? `[DEMO] ${name}` : `Duplicate of ${parent.name}.`,
    componentPath,
    createdAt: new Date().toISOString(),
    status: "draft",
    parentId: parent.id,
    hypothesis,
    element: str(input.element, "Element", 120, true),
    whyTested: str(input.whyTested, "Why", 600),
    expected: str(input.expected, "Expected outcome", 300),
    notes: "",
  };
  store.update((d) => void d.variants.push(variant));
  return variant;
}

function patchVariant(
  mode: Mode,
  pageId: string,
  id: string,
  body: Record<string, unknown>,
) {
  const store = stores[mode];
  const cur = store.data.variants.find(
    (v) => v.pageId === pageId && v.id === id,
  );
  if (!cur) throw new HttpError(404, "Variant not found");
  store.update((d) => {
    const v = d.variants.find((x) => x.pageId === pageId && x.id === id)!;
    for (const key of [
      "name",
      "hypothesis",
      "element",
      "whyTested",
      "expected",
      "notes",
    ] as const) {
      if (key in body) v[key] = str(body[key], key, 2000, key === "name");
    }
    if ("parentId" in body) {
      const pid =
        body.parentId === null ? null : str(body.parentId, "Baseline", 80);
      if (pid !== null) {
        if (pid === id) throw bad("A variant cannot be its own baseline");
        // Reject cycles: walking up from the new parent must not reach this variant.
        let cursor: string | null = pid;
        for (let hops = 0; cursor && hops < 100; hops++) {
          const p = d.variants.find(
            (x) => x.pageId === pageId && x.id === cursor,
          );
          if (!p) throw bad("Baseline variant not found");
          if (p.parentId === id) throw bad("That baseline would create a loop");
          cursor = p.parentId;
        }
      }
      v.parentId = pid;
    }
    if ("status" in body) {
      const s = body.status;
      if (s !== "draft" && s !== "ready" && s !== "paused" && s !== "archived")
        throw bad("Invalid status");
      if (
        d.deployments.some(
          (w) =>
            w.pageId === pageId &&
            w.variantId === id &&
            w.confirmed &&
            w.endUtc === null,
        )
      ) {
        throw bad(
          "This variant is live on production. Close its activation window before changing status.",
        );
      }
      // Only one "ready to deploy" variant per page; it is never "live".
      if (s === "ready") {
        const prev = d.readyToDeploy[pageId];
        if (prev && prev !== id) {
          const pv = d.variants.find(
            (x) => x.pageId === pageId && x.id === prev,
          );
          if (pv?.status === "ready") pv.status = "draft";
        }
        d.readyToDeploy[pageId] = id;
      } else if (d.readyToDeploy[pageId] === id) delete d.readyToDeploy[pageId];
      v.status = s;
    }
  });
}

const MAX_FUTURE_MS = 5 * 60_000;

/**
 * Switches the page's main variant in the local code (experiments.json +
 * generated file) and/or records when it went live in production. Live mode
 * only: demo data has no files.
 */
async function makeMain(pageId: string, body: Record<string, unknown>) {
  const store = stores.live;
  if (!PAGES.some((p) => p.id === pageId))
    throw new HttpError(404, "Unknown page");
  const variantId = str(body.variantId, "Variant", 80, true);
  const variant = store.data.variants.find(
    (v) => v.pageId === pageId && v.id === variantId,
  );
  if (!variant) throw new HttpError(404, "Variant not found");
  if (variant.status === "archived")
    throw bad("Archived variants cannot be main");

  let goLiveAt: string | null = null;
  if (
    body.goLiveAt !== undefined &&
    body.goLiveAt !== null &&
    body.goLiveAt !== ""
  ) {
    const t = Date.parse(str(body.goLiveAt, "Go-live time", 40));
    if (Number.isNaN(t)) throw bad("Go-live time is not a valid date");
    if (t > Date.now() + MAX_FUTURE_MS)
      throw bad("Go-live time is in the future. Record it after you deploy.");
    goLiveAt = new Date(t).toISOString();
  }

  const open = store.data.deployments.find(
    (d) => d.pageId === pageId && d.confirmed && d.endUtc === null,
  );
  if (goLiveAt) {
    if (open?.variantId === variantId)
      throw bad("This variant already has an open live window");
    // The open window is closed at goLiveAt, so it only clashes if it began later.
    const clash = store.data.deployments.find(
      (d) =>
        d.pageId === pageId &&
        d.confirmed &&
        (d.endUtc === null ? d.startUtc >= goLiveAt! : d.endUtc > goLiveAt!),
    );
    if (clash)
      throw bad(
        "Go-live time overlaps an existing window. Pick a time after the current one started.",
      );
  }

  const experiments = readExperiments(repoRoot);
  const current = mainVariantId(experiments, pageId);
  const switching = current !== variantId;
  if (!switching && !goLiveAt)
    throw bad("Already the main variant. Enter a go-live time to record it.");
  if (switching) {
    try {
      await writeExperiments(
        repoRoot,
        withMain(experiments, repoRoot, pageId, variantId),
      );
    } catch (e) {
      throw bad((e as Error).message);
    }
  }

  store.update((d) => {
    // Switching the local code only never changes a variant's status: "ready
    // to deploy" is set only by the explicit mark-ready action.
    if (!goLiveAt) return;
    const chosen = d.variants.find(
      (v) => v.pageId === pageId && v.id === variantId,
    )!;
    chosen.status = "draft"; // "live" is derived from the open window
    if (d.readyToDeploy[pageId] === variantId) delete d.readyToDeploy[pageId];
    for (const w of d.deployments) {
      if (w.pageId === pageId && w.confirmed && w.endUtc === null)
        w.endUtc = goLiveAt;
    }
    d.deployments.push({
      id: `d${Date.now().toString(36)}`,
      pageId,
      variantId,
      startUtc: goLiveAt,
      endUtc: null,
      confirmed: true,
      notes: "Recorded in the CRO Lab.",
    });
  });
}

function saveTest(mode: Mode, body: Record<string, unknown>, id?: string) {
  const store = stores[mode];
  store.update((d) => {
    let t = id ? d.tests.find((x) => x.id === id) : undefined;
    if (id && !t) throw new HttpError(404, "Test not found");
    if (!t) {
      const pageId = str(body.pageId, "Page", 80, true);
      if (!PAGES.some((p) => p.id === pageId)) throw bad("Unknown page");
      t = {
        id: `t${Date.now().toString(36)}`,
        pageId,
        hypothesis: "",
        element: "",
        priority: "Medium",
        status: "Idea",
        expected: "",
        findings: "",
        followUp: "",
      } as TestIdea;
      d.tests.push(t);
    }
    if ("hypothesis" in body || !id)
      t.hypothesis = str(
        body.hypothesis ?? t.hypothesis,
        "Hypothesis",
        600,
        true,
      );
    if ("element" in body) t.element = str(body.element, "Element", 120);
    if ("expected" in body) t.expected = str(body.expected, "Expected", 300);
    if ("findings" in body) t.findings = str(body.findings, "Findings", 2000);
    if ("followUp" in body) t.followUp = str(body.followUp, "Follow-up", 2000);
    if ("priority" in body) {
      if (
        body.priority !== "High" &&
        body.priority !== "Medium" &&
        body.priority !== "Low"
      )
        throw bad("Invalid priority");
      t.priority = body.priority;
    }
    if ("status" in body) {
      if (!TEST_STATUSES.includes(body.status as never))
        throw bad("Invalid status");
      t.status = body.status as TestIdea["status"];
    }
  });
}

async function readBody(
  req: http.IncomingMessage,
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 64_000) throw bad("Body too large");
    chunks.push(c as Buffer);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw bad("Invalid JSON");
  }
}

async function api(req: http.IncomingMessage, url: URL): Promise<unknown> {
  const mode = modeOf(url);
  const parts = url.pathname.split("/").filter(Boolean).slice(1); // drop "api"
  const m = req.method ?? "GET";
  if (m === "GET" && parts[0] === "state") return buildState(mode);
  if (m === "GET" && parts[0] === "rows") {
    if (mode === "demo") {
      const rows = demoRows(stores.demo.data);
      return {
        mode,
        rows,
        paths: demoPaths(rows),
        downstream: demoDownstream(rows),
      };
    }
    const force = url.searchParams.get("refresh") === "1";
    const live = await getLive(TRACKED_IDS, LIVE_TRACKING_START, { force });
    return {
      mode,
      rows: live.rows,
      paths: live.paths,
      downstream: live.downstream,
    };
  }
  if (m !== "GET" && req.headers["x-cro-lab"] !== "1")
    throw new HttpError(403, "Missing X-CRO-Lab header");
  if (m === "POST" && parts[0] === "variants" && parts.length === 1)
    return createVariant(
      mode,
      (await readBody(req)) as unknown as CreateVariantInput,
    );
  if (m === "PATCH" && parts[0] === "variants" && parts.length === 3) {
    patchVariant(mode, parts[1], parts[2], await readBody(req));
    return buildState(mode);
  }
  if (
    m === "POST" &&
    parts[0] === "pages" &&
    parts[2] === "main" &&
    parts.length === 3
  ) {
    if (mode !== "live")
      throw bad(
        "Demo data has no files. Switch to Live data to change the main variant.",
      );
    await makeMain(parts[1], await readBody(req));
    return buildState("live");
  }
  if (m === "POST" && parts[0] === "tests" && parts.length === 1) {
    saveTest(mode, await readBody(req));
    return buildState(mode);
  }
  if (m === "PATCH" && parts[0] === "tests" && parts.length === 2) {
    saveTest(mode, await readBody(req), parts[1]);
    return buildState(mode);
  }
  if (m === "DELETE" && parts[0] === "tests" && parts.length === 2) {
    stores[mode].update(
      (d) => void (d.tests = d.tests.filter((t) => t.id !== parts[1])),
    );
    return buildState(mode);
  }
  if (m === "POST" && parts[0] === "demo" && parts[1] === "reset") {
    stores.demo.write(seedDemo());
    return buildState("demo");
  }
  throw new HttpError(404, "Not found");
}

const vite = await createVite({
  configFile: path.join(labRoot, "vite.config.ts"),
  root: path.join(labRoot, "web"),
  server: { middlewareMode: true },
  appType: "spa",
});

const server = http.createServer(async (req, res) => {
  if (!allowedHosts.has(req.headers.host ?? "")) {
    res.writeHead(403).end("Forbidden host");
    return;
  }
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (!url.pathname.startsWith("/api/")) {
    vite.middlewares(req, res);
    return;
  }
  try {
    const out = await api(req, url);
    res
      .writeHead(200, {
        "content-type": "application/json",
        "cache-control": "no-store",
      })
      .end(JSON.stringify(out));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status === 500) console.error(e);
    res.writeHead(status, { "content-type": "application/json" }).end(
      JSON.stringify({
        error: status === 500 ? "Internal error" : (e as Error).message,
      }),
    );
  }
});
server.listen(PORT, "127.0.0.1", () =>
  console.log(
    `CRO Lab: http://127.0.0.1:${PORT}  (local only, not part of the site build)`,
  ),
);
