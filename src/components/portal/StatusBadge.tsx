import { cn } from "@/lib/utils";
import { STATUS_BADGE_STYLES, type StatusBadgeTone } from "@/lib/design-tokens";

export function StatusBadge({
  label,
  tone = "muted",
  className,
}: {
  label: string;
  tone?: StatusBadgeTone;
  className?: string;
}) {
  const styles = STATUS_BADGE_STYLES[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        styles.badge,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", styles.dot)} aria-hidden />
      {label}
    </span>
  );
}
