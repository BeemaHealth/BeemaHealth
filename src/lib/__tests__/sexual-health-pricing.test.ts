import { describe, expect, it } from "vitest";
import {
  PRODUCT_PRICING,
  SILDENAFIL_PRICING,
  TADALAFIL_PRICING,
} from "@/landing-variants/sexual-health/pricing";
import {
  ED_MINTS_RDT_PRICING,
  ED_SILDENAFIL_PER_PILL_USD,
  ED_TADALAFIL_PER_PILL_USD,
} from "@/lib/simple-treatment-pricing";

const round2 = (n: number) => Math.round(n * 100) / 100;

describe("sexual health dose-level pricing", () => {
  it("matches the ED pricing sheet (3-month plans)", () => {
    expect(TADALAFIL_PRICING.quarterly.map((l) => [l.dose, l.usd])).toEqual([
      ["5mg", 149],
      ["10mg", 159],
      ["20mg", 249],
    ]);
    expect(SILDENAFIL_PRICING.quarterly.map((l) => l.usd)).toEqual([129]);
  });

  it("matches the ED pricing sheet (1-month plans)", () => {
    expect(TADALAFIL_PRICING.monthly.map((l) => l.usd)).toEqual([89, 99, 149]);
    expect(SILDENAFIL_PRICING.monthly.map((l) => l.usd)).toEqual([89]);
  });

  it("keeps the hero per-pill figures consistent with the 3-month plans", () => {
    const tad = TADALAFIL_PRICING.quarterly[0];
    const sil = SILDENAFIL_PRICING.quarterly[0];
    expect(round2(tad.usd / (tad.tablets ?? 1))).toBe(
      ED_TADALAFIL_PER_PILL_USD,
    );
    expect(round2(sil.usd / (sil.tablets ?? 1))).toBe(
      ED_SILDENAFIL_PER_PILL_USD,
    );
  });

  it("takes ED Mints prices from the shared pricing library", () => {
    const mints = PRODUCT_PRICING["ed-mints"];
    expect(mints.monthly[0].usd).toBe(ED_MINTS_RDT_PRICING.monthlyUsd);
    expect(mints.quarterly[0].usd).toBe(
      ED_MINTS_RDT_PRICING.quarterly?.totalUsd,
    );
  });
});
