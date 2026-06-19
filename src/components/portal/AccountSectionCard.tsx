import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AccountSectionTone =
  | "primary"
  | "contact"
  | "shipping"
  | "communication"
  | "consent"
  | "security";

const toneStyles: Record<
  AccountSectionTone,
  {
    section: string;
    header: string;
    icon: string;
    title: string;
    description: string;
    editingRing: string;
    footer: string;
    divider: string;
    badgeOn: string;
    rowIcon: string;
  }
> = {
  primary: {
    section: "border-border",
    header: "bg-warning/14",
    icon: "bg-warning/18 text-warning-foreground",
    title: "text-foreground",
    description: "text-muted-foreground",
    editingRing: "ring-warning/20",
    footer: "bg-warning/10",
    divider: "border-border/80",
    badgeOn: "bg-warning/15 text-warning-foreground",
    rowIcon: "bg-warning/15 text-warning-foreground",
  },
  contact: {
    section: "border-border",
    header: "bg-muted/70",
    icon: "bg-foreground/8 text-foreground/70",
    title: "text-foreground",
    description: "text-muted-foreground",
    editingRing: "ring-foreground/12",
    footer: "bg-muted/50",
    divider: "border-border/80",
    badgeOn: "bg-muted text-foreground/80",
    rowIcon: "bg-foreground/8 text-foreground/70",
  },
  shipping: {
    section: "border-border",
    header: "bg-secondary/10",
    icon: "bg-secondary/12 text-secondary",
    title: "text-foreground",
    description: "text-muted-foreground",
    editingRing: "ring-secondary/18",
    footer: "bg-secondary/6",
    divider: "border-border/80",
    badgeOn: "bg-secondary/10 text-secondary",
    rowIcon: "bg-secondary/12 text-secondary",
  },
  communication: {
    section: "border-border",
    header: "bg-accent/30",
    icon: "bg-accent-foreground/10 text-accent-foreground",
    title: "text-foreground",
    description: "text-muted-foreground",
    editingRing: "ring-accent-foreground/15",
    footer: "bg-accent/20",
    divider: "border-border/80",
    badgeOn: "bg-accent-foreground/10 text-accent-foreground",
    rowIcon: "bg-accent-foreground/10 text-accent-foreground",
  },
  consent: {
    section: "border-border",
    header: "bg-success/10",
    icon: "bg-success/12 text-success",
    title: "text-foreground",
    description: "text-muted-foreground",
    editingRing: "ring-success/18",
    footer: "bg-success/6",
    divider: "border-border/80",
    badgeOn: "bg-success/12 text-success",
    rowIcon: "bg-success/12 text-success",
  },
  security: {
    section: "border-border",
    header: "bg-destructive/8",
    icon: "bg-destructive/10 text-destructive",
    title: "text-foreground",
    description: "text-muted-foreground",
    editingRing: "ring-destructive/15",
    footer: "bg-destructive/6",
    divider: "border-border/80",
    badgeOn: "bg-destructive/10 text-destructive",
    rowIcon: "bg-destructive/10 text-destructive",
  },
};

export function DisplayField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1", className)}>
      <dt className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">
        {value || (
          <span className="font-normal text-muted-foreground">Not set</span>
        )}
      </dd>
    </div>
  );
}

export function EditableField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

export function AccountSectionCard({
  title,
  description,
  icon: Icon,
  tone = "primary",
  editable = false,
  editing = false,
  saving = false,
  onEdit,
  onSave,
  onCancel,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: AccountSectionTone;
  editable?: boolean;
  editing?: boolean;
  saving?: boolean;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  const styles = toneStyles[tone];

  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border bg-card p-1.5 shadow-soft transition-shadow",
        styles.section,
        editing && `ring-2 ${styles.editingRing}`,
        className,
      )}
    >
      <div
        className={cn(
          "flex items-start justify-between gap-4 rounded-2xl px-4 py-3.5 md:px-5 md:py-4",
          styles.header,
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                styles.icon,
              )}
            >
              <Icon className="size-5" aria-hidden />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground md:text-lg">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {description}
              </p>
            )}
          </div>
        </div>
        {editable && !editing && onEdit && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-xl border-border/80 bg-card/90"
            onClick={onEdit}
          >
            Edit
          </Button>
        )}
      </div>

      <div className="px-4 py-4 md:px-5 md:py-5">{children}</div>

      {editable && editing && (
        <div
          className={cn(
            "mx-1.5 mb-1.5 flex flex-wrap justify-end gap-2 rounded-2xl px-4 py-3 md:px-5",
            styles.footer,
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-xl"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="rounded-xl"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      )}
    </section>
  );
}

export function accountSectionDividerClass(tone: AccountSectionTone): string {
  return toneStyles[tone].divider;
}

export function accountSectionBadgeOnClass(tone: AccountSectionTone): string {
  return toneStyles[tone].badgeOn;
}

export function accountSectionRowIconClass(tone: AccountSectionTone): string {
  return toneStyles[tone].rowIcon;
}

export function accountSectionNavIconClass(tone: AccountSectionTone): string {
  return toneStyles[tone].icon;
}

export function accountSectionNavActiveClass(tone: AccountSectionTone): string {
  const styles = toneStyles[tone];
  return cn(styles.header, "font-medium text-foreground");
}
