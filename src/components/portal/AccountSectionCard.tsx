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
    section: "border-warning/45",
    header: "bg-warning/32",
    icon: "bg-warning-foreground text-warning shadow-sm",
    title: "text-warning-foreground",
    description: "text-warning-foreground/80",
    editingRing: "ring-warning/40",
    footer: "bg-warning/20",
    divider: "border-warning/25",
    badgeOn: "bg-warning/30 text-warning-foreground",
    rowIcon: "bg-warning/30 text-warning-foreground",
  },
  contact: {
    section: "border-foreground/18",
    header: "bg-muted",
    icon: "bg-foreground/14 text-foreground shadow-sm",
    title: "text-foreground",
    description: "text-foreground/65",
    editingRing: "ring-foreground/20",
    footer: "bg-muted/80",
    divider: "border-foreground/12",
    badgeOn: "bg-foreground/10 text-foreground",
    rowIcon: "bg-foreground/12 text-foreground",
  },
  shipping: {
    section: "border-secondary/40",
    header: "bg-secondary/16",
    icon: "bg-secondary text-secondary-foreground shadow-sm",
    title: "text-secondary",
    description: "text-secondary/80",
    editingRing: "ring-secondary/35",
    footer: "bg-secondary/10",
    divider: "border-secondary/20",
    badgeOn: "bg-secondary/15 text-secondary",
    rowIcon: "bg-secondary text-secondary-foreground",
  },
  communication: {
    section: "border-accent-foreground/22",
    header: "bg-accent/75",
    icon: "bg-accent-foreground text-accent shadow-sm",
    title: "text-accent-foreground",
    description: "text-accent-foreground/80",
    editingRing: "ring-accent-foreground/25",
    footer: "bg-accent/45",
    divider: "border-accent-foreground/15",
    badgeOn: "bg-accent-foreground/12 text-accent-foreground",
    rowIcon: "bg-accent-foreground/12 text-accent-foreground",
  },
  consent: {
    section: "border-success/40",
    header: "bg-success/18",
    icon: "bg-success text-success-foreground shadow-sm",
    title: "text-success",
    description: "text-success/80",
    editingRing: "ring-success/30",
    footer: "bg-success/10",
    divider: "border-success/20",
    badgeOn: "bg-success/20 text-success",
    rowIcon: "bg-success/15 text-success",
  },
  security: {
    section: "border-destructive/30",
    header: "bg-destructive/10",
    icon: "bg-destructive text-destructive-foreground shadow-sm",
    title: "text-destructive",
    description: "text-destructive/75",
    editingRing: "ring-destructive/25",
    footer: "bg-destructive/8",
    divider: "border-destructive/15",
    badgeOn: "bg-destructive/12 text-destructive",
    rowIcon: "bg-destructive/12 text-destructive",
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
            <h2
              className={cn("text-base font-semibold md:text-lg", styles.title)}
            >
              {title}
            </h2>
            {description && (
              <p className={cn("mt-0.5 text-sm", styles.description)}>
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
  return cn(styles.header, styles.title, "font-medium shadow-sm");
}
