import { describe, expect, it } from "vitest";
import {
  INTAKE_ACKNOWLEDGMENT_KEY,
  isIntakeAcknowledgmentsComplete,
  normalizeSafetyAcknowledgments,
} from "@/lib/intake-acknowledgments";

describe("intake-acknowledgments", () => {
  it("is complete when agreed is true", () => {
    expect(isIntakeAcknowledgmentsComplete({ agreed: true })).toBe(true);
  });

  it("is complete when all legacy keys are true", () => {
    expect(
      isIntakeAcknowledgmentsComplete({
        no_guarantee: true,
        provider_review: true,
        side_effects: true,
        emergency: true,
        compounded: true,
        accurate: true,
        telehealth: true,
        electronic: true,
        storage: true,
      }),
    ).toBe(true);
  });

  it("is incomplete when agreed is false or missing", () => {
    expect(isIntakeAcknowledgmentsComplete({ agreed: false })).toBe(false);
    expect(isIntakeAcknowledgmentsComplete({})).toBe(false);
  });

  it("normalizes complete drafts to agreed only", () => {
    expect(
      normalizeSafetyAcknowledgments({
        [INTAKE_ACKNOWLEDGMENT_KEY]: true,
        no_guarantee: true,
      }),
    ).toEqual({ agreed: true });
  });

  it("clears incomplete drafts", () => {
    expect(normalizeSafetyAcknowledgments({ no_guarantee: true })).toEqual({});
  });
});
