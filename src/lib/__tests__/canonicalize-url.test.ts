import { describe, expect, it } from "vitest";
import { duplicateHomepageRedirectTarget } from "../canonicalize-url";

describe("duplicateHomepageRedirectTarget", () => {
  it("is a no-op for the canonical homepage (no self-redirect)", () => {
    expect(duplicateHomepageRedirectTarget("/")).toBeNull();
    expect(duplicateHomepageRedirectTarget("/", "?utm=1", "#x")).toBeNull();
    expect(duplicateHomepageRedirectTarget("/weight-loss/")).toBeNull();
    expect(duplicateHomepageRedirectTarget("/contact")).toBeNull();
  });

  it("rewrites /index.html to the canonical homepage path", () => {
    expect(duplicateHomepageRedirectTarget("/index.html")).toBe("/");
    expect(duplicateHomepageRedirectTarget("/index.html/")).toBe("/");
    expect(duplicateHomepageRedirectTarget("/index.html", "?utm=1")).toBe(
      "/?utm=1",
    );
    expect(
      duplicateHomepageRedirectTarget("/index.html", "?utm=1", "#cta"),
    ).toBe("/?utm=1#cta");
  });
});
