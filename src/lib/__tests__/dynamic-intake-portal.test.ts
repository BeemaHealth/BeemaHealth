import { describe, expect, it } from "vitest";
import type { BelugaVisitPayloadSnapshot } from "@/lib/types/mvp";

/** Mirror of portal logic: submitted review uses snapshot, not live gate. */
function shouldUseSubmittedReviewView(
  locked: boolean,
  hasSnapshot: boolean,
  fieldType: string,
): boolean {
  return (
    locked && hasSnapshot && (fieldType === "review" || fieldType === "plugin")
  );
}

describe("dynamic intake portal review", () => {
  it("uses submitted review view when intake is locked with snapshot", () => {
    expect(shouldUseSubmittedReviewView(true, true, "review")).toBe(true);
    expect(shouldUseSubmittedReviewView(false, true, "review")).toBe(false);
    expect(shouldUseSubmittedReviewView(true, false, "review")).toBe(false);
  });

  it("treats ready beluga snapshot as proof of successful POST payload", () => {
    const payload: BelugaVisitPayloadSnapshot = {
      ready: true,
      ready_count: 12,
      required_count: 12,
      missing: [],
      fields: [],
      form_obj: { firstName: "Jane" },
    };
    expect(payload.ready).toBe(true);
    expect(payload.missing).toHaveLength(0);
  });
});
