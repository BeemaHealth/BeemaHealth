import { describe, expect, it } from "vitest";
import {
  BMI_CATEGORIES,
  BMI_CTA_THRESHOLD,
  bmiCategory,
  computeBmi,
} from "@/lib/bmi";

describe("computeBmi", () => {
  it("computes a standard BMI value", () => {
    // 5'8", 170 lb → ~25.8 BMI (matches the standard reference formula)
    const bmi = computeBmi(5, 8, 170);
    expect(bmi).not.toBeNull();
    expect(bmi!).toBeCloseTo(25.84, 1);
  });

  it("returns null for zero or negative height", () => {
    expect(computeBmi(0, 0, 170)).toBeNull();
    expect(computeBmi(-1, 0, 170)).toBeNull();
  });

  it("returns null for zero or negative weight", () => {
    expect(computeBmi(5, 8, 0)).toBeNull();
    expect(computeBmi(5, 8, -10)).toBeNull();
  });

  it("returns null for non-finite inputs", () => {
    expect(computeBmi(NaN, 8, 170)).toBeNull();
    expect(computeBmi(5, 8, Infinity)).toBeNull();
  });
});

describe("bmiCategory", () => {
  it("categorizes underweight below 18.5", () => {
    expect(bmiCategory(18.4)).toBe("underweight");
  });

  it("categorizes healthy weight from 18.5 up to 25", () => {
    expect(bmiCategory(18.5)).toBe("healthy");
    expect(bmiCategory(24.9)).toBe("healthy");
  });

  it("categorizes overweight from 25 up to 30", () => {
    expect(bmiCategory(25)).toBe("overweight");
    expect(bmiCategory(29.9)).toBe("overweight");
  });

  it("categorizes obesity at 30 and above", () => {
    expect(bmiCategory(30)).toBe("obesity");
    expect(bmiCategory(45)).toBe("obesity");
  });
});

describe("BMI_CTA_THRESHOLD", () => {
  it("aligns with the obesity category boundary", () => {
    expect(BMI_CTA_THRESHOLD).toBe(30);
    expect(bmiCategory(BMI_CTA_THRESHOLD)).toBe("obesity");
  });
});

describe("BMI_CATEGORIES", () => {
  it("covers all four categories with no gaps", () => {
    expect(BMI_CATEGORIES.map((c) => c.id)).toEqual([
      "underweight",
      "healthy",
      "overweight",
      "obesity",
    ]);
  });
});
