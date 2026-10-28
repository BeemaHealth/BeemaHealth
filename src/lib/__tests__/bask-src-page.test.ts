import { describe, expect, it } from "vitest";
import { withBaskSrcPage } from "@/lib/utm";

const BASK = "https://q.beemahealth.com/start-online-visit/tadalafil";

describe("withBaskSrcPage", () => {
  it("stamps the clicked page on a Bask intake URL and keeps existing params", () => {
    const out = new URL(
      withBaskSrcPage(
        `${BASK}?cta_id=sildenafil_hero&utm_source=x`,
        "/sexual-health/",
      ),
    );
    expect(out.searchParams.get("src_page")).toBe("/sexual-health/");
    expect(out.searchParams.get("cta_id")).toBe("sildenafil_hero");
    expect(out.searchParams.get("utm_source")).toBe("x");
  });

  it("overwrites a stale src_page instead of duplicating it", () => {
    const out = new URL(
      withBaskSrcPage(`${BASK}?src_page=%2Fold%2F`, "/nad-plus/"),
    );
    expect(out.searchParams.getAll("src_page")).toEqual(["/nad-plus/"]);
  });

  it("leaves non-Bask and malformed links alone", () => {
    expect(withBaskSrcPage("https://example.com/a", "/x/")).toBe(
      "https://example.com/a",
    );
    expect(withBaskSrcPage("not a url", "/x/")).toBe("not a url");
    expect(withBaskSrcPage("https://q.beemahealth.com.evil.com/a", "/x/")).toBe(
      "https://q.beemahealth.com.evil.com/a",
    );
  });

  it("only stamps site paths, as an encoded value", () => {
    expect(withBaskSrcPage(BASK, "//evil.com")).toContain(
      "src_page=%2F%2Fevil.com",
    );
    expect(withBaskSrcPage(BASK, "javascript:alert(1)")).toBe(BASK);
    expect(withBaskSrcPage(BASK, `/${"a".repeat(200)}`)).toBe(BASK);
  });
});
