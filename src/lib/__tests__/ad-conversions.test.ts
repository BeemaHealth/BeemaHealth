import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetAdPixelBootstrapForTests,
  ensureGtmContainer,
  initAdPixels,
  isAnyAdPixelConfigured,
  isGaConfigured,
  isGoogleAdsConversionConfigured,
  isGtmConfigured,
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
  const elements = new Map<string, { id: string }>();
  const bodyChildren: unknown[] = [];

  const documentStub = {
    getElementById: (id: string) => scripts.get(id) ?? elements.get(id) ?? null,
    createElement: (tag: string) => {
      if (tag === "script") {
        return { id: "", async: false, src: "" };
      }
      if (tag === "noscript") {
        const el = {
          id: "",
          appendChild: (child: unknown) => {
            (el as { child?: unknown }).child = child;
            return child;
          },
        };
        return el;
      }
      if (tag === "iframe") {
        return {
          src: "",
          height: "",
          width: "",
          setAttribute: vi.fn(),
        };
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
      insertBefore: (el: { id: string }, _ref: unknown) => {
        elements.set(el.id, el);
        bodyChildren.push(el);
        return el;
      },
      prepend: (el: { id: string }) => {
        elements.set(el.id, el);
        bodyChildren.push(el);
        return el;
      },
    },
  };

  vi.stubGlobal("window", win);
  vi.stubGlobal("document", documentStub);
  return { scripts, elements, bodyChildren };
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
    expect(isGaConfigured(config)).toBe(false);
    expect(isGtmConfigured(config)).toBe(false);
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

  it("injects GTM script and noscript when container ID is set", () => {
    vi.stubEnv("VITE_GTM_CONTAINER_ID", "GTM-MHHJ44GF");

    const win: FakeWindow = { dataLayer: undefined };
    const { scripts, elements } = installDomStubs(win);

    ensureGtmContainer();

    const gtmScript = scripts.get("beema-gtm");
    expect(gtmScript?.src).toBe(
      "https://www.googletagmanager.com/gtm.js?id=GTM-MHHJ44GF",
    );
    expect(elements.has("beema-gtm-noscript")).toBe(true);
    expect(win.dataLayer?.[0]).toEqual(
      expect.objectContaining({ event: "gtm.js" }),
    );
  });

  it("rejects malformed GTM container IDs", () => {
    vi.stubEnv("VITE_GTM_CONTAINER_ID", "G-03PMCCSD3R");
    expect(isGtmConfigured()).toBe(false);

    const { scripts } = installDomStubs({});
    initAdPixels();
    expect(scripts.has("beema-gtm")).toBe(false);
  });
});
