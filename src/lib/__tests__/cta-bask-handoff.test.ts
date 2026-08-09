import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  appendQueryParams,
  buildCtaSearch,
  CTA_IDS,
  resolveCta,
} from "@/lib/cta-ids";
import {
  capturePageUtms,
  clearPendingUtms,
  getBaskHandoffParams,
  getPendingUtms,
  readUtmsFromUrl,
  storePendingUtms,
} from "@/lib/utm";

describe("Bask attribution handoff", () => {
  beforeEach(() => {
    clearPendingUtms();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    clearPendingUtms();
    vi.unstubAllGlobals();
  });

  it("reads fbclid, gclid, and all five utm_* keys from the query string", () => {
    expect(
      readUtmsFromUrl(
        "?utm_source=meta&utm_medium=paid&utm_campaign=wl_q3&utm_term=glp1&utm_content=carousel_1&fbclid=FbClick.1&gclid=Aw.Google&cta_id=home_hero",
      ),
    ).toEqual({
      utm_source: "meta",
      utm_medium: "paid",
      utm_campaign: "wl_q3",
      utm_term: "glp1",
      utm_content: "carousel_1",
      fbclid: "FbClick.1",
      gclid: "Aw.Google",
      cta_id: "home_hero",
    });
  });

  it("persists click ids and utm_term into sessionStorage on capture", () => {
    vi.stubGlobal("window", {
      location: {
        search:
          "?utm_source=google&utm_medium=cpc&utm_term=semaglutide&gclid=G.123&fbclid=F.456",
        pathname: "/",
      },
    });
    vi.stubGlobal("document", { referrer: "" });

    capturePageUtms();
    const pending = getPendingUtms();
    expect(pending.utm_source).toBe("google");
    expect(pending.utm_term).toBe("semaglutide");
    expect(pending.gclid).toBe("G.123");
    expect(pending.fbclid).toBe("F.456");
  });

  it("keeps session click ids after navigating to a clean path", () => {
    storePendingUtms({
      utm_source: "meta",
      utm_medium: "paid",
      utm_campaign: "launch",
      utm_term: "tirzepatide",
      utm_content: "ad_a",
      fbclid: "keep.me",
      gclid: "also.keep",
    });

    vi.stubGlobal("window", {
      location: { search: "", pathname: "/semaglutide/" },
    });

    expect(getBaskHandoffParams()).toEqual({
      utm_source: "meta",
      utm_medium: "paid",
      utm_campaign: "launch",
      utm_term: "tirzepatide",
      utm_content: "ad_a",
      fbclid: "keep.me",
      gclid: "also.keep",
    });
  });

  it("appendQueryParams writes every handoff key onto the Bask intake URL", () => {
    const url = appendQueryParams(
      "https://q.beemahealth.com/start-online-visit/weightloss",
      {
        cta_id: "home_hero",
        utm_source: "meta",
        utm_medium: "paid",
        utm_campaign: "wl",
        utm_term: "glp1",
        utm_content: "story",
        fbclid: "Fb.9",
        gclid: "G.9",
      },
    );
    const params = new URL(url).searchParams;
    expect(params.get("cta_id")).toBe("home_hero");
    expect(params.get("utm_source")).toBe("meta");
    expect(params.get("utm_medium")).toBe("paid");
    expect(params.get("utm_campaign")).toBe("wl");
    expect(params.get("utm_term")).toBe("glp1");
    expect(params.get("utm_content")).toBe("story");
    expect(params.get("fbclid")).toBe("Fb.9");
    expect(params.get("gclid")).toBe("G.9");
  });

  it("resolveCta bakes handoff params into Bask `to` (Link ignores search on absolute URLs)", () => {
    storePendingUtms({
      utm_source: "meta",
      utm_medium: "paid",
      utm_campaign: "q3",
      utm_term: "weightloss",
      utm_content: "video",
      fbclid: "IwAR0.abc",
      gclid: "Cj0KCQ.xyz",
    });
    vi.stubGlobal("window", {
      location: { search: "", pathname: "/tirzepatide/" },
      dataLayer: [],
    });

    const cta = resolveCta(CTA_IDS.tirzepatide_hero);
    const params = new URL(cta.to).searchParams;

    expect(cta.to.startsWith("https://q.beemahealth.com/")).toBe(true);
    expect(params.get("cta_id")).toBe("tirzepatide_hero");
    expect(params.get("utm_source")).toBe("meta");
    expect(params.get("utm_medium")).toBe("paid");
    expect(params.get("utm_campaign")).toBe("q3");
    expect(params.get("utm_term")).toBe("weightloss");
    expect(params.get("utm_content")).toBe("video");
    expect(params.get("fbclid")).toBe("IwAR0.abc");
    expect(params.get("gclid")).toBe("Cj0KCQ.xyz");

    // search object stays in sync for callers that still pass it
    expect(cta.search.cta_id).toBe("tirzepatide_hero");
    expect(cta.search.fbclid).toBe("IwAR0.abc");
    expect(buildCtaSearch(CTA_IDS.home_hero).gclid).toBe("Cj0KCQ.xyz");
  });
});
