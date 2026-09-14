import brandedSemaglutide from "@/assets/treatments/compounded-semaglutide-vial.webp";
import brandedTirzepatide from "@/assets/treatments/compounded-tirzepatide-vial.webp";
import unbrandedSemaglutide from "@/assets/treatments/unbranded-semaglutide-vial.webp";
import unbrandedTirzepatide from "@/assets/treatments/unbranded-tirzepatide-vial.webp";

/**
 * ---------------------------------------------------------------------
 * Vial imagery switchboard
 * ---------------------------------------------------------------------
 * During LegitScript review we shipped colour product photography without
 * a brand name/logo on the vial. Certification is complete (August 2026);
 * the site now ships branded Beema-wordmark vials. Unbranded shots remain
 * imported so flipping `VIAL_IMAGERY_MODE` back to `"unbranded"` is still
 * a one-line edit.
 *
 * `resolveVialImagery(id)` is the ONLY place that decision is made. Every
 * component that shows a vial calls this instead of importing an asset
 * directly.
 *
 * Unbranded shots are square studio photos of a vial on a plinth in a
 * staged set. Branded shots (2026-09-13, per Matt) are transparent-cutout
 * renders of the actual Beema-labeled vial (gold cap, black printed label,
 * honeycomb motif) at a portrait ~4:5 canvas, matching the real product
 * photography convention used on the other money pages (finasteride,
 * tadalafil, sildenafil, hair loss). Each set still carries its own
 * `wideCropClass` and intrinsic `width`/`height` so the vial stays inside
 * the letterboxed treatment cards without per-component overrides.
 */
export type MedicationId = "semaglutide" | "tirzepatide";

export type VialImageryMode = "unbranded" | "branded";

/** Flip to "unbranded" to restore colour vials without a Beema wordmark. */
export const VIAL_IMAGERY_MODE: VialImageryMode = "branded";

export type VialImagery = {
  /**
   * Product photo used everywhere a vial appears: treatment cards, treatment
   * page heroes, and the homepage hero's floating vial.
   */
  src: string;
  /** Intrinsic size of `src` - the two sets have different canvases. */
  width: number;
  height: number;
  alt: string;
  /** `object-position` for wide crops - keeps the vial fully in frame. */
  wideCropClass: string;
};

const IMAGERY: Record<VialImageryMode, Record<MedicationId, VialImagery>> = {
  unbranded: {
    semaglutide: {
      src: unbrandedSemaglutide,
      width: 1254,
      height: 1254,
      alt: "Compounded semaglutide injection vial",
      // Square photo in a letterbox crop: bias upward so the cap stays in.
      wideCropClass: "object-[center_40%]",
    },
    tirzepatide: {
      src: unbrandedTirzepatide,
      width: 1254,
      height: 1254,
      alt: "Compounded tirzepatide injection vial",
      wideCropClass: "object-[center_40%]",
    },
  },
  branded: {
    semaglutide: {
      src: brandedSemaglutide,
      width: 1024,
      height: 1280,
      alt: "Beema Health compounded semaglutide sterile injectable vial",
      // Portrait cutout in a letterbox crop: bias upward so the cap stays in.
      wideCropClass: "object-[center_40%]",
    },
    tirzepatide: {
      src: brandedTirzepatide,
      width: 1024,
      height: 1280,
      alt: "Beema Health compounded tirzepatide sterile injectable vial",
      wideCropClass: "object-[center_40%]",
    },
  },
};

/** Resolve the vial imagery a medication should render with today. */
export function resolveVialImagery(
  id: MedicationId,
  mode: VialImageryMode = VIAL_IMAGERY_MODE,
): VialImagery {
  return IMAGERY[mode][id];
}
