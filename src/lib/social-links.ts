import type { ComponentType, SVGProps } from "react";
import { Facebook, Instagram } from "lucide-react";
import { RedditGlyph, XGlyph } from "@/components/site/primitives";

/**
 * Real, active Beema Health accounts — mirrors ORGANIZATION_JSONLD.sameAs in
 * `src/lib/seo.ts`. LinkedIn is intentionally absent: the current account may
 * be a private personal profile rather than a public company page — re-add
 * once a proper company page exists. TikTok is asserted in sameAs for
 * schema/GEO purposes but left off this list: lucide has no brand glyph for
 * it, and a mismatched icon style would look worse than omitting it.
 */
export type SocialLink = {
  label: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /**
   * Brand-accurate color, hardcoded on purpose: these are fixed external
   * brand identities (not part of Beema's own palette), so they don't
   * belong in design-tokens.ts. Applied at rest, not just on hover — omitted
   * for X, whose current mark is monochrome, so it keeps the row's neutral
   * default instead of an inaccurate tint.
   */
  colorClassName?: string;
};

export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61591847661626",
    Icon: Facebook,
    colorClassName: "text-[#1877F2]",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/beemahealth",
    Icon: Instagram,
    colorClassName: "text-[#E4405F]",
  },
  {
    label: "X",
    href: "https://x.com/beemahealth",
    Icon: XGlyph,
  },
  {
    label: "Reddit",
    href: "https://www.reddit.com/r/beemahealth/",
    Icon: RedditGlyph,
    colorClassName: "text-[#FF4500]",
  },
];
