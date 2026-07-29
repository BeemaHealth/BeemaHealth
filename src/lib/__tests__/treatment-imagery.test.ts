import { describe, expect, it } from "vitest";
import {
  VIAL_IMAGERY_MODE,
  resolveVialImagery,
  type MedicationId,
} from "@/lib/treatment-imagery";

const MEDICATIONS: MedicationId[] = ["semaglutide", "tirzepatide"];

describe("treatment-imagery", () => {
  it("ships unbranded vials while LegitScript reviews us", () => {
    expect(VIAL_IMAGERY_MODE).toBe("unbranded");
    for (const id of MEDICATIONS) {
      const imagery = resolveVialImagery(id);
      expect(imagery.src).toContain(`unbranded-${id}-vial`);
      expect(imagery.alt).toBe(`Compounded ${id} injection vial`);
      expect(imagery.alt).not.toContain("Beema");
    }
  });

  it("keeps the branded renders one flag away", () => {
    for (const id of MEDICATIONS) {
      const branded = resolveVialImagery(id, "branded");
      expect(branded.src).toContain(`compounded-${id}-vial`);
      expect(branded.alt).toContain("Beema Health");
    }
  });

  it("floats a transparent cutout in the hero, sized for its own canvas", () => {
    for (const mode of ["unbranded", "branded"] as const) {
      for (const id of MEDICATIONS) {
        const { floating } = resolveVialImagery(id, mode);
        expect(floating.src).toContain("cutout");
        expect(floating.width).toBeGreaterThan(0);
        expect(floating.height).toBeGreaterThan(0);
      }
    }
  });

  it("gives each set a crop that keeps the vial in a letterboxed frame", () => {
    for (const id of MEDICATIONS) {
      expect(resolveVialImagery(id, "unbranded").wideCropClass).toBe(
        "object-[center_40%]",
      );
      expect(resolveVialImagery(id, "branded").wideCropClass).toBe(
        "object-center",
      );
    }
  });

  it("distinguishes the two medications in every mode", () => {
    for (const mode of ["unbranded", "branded"] as const) {
      const [sema, tirze] = MEDICATIONS.map((id) =>
        resolveVialImagery(id, mode),
      );
      expect(sema.src).not.toBe(tirze.src);
    }
  });
});
