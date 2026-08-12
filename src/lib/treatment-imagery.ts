import brandedSemaglutide from "@/assets/treatments/compounded-semaglutide-vial.png";
import brandedTirzepatide from "@/assets/treatments/compounded-tirzepatide-vial.png";
import unbrandedSemaglutide from "@/assets/treatments/unbranded-semaglutide-vial.webp";
import unbrandedTirzepatide from "@/assets/treatments/unbranded-tirzepatide-vial.webp";

/**
 * ---------------------------------------------------------------------
 * Vial imagery switchboard
 * ---------------------------------------------------------------------
 * During LegitScript review we shipped colour product photography without
 * a brand name/logo on the vial. Certification is complete (August 2026);
 * the site still defaults to unbranded shots until product flips
 * `VIAL_IMAGERY_MODE` to `"branded"`. Branded Beema vial renders remain
 * imported and ready.
 *
 * `resolveVialImagery(id)` is the ONLY place that decision is made. Every
 * component that shows a vial calls this instead of importing an asset
 * directly, so switching the whole site back to branded imagery is a
 * one-line edit to VIAL_IMAGERY_MODE below.
 *
 * The two sets are framed differently - the branded render is a 3:2
 * canvas with a transparent background and the vial centred, the
 * unbranded shot is a square photo of a vial on a plinth - so each set
 * carries its own `wideCropClass` and intrinsic `width`/`height`. That
 * keeps the whole vial inside the letterboxed image area of the treatment
 * cards without either set needing per-component overrides.
 */
export type MedicationId = "semaglutide" | "tirzepatide";

export type VialImageryMode = "unbranded" | "branded";

/** Flip to "branded" when product wants Beema-wordmark vials (LegitScript already certified). */
export const VIAL_IMAGERY_MODE: VialImageryMode = "unbranded";

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
      width: 1536,
      height: 1024,
      alt: "Beema Health compounded semaglutide injection vial",
      wideCropClass: "object-center",
    },
    tirzepatide: {
      src: brandedTirzepatide,
      width: 1536,
      height: 1024,
      alt: "Beema Health compounded tirzepatide injection vial",
      wideCropClass: "object-center",
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
