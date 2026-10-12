import { useEffect, useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  AlertCircle,
  Check,
  Info,
  Loader2,
  Shield,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  target: Target,
  check: Check,
  info: Info,
  shield: Shield,
};

export function nodeIcon(name?: string): LucideIcon {
  return (name && ICONS[name]) || Sparkles;
}

/** Staggered entrance for the children of a node. Static under reduced motion. */
export function Reveal({
  children,
  index = 0,
  className,
}: {
  children: ReactNode;
  index?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.45,
        delay: 0.06 * index,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

/** Heading block. The h1 takes focus on mount so screen readers announce each new step. */
export function NodeFrame({
  title,
  body,
  icon,
  align = "left",
  tone = "primary",
  children,
}: {
  title?: string;
  body?: string;
  icon?: string;
  align?: "left" | "center";
  tone?: "primary" | "success" | "info";
  children?: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [title]);
  const Icon = nodeIcon(icon);
  const center = align === "center";
  const toneClass =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "info"
        ? "bg-trust/15 text-trust"
        : "bg-primary-soft text-primary-foreground";
  return (
    <div
      className={cn(
        "flex flex-col gap-6",
        center && "items-center text-center",
      )}
    >
      <div className={cn("flex flex-col gap-3", center && "items-center")}>
        {icon ? (
          <Reveal index={0}>
            <span
              className={cn(
                "inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-soft",
                toneClass,
              )}
            >
              <Icon className="h-7 w-7" aria-hidden="true" />
            </span>
          </Reveal>
        ) : null}
        <Reveal index={1}>
          <h1
            ref={heading}
            tabIndex={-1}
            className="font-display text-3xl font-semibold leading-tight tracking-tight text-foreground outline-none sm:text-4xl"
          >
            {title}
          </h1>
        </Reveal>
        {body ? (
          <Reveal index={2}>
            <p className="max-w-prose text-base leading-relaxed text-muted-foreground sm:text-lg">
              {body}
            </p>
          </Reveal>
        ) : null}
      </div>
      <Reveal
        index={3}
        className={cn("w-full", center && "flex flex-col items-center")}
      >
        {children}
      </Reveal>
    </div>
  );
}

export function ErrorNote({
  message,
  id,
}: {
  message?: string | null;
  id?: string;
}) {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-2 text-sm font-medium text-destructive"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

export function ContinueButton({
  label,
  busy,
  disabled,
  type = "submit",
  onClick,
  savingLabel = "Saving",
}: {
  label: string;
  busy?: boolean;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
  savingLabel?: string;
}) {
  return (
    <Button
      type={type}
      size="xl"
      className="group w-full sm:w-auto sm:min-w-56"
      disabled={disabled || busy}
      onClick={onClick}
      aria-busy={busy || undefined}
    >
      {busy ? (
        <>
          <Loader2
            className="h-5 w-5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
          {savingLabel}
        </>
      ) : (
        label
      )}
    </Button>
  );
}

export const FIELD_CLASS =
  "h-14 w-full rounded-2xl border border-border bg-card px-4 text-base text-foreground shadow-soft outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 aria-[invalid=true]:border-destructive";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={htmlFor}
        className="text-sm font-semibold text-foreground"
      >
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
      <ErrorNote message={error} id={`${htmlFor}-error`} />
    </div>
  );
}
