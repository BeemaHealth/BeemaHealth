import type { ComponentType, SVGProps } from "react";
import { Facebook, Instagram, Linkedin } from "lucide-react";
import { XGlyph } from "@/components/site/primitives";

/**
 * Real, active Beema Health accounts shown as header/footer icons.
 * Schema `ORGANIZATION_JSONLD.sameAs` in `src/lib/seo.ts` is a superset:
 * it also includes TikTok (no lucide brand glyph, so omitted here) and the
 * Google Business Profile listing URL (identity profile, not a social icon).
 */
export type SocialLink = {
  label: string;
  href: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /**
   * Brand-accurate color, hardcoded on purpose: these are fixed external
   * brand identities (not part of Beema Health's own palette), so they don't
   * belong in design-tokens.ts. Applied at rest, not just on hover - omitted
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
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/beemahealth/",
    Icon: Linkedin,
    colorClassName: "text-[#0A66C2]",
  },
];
