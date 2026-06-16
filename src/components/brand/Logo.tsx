import { cn } from "@/lib/utils";

/**
 * Aretide wordmark — lowercase "aretide" with a leaf/upward-path shape inside the A.
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
          {/* V shape */}
          <path
            d="M5 6.5 L11.2 17.5 a1 1 0 0 0 1.7 0 L19 6.5"
            stroke="var(--color-primary-foreground)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* leaf / upward path accent rising out of the V */}
          <path
            d="M12 14 C 12 10.5 14 8.5 17.5 8 C 17 11.5 15 13.5 12 14 Z"
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
