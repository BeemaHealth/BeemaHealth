import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLARITY_CONNECT_ORIGINS,
  CLARITY_EMBED_SCRIPT,
  CLARITY_PROJECT_ID,
  CLARITY_PRODUCTION_HOSTNAME,
  CLARITY_SCRIPT_ORIGINS,
} from "@/lib/clarity";

describe("clarity", () => {
  const rootRoute = readFileSync(
    resolve(__dirname, "../../routes/__root.tsx"),
    "utf-8",
  );

  it("exposes the project id", () => {
    expect(CLARITY_PROJECT_ID).toBe("zd5hkqhqhq");
  });

  it("only loads on the production hostname", () => {
    expect(CLARITY_EMBED_SCRIPT).toContain(
      `window.location.hostname === '${CLARITY_PRODUCTION_HOSTNAME}'`,
    );
  });

  it("injects the official tag URL after load/idle", () => {
    expect(CLARITY_EMBED_SCRIPT).toContain("https://www.clarity.ms/tag/");
    expect(CLARITY_EMBED_SCRIPT).toContain("requestIdleCallback");
    expect(CLARITY_EMBED_SCRIPT).not.toContain("—");
  });

  it("installs the script and allows its CSP origins", () => {
    expect(rootRoute).toContain("CLARITY_EMBED_SCRIPT");
    for (const o of CLARITY_SCRIPT_ORIGINS) expect(rootRoute).toContain(o);
    for (const o of CLARITY_CONNECT_ORIGINS) expect(rootRoute).toContain(o);
  });
});
