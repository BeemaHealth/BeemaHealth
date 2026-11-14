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
import { CTA_IDS, defaultCtaPosition, resolveCta } from "@/lib/cta-ids";

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
      /script-src 'self' 'unsafe-inline' https:\/\/www\.googletagmanager\.com\$\{import\.meta\.env\.DEV[^}]*\} https:\/\/connect\.facebook\.net https:\/\/googleads\.g\.doubleclick\.net https:\/\/www\.googleadservices\.com https:\/\/td\.doubleclick\.net https:\/\/www\.chatbase\.co https:\/\/news\.google\.com https:\/\/www\.clarity\.ms https:\/\/scripts\.clarity\.ms; /,
    );
    expect(rootRoute).toMatch(
      /script-src-elem 'self' 'unsafe-inline' https:\/\/www\.googletagmanager\.com\$\{import\.meta\.env\.DEV[^}]*\} https:\/\/connect\.facebook\.net https:\/\/googleads\.g\.doubleclick\.net https:\/\/www\.googleadservices\.com https:\/\/td\.doubleclick\.net https:\/\/www\.chatbase\.co https:\/\/news\.google\.com https:\/\/www\.clarity\.ms https:\/\/scripts\.clarity\.ms; /,
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
    expect(isBaskIntakeUrl("/glp-1-houston/")).toBe(false);
  });

  it("pushes intake_handoff with only event + cta_id + cta_location + event_id", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", { dataLayer });

    const id = trackIntakeHandoff("home_hero", "hero");

    expect(dataLayer).toHaveLength(1);
    expect(dataLayer[0]).toEqual({
      event: "intake_handoff",
      cta_id: "home_hero",
      cta_location: "hero",
      event_id: id,
    });
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(JSON.stringify(dataLayer[0])).not.toMatch(/@|email|phone|name/i);
  });

  it("uses a fresh event_id per handoff", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", { dataLayer });

    const a = trackIntakeHandoff("home_hero", "hero");
    const b = trackIntakeHandoff("home_hero", "hero");

    expect(a).not.toBe(b);
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
      cta_id: "home_hero",
      cta_location: "hero",
      event_id: expect.any(String),
    });
  });

  it.each([
    [CTA_IDS.tirzepatide_hero, "hero"],
    [CTA_IDS.tirzepatide_footer, "footer"],
    [CTA_IDS.footer, "footer"],
    [CTA_IDS.glp1_mid, "mid_page"],
    [CTA_IDS.tirzepatide_bmi, "mid_page"],
    [CTA_IDS.pricing_hero, "hero"],
    [CTA_IDS.pricing_footer, "footer"],
    [CTA_IDS.faq, "mid_page"],
  ] as const)("derives cta_location for %s as %s", (ctaId, expected) => {
    expect(defaultCtaPosition(ctaId)).toBe(expected);
  });

  it("withPosition reports the same cta_id from a different spot", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", {
      dataLayer,
      location: { search: "", pathname: "/" },
    });

    const hero = resolveCta(CTA_IDS.tirzepatide_hero);
    const pricing = hero.withPosition("pricing");
    expect(pricing.to).toBe(hero.to);

    hero.onClick();
    pricing.onClick();
    resolveCta(CTA_IDS.tirzepatide_hero, "sticky").onClick();

    expect(dataLayer).toEqual([
      expect.objectContaining({
        cta_id: "tirzepatide_hero",
        cta_location: "hero",
      }),
      expect.objectContaining({
        cta_id: "tirzepatide_hero",
        cta_location: "pricing",
      }),
      expect.objectContaining({
        cta_id: "tirzepatide_hero",
        cta_location: "sticky",
      }),
    ]);
  });

  it("reports the finer landing-page positions as cta_location", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", {
      dataLayer,
      location: { search: "", pathname: "/" },
    });
    const hero = resolveCta(CTA_IDS.tirzepatide_hero);
    for (const position of [
      "story_video",
      "mid_banner",
      "final_banner",
    ] as const) {
      hero.withPosition(position).onClick();
    }
    expect(dataLayer).toEqual([
      expect.objectContaining({ cta_location: "story_video" }),
      expect.objectContaining({ cta_location: "mid_banner" }),
      expect.objectContaining({ cta_location: "final_banner" }),
    ]);
  });

  it("ED Mints Boston picker and plan cards report their own id and position", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", {
      dataLayer,
      location: { search: "", pathname: "/" },
    });
    const picker = resolveCta(
      CTA_IDS.ed_mints_boston_rdt_picker,
      "formulation_picker",
    );
    const plans = resolveCta(
      CTA_IDS.ed_mints_boston_odt_plans,
      "plan_comparison",
    );
    // Same Bask intake as the nationwide formulation ids.
    expect(picker.to).toContain(
      resolveCta(CTA_IDS.ed_mints_rdt_hero).to.split("?")[0],
    );
    expect(plans.to).toContain(
      resolveCta(CTA_IDS.ed_mints_odt_hero).to.split("?")[0],
    );
    picker.onClick();
    plans.onClick();
    expect(dataLayer).toEqual([
      expect.objectContaining({
        cta_id: "ed_mints_boston_rdt_picker",
        cta_location: "formulation_picker",
      }),
      expect.objectContaining({
        cta_id: "ed_mints_boston_odt_plans",
        cta_location: "plan_comparison",
      }),
    ]);
  });

  it("new ED Mints Boston ids carry every UTM and click id exactly like the old ids", () => {
    vi.stubGlobal("window", {
      dataLayer: [],
      location: {
        search:
          "?utm_source=meta&utm_medium=paid&utm_campaign=c1&utm_term=t1&utm_content=ad9&fbclid=FB123&gclid=G456",
        pathname: "/ed-mints-boston/",
      },
    });
    const pairs = [
      [CTA_IDS.ed_mints_rdt_hero, CTA_IDS.ed_mints_boston_rdt_picker],
      [CTA_IDS.ed_mints_rdt_hero, CTA_IDS.ed_mints_boston_rdt_plans],
      [CTA_IDS.ed_mints_odt_hero, CTA_IDS.ed_mints_boston_odt_picker],
      [CTA_IDS.ed_mints_odt_hero, CTA_IDS.ed_mints_boston_odt_plans],
    ] as const;
    for (const [oldId, newId] of pairs) {
      const oldUrl = new URL(resolveCta(oldId).to);
      const newUrl = new URL(resolveCta(newId).to);
      expect(newUrl.origin + newUrl.pathname).toBe(
        oldUrl.origin + oldUrl.pathname,
      );
      expect(newUrl.searchParams.get("cta_id")).toBe(newId);
      for (const key of [
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "fbclid",
        "gclid",
      ]) {
        expect(newUrl.searchParams.get(key)).toBe(oldUrl.searchParams.get(key));
        expect(newUrl.searchParams.get(key)).toBeTruthy();
      }
      oldUrl.searchParams.delete("cta_id");
      newUrl.searchParams.delete("cta_id");
      expect(newUrl.toString()).toBe(oldUrl.toString());
    }
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
          cta_id: expectedLocation,
          cta_location: "mid_page",
          event_id: expect.any(String),
        },
      ]);
      expect(JSON.stringify(dataLayer)).not.toMatch(
        /servings|multiplier|category|symptom|nutrition|protein|fiber/i,
      );
    },
  );
});
