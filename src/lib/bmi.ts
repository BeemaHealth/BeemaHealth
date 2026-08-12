/** Shared BMI math for the marketing-site calculator (informational only - not clinical intake). */

export type BmiCategory = "underweight" | "healthy" | "overweight" | "obesity";

export const BMI_SCALE_MIN = 15;
export const BMI_SCALE_MAX = 40;

/** Beema shows the "Get started" CTA at/above this BMI. */
export const BMI_CTA_THRESHOLD = 30;

/** Standard BMI formula (lb / in^2 * 703). Returns null for non-finite or non-positive inputs. */
export function computeBmi(
  heightFt: number,
  heightIn: number,
  weightLbs: number,
): number | null {
  const totalInches = heightFt * 12 + heightIn;
  if (!Number.isFinite(totalInches) || totalInches <= 0) return null;
  if (!Number.isFinite(weightLbs) || weightLbs <= 0) return null;
  return (weightLbs / (totalInches * totalInches)) * 703;
}

export function bmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "healthy";
  if (bmi < 30) return "overweight";
  return "obesity";
}

export const BMI_CATEGORIES: Array<{
  id: BmiCategory;
  label: string;
  range: string;
}> = [
  { id: "underweight", label: "Underweight", range: "Under 18.5" },
  { id: "healthy", label: "Healthy weight", range: "18.5 – 24.9" },
  { id: "overweight", label: "Overweight", range: "25 – 29.9" },
  { id: "obesity", label: "Obesity", range: "30 and above" },
];
