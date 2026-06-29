import { describe, expect, it } from "vitest";
import {
  formatRefillCooldownWaitMessage,
  getRefillCooldownBannerMessage,
  isRefillCooldownActive,
  validateRefillRequestAllowed,
} from "@/lib/refill-cooldown";
import type { RefillCooldown } from "@/lib/types/mvp";

describe("refill cooldown helpers", () => {
  const inactive: RefillCooldown = {
    active: false,
    retry_after: null,
    hours_remaining: null,
  };

  const active: RefillCooldown = {
    active: true,
    retry_after: "2026-06-28T12:00:00.000Z",
    hours_remaining: 18.5,
  };

  it("detects active cooldown", () => {
    expect(isRefillCooldownActive(inactive)).toBe(false);
    expect(isRefillCooldownActive(active)).toBe(true);
  });

  it("allows refill when cooldown is inactive", () => {
    expect(validateRefillRequestAllowed(inactive)).toBeNull();
    expect(validateRefillRequestAllowed(null)).toBeNull();
  });

  it("blocks refill when cooldown is active", () => {
    const error = validateRefillRequestAllowed(active);
    expect(error).toContain("24 hours");
    expect(error).toContain("contact support");
  });

  it("formats wait message from hours remaining", () => {
    expect(formatRefillCooldownWaitMessage(active)).toContain("19 more hours");
    expect(getRefillCooldownBannerMessage(active)).toContain(
      "refill request within the last 24 hours",
    );
  });
});
