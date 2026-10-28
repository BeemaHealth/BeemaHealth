export const BLOG_INDEX_PATH = "/blogs/" as const;

export function blogArticlePath(slug: string): string {
  return `/blogs/${slug}/`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export function formatBlogDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const month = MONTHS[Number(match[2]) - 1];
  if (!month) return iso;
  return `${month} ${Number(match[3])}, ${match[1]}`;
}

/** Responsive WebP variants live next to the full-size file: name-480w.webp, etc. */
const IMAGE_WIDTHS = [480, 768, 1024] as const;

export function blogImageSrcSet(src: string, fullWidth: number): string {
  return [
    ...IMAGE_WIDTHS.map((width) => `${src}-${width}w.webp ${width}w`),
    `${src}.webp ${fullWidth}w`,
  ].join(", ");
}

export function blogImageFile(src: string): string {
  return `${src}.webp`;
}
