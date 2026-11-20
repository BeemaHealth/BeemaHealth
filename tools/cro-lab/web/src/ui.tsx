import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";
import { Check, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import type { VariantStatus } from "@shared/types.ts";
import type { Evidence } from "@shared/metrics.ts";

export const cx = clsx;

export function Button({
  variant = "ghost",
  size = "md",
  className,
  loading,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "outline" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={cx(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45",
        size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
        variant === "primary" && "bg-teal text-bg hover:bg-[#5eead4]",
        variant === "ghost" && "text-soft hover:bg-raised hover:text-ink",
        variant === "outline" &&
          "border border-line-strong text-ink hover:bg-raised",
        variant === "danger" && "text-rose hover:bg-rose/10",
        className,
      )}
    >
      {loading && <Loader2 className="size-3.5 animate-spin" />}
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-faint transition-colors hover:bg-raised hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent",
        className,
      )}
    >
      {children}
    </button>
  );
}

export type DisplayStatus = VariantStatus | "testing" | "staging";

const STATUS_STYLE: Record<DisplayStatus, string> = {
  testing: "bg-sky/10 text-sky ring-sky/30",
  staging: "bg-violet-500/10 text-violet-300 ring-violet-400/30",
  live: "bg-amber/12 text-amber ring-amber/30",
  ready: "bg-teal/10 text-teal ring-teal/30",
  draft: "bg-raised text-soft ring-line-strong",
  paused: "bg-sky/10 text-sky ring-sky/25",
  archived: "bg-transparent text-faint ring-line",
  retired: "bg-raised text-soft ring-line-strong",
};
export const STATUS_LABEL: Record<DisplayStatus, string> = {
  testing: "LIVE LOCALLY",
  staging: "ON STAGING, TESTING",
  live: "Live",
  ready: "Ready to deploy",
  draft: "Draft",
  paused: "Paused",
  archived: "Archived",
  retired: "Previously live",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        STATUS_STYLE[status],
      )}
    >
      {status === "live" && (
        <span className="pulse-dot size-1.5 rounded-full bg-amber" />
      )}
      {STATUS_LABEL[status]}
    </span>
  );
}

export function DemoChip({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "rounded border border-amber/40 bg-amber/10 px-1.5 py-px text-[10px] font-bold tracking-wider text-amber",
        className,
      )}
    >
      DEMO
    </span>
  );
}

export function EvidenceBadge({ e }: { e: Evidence }) {
  const style = {
    none: "text-faint",
    insufficient: "text-amber",
    directional: "text-sky",
    persuasive: "text-teal",
  }[e.level];
  return (
    <span className={cx("text-[11px] font-medium", style)}>{e.label}</span>
  );
}

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx("rounded-xl border border-line bg-surface/80", className)}
    >
      {children}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function Empty({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
      <div className="text-faint">{icon}</div>
      <p className="font-semibold">{title}</p>
      <p className="max-w-md text-sm text-soft">{children}</p>
    </div>
  );
}

export function CopyButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1600);
        } catch {
          /* clipboard blocked */
        }
      }}
    >
      {done ? (
        <Check className="size-3.5 text-teal" />
      ) : (
        <Copy className="size-3.5" />
      )}
      {done ? "Copied" : label}
    </Button>
  );
}

export const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-soft">{label}</span>
    {children}
    {hint && <span className="mt-1 block text-[11px] text-faint">{hint}</span>}
  </label>
);

export const inputCls =
  "w-full rounded-lg border border-line-strong bg-bg px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-teal focus:outline-none";
