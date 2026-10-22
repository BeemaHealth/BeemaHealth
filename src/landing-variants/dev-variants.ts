// Dev-only: lets ?preview_variant= render ANY variant file, even one that is
// not live. Loaded through a DEV-gated dynamic import, so production bundles
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
