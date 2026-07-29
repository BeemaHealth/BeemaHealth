import brandedSemaglutide from "@/assets/treatments/compounded-semaglutide-vial.png";
import brandedSemaglutideFloating from "@/assets/treatments/compounded-semaglutide-vial-cutout.png";
import brandedTirzepatide from "@/assets/treatments/compounded-tirzepatide-vial.png";
import brandedTirzepatideFloating from "@/assets/treatments/compounded-tirzepatide-vial-cutout.png";
import unbrandedSemaglutide from "@/assets/treatments/unbranded-semaglutide-vial.webp";
import unbrandedSemaglutideFloating from "@/assets/treatments/unbranded-semaglutide-vial-cutout.webp";
import unbrandedTirzepatide from "@/assets/treatments/unbranded-tirzepatide-vial.webp";
import unbrandedTirzepatideFloating from "@/assets/treatments/unbranded-tirzepatide-vial-cutout.webp";

/**
 * ---------------------------------------------------------------------
 * Vial imagery switchboard
 * ---------------------------------------------------------------------
 * LegitScript prefers colour-branded product photography without a brand
 * name or logo on the vial, so while our application is under review the
 * site ships the unbranded product shots. The branded Beema vial renders
 * are untouched and still imported here, ready to go back up once we're
 * approved.
 *
 * `resolveVialImagery(id)` is the ONLY place that decision is made. Every
 * component that shows a vial calls this instead of importing an asset
 * directly, so switching the whole site back to branded imagery is a
 * one-line edit to VIAL_IMAGERY_MODE below.
 *
 * The two sets are framed differently — the branded render is a 3:2
 * canvas with a transparent background and the vial centred, the
 * unbranded shot is a square photo of a vial on a plinth — so each set
 * carries its own `wideCropClass`. That keeps the whole vial inside the
 * letterboxed image area of the treatment cards without either set
 * needing per-component overrides.
 */
export type MedicationId = "semaglutide" | "tirzepatide";

export type VialImageryMode = "unbranded" | "branded";

/** Flip to "branded" once LegitScript has reviewed us. */
export const VIAL_IMAGERY_MODE: VialImageryMode = "unbranded";

export type VialImagery = {
  /** Full-bleed image for treatment cards and treatment page heroes. */
  src: string;
  /**
   * Transparent-background variant for the floating vial in the homepage
   * hero, with its intrinsic size — the panel around it takes its shape from
   * the image, so the two sets reserve different boxes.
   */
  floating: { src: string; width: number; height: number };
  alt: string;
  /** `object-position` for wide crops — keeps the vial fully in frame. */
  wideCropClass: string;
};

const IMAGERY: Record<VialImageryMode, Record<MedicationId, VialImagery>> = {
  unbranded: {
    semaglutide: {
      src: unbrandedSemaglutide,
      floating: { src: unbrandedSemaglutideFloating, width: 345, height: 823 },
      alt: "Compounded semaglutide injection vial",
      // Square photo in a letterbox crop: bias upward so the cap stays in.
      wideCropClass: "object-[center_40%]",
    },
    tirzepatide: {
      src: unbrandedTirzepatide,
      floating: { src: unbrandedTirzepatideFloating, width: 345, height: 820 },
      alt: "Compounded tirzepatide injection vial",
      wideCropClass: "object-[center_40%]",
    },
  },
  branded: {
    semaglutide: {
      src: brandedSemaglutide,
      floating: { src: brandedSemaglutideFloating, width: 1536, height: 1024 },
      alt: "Beema Health compounded semaglutide injection vial",
      wideCropClass: "object-center",
    },
    tirzepatide: {
      src: brandedTirzepatide,
      floating: { src: brandedTirzepatideFloating, width: 1536, height: 1024 },
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
