import { cn } from "@/lib/utils";

const toneStyles = {
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

export function StatusBadge({
  label,
  tone = "muted",
  className,
}: {
  label: string;
  tone?: keyof typeof toneStyles;
  className?: string;
}) {
  const styles = toneStyles[tone];

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
