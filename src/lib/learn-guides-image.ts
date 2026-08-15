export const LEARN_GUIDES_IMAGE_SLUG = "library-reading";
export const LEARN_GUIDES_IMAGE_WIDTHS = [480, 768, 1024, 1536] as const;
export const LEARN_GUIDES_IMAGE_ALT =
  "A woman reading by a fireplace in a cozy home library";

export function learnGuidesImagePath(
  width: (typeof LEARN_GUIDES_IMAGE_WIDTHS)[number] = 1536,
): string {
  const suffix = width === 1536 ? "" : `-${width}w`;
  return `/images/learn/${LEARN_GUIDES_IMAGE_SLUG}${suffix}.webp`;
}

export function learnGuidesImageSrcSet(): string {
  return LEARN_GUIDES_IMAGE_WIDTHS.map(
    (width) => `${learnGuidesImagePath(width)} ${width}w`,
  ).join(", ");
}
