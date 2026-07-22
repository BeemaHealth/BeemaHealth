import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  capturePageUtms,
  clearPendingUtms,
  getAttributionForSubmit,
  getPendingUtms,
  readUtmsFromUrl,
} from "@/lib/utm";

describe("utm / attribution (frontend-only)", () => {
  beforeEach(() => {
    clearPendingUtms();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    clearPendingUtms();
    vi.unstubAllGlobals();
  });

  it("reads UTMs and cta_id from the query string", () => {
    expect(
      readUtmsFromUrl(
        "?utm_source=instagram&utm_medium=social&cta_id=nav_header&utm_campaign=launch",
      ),
    ).toEqual({
      utm_source: "instagram",
      utm_medium: "social",
      utm_campaign: "launch",
      cta_id: "nav_header",
    });
  });

  it("captures first-touch referrer and landing path into sessionStorage", () => {
    vi.stubGlobal("window", {
      location: {
        search: "?utm_source=threads&cta_id=home_hero",
        pathname: "/waitlist/",
      },
    });
    vi.stubGlobal("document", {
      referrer: "https://www.threads.net/@beema",
    });

    capturePageUtms();
    const pending = getPendingUtms();
    expect(pending.utm_source).toBe("threads");
    expect(pending.cta_id).toBe("home_hero");
    expect(pending.referrer).toBe("https://www.threads.net/@beema");
    expect(pending.landing_path).toBe(
      "/waitlist/?utm_source=threads&cta_id=home_hero",
    );
  });

  it("builds a Formspree-ready attribution payload without empty fields required", () => {
    vi.stubGlobal("window", {
      location: {
        search: "?utm_source=meta&cta_id=footer",
        pathname: "/waitlist/",
      },
    });
    vi.stubGlobal("document", { referrer: "" });
    capturePageUtms();

    const snap = getAttributionForSubmit();
    expect(snap.utm_source).toBe("meta");
    expect(snap.cta_id).toBe("footer");
    expect(snap.page_path).toBe("/waitlist/?utm_source=meta&cta_id=footer");
  });
});
