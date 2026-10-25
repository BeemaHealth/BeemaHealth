import { describe, expect, it, vi } from "vitest";
import { CTA_IDS, resolveCta } from "../cta-ids";
import { NOT_FOUND_LINKS } from "../not-found";

describe("404 page", () => {
  it("links only to internal, trailing-slash paths", () => {
    for (const link of NOT_FOUND_LINKS) {
      expect(link.to).toMatch(/^\/[a-z0-9-/]*\/$/);
      expect(link.label.length).toBeGreaterThan(0);
    }
    expect(new Set(NOT_FOUND_LINKS.map((l) => l.to)).size).toBe(
      NOT_FOUND_LINKS.length,
    );
  });

  it("routes the CTA to Bask intake with its own attribution id", () => {
    const dataLayer: unknown[] = [];
    vi.stubGlobal("window", {
      dataLayer,
      location: { search: "", pathname: "/nope/" },
    });

    const cta = resolveCta(CTA_IDS.not_found);
    const target = new URL(cta.to);
    expect(target.hostname).toBe("q.beemahealth.com");
    expect(target.searchParams.get("cta_id")).toBe("not_found");

    cta.onClick();
    expect(dataLayer).toEqual([
      { event: "intake_handoff", cta_location: "not_found" },
    ]);
    vi.unstubAllGlobals();
  });
});
