import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetAdPixelBootstrapForTests,
  isAnyAdPixelConfigured,
  isGoogleAdsConversionConfigured,
  isMetaPixelConfigured,
  readAdPixelConfig,
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
  const scripts = new Map<string, { id: string; src: string }>();
  const documentStub = {
    getElementById: (id: string) => scripts.get(id) ?? null,
    createElement: () => ({ id: "", async: false, src: "" }),
    head: {
      appendChild: (el: { id: string; src: string }) => {
        scripts.set(el.id, el);
        return el;
      },
    },
  };

  vi.stubGlobal("window", win);
  vi.stubGlobal("document", documentStub);
  return scripts;
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
    expect(isAnyAdPixelConfigured(config)).toBe(false);
  });

  it("no-ops conversion tracking when IDs are missing", () => {
    const scripts = installDomStubs({});
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
});
