/**
 * Lightweight recipe count for nav copy. Kept out of recipes.ts on purpose:
 * SiteHeader (bundled into every page via MarketingLayout) only needs the
 * count for its "More" dropdown description - importing RECIPES itself would
 * pull the full ~600-line recipe dataset (instructions, scaled templates,
 * nutrition) into that shared chunk. Measured contributing to a 1.2s main-
 * thread boot cost on the shared layout bundle (2026-09-27 performance
 * audit). Verified against RECIPES.length in recipes.test.ts - update this
 * if a recipe is added or removed.
 */
export const RECIPES_COUNT = 13;
