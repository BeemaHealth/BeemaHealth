import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BASK_HREF_SYNC_SCRIPT,
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

  it("reads utm_term, fbclid, and gclid when present", () => {
    expect(
      readUtmsFromUrl("?utm_source=google&utm_term=glp1&fbclid=Fb.1&gclid=G.1"),
    ).toMatchObject({
      utm_source: "google",
      utm_term: "glp1",
      fbclid: "Fb.1",
      gclid: "G.1",
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

  it("repairs Gmail-style percent-encoded UTM blobs so GA keys exist", () => {
    const mangled =
      "?utm_source%3Dx%26utm_medium%3Dsocial%26utm_campaign%3Ddaily_2026-07-22%26utm_content%3Dx_post_1_20260722_jbwy&source=gmail&ust=1&sa=E";
    expect(readUtmsFromUrl(mangled)).toEqual({
      utm_source: "x",
      utm_medium: "social",
      utm_campaign: "daily_2026-07-22",
      utm_content: "x_post_1_20260722_jbwy",
    });
  });

  it("BASK_HREF_SYNC_SCRIPT rewrites prerendered Bask anchors before hydration can", () => {
    const heroAnchor = {
      href: "https://q.beemahealth.com/start-online-visit/weightloss?cta_id=home_hero",
    };
    const footerAnchor = {
      href: "https://q.beemahealth.com/start-online-visit/weightloss?cta_id=footer",
    };
    const hiveLoginAnchor = { href: "https://hive.beemahealth.com/" };
    const anchors = [heroAnchor, footerAnchor, hiveLoginAnchor];

    vi.stubGlobal("window", {
      location: {
        search:
          "?utm_source=facebook&utm_campaign=houston&utm_medium=paid&fbclid=IwAR0.abc",
      },
    });
    vi.stubGlobal("document", {
      // Emulates `a[href^="https://q.beemahealth.com/"]` for the two Bask
      // CTAs only - the Hive login anchor must be left untouched.
      querySelectorAll: (selector: string) =>
        selector.includes("q.beemahealth.com")
          ? anchors.filter((a) =>
              a.href.startsWith("https://q.beemahealth.com/"),
            )
          : [],
    });

    // This is the literal inline <script> shipped in every prerendered page
    // (see RootShell in src/routes/__root.tsx) - run the real string, not a
    // reimplementation, so the test would catch a typo the same way a
    // browser would.

    new Function(BASK_HREF_SYNC_SCRIPT)();

    const heroUrl = new URL(heroAnchor.href);
    expect(heroUrl.searchParams.get("cta_id")).toBe("home_hero");
    expect(heroUrl.searchParams.get("utm_source")).toBe("facebook");
    expect(heroUrl.searchParams.get("utm_campaign")).toBe("houston");
    expect(heroUrl.searchParams.get("utm_medium")).toBe("paid");
    expect(heroUrl.searchParams.get("fbclid")).toBe("IwAR0.abc");

    const footerUrl = new URL(footerAnchor.href);
    expect(footerUrl.searchParams.get("cta_id")).toBe("footer");
    expect(footerUrl.searchParams.get("utm_source")).toBe("facebook");

    expect(hiveLoginAnchor.href).toBe("https://hive.beemahealth.com/");
  });

  it("BASK_HREF_SYNC_SCRIPT no-ops when the landing URL carries no attribution params", () => {
    const heroAnchor = {
      href: "https://q.beemahealth.com/start-online-visit/weightloss?cta_id=home_hero",
    };
    vi.stubGlobal("window", { location: { search: "" } });
    vi.stubGlobal("document", {
      querySelectorAll: () => [heroAnchor],
    });

    new Function(BASK_HREF_SYNC_SCRIPT)();

    expect(heroAnchor.href).toBe(
      "https://q.beemahealth.com/start-online-visit/weightloss?cta_id=home_hero",
    );
  });

  it("leaves already-valid UTM queries unchanged", () => {
    const ok =
      "?utm_source=x&utm_medium=social&utm_campaign=daily_2026-07-22&utm_content=x_post_1";
    expect(readUtmsFromUrl(ok)).toEqual({
      utm_source: "x",
      utm_medium: "social",
      utm_campaign: "daily_2026-07-22",
      utm_content: "x_post_1",
    });
  });
});
