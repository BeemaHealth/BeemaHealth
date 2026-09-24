/**
 * Required compounded-medication sentences (treatment-pages.md / FDA
 * compounding themes). Reuse verbatim wherever compounded status is explained.
 */

export const COMPOUNDED_SEMA_REQUIRED =
  "Compounded semaglutide is not FDA-approved and is considered only when legally available and clinically appropriate.";

export const COMPOUNDED_TIRZ_REQUIRED =
  "Compounded tirzepatide is not FDA-approved and is considered only when legally available and clinically appropriate.";

export const COMPOUNDED_DISCLOSURE = `${COMPOUNDED_SEMA_REQUIRED} ${COMPOUNDED_TIRZ_REQUIRED}`;

/**
 * Updated 2026-09-03 (per Matt) to note the FDA-registered 503B outsourcing
 * facility - a real, verifiable fact distinct from an FDA drug approval.
 * The formulations themselves remain compounded and not FDA-approved (no
 * NDA/ANDA exists for a fixed-dose tadalafil+sildenafil, or +oxytocin,
 * tablet) - do not drop that disclosure just because the facility is
 * FDA-registered.
 */
export const COMPOUNDED_ED_MINTS_REQUIRED =
  "Beema Health's ED Mints formulations are compounded at an FDA-registered 503B outsourcing facility. They are not FDA-approved and are considered only when legally available and clinically appropriate.";

/**
 * Beema Health's tadalafil and sildenafil are the FDA-approved generic versions of
 * Cialis and Viagra (corrected 2026-09-03, per Matt) - not compounded, unlike
 * ED Mints above. Mirrors how oral finasteride is the real generic of
 * Propecia, not a compounded formulation.
 */
export const GENERIC_TADALAFIL_REQUIRED =
  "Beema Health's tadalafil is the FDA-approved generic version of Cialis - the identical active ingredient, strength, and intended use as the brand-name product, dispensed by a licensed pharmacy, not a compounded formulation.";

export const GENERIC_SILDENAFIL_REQUIRED =
  "Beema Health's sildenafil is the FDA-approved generic version of Viagra - the identical active ingredient, strength, and intended use as the brand-name product, dispensed by a licensed pharmacy, not a compounded formulation.";
