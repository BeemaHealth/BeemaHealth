// Dev and staging only: lets ?preview_variant= render ANY variant file, even
// one that is not live. Loaded through a dynamic import gated on DEV or
// VITE_PREVIEW_ALL_VARIANTS=1 (set only in .env.staging), so production bundles
// never include inactive variants.
import type { LandingVariant } from "./types";

const modules = import.meta.glob<{ variant: LandingVariant }>("./*/v*.tsx", {
  eager: true,
});

export function findDevVariant(
  page: string,
  variantId: string,
): LandingVariant | null {
  for (const [path, mod] of Object.entries(modules)) {
    if (path.startsWith(`./${page}/`) && mod.variant.id === variantId)
      return mod.variant;
  }
  return null;
}

/** Every variant file for a page, control first. Used by the staging switcher. */
export function listVariants(page: string): LandingVariant[] {
  return Object.entries(modules)
    .filter(([path]) => path.startsWith(`./${page}/`))
    .map(([, mod]) => mod.variant)
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}
