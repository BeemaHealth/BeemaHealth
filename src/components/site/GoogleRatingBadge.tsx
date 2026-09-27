import { Star } from "lucide-react";
import {
  GOOGLE_BUSINESS_LISTING_URL,
  GOOGLE_RATING_VALUE,
} from "@/lib/google-business";
import { cn } from "@/lib/utils";

type GoogleRatingBadgeProps = {
  className?: string;
};

/**
 * "5.0 on Google" trust badge - 5 filled stars linking to the Google
 * Business Profile listing. Originally inline on Glp1LandingPage.tsx;
 * extracted so treatment-page heroes can reuse the identical markup instead
 * of duplicating it. Caller supplies any entrance-animation wrapper (motion
 * timing differs per hero), matching how LegitScriptSeal works.
 */
export function GoogleRatingBadge({ className }: GoogleRatingBadgeProps) {
  return (
    <a
      href={GOOGLE_BUSINESS_LISTING_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground shadow-soft ring-1 ring-border/60 transition-colors hover:bg-muted",
        className,
      )}
    >
      <span aria-hidden className="flex items-center gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            strokeWidth={1.5}
            className="size-4 fill-primary stroke-foreground"
          />
        ))}
      </span>
      {GOOGLE_RATING_VALUE} on Google
    </a>
  );
}
