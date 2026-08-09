/**
 * Single source of truth for LegitScript certification seal data.
 * Change the verify URL, seal image, or display size here — consumers
 * (`LegitScriptSeal`, tests) all read from this module.
 *
 * Native asset is 73×79; we display a modest step up for hero prominence.
 * Avoid shrinking below native size (LegitScript warns that downscaling
 * hurts legibility).
 */
export const LEGITSCRIPT_VERIFY_URL =
  "https://www.legitscript.com/websites/?checker_keywords=beemahealth.com";

export const LEGITSCRIPT_SEAL_SRC =
  "https://static.legitscript.com/seals/51697885.png";

/** Native seal pixel size from LegitScript (do not display smaller). */
export const LEGITSCRIPT_SEAL_NATIVE_WIDTH = 73;
export const LEGITSCRIPT_SEAL_NATIVE_HEIGHT = 79;

/** Display size used on the homepage hero (~1.25× native). */
export const LEGITSCRIPT_SEAL_WIDTH = 92;
export const LEGITSCRIPT_SEAL_HEIGHT = 100;

export const LEGITSCRIPT_SEAL_ALT = "Verify Approval for www.beemahealth.com";

export const LEGITSCRIPT_SEAL_TITLE =
  "Verify LegitScript Approval for www.beemahealth.com";
