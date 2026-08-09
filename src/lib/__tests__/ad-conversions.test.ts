import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetAdPixelBootstrapForTests,
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
  };
  gtag?: (...args: unknown[]) => void;
  dataLayer?: unknown[];
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

  it("shares one Google tag loader across GA4 and Ads destinations", () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubEnv("VITE_GOOGLE_ADS_ID", "AW-999888777");
    const { scripts } = installDomStubs({ dataLayer: [] });

    initAdPixels();

    expect(scripts.size).toBe(1);
    expect(scripts.get("beema-google-tag")?.src).toBe(
      "https://www.googletagmanager.com/gtag/js?id=G-TEST123",
    );
    expect((window.dataLayer ?? []).filter(Array.isArray)).toEqual(
      expect.arrayContaining([
        ["config", "G-TEST123", { send_page_view: false }],
        ["config", "AW-999888777"],
      ]),
    );
  });

  it("fires GA4 generate_lead and page_view with optional cta_id", () => {
    vi.stubEnv("VITE_GA_MEASUREMENT_ID", "G-TEST123");

    const gtag = vi.fn();
    installDomStubs({
      gtag,
      location: { pathname: "/waitlist/", search: "?cta_id=nav_header" },
    } as FakeWindow & { location: { pathname: string; search: string } });

    trackGaPageView("waitlist", "nav_header");
    trackWaitlistLeadConversion();

    expect(gtag).toHaveBeenCalledWith(
      "event",
      "page_view",
      expect.objectContaining({
        page_title: "waitlist",
        cta_id: "nav_header",
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
