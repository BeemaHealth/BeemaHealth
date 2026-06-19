import { describe, expect, it } from "vitest";
import {
  canEditEligibilitySummary,
  canEditIntake,
} from "@/lib/intake-edit-policy";

describe("intake-edit-policy", () => {
  it("allows edit during draft funnel", () => {
    expect(canEditIntake("draft")).toBe(true);
    expect(canEditEligibilitySummary("draft", "funnel")).toBe(true);
  });

  it("blocks portal edit when submitted", () => {
    expect(canEditIntake("submitted", false)).toBe(false);
    expect(canEditEligibilitySummary("submitted", "portal")).toBe(false);
  });

  it("allows edit when more_info_needed", () => {
    expect(canEditIntake("more_info_needed", true)).toBe(true);
    expect(canEditEligibilitySummary("more_info_needed", "portal", true)).toBe(
      true,
    );
  });
});
