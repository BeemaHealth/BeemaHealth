#!/usr/bin/env node
/**
 * Live SEO redirect check against production (beemahealth.com).
 * Usage: node scripts/check-prod-redirects.mjs
 * Or:    npm run test:seo-live
 */
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const result = spawnSync(
  "npx",
  ["vitest", "run", "src/lib/__tests__/prod-redirects.test.ts"],
  {
    cwd: root,
    env: { ...process.env, SEO_LIVE_CHECK: "1" },
    stdio: "inherit",
  },
);
process.exit(result.status ?? 1);
