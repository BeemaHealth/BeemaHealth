export type BlogInline =
  | { type: "text"; value: string }
  | { type: "strong"; value: string }
  | { type: "link"; label: string; href: string };

export type BlogChart = {
  id: string;
  title: string;
  unit: string;
  /** [ISO date, value], in date order. */
  points: readonly (readonly [string, number])[];
};

export type BlogBlock =
  | { type: "chart"; id: string }
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; inlines: BlogInline[]; disclaimer: boolean }
  | { type: "list"; items: BlogInline[][] }
  | {
      type: "image";
      /** Base path without size suffix or extension, e.g. /images/blog/name. */
      src: string;
      alt: string;
      width: number;
      height: number;
    };

export type BlogArticle = {
  title: string;
  slug: string;
  metaDescription: string;
  excerpt: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  author: string;
  blocks: BlogBlock[];
};
