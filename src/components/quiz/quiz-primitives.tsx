import { cn } from "@/lib/utils";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { useState, type ReactNode } from "react";

export const inputCls =
  "w-full rounded-2xl border border-input bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring";

export function RequiredFieldLegend() {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="text-destructive">*</span> indicates a required field
    </p>
  );
}

export function QuizShell({
  label,
  title,
  subtitle,
  showRequiredLegend,
  children,
  footer,
}: {
  label?: string;
  title: string;
  subtitle?: string;
  showRequiredLegend?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full max-w-xl">
      {label && <p className="text-sm font-medium text-primary">{label}</p>}
      <div
        className={cn(
          "rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8",
          label && "mt-4",
        )}
      >
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {subtitle}
          </p>
        )}
        {showRequiredLegend && (
          <div className={subtitle ? "mt-3" : "mt-2"}>
            <RequiredFieldLegend />
          </div>
        )}
        <div className="mt-6">{children}</div>
        {footer}
      </div>
    </div>
  );
}

export function QuizProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1 w-full bg-muted">
      <div
        className="h-1 rounded-r-full bg-primary transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function Field({
  label,
  children,
  className,
  required,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function ChoiceCard({
  title,
  desc,
  selected,
  onClick,
  compact,
}: {
  title: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left transition-all",
        compact ? "py-3" : "py-4",
        selected
          ? "border-primary bg-primary-soft/50 shadow-soft"
          : "border-border bg-background hover:bg-muted",
      )}
    >
      <span>
        <span className="block text-base font-semibold text-foreground">
          {title}
        </span>
        {desc && (
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {desc}
          </span>
        )}
      </span>
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-full border",
          selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border",
        )}
      >
        {selected && <Check className="size-4" />}
      </span>
    </button>
  );
}

export function YesNoField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <ChoiceCard
          compact
          selected={value === true}
          onClick={() => onChange(true)}
          title="Yes"
        />
        <ChoiceCard
          compact
          selected={value === false}
          onClick={() => onChange(false)}
          title="No"
        />
      </div>
    </div>
  );
}

export function PasswordInput({
  value,
  onChange,
  placeholder,
  className,
  autoComplete = "current-password",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cn(inputCls, "pr-12", className)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}

export function BlockedMessage({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5">
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function QuizNav({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled,
  nextLoading,
  showBack = true,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  showBack?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between gap-3">
      {showBack && onBack ? (
        <button
          type="button"
          onClick={onBack}
          disabled={nextLoading}
          className="text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          ← Back
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        disabled={nextDisabled}
        onClick={onNext}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {nextLoading && (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        )}
        {nextLabel}
      </button>
    </div>
  );
}
