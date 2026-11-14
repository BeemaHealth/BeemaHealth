import { describe, expect, it } from "vitest";
import { MINT_PLAN_COMPARISONS } from "./plan-comparison";

describe("ED Mints plan comparison", () => {
  const rdt = MINT_PLAN_COMPARISONS.find((p) => p.id === "rdt")!;
  const odt = MINT_PLAN_COMPARISONS.find((p) => p.id === "odt")!;

  it("uses the cost-sheet tablet counts", () => {
    expect(rdt.monthly.tablets).toBe(10);
    expect(rdt.quarterly.tablets).toBe(32);
    expect(odt.monthly.tablets).toBe(6);
    expect(odt.quarterly.tablets).toBe(18);
  });

  it("derives per-tablet and per-month prices", () => {
    expect(rdt.monthly.perTabletUsd).toBe(14.9);
    expect(rdt.quarterly.perTabletUsd).toBe(6.22);
    expect(odt.monthly.perTabletUsd).toBe(24.83);
    expect(odt.quarterly.perTabletUsd).toBe(11.06);
    expect(rdt.quarterly.perMonthUsd).toBe(66.33);
  });

  it("3 months is cheaper per tablet and in total savings", () => {
    for (const p of MINT_PLAN_COMPARISONS) {
      expect(p.quarterly.perTabletUsd).toBeLessThan(p.monthly.perTabletUsd);
      expect(p.quarterly.savingsUsd).toBeGreaterThan(0);
      expect(p.quarterly.tablets).toBeGreaterThan(p.monthly.tablets * 2);
    }
  });
});
