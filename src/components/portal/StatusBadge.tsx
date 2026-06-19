import { cn } from "@/lib/utils";

const dotColors = {
  success: "bg-success",
  warning: "bg-warning",
  info: "bg-secondary",
  muted: "bg-muted-foreground/40",
} as const;

export function StatusBadge({
  label,
  tone = "muted",
  className,
}: {
  label: string;
  tone?: keyof typeof dotColors;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground",
        className,
      )}
    >
      <span
        className={cn("size-1.5 rounded-full", dotColors[tone])}
        aria-hidden
      />
      {label}
    </span>
  );
}
