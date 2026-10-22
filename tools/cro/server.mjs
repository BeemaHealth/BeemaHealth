// Local-only CRO dashboard: manage landing-page variants and read GA4 results.
// Never part of the site build (lives outside src/). Binds to 127.0.0.1.
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  STATUSES,
  cloneVariantSource,
  isValidPageKey,
  isValidVariantId,
  lastActivation,
  lastDeploy,
  nextExperimentId,
  nextVariantId,
  normalizeConfig,
  recordDeploy,
  renderGenerated,
  scanVariants,
  undeployedChanges,
  validatePageConfig,
} from "./lib.mjs";
import {
  dimensionStatus,
  loadConfig,
  pageBreakdown,
  pageHealth,
  pageSeries,
  realtimeEvents,
  variantBreakdown,
  variantDays,
  variantSeries,
  variantTotals,
} from "./ga4.mjs";
import { fetchAdsSummary } from "./adapters/ads.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const variantsDir = path.join(root, "src/landing-variants");
const configFile = path.join(variantsDir, "experiments.json");
const generatedFile = path.join(variantsDir, "experiments.generated.ts");
const deploysFile = path.join(here, "data/deploys.json");
const PORT = Number(process.env.CRO_PORT ?? 8787);
const DEV_URL = process.env.CRO_DEV_URL ?? "http://localhost:8080";
const SITE_URL = "https://beemahealth.com";
const DAYS = new Set([7, 14, 30, 60, 90]);
const allowedHosts = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);

const cache = new Map();
async function cached(key, fn, ttlMs = 60_000) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
};
const writeJson = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

function readAll() {
  const pages = scanVariants(variantsDir);
  const config = normalizeConfig(readJson(configFile, {}), pages);
  return { pages, config, deploys: readJson(deploysFile, []) };
}

/** Persists config. Throws with a readable message if any page is invalid. */
async function writeConfig(config) {
  const generated = renderGenerated(config); // validates every page
  const prettier = await import("prettier");
  const options = (await prettier.resolveConfig(generatedFile)) ?? {};
  writeJson(configFile, config);
  fs.writeFileSync(
    generatedFile,
    await prettier.format(generated, { ...options, filepath: generatedFile }),
  );
}

const gitDiffStat = () =>
  new Promise((resolve) => {
    execFile(
      "git",
      ["status", "--short", "--", "src/landing-variants"],
      { cwd: root },
      (err, out) => resolve(err ? "" : out.trim()),
    );
  });

async function state() {
  const { pages, config, deploys } = readAll();
  const out = {};
  for (const [page, variants] of Object.entries(pages)) {
    const cfg = config[page];
    const last = lastDeploy(deploys, page);
    out[page] = {
      experimentId: cfg.experimentId,
      lastDeployAt: last?.at ?? null,
      pendingDeploy: undeployedChanges(deploys, page, cfg),
      variants: variants.map((v) => ({
        ...v,
        status: cfg.variants[v.id].status,
        weight: cfg.variants[v.id].weight,
        deployed: last?.config[v.id] ?? null,
        lastActivation: lastActivation(deploys, page, v.id),
        previewUrl: `${DEV_URL}/${page}/?preview_variant=${v.id}`,
      })),
    };
  }
  return {
    pages: out,
    devUrl: DEV_URL,
    siteUrl: SITE_URL,
    ga4: !!loadConfig(),
    diff: await gitDiffStat(),
  };
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, {
    "content-type": type,
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 20_000) reject(new Error("too large"));
    });
    req.on("end", () => resolve(data));
  });
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parsePageParams(url) {
  const q = new URL(url, "http://x").searchParams;
  const page = q.get("page");
  const days = Number(q.get("days") ?? 30);
  if (!isValidPageKey(page)) throw new HttpError(400, "invalid page");
  if (!DAYS.has(days)) throw new HttpError(400, "invalid days");
  const variant = q.get("variant");
  if (variant !== null && !isValidVariantId(variant))
    throw new HttpError(400, "invalid variant");
  return { page, days, variant };
}

async function report({ page, days }) {
  const cfg = loadConfig();
  if (!cfg) return { configured: false };
  const dims = await cached("dims", () => dimensionStatus(cfg), 300_000);
  const health = await cached(`health:${page}:${days}`, () =>
    pageHealth(cfg, page, days),
  );
  const result = {
    configured: true,
    days,
    fetchedAt: new Date().toISOString(),
    dims,
    health,
    variants: {},
    variantDays: {},
    ads: await fetchAdsSummary(),
  };
  if (dims.all) {
    result.variants = await cached(`totals:${page}:${days}`, () =>
      variantTotals(cfg, page, days),
    );
    result.variantDays = await cached(`vdays:${page}:${days}`, () =>
      variantDays(cfg, page, days),
    );
  }
  return result;
}

const server = http.createServer(async (req, res) => {
  try {
    // Block DNS rebinding and cross-site requests: only our own origin.
    if (!allowedHosts.has(req.headers.host ?? ""))
      return send(res, 403, { error: "bad host" });

    if (req.method === "GET") {
      if (req.url === "/") {
        return send(
          res,
          200,
          fs.readFileSync(path.join(here, "index.html"), "utf8"),
          "text/html; charset=utf-8",
        );
      }
      if (req.url === "/metrics.mjs") {
        return send(
          res,
          200,
          fs.readFileSync(path.join(here, "metrics.mjs"), "utf8"),
          "text/javascript; charset=utf-8",
        );
      }
      if (req.url === "/api/state") return send(res, 200, await state());
      if (req.url.startsWith("/api/report"))
        return send(res, 200, await report(parsePageParams(req.url)));
      if (req.url.startsWith("/api/pagestats")) {
        const { page, days } = parsePageParams(req.url);
        const cfg = loadConfig();
        if (!cfg) return send(res, 200, { configured: false });
        const [series, breakdown] = await Promise.all([
          cached(`pseries:${page}:${days}`, () => pageSeries(cfg, page, days)),
          cached(`pbd:${page}:${days}`, () => pageBreakdown(cfg, page, days)),
        ]);
        return send(res, 200, { configured: true, series, breakdown });
      }
      if (req.url.startsWith("/api/detail")) {
        const { page, days, variant } = parsePageParams(req.url);
        if (!variant) throw new HttpError(400, "variant required");
        const cfg = loadConfig();
        if (!cfg) return send(res, 200, { configured: false });
        const dims = await cached("dims", () => dimensionStatus(cfg), 300_000);
        if (!dims.all)
          return send(res, 200, { configured: true, dimsMissing: true });
        const [series, breakdown] = await Promise.all([
          cached(`series:${page}:${variant}:${days}`, () =>
            variantSeries(cfg, page, variant, days),
          ),
          cached(`bd:${page}:${variant}:${days}`, () =>
            variantBreakdown(cfg, page, variant, days),
          ),
        ]);
        return send(res, 200, {
          configured: true,
          series,
          breakdown,
          fetchedAt: new Date().toISOString(),
        });
      }
      if (req.url === "/api/realtime") {
        const cfg = loadConfig();
        if (!cfg) return send(res, 200, { configured: false });
        return send(res, 200, {
          configured: true,
          events: await realtimeEvents(cfg),
          fetchedAt: new Date().toISOString(),
        });
      }
      return send(res, 404, { error: "not found" });
    }

    if (req.method === "POST") {
      const origin = req.headers.origin;
      if (!origin || !allowedHosts.has(new URL(origin).host))
        throw new HttpError(403, "bad origin");
      const body = JSON.parse((await readBody(req)) || "{}");
      const { pages, config, deploys } = readAll();
      const { page } = body;
      if (!isValidPageKey(page) || !pages[page])
        throw new HttpError(400, "invalid page");

      if (req.url === "/api/config") {
        // body.variants: { [id]: { status, weight } }
        const next = structuredClone(config[page]);
        for (const [id, v] of Object.entries(body.variants ?? {})) {
          if (!next.variants[id])
            throw new HttpError(400, `unknown variant ${id}`);
          if (!STATUSES.includes(v.status))
            throw new HttpError(400, `bad status for ${id}`);
          next.variants[id] = {
            status: v.status,
            weight: v.status === "live" ? Number(v.weight) : 0,
          };
        }
        const problems = validatePageConfig(next);
        if (problems.length) throw new HttpError(400, problems.join("; "));
        await writeConfig({ ...config, [page]: next });
      } else if (req.url === "/api/new-experiment") {
        const next = {
          ...config[page],
          experimentId: nextExperimentId(config[page].experimentId),
        };
        await writeConfig({ ...config, [page]: next });
      } else if (req.url === "/api/deployed") {
        const when = body.at ? new Date(body.at) : new Date();
        if (
          Number.isNaN(when.getTime()) ||
          when.getTime() > Date.now() + 60_000
        )
          throw new HttpError(400, "invalid time");
        writeJson(
          deploysFile,
          recordDeploy(deploys, page, config[page], when.toISOString()),
        );
      } else if (req.url === "/api/new-variant") {
        const id = nextVariantId(
          pages[page].map((v) => v.id),
          String(body.name ?? ""),
        );
        const label = String(body.label ?? body.name).slice(0, 80);
        const control = path.join(variantsDir, page, "v1-control.tsx");
        fs.writeFileSync(
          path.join(variantsDir, page, `${id}.tsx`),
          cloneVariantSource(fs.readFileSync(control, "utf8"), id, label),
          { flag: "wx" },
        );
        // Register as a draft; drafts are never bundled into the site.
        await writeConfig({
          ...config,
          [page]: {
            ...config[page],
            variants: {
              ...config[page].variants,
              [id]: { status: "draft", weight: 0 },
            },
          },
        });
      } else {
        throw new HttpError(404, "not found");
      }
      cache.clear();
      return send(res, 200, await state());
    }
    send(res, 405, { error: "method not allowed" });
  } catch (e) {
    send(res, e instanceof HttpError ? e.status : 500, {
      error: String(e?.message ?? e),
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`CRO dashboard: http://127.0.0.1:${PORT}  (previews ${DEV_URL})`);
});
