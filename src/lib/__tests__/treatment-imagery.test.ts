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

  it("exposes one photo per medication, with its intrinsic size", () => {
    for (const mode of ["unbranded", "branded"] as const) {
      for (const id of MEDICATIONS) {
        const imagery = resolveVialImagery(id, mode);
        // The hero's floating vial and the treatment cards share this photo,
        // so no transparent cutout variant exists anymore.
        expect(imagery.src).not.toContain("cutout");
        expect(imagery.width).toBeGreaterThan(0);
        expect(imagery.height).toBeGreaterThan(0);
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
