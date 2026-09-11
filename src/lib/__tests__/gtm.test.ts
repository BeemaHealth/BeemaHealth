import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GOOGLE_ADS_ID,
  GTM_CONTAINER_ID,
  GTM_HEAD_SCRIPT,
  GTM_PRODUCTION_HOSTNAME,
  isBaskIntakeUrl,
  isGtmProductionHost,
  trackIntakeHandoff,
} from "@/lib/gtm";
import { CTA_IDS, resolveCta } from "@/lib/cta-ids";

describe("gtm", () => {
  const rootRoute = readFileSync(
    resolve(__dirname, "../../routes/__root.tsx"),
    "utf-8",
  );
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exposes the public container ID as a plain constant", () => {
    expect(GTM_CONTAINER_ID).toBe("GTM-MHHJ44GF");
  });

  it("exposes the Google Ads account tag as a plain constant", () => {
    expect(GOOGLE_ADS_ID).toBe("AW-18301765593");
  });

  it("keeps one Google tag loader and required measurement CSP origins", () => {
    expect(rootRoute).not.toContain("GOOGLE_ADS_HEAD_SCRIPT");
    expect(rootRoute).toMatch(
      /script-src 'self' 'unsafe-inline' https:\/\/www\.googletagmanager\.com\$\{import\.meta\.env\.DEV[^}]*\} https:\/\/connect\.facebook\.net https:\/\/googleads\.g\.doubleclick\.net https:\/\/www\.googleadservices\.com https:\/\/td\.doubleclick\.net; /,
    );
    expect(rootRoute).toMatch(
      /script-src-elem 'self' 'unsafe-inline' https:\/\/www\.googletagmanager\.com\$\{import\.meta\.env\.DEV[^}]*\} https:\/\/connect\.facebook\.net https:\/\/googleads\.g\.doubleclick\.net https:\/\/www\.googleadservices\.com https:\/\/td\.doubleclick\.net; /,
    );
    for (const origin of [
      "https://www.google.com",
      "https://googleads.g.doubleclick.net",
      "https://www.googleadservices.com",
      "https://td.doubleclick.net",
      "https://ad.doubleclick.net",
    ]) {
      expect(rootRoute).toContain(origin);
    }
  });

  it("only allows GTM Preview's tagmanager.google.com origin in dev, never unconditionally", () => {
    // tagmanager.google.com (Preview/Tag Assistant's debug UI) must never
    // appear as a bare, unconditional CSP origin - only inside an
    // `import.meta.env.DEV` ternary, so production keeps only the published
    // container's googletagmanager.com origin.
    const previewOriginPattern = /https:\/\/tagmanager\.google\.com/g;
    const matches = rootRoute.match(previewOriginPattern) ?? [];
    expect(matches.length).toBeGreaterThan(0);

    const devGatedPattern =
      /import\.meta\.env\.DEV \? "[^"]*https:\/\/tagmanager\.google\.com[^"]*" : ""/g;
    const gatedMatches = rootRoute.match(devGatedPattern) ?? [];
    // Every literal occurrence of the preview origin must live inside a
    // DEV-gated ternary (script-src, script-src-elem, style-src).
    expect(gatedMatches.length).toBe(matches.length);
  });

  it("gates the head snippet to the production hostname only", () => {
    expect(GTM_HEAD_SCRIPT).toContain(
      `window.location.hostname === '${GTM_PRODUCTION_HOSTNAME}'`,
    );
    expect(GTM_HEAD_SCRIPT).toContain(GTM_CONTAINER_ID);
    // Google's install-snippet essentials must still be present.
    expect(GTM_HEAD_SCRIPT).toContain("gtm.start");
    expect(GTM_HEAD_SCRIPT).toContain(
      "https://www.googletagmanager.com/gtm.js?id=",
    );
  });

  describe("deferred container load", () => {
    type Listener = (...args: unknown[]) => void;

    function runSnippet(
      hostname: string = GTM_PRODUCTION_HOSTNAME,
      search = "",
    ) {
      const inserted: { src: string; async: boolean }[] = [];
      const listeners = new Map<string, Listener[]>();
      const idleCallbacks: Listener[] = [];
      const timeouts: { fn: Listener; ms: number }[] = [];
      const firstScript = {
        parentNode: {
          insertBefore: (node: { src: string; async: boolean }) => {
            inserted.push(node);
          },
        },
      };
      const doc = {
        readyState: "loading" as DocumentReadyState,
        getElementsByTagName: () => [firstScript],
        createElement: () => ({ src: "", async: false }),
      };
      const win = {
        location: { hostname, search },
        dataLayer: undefined as unknown[] | undefined,
        addEventListener: (type: string, fn: Listener) => {
          listeners.set(type, [...(listeners.get(type) ?? []), fn]);
        },
        requestIdleCallback: (fn: Listener) => {
          idleCallbacks.push(fn);
        },
        setTimeout: (fn: Listener, ms: number) => {
          timeouts.push({ fn, ms });
          return 0;
        },
      };
      // The snippet only ever touches the `window` / `document` identifiers.
      new Function("window", "document", GTM_HEAD_SCRIPT)(win, doc);
      const fire = (type: string) =>
        (listeners.get(type) ?? []).forEach((fn) => fn());
      return { win, inserted, fire, idleCallbacks, timeouts };
    }

    it("creates dataLayer and pushes gtm.start before the container loads", () => {
      const { win, inserted } = runSnippet();

      expect(win.dataLayer).toHaveLength(1);
      expect(win.dataLayer?.[0]).toMatchObject({ event: "gtm.js" });
      expect(inserted).toHaveLength(0);
    });

    it("loads the container on idle after window load", () => {
      const { inserted, fire, idleCallbacks } = runSnippet();

      fire("load");
      expect(inserted).toHaveLength(0);

      idleCallbacks.forEach((fn) => fn());
      expect(inserted).toHaveLength(1);
      expect(inserted[0]?.async).toBe(true);
      expect(inserted[0]?.src).toBe(
        `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`,
      );
    });

    it("loads the container on first interaction, before window load", () => {
      const { inserted, fire } = runSnippet();

      fire("pointerdown");

      expect(inserted).toHaveLength(1);
    });

    it("injects the container script exactly once", () => {
      const { inserted, fire, idleCallbacks } = runSnippet();

      fire("pointerdown");
      fire("keydown");
      fire("scroll");
      fire("load");
      idleCallbacks.forEach((fn) => fn());

      expect(inserted).toHaveLength(1);
    });

    it("falls back to a timer when requestIdleCallback is missing", () => {
      const { inserted, fire, timeouts, win } = runSnippet();
      delete (win as { requestIdleCallback?: unknown }).requestIdleCallback;

      fire("load");
      expect(timeouts).toHaveLength(1);

      timeouts.forEach(({ fn }) => fn());
      expect(inserted).toHaveLength(1);
    });

    it("does nothing at all off the production hostname", () => {
      const { win, inserted, fire, idleCallbacks } = runSnippet("localhost");

      fire("pointerdown");
      fire("load");
      idleCallbacks.forEach((fn) => fn());

      expect(win.dataLayer).toBeUndefined();
      expect(inserted).toHaveLength(0);
    });

    it("loads off-production when the URL carries Tag Assistant's gtm_debug param", () => {
      const { win, inserted, fire } = runSnippet(
        "localhost",
        "?gtm_debug=1234567890",
      );

      fire("pointerdown");

      expect(win.dataLayer).toHaveLength(1);
      expect(inserted).toHaveLength(1);
    });

    it("ignores an unrelated query string without gtm_debug off-production", () => {
      const { win, inserted, fire, idleCallbacks } = runSnippet(
        "localhost",
        "?utm_source=test",
      );

      fire("pointerdown");
      fire("load");
      idleCallbacks.forEach((fn) => fn());

      expect(win.dataLayer).toBeUndefined();
      expect(inserted).toHaveLength(0);
    });
  });

  it("recognizes production vs non-production hosts", () => {
    expect(isGtmProductionHost("beemahealth.com")).toBe(true);
    expect(isGtmProductionHost("localhost")).toBe(false);
    expect(isGtmProductionHost("mattaertker.github.io")).toBe(false);
    expect(isGtmProductionHost("www.beemahealth.com")).toBe(false);
  });

  it("detects Bask intake URLs only", () => {
    expect(
      isBaskIntakeUrl(
        "https://q.beemahealth.com/start-online-visit/weightloss",
      ),
    ).toBe(true);
    expect(isBaskIntakeUrl("https://hive.beemahealth.com")).toBe(false);
    expect(isBaskIntakeUrl("/waitlist/")).toBe(false);
  });

  it("pushes intake_handoff with only event + cta_location", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", { dataLayer });

    trackIntakeHandoff("home_hero");

    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toEqual({
      event: "intake_handoff",
      cta_location: "home_hero",
    });
    expect(JSON.stringify(dataLayer[0])).not.toMatch(/@|email|phone|name/i);
  });

  it("resolveCta onClick fires handoff for Bask destinations", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", {
      dataLayer,
      location: { search: "", pathname: "/" },
    });

    const cta = resolveCta(CTA_IDS.home_hero);
    expect(cta.to.startsWith("https://q.beemahealth.com/")).toBe(true);
    expect(new URL(cta.to).searchParams.get("cta_id")).toBe("home_hero");
    cta.onClick();

    expect(dataLayer[0]).toEqual({
      event: "intake_handoff",
      cta_location: "home_hero",
    });
  });

  it.each([
    [CTA_IDS.recipes_hub, "recipes_hub"],
    [CTA_IDS.recipe_detail, "recipe_detail"],
  ] as const)(
    "keeps recipe CTA attribution generic for %s",
    (ctaId, expectedLocation) => {
      const dataLayer: unknown[] = [];
      vi.stubGlobal("window", {
        dataLayer,
        location: { search: "", pathname: "/recipes/" },
      });

      const cta = resolveCta(ctaId);
      const target = new URL(cta.to);
      expect(target.hostname).toBe("q.beemahealth.com");
      expect(target.searchParams.get("cta_id")).toBe(expectedLocation);

      cta.onClick();

      expect(dataLayer).toEqual([
        {
          event: "intake_handoff",
          cta_location: expectedLocation,
        },
      ]);
      expect(JSON.stringify(dataLayer)).not.toMatch(
        /servings|multiplier|category|symptom|nutrition|protein|fiber/i,
      );
    },
  );
});
