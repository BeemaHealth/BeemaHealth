import { describe, expect, it } from "vitest";
import {
  LEGITSCRIPT_SEAL_HEIGHT,
  LEGITSCRIPT_SEAL_NATIVE_HEIGHT,
  LEGITSCRIPT_SEAL_NATIVE_WIDTH,
  LEGITSCRIPT_SEAL_SRC,
  LEGITSCRIPT_SEAL_WIDTH,
  LEGITSCRIPT_VERIFY_URL,
} from "@/lib/legitscript";

describe("legitscript", () => {
  it("points at the beemahealth.com LegitScript verify page", () => {
    expect(LEGITSCRIPT_VERIFY_URL).toBe(
      "https://www.legitscript.com/websites/?checker_keywords=beemahealth.com",
    );
  });

  it("uses the official seal asset, displayed slightly above native size", () => {
    expect(LEGITSCRIPT_SEAL_SRC).toBe(
      "https://static.legitscript.com/seals/51697885.png",
    );
    expect(LEGITSCRIPT_SEAL_NATIVE_WIDTH).toBe(73);
    expect(LEGITSCRIPT_SEAL_NATIVE_HEIGHT).toBe(79);
    expect(LEGITSCRIPT_SEAL_WIDTH).toBe(92);
    expect(LEGITSCRIPT_SEAL_HEIGHT).toBe(100);
    expect(LEGITSCRIPT_SEAL_WIDTH).toBeGreaterThanOrEqual(
      LEGITSCRIPT_SEAL_NATIVE_WIDTH,
    );
    expect(LEGITSCRIPT_SEAL_HEIGHT).toBeGreaterThanOrEqual(
      LEGITSCRIPT_SEAL_NATIVE_HEIGHT,
    );
  });
});
