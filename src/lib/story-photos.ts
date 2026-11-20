/**
 * Product photos for /share-your-story.
 *
 * Files live in public/images/share-your-story so they are static URLs on
 * beemahealth.com. Cloudflare caches that path the same way it caches
 * /images/recipes and /images/learn (stable filename, WebP, srcset widths).
 * Do not import these through Vite: hashed asset URLs are a poor image-search
 * filename and change every rebuild.
 *
 * Sources are the live treatment photos (transparent WebP). Width variants
 * never upscale past the source.
 */

export const STORY_PHOTO_DIRECTORY = "/images/share-your-story";

export type StoryPhoto = {
  id: "weight-loss" | "ed" | "nad" | "sermorelin" | "hair-loss";
  slug: string;
  alt: string;
  width: number;
  height: number;
  /** Intrinsic widths that exist on disk, largest last and equal to `width`. */
  widths: readonly number[];
};

export const STORY_PHOTOS: readonly StoryPhoto[] = [
  {
    id: "weight-loss",
    slug: "beema-health-compounded-tirzepatide-vial",
    alt: "Compounded tirzepatide injection vial and syringe, labeled sterile injectable, Rx only",
    width: 1024,
    height: 1280,
    widths: [480, 768, 1024],
  },
  {
    id: "ed",
    slug: "beema-health-ed-mints-dissolvable-tablet",
    alt: "Beema Health ED Mints dissolvable tablet",
    width: 1024,
    height: 1024,
    widths: [480, 768, 1024],
  },
  {
    id: "nad",
    slug: "beema-health-nad-plus-injection-vial",
    alt: "NAD+ sterile injectable vial and syringe, labeled 1000 mg/mL, Rx only",
    width: 800,
    height: 1000,
    widths: [480, 768, 800],
  },
  {
    id: "sermorelin",
    slug: "beema-health-sermorelin-injection-vial",
    alt: "Sermorelin sterile injectable vial, labeled Rx only",
    width: 800,
    height: 1000,
    widths: [480, 768, 800],
  },
  {
    id: "hair-loss",
    slug: "beema-health-finasteride-oral-tablets",
    alt: "Finasteride oral tablets in a clear bottle, labeled Rx only",
    width: 720,
    height: 900,
    widths: [480, 720],
  },
];

export function storyPhotoPath(photo: StoryPhoto, width?: number): string {
  const suffix = width == null || width === photo.width ? "" : `-${width}w`;
  return `${STORY_PHOTO_DIRECTORY}/${photo.slug}${suffix}.webp`;
}

export function storyPhotoSrcSet(photo: StoryPhoto): string {
  return photo.widths
    .map((width) => `${storyPhotoPath(photo, width)} ${width}w`)
    .join(", ");
}
