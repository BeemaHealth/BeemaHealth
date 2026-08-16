import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetAdPixelBootstrapForTests,
  ensureMetaPixel,
  initAdPixels,
  isAnyAdPixelConfigured,
  isGaConfigured,
  isGoogleAdsConversionConfigured,
  isGoogleAdsTagConfigured,
  isMetaPixelConfigured,
  readAdPixelConfig,
  trackGaPageView,
  trackWaitlistLeadConversion,
} from "@/lib/ad-conversions";

type FakeWindow = {
  fbq?: ((...args: unknown[]) => void) & {
    queue?: unknown[];
    loaded?: boolean;
    callMethod?: (...args: unknown[]) => void;
  };
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
  location?: { href: string; pathname: string; search: string };
};

function installDomStubs(win: FakeWindow) {
  const scripts = new Map<
    string,
    { id: string; src: string; async?: boolean }
  >();

  const documentStub = {
    getElementById: (id: string) => scripts.get(id) ?? null,
    createElement: (tag: string) => {
      if (tag === "script") {
        return { id: "", async: false, src: "" };
      }
      return { id: "" };
    },
    getElementsByTagName: (tag: string) => {
      if (tag === "script") {
        return Array.from(scripts.values());
      }
      return [];
    },
    head: {
      appendChild: (el: { id: string; src: string }) => {
        scripts.set(el.id, el);
        return el;
      },
    },
    body: {
      firstChild: null as unknown,
      insertBefore: (el: unknown) => el,
      prepend: (el: unknown) => el,
    },
    referrer: "",
    title: "",
  };

  vi.stubGlobal("window", win);
  vi.stubGlobal("document", documentStub);
  return { scripts };
}

describe("ad-conversions", () => {
  beforeEach(() => {
    __resetAdPixelBootstrapForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    __resetAdPixelBootstrapForTests();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reports no pixels when env vars are unset", () => {
    const config = readAdPixelConfig();
    expect(isMetaPixelConfigured(config)).toBe(false);
    expect(isGoogleAdsConversionConfigured(config)).toBe(false);
    expect(isGoogleAdsTagConfigured(config)).toBe(false);
    expect(isGaConfigured(config)).toBe(false);
    expect(isAnyAdPixelConfigured(config)).toBe(false);
  });

  it("no-ops conversion tracking when IDs are missing", () => {
    const { scripts } = installDomStubs({});
    expect(() => trackWaitlistLeadConversion()).not.toThrow();
    expect(scripts.size).toBe(0);
  });

  it("fires Meta Lead and Google conversion without PHI", () => {
    vi.stubEnv("VITE_META_PIXEL_ID", "111222333");
    vi.stubEnv("VITE_GOOGLE_ADS_ID", "AW-999888777");
    vi.stubEnv("VITE_GOOGLE_ADS_CONVERSION_LABEL", "leadLabel");

    const fbq = vi.fn();
    const gtag = vi.fn();
    installDomStubs({ fbq, gtag });

    trackWaitlistLeadConversion();

    expect(fbq).toHaveBeenCalledWith("init", "111222333");
    expect(fbq).toHaveBeenCalledWith("track", "PageView");
    expect(fbq).toHaveBeenCalledWith("track", "Lead");
    expect(gtag).toHaveBeenCalledWith("event", "conversion", {
      send_to: "AW-999888777/leadLabel",
    });

    const fbqArgs = JSON.stringify(fbq.mock.calls);
    const gtagArgs = JSON.stringify(gtag.mock.calls);
    expect(fbqArgs).not.toMatch(/@/);
    expect(gtagArgs).not.toMatch(/@/);
  });

  it("delegates to fbevents.js's callMethod once it upgrades the stub, instead of queuing forever", () => {
    vi.stubEnv("VITE_META_PIXEL_ID", "111222333");
    const win: FakeWindow = {};
    installDomStubs(win);

    // No pre-installed fbq mock here - this exercises the real self-created
    // stub from ensureMetaPixel(), the same object fbevents.js upgrades in place.
    ensureMetaPixel();
    expect(win.fbq).toBeDefined();
    expect(win.fbq!.queue).toEqual([
      ["init", "111222333"],
      ["track", "PageView"],
    ]);

    // Simulate fbevents.js finishing its load: it sets `callMethod` on the
    // existing fbq function object rather than replacing window.fbq.
    const callMethod = vi.fn();
    win.fbq!.callMethod = callMethod;

    // A call made after "load" (e.g. the GTM Lead tag on a CTA click) must
    // reach callMethod directly, not pile into the queue no one drains again.
    win.fbq!("track", "Lead");

    expect(callMethod).toHaveBeenCalledWith("track", "Lead");
    expect(win.fbq!.queue).toEqual([
      ["init", "111222333"],
      ["track", "PageView"],
    ]);
  });

  it("shares one Google tag loader across GA4 and Ads destinations", () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubEnv("VITE_GOOGLE_ADS_ID", "AW-999888777");
    const { scripts } = installDomStubs({
      dataLayer: [],
      location: {
        href: "https://beemahealth.com/",
        pathname: "/",
        search: "",
      },
    });

    initAdPixels();

    expect(scripts.size).toBe(1);
    expect(scripts.get("beema-google-tag")?.src).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
    );
    const queued = (window.dataLayer ?? []).map((entry) =>
      Array.from(entry as ArrayLike<unknown>),
    );
    expect(queued).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          "config",
          "G-TEST123",
          expect.objectContaining({ send_page_view: false }),
        ]),
        ["config", "AW-999888777"],
      ]),
    );
  });

  it("fires GA4 page_view with path title, UTMs, and campaign_landing", () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");

    const gtag = vi.fn();
    installDomStubs({
      gtag,
      location: {
        href: "https://beemahealth.com/waitlist/?utm_source=instagram&utm_medium=social&utm_campaign=test_manual&utm_content=ig_post_test&cta_id=nav_header",
        pathname: "/waitlist/",
        search:
          "?utm_source=instagram&utm_medium=social&utm_campaign=test_manual&utm_content=ig_post_test&cta_id=nav_header",
      },
    });

    trackGaPageView("waitlist", "nav_header");
    trackWaitlistLeadConversion();

    expect(gtag).toHaveBeenCalledWith(
      "event",
      "page_view",
      expect.objectContaining({
        page_title: "/waitlist/",
        page_path: "/waitlist/",
        screen_name: "waitlist",
        page_location: expect.stringContaining("utm_source=instagram"),
        utm_source: "instagram",
        utm_medium: "social",
        utm_campaign: "test_manual",
        utm_content: "ig_post_test",
        cta_id: "nav_header",
      }),
    );
    expect(gtag).toHaveBeenCalledWith(
      "event",
      "campaign_landing",
      expect.objectContaining({
        utm_source: "instagram",
        utm_content: "ig_post_test",
        landing_page: "waitlist",
        page_path: "/waitlist/",
      }),
    );
    expect(gtag).toHaveBeenCalledWith("event", "generate_lead", {
      event_category: "waitlist",
    });
    expect(JSON.stringify(gtag.mock.calls)).not.toMatch(/@/);
  });

  it("does not inject GTM from initAdPixels (shell owns GTM)", () => {
    vi.stubEnv("VITE_GTM_CONTAINER_ID", "GTM-MHHJ44GF");
    const { scripts } = installDomStubs({ dataLayer: undefined });
    initAdPixels();
    expect(scripts.has("beema-gtm")).toBe(false);
  });
});
