/**
 * Aretide design tokens — single TypeScript source for semantic color usage.
 *
 * Raw oklch values live in `src/styles.css` (`:root` and `.dark`).
 * Components must reference semantic tokens from this file (or Tailwind
 * classes that map to those CSS variables) — never ad hoc hex/rgb/oklch.
 *
 * @see src/styles.css — brand palette definitions
 */

import { cn } from "@/lib/utils";

/** Semantic palette keys backed by CSS variables in styles.css */
export const SEMANTIC_COLORS = [
  "primary",
  "primary-soft",
  "secondary",
  "accent",
  "accent-foreground",
  "muted",
  "foreground",
  "success",
  "warning",
  "destructive",
  "border",
  "card",
  "background",
] as const;

export type SemanticColor = (typeof SEMANTIC_COLORS)[number];

/** Shared layout/text classes for portal section cards */
export const SECTION_CARD_BASE = {
  section: "border-border",
  title: "text-foreground",
  description: "text-muted-foreground",
  divider: "border-border/80",
} as const;

/**
 * Surface treatments per semantic palette color.
 * Tune softness/contrast here — section tones map to these entries.
 */
export const SEMANTIC_PALETTE_SURFACES = {
  warning: {
    header: "bg-warning/14",
    icon: "bg-warning/18 text-warning-foreground",
    editingRing: "ring-warning/20",
    footer: "bg-warning/10",
    badgeOn: "bg-warning/15 text-warning-foreground",
    rowIcon: "bg-warning/15 text-warning-foreground",
  },
  neutral: {
    header: "bg-muted/70",
    icon: "bg-foreground/8 text-foreground/70",
    editingRing: "ring-foreground/12",
    footer: "bg-muted/50",
    badgeOn: "bg-muted text-foreground/80",
    rowIcon: "bg-foreground/8 text-foreground/70",
  },
  secondary: {
    header: "bg-secondary/10",
    icon: "bg-secondary/12 text-secondary",
    editingRing: "ring-secondary/18",
    footer: "bg-secondary/6",
    badgeOn: "bg-secondary/10 text-secondary",
    rowIcon: "bg-secondary/12 text-secondary",
  },
  accent: {
    header: "bg-accent/30",
    icon: "bg-accent-foreground/10 text-accent-foreground",
    editingRing: "ring-accent-foreground/15",
    footer: "bg-accent/20",
    badgeOn: "bg-accent-foreground/10 text-accent-foreground",
    rowIcon: "bg-accent-foreground/10 text-accent-foreground",
  },
  success: {
    header: "bg-success/10",
    icon: "bg-success/12 text-success",
    editingRing: "ring-success/18",
    footer: "bg-success/6",
    badgeOn: "bg-success/12 text-success",
    rowIcon: "bg-success/12 text-success",
  },
  destructive: {
    header: "bg-destructive/8",
    icon: "bg-destructive/10 text-destructive",
    editingRing: "ring-destructive/15",
    footer: "bg-destructive/6",
    badgeOn: "bg-destructive/10 text-destructive",
    rowIcon: "bg-destructive/10 text-destructive",
  },
  primary: {
    header: "bg-primary-soft/70",
    icon: "bg-primary/15 text-primary",
    editingRing: "ring-primary/25",
    footer: "bg-primary-soft/40",
    badgeOn: "bg-primary/15 text-primary",
    rowIcon: "bg-primary/15 text-primary",
  },
} as const;

export type SemanticPalette = keyof typeof SEMANTIC_PALETTE_SURFACES;

export type SectionToneSurface = typeof SECTION_CARD_BASE & {
  header: string;
  icon: string;
  editingRing: string;
  footer: string;
  badgeOn: string;
  rowIcon: string;
};

/**
 * Portal section tone slugs (account tabs, intake steps, etc.)
 * mapped to a semantic palette entry above.
 */
export const SECTION_TONE_PALETTE = {
  /** Profile — yellow */
  primary: "warning",
  /** Contact — gray */
  contact: "neutral",
  /** Shipping — blue */
  shipping: "secondary",
  /** Communication — mint */
  communication: "accent",
  /** Consent — green */
  consent: "success",
  /** Security — light red */
  security: "destructive",
} as const satisfies Record<string, SemanticPalette>;

export type SectionTone = keyof typeof SECTION_TONE_PALETTE;

export function getSectionToneStyles(tone: SectionTone): SectionToneSurface {
  const palette = SEMANTIC_PALETTE_SURFACES[SECTION_TONE_PALETTE[tone]];
  return { ...SECTION_CARD_BASE, ...palette };
}

export function sectionDividerClass(tone: SectionTone): string {
  return getSectionToneStyles(tone).divider;
}

export function sectionBadgeOnClass(tone: SectionTone): string {
  return getSectionToneStyles(tone).badgeOn;
}

export function sectionRowIconClass(tone: SectionTone): string {
  return getSectionToneStyles(tone).rowIcon;
}

export function sectionNavIconClass(tone: SectionTone): string {
  return getSectionToneStyles(tone).icon;
}

export function sectionNavActiveClass(tone: SectionTone): string {
  const styles = getSectionToneStyles(tone);
  return cn(styles.header, SECTION_CARD_BASE.title, "font-medium");
}

/** Dashboard home summary card icon chips */
export const DASHBOARD_SUMMARY_ICON_STYLES = {
  review: "bg-warning/25 text-warning-foreground",
  prescription: "bg-success/20 text-success",
  shipping: "bg-muted text-muted-foreground",
  messages: "bg-accent/70 text-accent-foreground",
} as const;

export type DashboardSummaryIconTone =
  keyof typeof DASHBOARD_SUMMARY_ICON_STYLES;

/** Status badge chips (dashboard status, timeline, etc.) */
export const STATUS_BADGE_STYLES = {
  success: {
    badge: "border-success/30 bg-success/15 text-foreground",
    dot: "bg-success",
  },
  warning: {
    badge: "border-warning/35 bg-warning/25 text-foreground",
    dot: "bg-warning-foreground/70",
  },
  info: {
    badge: "border-secondary/25 bg-secondary/12 text-foreground",
    dot: "bg-secondary",
  },
  muted: {
    badge: "border-border bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/50",
  },
} as const;

export type StatusBadgeTone = keyof typeof STATUS_BADGE_STYLES;

/** Prominent status / notice banners */
export const NOTICE_BANNER_STYLES = {
  primary: "border-primary/25 bg-primary-soft",
  warning: "border-warning/30 bg-warning/10",
} as const;

export type NoticeBannerTone = keyof typeof NOTICE_BANNER_STYLES;

/** Case timeline event chips */
export const TIMELINE_TONE_STYLES = {
  blue: {
    dot: "bg-secondary",
    badge: "border-secondary/20 bg-secondary/12 text-secondary",
  },
  green: {
    dot: "bg-success",
    badge: "border-success/20 bg-success/12 text-success",
  },
  orange: {
    dot: "bg-warning",
    badge: "border-warning/25 bg-warning/20 text-warning-foreground",
  },
  gray: {
    dot: "bg-muted-foreground/45",
    badge: "border-border bg-muted text-muted-foreground",
  },
} as const;

export type TimelineTone = keyof typeof TIMELINE_TONE_STYLES;
