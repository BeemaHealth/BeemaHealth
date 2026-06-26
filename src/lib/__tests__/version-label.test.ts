import { describe, expect, it } from "vitest";
import {
  bumpVersionLabel,
  parseVersionNumber,
} from "@/lib/questionnaire/version-label";

describe("version label helpers", () => {
  it("parses leading numeric version labels", () => {
    expect(parseVersionNumber("2.0.0")).toBe(2);
    expect(parseVersionNumber("12-beta")).toBe(12);
    expect(parseVersionNumber("home-hero")).toBeNull();
  });

  it("bumps numeric labels while preserving suffix", () => {
    expect(bumpVersionLabel("2.0.0", 1)).toBe("3.0.0");
    expect(bumpVersionLabel("2.0.0", -1)).toBe("1.0.0");
  });

  it("clamps version labels to 32 characters", () => {
    const long = "9" + "x".repeat(40);
    expect(bumpVersionLabel(long, 1).length).toBeLessThanOrEqual(32);
  });
});
