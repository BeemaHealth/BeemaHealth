import beemaMark from "@/assets/beema-mark.png";
import { cn } from "@/lib/utils";

type LogoProps = {
  /** Sizing classes applied to the bee mark image (legacy contract). */
  className?: string;
  /** Set on black `ink` surfaces so the wordmark stays legible. */
  tone?: "default" | "ink";
  /** Hide the text wordmark and show only the hexagon bee mark. */
  markOnly?: boolean;
};

export function Logo({
  className,
  tone = "default",
  markOnly = false,
}: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <img
        src={beemaMark}
        alt="Beema Health"
        width={592}
        height={653}
        className={cn("h-10 w-auto object-contain", className)}
      />
      {/* Wordmark is visual; accessible name comes from the img alt (and any
          wrapping Link aria-label). Keeps Bing/Lighthouse from flagging empty alt. */}
      <span
        aria-hidden="true"
        className={cn(
          "font-display text-xl font-bold leading-none tracking-tight",
          tone === "ink" ? "text-ink-foreground" : "text-foreground",
          markOnly && "sr-only",
        )}
      >
        Beema{" "}
        <span
          className={tone === "ink" ? "text-primary" : "text-accent-foreground"}
        >
          Health
        </span>
      </span>
    </span>
  );
}
