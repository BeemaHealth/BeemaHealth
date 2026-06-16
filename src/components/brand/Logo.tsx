import { cn } from "@/lib/utils";

/**
 * Aretide wordmark — mountain peak + horizon line (Colorado-inspired, not a V).
 */
export function Logo({
  className,
  showWordmark = true,
}: {
  className?: string;
  showWordmark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary shadow-soft">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          aria-hidden="true"
        >
          {/* horizon */}
          <path
            d="M4 17.5 H20"
            stroke="var(--color-primary-foreground)"
            strokeWidth="1.5"
            strokeLinecap="round"
            opacity="0.5"
          />
          {/* mountain peak */}
          <path
            d="M5 17 L12 7 L19 17 Z"
            fill="var(--color-primary-foreground)"
            opacity="0.9"
          />
          {/* accent snow cap */}
          <path
            d="M10.5 11.5 L12 7 L13.5 11.5 Z"
            fill="var(--color-accent)"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="font-display text-2xl font-bold lowercase tracking-tight text-foreground">
          aretide
        </span>
      )}
    </span>
  );
}
